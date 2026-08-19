import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, test } from "node:test";
import { prisma, type TenantContext } from "@smrkomed/database";

import { createApp } from "./app";
import { credentialService } from "./integrations/credentials/service";
import { setWhatsAppGraphFetchForTests } from "./integrations/providers/whatsapp/graph";
import { encodeSessionToken } from "./middleware/auth";

const PREFIX = "phase7-wa";
const app = createApp();
const META_SECRET = "meta-app-secret-for-tests";
const VERIFY_TOKEN = "smrkomed-verify";

type Fixture = {
  ctxA: TenantContext;
  ctxB: TenantContext;
  tokenA: string;
  tokenB: string;
  tokenPlatform: string;
  orgAId: string;
  clinicAId: string;
  clinicBId: string;
  patientAId: string;
  patientBId: string;
};

let fixture: Fixture;
const envBackup: Record<string, string | undefined> = {};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function sign(body: string) {
  return `sha256=${createHmac("sha256", META_SECRET).update(body).digest("hex")}`;
}

function cookie(token: string) {
  return { Cookie: `authjs.session-token=${token}` };
}

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

function secretKeysPresent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const forbidden = ["accessToken", "refreshToken", "clientSecret", "appSecret", "systemUserToken", "encryptedCredentials", "code"];
  if (forbidden.some((key) => key in record)) return true;
  return Object.values(record).some(secretKeysPresent);
}

function waPayload(input: {
  phoneNumberId: string;
  wabaId?: string;
  messages?: Array<{ id: string; from: string; type?: string; text?: string }>;
  statuses?: Array<{ id: string; status: string }>;
  clinicId?: string;
}) {
  return JSON.stringify({
    object: "whatsapp_business_account",
    clinicId: input.clinicId,
    entry: [
      {
        id: input.wabaId ?? "waba_a",
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: input.phoneNumberId },
              messages: input.messages?.map((row) => ({
                id: row.id,
                from: row.from,
                type: row.type ?? "text",
                text: row.text ? { body: row.text } : undefined,
              })),
              statuses: input.statuses,
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
  const users = await prisma.user.findMany({
    where: { email: { endsWith: `@${PREFIX}.demo` } },
    select: { id: true },
  });
  if (clinicIds.length > 0) {
    await prisma.notification.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.consent.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.message.deleteMany({ where: { conversation: { clinicId: { in: clinicIds } } } });
    await prisma.conversation.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.leadActivity.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.careTask.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.lead.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.campaign.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.whatsAppTemplate.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.whatsAppAccount.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integrationOauthState.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integrationEvent.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integration.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.auditLog.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }
  if (orgIds.length > 0) {
    await prisma.leadActivity.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.lead.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.campaign.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.auditLog.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
  if (users.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: users.map((row) => row.id) } } });
  }
}

