import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, test } from "node:test";
import { prisma, type TenantContext } from "@smrkomed/database";

import { createApp } from "./app";
import { credentialService } from "./integrations/credentials/service";
import { setWhatsAppGraphFetchForTests } from "./integrations/providers/whatsapp/graph";
import { encodeSessionToken } from "./middleware/auth";
import { downloadAndStoreWhatsAppMedia } from "./modules/media/service";
import { mediaStorageProvider } from "./modules/media/storage";
import { realtimeBus } from "./modules/realtime/bus";
import type { RealtimeEvent } from "./modules/realtime/types";

const PREFIX = "wa-media-test";
const app = createApp();
const META_SECRET = "meta-app-secret-media-tests";
const VERIFY_TOKEN = "smrkomed-verify-media";

type Fixture = {
  ctxA: TenantContext;
  ctxB: TenantContext;
  tokenA: string;
  tokenB: string;
  clinicAId: string;
  clinicBId: string;
  orgAId: string;
  orgBId: string;
  userAId: string;
  userBId: string;
  patientAId: string;
  patientBId: string;
};

let fixture: Fixture;
const envBackup: Record<string, string | undefined> = {};

function sign(body: string) {
  return `sha256=${createHmac("sha256", META_SECRET).update(body).digest("hex")}`;
}

function cookie(token: string) {
  return { Cookie: `authjs.session-token=${token}` };
}

function waMediaPayload(input: {
  phoneNumberId: string;
  wabaId?: string;
  messageId: string;
  from: string;
  type: string;
  audio?: { id: string; mime_type?: string; sha256?: string; voice?: boolean };
  image?: { id: string; mime_type?: string; sha256?: string; caption?: string };
  video?: { id: string; mime_type?: string; sha256?: string; caption?: string; filename?: string };
  document?: { id: string; mime_type?: string; sha256?: string; caption?: string; filename?: string };
  sticker?: { id: string; mime_type?: string; sha256?: string; animated?: boolean };
  text?: { body: string };
}) {
  return JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        id: input.wabaId ?? "waba_media_a",
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: input.phoneNumberId },
              messages: [
                {
                  id: input.messageId,
                  from: input.from,
                  type: input.type,
                  audio: input.audio,
                  image: input.image,
                  video: input.video,
                  document: input.document,
                  sticker: input.sticker,
                  text: input.text,
                },
              ],
            },
          },
        ],
      },
    ],
  });
}

async function cleanup() {
  const clinics = await prisma.clinic.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true, organizationId: true },
  });
  const clinicIds = clinics.map((row) => row.id);
  const orgIds = [...new Set(clinics.map((row) => row.organizationId))];

  if (clinicIds.length > 0) {
    await prisma.whatsAppMedia.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.message.deleteMany({ where: { conversation: { clinicId: { in: clinicIds } } } });
    await prisma.conversation.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.whatsAppAccount.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integrationEvent.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integration.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }

  if (orgIds.length > 0) {
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }

  const users = await prisma.user.findMany({
    where: { email: { endsWith: `@${PREFIX}.demo` } },
    select: { id: true },
  });
  if (users.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: users.map((row) => row.id) } } });
  }
}

