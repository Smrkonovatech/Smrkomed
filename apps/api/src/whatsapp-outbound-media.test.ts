import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma, type TenantContext } from "@smrkomed/database";

import { createApp } from "./app";
import { credentialService } from "./integrations/credentials/service";
import { setWhatsAppGraphFetchForTests } from "./integrations/providers/whatsapp/graph";
import { encodeSessionToken } from "./middleware/auth";
import {
  inferMediaKind,
  validateOutboundMediaFile,
} from "./modules/media/outbound-validation";
import { mediaStorageProvider } from "./modules/media/storage";

const PREFIX = "wa-out-media";
const app = createApp();

type Fixture = {
  tokenA: string;
  tokenB: string;
  clinicAId: string;
  clinicBId: string;
  conversationAId: string;
  conversationBId: string;
  patientAId: string;
  documentAId: string;
};

let fixture: Fixture;
let outboundSeq = 0;
const uploadedBodies: Array<{ path: string; hasFile: boolean }> = [];

function cookie(token: string) {
  return { Cookie: `authjs.session-token=${token}` };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

function secretKeysPresent(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const forbidden = ["accessToken", "refreshToken", "clientSecret", "appSecret", "systemUserToken", "encryptedCredentials"];
  if (forbidden.some((key) => key in record)) return true;
  return Object.values(record).some(secretKeysPresent);
}

async function cleanup() {
  const clinics = await prisma.clinic.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true, organizationId: true },
  });
  const clinicIds = clinics.map((c) => c.id);
  const orgIds = [...new Set(clinics.map((c) => c.organizationId))];
  if (clinicIds.length) {
    await prisma.whatsAppMedia.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.message.deleteMany({ where: { conversation: { clinicId: { in: clinicIds } } } });
    await prisma.conversation.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.document.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.whatsAppAccount.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integrationEvent.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integration.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.consent.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.auditLog.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }
  if (orgIds.length) {
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${PREFIX}.demo` } } });
}

before(async () => {
  setWhatsAppGraphFetchForTests(async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.includes("/media") && method === "POST") {
      outboundSeq += 1;
      uploadedBodies.push({ path: url.split("?")[0] ?? url, hasFile: Boolean(init?.body) });
      return jsonResponse({ id: `meta-media-${outboundSeq}` });
    }
    if (url.includes("/messages") && method === "POST") {
      const body = typeof init?.body === "string" ? (JSON.parse(init.body) as { type?: string }) : {};
      if (body.type === "fail_media") {
        return jsonResponse({ error: { message: "send failed", code: 131047 } }, 400);
      }
      outboundSeq += 1;
      return jsonResponse({ messages: [{ id: `wamid.media-${outboundSeq}` }] });
    }
    return jsonResponse({ error: { message: "unexpected" } }, 500);
  });

  await cleanup();
  const role = await prisma.role.upsert({
    where: { key: "CLINIC_ADMIN" },
    update: {},
    create: { key: "CLINIC_ADMIN", name: "CLINIC_ADMIN" },
  });

  async function make(label: "a" | "b") {
    const organization = await prisma.organization.create({
      data: { name: `Out Org ${label}`, slug: `${PREFIX}-org-${label}` },
    });
    const clinic = await prisma.clinic.create({
      data: {
        organizationId: organization.id,
        name: `Out Clinic ${label}`,
        slug: `${PREFIX}-clinic-${label}`,
      },
    });
    const user = await prisma.user.create({
      data: { email: `${label}@${PREFIX}.demo`, passwordHash: "x", name: `Out ${label}` },
    });
    await prisma.clinicMembership.create({
      data: { clinicId: clinic.id, userId: user.id, roleId: role.id, status: "ACTIVE" },
    });
    const encrypted = credentialService.encrypt({ accessToken: `token-${label}` });
    const integration = await prisma.integration.create({
      data: {
        organizationId: organization.id,
        clinicId: clinic.id,
        provider: "WHATSAPP_CLOUD",
        status: "ACTIVE",
        encryptedCredentials: encrypted,
        externalAccountId: `waba-${label}`,
      },
    });
    await prisma.whatsAppAccount.create({
      data: {
        clinicId: clinic.id,
        integrationId: integration.id,
        phoneNumberId: `phone-${label}`,
        displayPhoneNumber: "919999900000",
        isActive: true,
      },
    });
    const patient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: "Rahul",
        lastName: "Test",
        phone: "9000000000",
        whatsappNumber: "919000000000",
      },
    });
    const conversation = await prisma.conversation.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        contactPhone: "919000000000",
        channel: "WHATSAPP",
        status: "OPEN",
      },
    });
    const stored = await mediaStorageProvider.upload({
      clinicId: clinic.id,
      providerMediaId: `doc-${label}`,
      type: "DOCUMENT",
      buffer: Buffer.from("%PDF-1.4 demo report"),
      mimeType: "application/pdf",
      filename: "Blood-Test-Report.pdf",
    });
    const document = await prisma.document.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        name: "Blood Test Report.pdf",
        mimeType: "application/pdf",
        sizeBytes: stored.sizeBytes,
        storageKey: stored.storageKey,
        status: "UPLOADED",
      },
    });
    const token = await encodeSessionToken(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: organization.id,
        organizationName: organization.name,
        clinicId: clinic.id,
        clinicName: clinic.name,
        role: "CLINIC_ADMIN",
      },
      "authjs.session-token",
    );
    return { token, clinicId: clinic.id, conversationId: conversation.id, patientId: patient.id, documentId: document.id };
  }

  const a = await make("a");
  const b = await make("b");
  fixture = {
    tokenA: a.token,
    tokenB: b.token,
    clinicAId: a.clinicId,
    clinicBId: b.clinicId,
    conversationAId: a.conversationId,
    conversationBId: b.conversationId,
    patientAId: a.patientId,
    documentAId: a.documentId,
  };
});

after(async () => {
  setWhatsAppGraphFetchForTests(null);
  await cleanup();
});

test("outbound validation: mime and size rules", () => {
  assert.equal(inferMediaKind("image/jpeg"), "IMAGE");
  assert.equal(inferMediaKind("application/pdf"), "DOCUMENT");
  assert.equal(inferMediaKind("text/html"), null);

  const okImg = validateOutboundMediaFile({
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    filename: "a.jpg",
  });
  assert.equal(okImg.ok, true);

  const badExe = validateOutboundMediaFile({
    mimeType: "application/octet-stream",
    sizeBytes: 10,
    filename: "virus.exe",
  });
  assert.equal(badExe.ok, false);

  const tooBig = validateOutboundMediaFile({
    mimeType: "image/png",
    sizeBytes: 6 * 1024 * 1024,
  });
  assert.equal(tooBig.ok, false);
});

test("outbound image send + media proxy tenant isolation + no secrets", async () => {
  const form = new FormData();
  form.set("file", new Blob([Uint8Array.from([1, 2, 3, 4])], { type: "image/jpeg" }), "scan.jpg");
  form.set("kind", "IMAGE");
  form.set("caption", "Lab image");

  const res = await app.request(`/api/v1/whatsapp-automation/inbox/${fixture.conversationAId}/media`, {
    method: "POST",
    headers: cookie(fixture.tokenA),
    body: form,
  });
  assert.equal(res.status, 201);
  const body = await json(res);
  assert.equal(secretKeysPresent(body), false);
  const data = body["data"] as { id: string; status: string; media: { id: string; status: string; url: string } };
  assert.equal(data.status, "SENT");
  assert.equal(data.media.status, "READY");
  assert.ok(data.media.url.includes("/inbox/media/"));

  const proxyOk = await app.request(data.media.url, { headers: cookie(fixture.tokenA) });
  assert.equal(proxyOk.status, 200);

  const proxyCross = await app.request(data.media.url, { headers: cookie(fixture.tokenB) });
  assert.equal(proxyCross.status, 403);
});

test("outbound document from patient Document model", async () => {
  const res = await app.request(`/api/v1/whatsapp-automation/inbox/${fixture.conversationAId}/send-document`, {
    method: "POST",
    headers: { ...cookie(fixture.tokenA), "content-type": "application/json" },
    body: JSON.stringify({
      documentId: fixture.documentAId,
      caption: "Hi Rahul, please find your latest report.",
    }),
  });
  assert.equal(res.status, 201);
  const body = await json(res);
  assert.equal(secretKeysPresent(body), false);
});

test("failed upload validation rejects empty file", async () => {
  const form = new FormData();
  form.set("file", new Blob([], { type: "image/jpeg" }), "empty.jpg");
  form.set("kind", "IMAGE");
  const res = await app.request(`/api/v1/whatsapp-automation/inbox/${fixture.conversationAId}/media`, {
    method: "POST",
    headers: cookie(fixture.tokenA),
    body: form,
  });
  assert.equal(res.status, 422);
});

test("cross-tenant media send blocked", async () => {
  const form = new FormData();
  form.set("file", new Blob([Uint8Array.from([9, 9])], { type: "image/png" }), "x.png");
  form.set("kind", "IMAGE");
  const res = await app.request(`/api/v1/whatsapp-automation/inbox/${fixture.conversationAId}/media`, {
    method: "POST",
    headers: cookie(fixture.tokenB),
    body: form,
  });
  assert.ok(res.status === 404 || res.status === 403);
});

test("patient documents list is clinic scoped", async () => {
  const ok = await app.request(
    `/api/v1/whatsapp-automation/inbox/${fixture.conversationAId}/patient-documents`,
    { headers: cookie(fixture.tokenA) },
  );
  assert.equal(ok.status, 200);
  const data = (await json(ok))["data"] as { items: Array<{ id: string; sendable: boolean }> };
  assert.ok(data.items.some((i) => i.id === fixture.documentAId && i.sendable));

  const cross = await app.request(
    `/api/v1/whatsapp-automation/inbox/${fixture.conversationAId}/patient-documents`,
    { headers: cookie(fixture.tokenB) },
  );
  assert.equal(cross.status, 404);
});