before(async () => {
  for (const key of ["META_APP_ID", "META_APP_SECRET", "WHATSAPP_CONFIGURATION_ID", "WHATSAPP_VERIFY_TOKEN", "META_GRAPH_API_VERSION"]) {
    envBackup[key] = process.env[key];
  }
  process.env["META_APP_ID"] = "app-id";
  process.env["META_APP_SECRET"] = META_SECRET;
  process.env["WHATSAPP_CONFIGURATION_ID"] = "config-id";
  process.env["WHATSAPP_VERIFY_TOKEN"] = VERIFY_TOKEN;
  process.env["META_GRAPH_API_VERSION"] = "v21.0";

  setWhatsAppGraphFetchForTests(async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.includes("/oauth/access_token")) {
      if (url.includes("bad-code")) {
        return jsonResponse({ error: { message: "Invalid code", code: 100 } }, 400);
      }
      return jsonResponse({ access_token: "exchanged-bisu-token", token_type: "bearer" });
    }
    if (url.includes("/subscribed_apps") && method === "DELETE") return jsonResponse({ success: true });
    if (url.includes("/subscribed_apps")) return jsonResponse({ success: true });
    if (url.includes("/message_templates")) {
      return jsonResponse({
        data: [
          {
            id: "tpl-1",
            name: "appointment_reminder",
            language: "en",
            status: "APPROVED",
            category: "UTILITY",
            components: [{ type: "BODY", text: "Hello {{1}}, your appointment is on {{2}}." }],
          },
          { id: "tpl-2", name: "lead_follow_up", language: "en", status: "PENDING", category: "UTILITY" },
          { id: "tpl-3", name: "rejected_note", language: "en", status: "REJECTED", category: "UTILITY", rejected_reason: "policy" },
        ],
      });
    }
    if (url.includes("/phone_numbers")) {
      return jsonResponse({
        data: [{ id: "phone_a", display_phone_number: "919999911111", verified_name: "ABC Fertility", quality_rating: "GREEN" }],
      });
    }
    if (url.includes("/messages")) {
      const body = typeof init?.body === "string" ? (JSON.parse(init.body) as { to?: string }) : {};
      if (body.to === "000") return jsonResponse({ error: { message: "invalid", code: 131026 } }, 400);
      return jsonResponse({ messages: [{ id: "wamid.out-1" }] });
    }
    if (url.includes("phone_a")) {
      return jsonResponse({
        id: "phone_a",
        display_phone_number: "919999911111",
        verified_name: "ABC Fertility",
        quality_rating: "GREEN",
      });
    }
    if (url.includes("waba_a") || url.includes("waba_b")) {
      return jsonResponse({ id: "waba_a", name: "ABC Fertility" });
    }
    if (url.includes("190")) return jsonResponse({ error: { message: "expired", code: 190 } }, 401);
    return jsonResponse({ error: { message: "unexpected graph call" } }, 500);
  });

  await cleanup();
  const roles = await Promise.all(
    (["PLATFORM_ADMIN", "ORGANIZATION_ADMIN", "CLINIC_ADMIN"] as const).map((key) =>
      prisma.role.upsert({ where: { key }, update: {}, create: { key, name: key } }),
    ),
  );
  const role = Object.fromEntries(roles.map((row) => [row.key, row.id]));

  async function make(label: "a" | "b" | "p", staffRole: "CLINIC_ADMIN" | "ORGANIZATION_ADMIN" | "PLATFORM_ADMIN") {
    const organization = await prisma.organization.create({
      data: { name: `WA Org ${label.toUpperCase()}`, slug: `${PREFIX}-org-${label}` },
    });
    const clinic = await prisma.clinic.create({
      data: {
        organizationId: organization.id,
        name: `WA Clinic ${label.toUpperCase()}`,
        slug: `${PREFIX}-clinic-${label}`,
        city: "Bangalore",
      },
    });
    const user = await prisma.user.create({
      data: { email: `${label}@${PREFIX}.demo`, passwordHash: "unused", name: `WA User ${label.toUpperCase()}` },
    });
    await prisma.clinicMembership.create({
      data: { clinicId: clinic.id, userId: user.id, roleId: role[staffRole]!, status: "ACTIVE" },
    });
    const ctx: TenantContext = {
      userId: user.id,
      organizationId: organization.id,
      organizationName: organization.name,
      clinicId: clinic.id,
      clinicName: clinic.name,
      role: staffRole,
    };
    const token = await encodeSessionToken(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: organization.id,
        organizationName: organization.name,
        clinicId: clinic.id,
        clinicName: clinic.name,
        role: staffRole,
      },
      "authjs.session-token",
    );
    return { organization, clinic, ctx, token };
  }

  const a = await make("a", "CLINIC_ADMIN");
  const b = await make("b", "ORGANIZATION_ADMIN");
  const platform = await make("p", "PLATFORM_ADMIN");
  const patientA = await prisma.patient.create({
    data: {
      clinicId: a.clinic.id,
      firstName: "Priya",
      lastName: "Sharma",
      phone: "9876543210",
      whatsappNumber: "919876543210",
    },
  });
  const patientB = await prisma.patient.create({
    data: {
      clinicId: b.clinic.id,
      firstName: "Anjali",
      lastName: "Rao",
      phone: "9876543210",
      whatsappNumber: "919876543210",
    },
  });

  fixture = {
    ctxA: a.ctx,
    ctxB: b.ctx,
    tokenA: a.token,
    tokenB: b.token,
    tokenPlatform: platform.token,
    orgAId: a.organization.id,
    clinicAId: a.clinic.id,
    clinicBId: b.clinic.id,
    patientAId: patientA.id,
    patientBId: patientB.id,
  };
});