before(async () => {
  for (const key of ["META_APP_ID", "META_APP_SECRET", "WHATSAPP_VERIFY_TOKEN", "META_GRAPH_API_VERSION"]) {
    envBackup[key] = process.env[key];
  }
  process.env["META_APP_ID"] = "app-id-media";
  process.env["META_APP_SECRET"] = META_SECRET;
  process.env["WHATSAPP_VERIFY_TOKEN"] = VERIFY_TOKEN;
  process.env["META_GRAPH_API_VERSION"] = "v21.0";

  // Mock Meta Graph API responses
  setWhatsAppGraphFetchForTests(async (input, init) => {
    const url = String(input);

    // 1. Meta Media Metadata lookup: GET /{mediaId}
    if (url.includes("/meta-media-") && !url.includes("/meta-media-fail")) {
      return new Response(
        JSON.stringify({
          id: "meta-media-test",
          url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=test-binary",
          mime_type: url.includes("audio")
            ? "audio/ogg"
            : url.includes("doc")
              ? "application/pdf"
              : url.includes("vid")
                ? "video/mp4"
                : url.includes("stk")
                  ? "image/webp"
                  : "image/jpeg",
          file_size: 1024,
          sha256: "test-sha256-hash",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // 2. Failure simulation: GET /meta-media-fail
    if (url.includes("/meta-media-fail")) {
      return new Response(JSON.stringify({ error: { message: "Media expired or not found", code: 100 } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    // 3. Binary download simulation: GET lookaside.fbsbx.com
    if (url.includes("lookaside.fbsbx.com")) {
      const dummyContent = Buffer.from("DUMMY_SMRKOMED_BINARY_CONTENT_1234567890");
      return new Response(dummyContent, {
        status: 200,
        headers: { "content-type": "application/octet-stream" },
      });
    }

    return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
  });

  await cleanup();

  // Create Organizations and Clinics A & B
  const orgA = await prisma.organization.create({ data: { name: `${PREFIX} Org A` } });
  const orgB = await prisma.organization.create({ data: { name: `${PREFIX} Org B` } });

  const clinicA = await prisma.clinic.create({
    data: { name: `${PREFIX} Clinic A`, slug: `${PREFIX}-clinic-a`, organizationId: orgA.id },
  });
  const clinicB = await prisma.clinic.create({
    data: { name: `${PREFIX} Clinic B`, slug: `${PREFIX}-clinic-b`, organizationId: orgB.id },
  });

  const userA = await prisma.user.create({
    data: { email: `admin-a@${PREFIX}.demo`, name: "Staff A", passwordHash: "mock" },
  });
  const userB = await prisma.user.create({
    data: { email: `admin-b@${PREFIX}.demo`, name: "Staff B", passwordHash: "mock" },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "CLINIC_ADMIN" } });
  await prisma.clinicMembership.createMany({
    data: [
      { clinicId: clinicA.id, userId: userA.id, roleId: adminRole.id, status: "ACTIVE" },
      { clinicId: clinicB.id, userId: userB.id, roleId: adminRole.id, status: "ACTIVE" },
    ],
  });

  // Create integration for Clinic A with phone_media_a
  const encrypted = credentialService.encrypt({ accessToken: "test-token-clinic-a" });
  const integrationA = await prisma.integration.create({
    data: {
      clinicId: clinicA.id,
      organizationId: orgA.id,
      provider: "WHATSAPP_CLOUD",
      status: "ACTIVE",
      encryptedCredentials: encrypted,
    },
  });

  await prisma.whatsAppAccount.create({
    data: {
      integrationId: integrationA.id,
      clinicId: clinicA.id,
      phoneNumberId: "phone_media_a",
      businessAccountId: "waba_media_a",
      displayPhoneNumber: "+91 99999 88881",
      verifiedName: "SmrkoMed Clinic A",
      isActive: true,
    },
  });

  const patientA = await prisma.patient.create({
    data: {
      clinicId: clinicA.id,
      firstName: "Aarav",
      lastName: "Sharma",
      phone: "+919999900001",
      whatsappNumber: "+919999900001",
    },
  });

  const patientB = await prisma.patient.create({
    data: {
      clinicId: clinicB.id,
      firstName: "Neha",
      lastName: "Patel",
      phone: "+919999900002",
      whatsappNumber: "+919999900002",
    },
  });

  const ctxA: TenantContext = {
    organizationId: orgA.id,
    organizationName: orgA.name,
    clinicId: clinicA.id,
    clinicName: clinicA.name,
    userId: userA.id,
    role: "CLINIC_ADMIN",
  };

  const ctxB: TenantContext = {
    organizationId: orgB.id,
    organizationName: orgB.name,
    clinicId: clinicB.id,
    clinicName: clinicB.name,
    userId: userB.id,
    role: "CLINIC_ADMIN",
  };

  const tokenA = await encodeSessionToken(
    {
      id: userA.id,
      name: userA.name,
      email: userA.email,
      organizationId: orgA.id,
      organizationName: orgA.name,
      clinicId: clinicA.id,
      clinicName: clinicA.name,
      role: "CLINIC_ADMIN",
    },
    "authjs.session-token",
  );

  const tokenB = await encodeSessionToken(
    {
      id: userB.id,
      name: userB.name,
      email: userB.email,
      organizationId: orgB.id,
      organizationName: orgB.name,
      clinicId: clinicB.id,
      clinicName: clinicB.name,
      role: "CLINIC_ADMIN",
    },
    "authjs.session-token",
  );

  fixture = {
    ctxA,
    ctxB,
    tokenA,
    tokenB,
    clinicAId: clinicA.id,
    clinicBId: clinicB.id,
    orgAId: orgA.id,
    orgBId: orgB.id,
    userAId: userA.id,
    userBId: userB.id,
    patientAId: patientA.id,
    patientBId: patientB.id,
  };
});

after(async () => {
  setWhatsAppGraphFetchForTests(null);
  await cleanup();
  for (const [key, value] of Object.entries(envBackup)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("WhatsApp Inbound Media: Inbound Voice Note webhook persists message, media metadata and publishes realtime event", async () => {
  const publishedEvents: RealtimeEvent[] = [];
  const unsubscribe = realtimeBus.subscribe(fixture.clinicAId, (evt) => {
    publishedEvents.push(evt);
  });

  const body = waMediaPayload({
    phoneNumberId: "phone_media_a",
    messageId: "wamid.inbound-voice-001",
    from: "919999900001",
    type: "audio",
    audio: {
      id: "meta-media-audio-1",
      mime_type: "audio/ogg; codecs=opus",
      voice: true,
      sha256: "voice-sha256-abc",
    },
  });

  const res = await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sign(body),
    },
    body,
  });

  assert.equal(res.status, 200);

  // Verify message persisted
  const message = await prisma.message.findFirst({
    where: { providerMessageId: "wamid.inbound-voice-001" },
    include: { whatsappMedia: true },
  });

  assert.ok(message, "Message must be persisted");
  assert.equal(message.messageType, "audio");
  assert.equal(message.content, "🎤 Voice message");
  assert.ok(message.whatsappMedia, "WhatsAppMedia record must be created");
  assert.equal(message.whatsappMedia.providerMediaId, "meta-media-audio-1");
  assert.equal(message.whatsappMedia.type, "AUDIO");
  assert.equal(message.whatsappMedia.isVoice, true);
  assert.ok(message.whatsappMedia.status === "PENDING" || message.whatsappMedia.status === "READY");

  // Verify MESSAGE_CREATED realtime event
  const createdEvt = publishedEvents.find((e) => e.type === "MESSAGE_CREATED");
  assert.ok(createdEvt, "MESSAGE_CREATED event must be published");
  if (createdEvt && createdEvt.type === "MESSAGE_CREATED") {
    assert.equal(createdEvt.message.messageType, "audio");
    assert.ok(createdEvt.message.media, "Event message must contain media payload");
    assert.equal(createdEvt.message.media?.providerMediaId, undefined); // Sensitive provider ID not exposed
    assert.equal(createdEvt.message.media?.type, "AUDIO");
    assert.equal(createdEvt.message.media?.isVoice, true);
  }

  unsubscribe();
});

test("WhatsApp Inbound Media: Inbound Image webhook persists caption and media metadata", async () => {
  const body = waMediaPayload({
    phoneNumberId: "phone_media_a",
    messageId: "wamid.inbound-img-001",
    from: "919999900001",
    type: "image",
    image: {
      id: "meta-media-img-1",
      mime_type: "image/jpeg",
      caption: "Ultrasound scan report",
      sha256: "img-sha256-xyz",
    },
  });

  const res = await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sign(body),
    },
    body,
  });

  assert.equal(res.status, 200);

  const message = await prisma.message.findFirst({
    where: { providerMessageId: "wamid.inbound-img-001" },
    include: { whatsappMedia: true },
  });

  assert.ok(message);
  assert.equal(message.messageType, "image");
  assert.equal(message.content, "Ultrasound scan report");
  assert.ok(message.whatsappMedia);
  assert.equal(message.whatsappMedia.type, "IMAGE");
  assert.equal(message.whatsappMedia.caption, "Ultrasound scan report");
  assert.equal(message.whatsappMedia.mimeType, "image/jpeg");
});

test("WhatsApp Inbound Media: Inbound Document webhook preserves filename", async () => {
  const body = waMediaPayload({
    phoneNumberId: "phone_media_a",
    messageId: "wamid.inbound-doc-001",
    from: "919999900001",
    type: "document",
    document: {
      id: "meta-media-doc-1",
      mime_type: "application/pdf",
      filename: "Blood_Test_Report.pdf",
    },
  });

  const res = await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sign(body),
    },
    body,
  });

  assert.equal(res.status, 200);

  const message = await prisma.message.findFirst({
    where: { providerMessageId: "wamid.inbound-doc-001" },
    include: { whatsappMedia: true },
  });

  assert.ok(message);
  assert.equal(message.messageType, "document");
  assert.equal(message.content, "Blood_Test_Report.pdf");
  assert.ok(message.whatsappMedia);
  assert.equal(message.whatsappMedia.type, "DOCUMENT");
  assert.equal(message.whatsappMedia.filename, "Blood_Test_Report.pdf");
});

test("WhatsApp Inbound Media: Inbound Video and Sticker webhook handling", async () => {
  const bodyVideo = waMediaPayload({
    phoneNumberId: "phone_media_a",
    messageId: "wamid.inbound-vid-001",
    from: "919999900001",
    type: "video",
    video: {
      id: "meta-media-vid-1",
      mime_type: "video/mp4",
      caption: "Consultation clip",
      filename: "clip.mp4",
    },
  });

  const resVideo = await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sign(bodyVideo),
    },
    body: bodyVideo,
  });
  assert.equal(resVideo.status, 200);

  const msgVideo = await prisma.message.findFirst({
    where: { providerMessageId: "wamid.inbound-vid-001" },
    include: { whatsappMedia: true },
  });
  assert.ok(msgVideo);
  assert.equal(msgVideo.messageType, "video");
  assert.equal(msgVideo.whatsappMedia?.type, "VIDEO");

  const bodySticker = waMediaPayload({
    phoneNumberId: "phone_media_a",
    messageId: "wamid.inbound-stk-001",
    from: "919999900001",
    type: "sticker",
    sticker: {
      id: "meta-media-stk-1",
      mime_type: "image/webp",
    },
  });

  const resSticker = await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sign(bodySticker),
    },
    body: bodySticker,
  });
  assert.equal(resSticker.status, 200);

  const msgSticker = await prisma.message.findFirst({
    where: { providerMessageId: "wamid.inbound-stk-001" },
    include: { whatsappMedia: true },
  });
  assert.ok(msgSticker);
  assert.equal(msgSticker.messageType, "sticker");
  assert.equal(msgSticker.whatsappMedia?.type, "STICKER");
});

test("WhatsApp Inbound Media: Duplicate media webhook does not crash or create duplicate records", async () => {
  const body = waMediaPayload({
    phoneNumberId: "phone_media_a",
    messageId: "wamid.inbound-voice-001",
    from: "919999900001",
    type: "audio",
    audio: {
      id: "meta-media-audio-1",
      mime_type: "audio/ogg",
    },
  });

  const res = await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sign(body),
    },
    body,
  });

  assert.equal(res.status, 200);

  const count = await prisma.whatsAppMedia.count({
    where: { clinicId: fixture.clinicAId, providerMediaId: "meta-media-audio-1" },
  });
  assert.equal(count, 1, "Must have exactly 1 media record");
});

test("WhatsApp Media Download: downloadAndStoreWhatsAppMedia downloads, caches, updates DB and publishes MESSAGE_MEDIA_UPDATED", async () => {
  const conversation = await prisma.conversation.findFirstOrThrow({
    where: { clinicId: fixture.clinicAId },
  });
  const msg = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      senderType: "PATIENT",
      content: "🎤 Fresh Voice note",
      messageType: "audio",
      status: "DELIVERED",
    },
  });
  const media = await prisma.whatsAppMedia.create({
    data: {
      clinicId: fixture.clinicAId,
      conversationId: conversation.id,
      messageId: msg.id,
      providerMediaId: "meta-media-audio-fresh",
      type: "AUDIO",
      mimeType: "audio/ogg",
      status: "PENDING",
      isVoice: true,
    },
  });

  let mediaUpdatedPublished = false;
  const unsubscribe = realtimeBus.subscribe(fixture.clinicAId, (evt) => {
    if (evt.type === "MESSAGE_MEDIA_UPDATED" && evt.media.id === media.id) {
      mediaUpdatedPublished = true;
      assert.equal(evt.media.status, "READY");
      assert.ok(evt.media.url?.includes(media.id));
    }
  });

  await downloadAndStoreWhatsAppMedia(fixture.clinicAId, media.id);

  const updated = await prisma.whatsAppMedia.findUnique({
    where: { id: media.id },
  });

  assert.ok(updated);
  assert.equal(updated.status, "READY");
  assert.ok(updated.storageKey);
  assert.ok(updated.sizeBytes && updated.sizeBytes > 0);
  assert.ok(updated.sha256);
  assert.equal(mediaUpdatedPublished, true, "MESSAGE_MEDIA_UPDATED event must be published");

  unsubscribe();
});