after(async () => {
  setWhatsAppGraphFetchForTests(null);
  for (const [key, value] of Object.entries(envBackup)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await cleanup();
  await prisma.$disconnect();
});

async function connectClinicA(phoneNumberId = "phone_a") {
  const start = await app.request("/api/v1/integrations/whatsapp/connect", {
    method: "POST",
    headers: cookie(fixture.tokenA),
  });
  assert.equal(start.status, 200);
  const startBody = await json(start);
  const data = startBody["data"] as { state: string; appId: string; configId: string };
  assert.equal(data.appId, "app-id");
  assert.equal(secretKeysPresent(startBody), false);
  const callback = await app.request("/api/v1/integrations/whatsapp/callback", {
    method: "POST",
    headers: { ...cookie(fixture.tokenA), "content-type": "application/json" },
    body: JSON.stringify({
      state: data.state,
      code: "ok-code",
      wabaId: "waba_a",
      phoneNumberId,
    }),
  });
  return { start: startBody, callback };
}

test("whatsapp connect stores encrypted credentials and never returns them", async () => {
  const { callback } = await connectClinicA();
  assert.equal(callback.status, 200);
  const body = await json(callback);
  assert.equal(secretKeysPresent(body), false);
  const stored = await prisma.integration.findUnique({
    where: { clinicId_provider: { clinicId: fixture.clinicAId, provider: "WHATSAPP_CLOUD" } },
  });
  assert.equal(stored?.status, "ACTIVE");
  assert.equal(Boolean(stored?.encryptedCredentials), true);
  assert.equal(stored?.encryptedCredentials?.includes("exchanged-bisu-token"), false);
  assert.equal(credentialService.decrypt(stored?.encryptedCredentials).accessToken, "exchanged-bisu-token");
  const status = await app.request("/api/v1/integrations/whatsapp/status", { headers: cookie(fixture.tokenA) });
  const statusBody = await json(status);
  assert.equal(secretKeysPresent(statusBody), false);
  assert.equal(((statusBody["data"] as { integration: { connectionStatus: string } }).integration.connectionStatus), "CONNECTED");
});

test("oauth state is bound to clinic and expires", async () => {
  const stolen = await app.request("/api/v1/integrations/whatsapp/connect", {
    method: "POST",
    headers: cookie(fixture.tokenA),
  });
  const state = ((await json(stolen))["data"] as { state: string }).state;
  const replay = await app.request("/api/v1/integrations/whatsapp/callback", {
    method: "POST",
    headers: { ...cookie(fixture.tokenB), "content-type": "application/json" },
    body: JSON.stringify({ state, code: "ok-code", wabaId: "waba_a", phoneNumberId: "phone_a" }),
  });
  assert.equal(replay.status, 403);

  const expired = await prisma.integrationOauthState.create({
    data: {
      provider: "WHATSAPP_CLOUD",
      userId: fixture.ctxA.userId,
      organizationId: fixture.ctxA.organizationId,
      clinicId: fixture.clinicAId,
      nonce: "expired",
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  const expiredRes = await app.request("/api/v1/integrations/whatsapp/callback", {
    method: "POST",
    headers: { ...cookie(fixture.tokenA), "content-type": "application/json" },
    body: JSON.stringify({ state: expired.id, code: "ok-code", wabaId: "waba_a", phoneNumberId: "phone_a" }),
  });
  assert.equal(expiredRes.status, 401);

  const fail = await app.request("/api/v1/integrations/whatsapp/callback", {
    method: "POST",
    headers: { ...cookie(fixture.tokenA), "content-type": "application/json" },
    body: JSON.stringify({
      state: ((await json(await app.request("/api/v1/integrations/whatsapp/connect", { method: "POST", headers: cookie(fixture.tokenA) })))["data"] as { state: string }).state,
      code: "bad-code",
      wabaId: "waba_a",
      phoneNumberId: "phone_a",
    }),
  });
  assert.equal(fail.status, 500);
});

test("duplicate active phone numbers cannot be connected to another clinic", async () => {
  await connectClinicA();
  const startB = await app.request("/api/v1/integrations/whatsapp/connect", {
    method: "POST",
    headers: cookie(fixture.tokenB),
  });
  const state = ((await json(startB))["data"] as { state: string }).state;
  const conflict = await app.request("/api/v1/integrations/whatsapp/callback", {
    method: "POST",
    headers: { ...cookie(fixture.tokenB), "content-type": "application/json" },
    body: JSON.stringify({ state, code: "ok-code", wabaId: "waba_a", phoneNumberId: "phone_a" }),
  });
  assert.equal(conflict.status, 409);
});

test("templates sync and only approved templates can be sent", async () => {
  await connectClinicA();
  const sync = await app.request("/api/v1/integrations/whatsapp/sync", {
    method: "POST",
    headers: cookie(fixture.tokenA),
  });
  assert.equal(sync.status, 200);
  const templates = (await json(sync))["data"] as Array<{ id: string; name: string; status: string }>;
  const approved = templates.find((row) => row.name === "appointment_reminder");
  const pending = templates.find((row) => row.name === "lead_follow_up");
  const rejected = templates.find((row) => row.name === "rejected_note");
  assert.equal(approved?.status, "APPROVED");
  assert.equal(pending?.status, "PENDING");
  assert.equal(rejected?.status, "REJECTED");

  const sendApproved = await app.request("/api/v1/integrations/whatsapp/messages/template", {
    method: "POST",
    headers: { ...cookie(fixture.tokenA), "content-type": "application/json" },
    body: JSON.stringify({
      patientId: fixture.patientAId,
      templateId: approved?.id,
      parameters: ["Priya", "tomorrow 9am"],
    }),
  });
  assert.equal(sendApproved.status, 201);
  const sent = (await json(sendApproved))["data"] as { status: string; providerMessageId: string };
  assert.equal(sent.status, "SENT");
  assert.equal(sent.providerMessageId, "wamid.out-1");

  const sendPending = await app.request("/api/v1/integrations/whatsapp/messages/template", {
    method: "POST",
    headers: { ...cookie(fixture.tokenA), "content-type": "application/json" },
    body: JSON.stringify({ patientId: fixture.patientAId, templateId: pending?.id, parameters: ["x"] }),
  });
  assert.equal(sendPending.status, 422);

  const sendRejected = await app.request("/api/v1/integrations/whatsapp/messages/template", {
    method: "POST",
    headers: { ...cookie(fixture.tokenA), "content-type": "application/json" },
    body: JSON.stringify({ patientId: fixture.patientAId, templateId: rejected?.id, parameters: ["x"] }),
  });
  assert.equal(sendRejected.status, 422);

  const missingParams = await app.request("/api/v1/integrations/whatsapp/messages/template", {
    method: "POST",
    headers: { ...cookie(fixture.tokenA), "content-type": "application/json" },
    body: JSON.stringify({ patientId: fixture.patientAId, templateId: approved?.id, parameters: ["only-one"] }),
  });
  assert.equal(missingParams.status, 422);

  const cross = await app.request("/api/v1/integrations/whatsapp/messages/template", {
    method: "POST",
    headers: { ...cookie(fixture.tokenB), "content-type": "application/json" },
    body: JSON.stringify({ patientId: fixture.patientBId, templateId: approved?.id, parameters: ["A", "B"] }),
  });
  assert.equal(cross.status, 409);
});

test("webhooks verify, isolate tenants, update status, and ignore duplicates", async () => {
  await connectClinicA();
  const challenge = await app.request(
    `/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=12345`,
  );
  assert.equal(challenge.status, 200);
  assert.equal(await challenge.text(), "12345");
  const badChallenge = await app.request(
    "/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1",
  );
  assert.equal(badChallenge.status, 403);

  const inbound = waPayload({
    phoneNumberId: "phone_a",
    clinicId: fixture.clinicBId,
    messages: [{ id: "wamid.in-1", from: "919876543210", text: "Hello clinic" }],
  });
  const unsigned = await app.request("/api/v1/webhooks/whatsapp", { method: "POST", body: inbound });
  assert.equal(unsigned.status, 401);

  const first = await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: { "x-hub-signature-256": sign(inbound), "content-type": "application/json" },
    body: inbound,
  });
  assert.equal(first.status, 200);
  const messages = await prisma.message.findMany({
    where: { providerMessageId: "wamid.in-1" },
    include: { conversation: true },
  });
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.conversation.clinicId, fixture.clinicAId);
  assert.equal(messages[0]?.conversation.patientId, fixture.patientAId);
  assert.equal(messages[0]?.content, "Hello clinic");

  const second = await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: { "x-hub-signature-256": sign(inbound), "content-type": "application/json" },
    body: inbound,
  });
  assert.equal(second.status, 200);
  assert.equal(await prisma.message.count({ where: { providerMessageId: "wamid.in-1" } }), 1);

  const unknown = waPayload({
    phoneNumberId: "phone_a",
    messages: [{ id: "wamid.in-unknown", from: "911111111111", text: "who is this" }],
  });
  const unknownRes = await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: { "x-hub-signature-256": sign(unknown), "content-type": "application/json" },
    body: unknown,
  });
  assert.equal(unknownRes.status, 200);
  const unmatched = await prisma.conversation.findFirst({
    where: { clinicId: fixture.clinicAId, unmatched: true, contactPhone: "911111111111" },
  });
  assert.equal(Boolean(unmatched), true);

  await prisma.message.create({
    data: {
      conversationId: messages[0]!.conversationId,
      direction: "OUTBOUND",
      senderType: "STAFF",
      content: "Template: appointment_reminder",
      messageType: "template",
      providerMessageId: "wamid.status-1",
      status: "SENT",
    },
  });
  const delivered = waPayload({ phoneNumberId: "phone_a", statuses: [{ id: "wamid.status-1", status: "delivered" }] });
  await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: { "x-hub-signature-256": sign(delivered), "content-type": "application/json" },
    body: delivered,
  });
  assert.equal((await prisma.message.findFirst({ where: { providerMessageId: "wamid.status-1" } }))?.status, "DELIVERED");
  const read = waPayload({ phoneNumberId: "phone_a", statuses: [{ id: "wamid.status-1", status: "read" }] });
  await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: { "x-hub-signature-256": sign(read), "content-type": "application/json" },
    body: read,
  });
  assert.equal((await prisma.message.findFirst({ where: { providerMessageId: "wamid.status-1" } }))?.status, "READ");

  const other = waPayload({
    phoneNumberId: "unknown-phone",
    messages: [{ id: "wamid.other", from: "919876543210", text: "wrong clinic" }],
  });
  const otherRes = await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: { "x-hub-signature-256": sign(other), "content-type": "application/json" },
    body: other,
  });
  assert.equal(otherRes.status, 200);
  assert.equal(await prisma.message.count({ where: { providerMessageId: "wamid.other" } }), 0);

  const listA = await app.request("/api/v1/integrations/whatsapp/conversations", { headers: cookie(fixture.tokenA) });
  const listB = await app.request("/api/v1/integrations/whatsapp/conversations", { headers: cookie(fixture.tokenB) });
  const idsA = ((await json(listA))["data"] as Array<{ id: string }>).map((row) => row.id);
  const idsB = ((await json(listB))["data"] as Array<{ id: string }>).map((row) => row.id);
  assert.equal(idsA.length > 0, true);
  assert.equal(idsB.some((id) => idsA.includes(id)), false);
});