test("WhatsApp Media Download: Failure handling updates status to FAILED gracefully", async () => {
  // Create a pending media record pointing to an unresolvable ID
  const conversation = await prisma.conversation.findFirstOrThrow({
    where: { clinicId: fixture.clinicAId },
  });
  const msg = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      senderType: "PATIENT",
      content: "📷 Photo",
      messageType: "image",
      status: "DELIVERED",
    },
  });

  const failMedia = await prisma.whatsAppMedia.create({
    data: {
      clinicId: fixture.clinicAId,
      conversationId: conversation.id,
      messageId: msg.id,
      providerMediaId: "meta-media-fail",
      type: "IMAGE",
      mimeType: "image/jpeg",
      status: "PENDING",
    },
  });

  await downloadAndStoreWhatsAppMedia(fixture.clinicAId, failMedia.id);

  const updated = await prisma.whatsAppMedia.findUnique({
    where: { id: failMedia.id },
  });

  assert.ok(updated);
  assert.equal(updated.status, "FAILED");
  assert.ok(updated.error);
});

test("WhatsApp Media Security: Authenticated media proxy and strict Clinic Isolation", async () => {
  const readyMedia = await prisma.whatsAppMedia.findFirst({
    where: { clinicId: fixture.clinicAId, status: "READY" },
  });
  assert.ok(readyMedia);

  // 1. Unauthenticated request -> 401
  const unauthRes = await app.request(`/api/v1/whatsapp-automation/inbox/media/${readyMedia.id}`);
  assert.equal(unauthRes.status, 401);

  // 2. Cross-tenant request from Clinic B -> 403 Forbidden
  const crossTenantRes = await app.request(`/api/v1/whatsapp-automation/inbox/media/${readyMedia.id}`, {
    headers: cookie(fixture.tokenB),
  });
  assert.equal(crossTenantRes.status, 403, "Clinic B must be blocked from accessing Clinic A's media");

  // 3. Authorized request from Clinic A -> 200 OK with binary
  const authRes = await app.request(`/api/v1/whatsapp-automation/inbox/media/${readyMedia.id}`, {
    headers: cookie(fixture.tokenA),
  });
  assert.equal(authRes.status, 200);
  assert.equal(authRes.headers.get("x-content-type-options"), "nosniff");
  assert.ok(authRes.headers.get("content-type"));
  const arrayBuf = await authRes.arrayBuffer();
  assert.ok(arrayBuf.byteLength > 0);

  // 4. Byte Range request -> 206 Partial Content
  const rangeRes = await app.request(`/api/v1/whatsapp-automation/inbox/media/${readyMedia.id}`, {
    headers: {
      ...cookie(fixture.tokenA),
      Range: "bytes=0-10",
    },
  });
  assert.equal(rangeRes.status, 206);
  assert.ok(rangeRes.headers.get("content-range")?.startsWith("bytes 0-10/"));
});

test("WhatsApp Media: Inbox detail API includes media serialized without secrets", async () => {
  const conversation = await prisma.conversation.findFirstOrThrow({
    where: { clinicId: fixture.clinicAId },
  });

  const res = await app.request(`/api/v1/whatsapp-automation/inbox/${conversation.id}`, {
    headers: cookie(fixture.tokenA),
  });
  assert.equal(res.status, 200);
  const resJson = (await res.json()) as { success: boolean; data: { messages: Array<{ id: string; media?: { url: string; status: string } }> } };
  const data = resJson.data;

  const messageWithMedia = data.messages.find((m) => Boolean(m.media));
  assert.ok(messageWithMedia, "Conversation messages must include serialized media");
  assert.ok(messageWithMedia.media?.url.startsWith("/api/v1/whatsapp-automation/inbox/media/"));

  // Check no secrets are leaked in JSON
  const jsonStr = JSON.stringify(data);
  assert.equal(jsonStr.includes("accessToken"), false);
  assert.equal(jsonStr.includes("clientSecret"), false);
  assert.equal(jsonStr.includes("appSecret"), false);
});

test("WhatsApp Inbound Media: Standard text messages continue working unaffected", async () => {
  const bodyText = waMediaPayload({
    phoneNumberId: "phone_media_a",
    messageId: "wamid.inbound-text-regular",
    from: "919999900001",
    type: "text",
    text: { body: "Hello Doctor, I have a question regarding my medications." },
  });

  const res = await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": sign(bodyText),
    },
    body: bodyText,
  });

  assert.equal(res.status, 200);

  const textMsg = await prisma.message.findFirst({
    where: { providerMessageId: "wamid.inbound-text-regular" },
    include: { whatsappMedia: true },
  });

  assert.ok(textMsg);
  assert.equal(textMsg.messageType, "text");
  assert.equal(textMsg.content, "Hello Doctor, I have a question regarding my medications.");
  assert.equal(textMsg.whatsappMedia, null, "Text message must not have a media attachment");
});