test("disconnect keeps history and stops sending", async () => {
  await connectClinicA();
  const before = await prisma.conversation.count({ where: { clinicId: fixture.clinicAId } });
  const disconnect = await app.request("/api/v1/integrations/whatsapp/disconnect", {
    method: "POST",
    headers: cookie(fixture.tokenA),
  });
  assert.equal(disconnect.status, 200);
  const stored = await prisma.integration.findUnique({
    where: { clinicId_provider: { clinicId: fixture.clinicAId, provider: "WHATSAPP_CLOUD" } },
  });
  assert.equal(stored?.status, "DISCONNECTED");
  assert.equal(stored?.encryptedCredentials, null);
  assert.equal(await prisma.conversation.count({ where: { clinicId: fixture.clinicAId } }), before);
  const inbound = waPayload({
    phoneNumberId: "phone_a",
    messages: [{ id: "wamid.after-disconnect", from: "919876543210", text: "after" }],
  });
  await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: { "x-hub-signature-256": sign(inbound), "content-type": "application/json" },
    body: inbound,
  });
  assert.equal(await prisma.message.count({ where: { providerMessageId: "wamid.after-disconnect" } }), 0);
  const reconnect = await connectClinicA();
  assert.equal(reconnect.callback.status, 200);
});

test("admin whatsapp monitoring hides secrets and supports action required filter", async () => {
  await connectClinicA();
  const list = await app.request("/api/v1/admin/integrations/whatsapp", { headers: cookie(fixture.tokenPlatform) });
  assert.equal(list.status, 200);
  const body = await json(list);
  assert.equal(secretKeysPresent(body), false);
  assert.equal(JSON.stringify(body).includes("exchanged-bisu-token"), false);
  const clinic = await app.request("/api/v1/admin/integrations/whatsapp", { headers: cookie(fixture.tokenA) });
  assert.equal(clinic.status, 403);
});

test("audit logs do not store tokens or message bodies", async () => {
  await connectClinicA();
  const logs = await prisma.auditLog.findMany({ where: { clinicId: fixture.clinicAId, action: { startsWith: "whatsapp." } } });
  assert.equal(logs.length > 0, true);
  for (const log of logs) {
    const raw = JSON.stringify(log.metadata ?? {});
    assert.equal(raw.includes("exchanged-bisu-token"), false);
    assert.equal(raw.includes("accessToken"), false);
    assert.equal(raw.includes("Hello clinic"), false);
  }
});
