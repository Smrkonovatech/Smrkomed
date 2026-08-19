import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { prisma, type TenantContext, writeAuditLog } from "@smrkomed/database";

import { createApp } from "./app";
import { encryptString, parseIntegrationEncryptionKey } from "./integrations/credentials/encryption";
import { credentialService } from "./integrations/credentials/service";
import { getProvider, parseProviderId, registerProviderForTests, resetProviderRegistryForTests } from "./integrations/core/registry";
import { assertTransition, canTransition } from "./integrations/core/status";
import { IntegrationError } from "./integrations/core/errors";
import { mockIntegrationProvider, mockWebhookSignature } from "./integrations/providers/mock/provider";
import { integrationService } from "./integrations/services/integration-service";
import { encodeSessionToken } from "./middleware/auth";

const PREFIX = "phase6-int";
const app = createApp();

type Fixture = {
  ctxA: TenantContext;
  ctxB: TenantContext;
  tokenA: string;
  tokenB: string;
  tokenPlatform: string;
  orgAId: string;
  orgBId: string;
  clinicAId: string;
  clinicBId: string;
  integrationAId: string;
};

let fixture: Fixture;

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
    await prisma.message.deleteMany({ where: { conversation: { clinicId: { in: clinicIds } } } });
    await prisma.conversation.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.whatsAppTemplate.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.whatsAppAccount.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integrationOauthState.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integrationEvent.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.integration.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.auditLog.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }
  if (orgIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
  if (users.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: users.map((row) => row.id) } } });
  }
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
  const forbidden = ["accessToken", "refreshToken", "clientSecret", "appSecret", "systemUserToken", "encryptedCredentials"];
  if (forbidden.some((key) => key in record)) return true;
  return Object.values(record).some(secretKeysPresent);
}

before(async () => {
  await cleanup();
  const roles = await Promise.all(
    (["PLATFORM_ADMIN", "ORGANIZATION_ADMIN", "CLINIC_ADMIN"] as const).map((key) =>
      prisma.role.upsert({ where: { key }, update: {}, create: { key, name: key } }),
    ),
  );
  const role = Object.fromEntries(roles.map((row) => [row.key, row.id]));

  async function make(label: "a" | "b" | "p", staffRole: "CLINIC_ADMIN" | "ORGANIZATION_ADMIN" | "PLATFORM_ADMIN") {
    const organization = await prisma.organization.create({
      data: { name: `Int Org ${label.toUpperCase()}`, slug: `${PREFIX}-org-${label}` },
    });
    const clinic = await prisma.clinic.create({
      data: {
        organizationId: organization.id,
        name: `Int Clinic ${label.toUpperCase()}`,
        slug: `${PREFIX}-clinic-${label}`,
        city: "Bangalore",
      },
    });
    const user = await prisma.user.create({
      data: {
        email: `${label}@${PREFIX}.demo`,
        passwordHash: "unused",
        name: `Int User ${label.toUpperCase()}`,
      },
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
  const integration = await prisma.integration.create({
    data: {
      organizationId: a.organization.id,
      clinicId: a.clinic.id,
      provider: "WHATSAPP_CLOUD",
      status: "ACTIVE",
      displayName: "WhatsApp A",
      encryptedCredentials: credentialService.encrypt({ accessToken: "raw-secret-token" }),
      externalAccountId: "mock_account_001",
    },
  });

  fixture = {
    ctxA: a.ctx,
    ctxB: b.ctx,
    tokenA: a.token,
    tokenB: b.token,
    tokenPlatform: platform.token,
    orgAId: a.organization.id,
    orgBId: b.organization.id,
    clinicAId: a.clinic.id,
    clinicBId: b.clinic.id,
    integrationAId: integration.id,
  };
});

after(async () => {
  resetProviderRegistryForTests();
  await cleanup();
  await prisma.$disconnect();
});

test("provider registry returns stubs that are not implemented", async () => {
  for (const id of ["WHATSAPP", "META_ADS", "GOOGLE_ADS"] as const) {
    const provider = getProvider(id);
    await assert.rejects(() => provider.connect(), (error: unknown) => {
      assert.equal(error instanceof IntegrationError, true);
      assert.equal((error as IntegrationError).code, "PROVIDER_NOT_IMPLEMENTED");
      return true;
    });
  }
  assert.equal(parseProviderId("whatsapp"), "WHATSAPP_CLOUD");
  assert.throws(() => getProvider("UNKNOWN_VENDOR"), IntegrationError);
});

test("state machine allows documented transitions and rejects DISCONNECTED → CONNECTED", () => {
  assert.equal(canTransition("NOT_CONNECTED", "CONNECTING"), true);
  assert.equal(canTransition("CONNECTING", "CONNECTED"), true);
  assert.equal(canTransition("CONNECTING", "ERROR"), true);
  assert.equal(canTransition("CONNECTED", "ACTION_REQUIRED"), true);
  assert.equal(canTransition("CONNECTED", "ERROR"), true);
  assert.equal(canTransition("CONNECTED", "DISCONNECTED"), true);
  assert.throws(() => assertTransition("DISCONNECTED", "CONNECTED"), IntegrationError);
});

test("clinic A cannot read clinic B integrations", async () => {
  const own = await app.request("/api/v1/integrations", { headers: cookie(fixture.tokenA) });
  const body = await json(own);
  const rows = body["data"] as { clinicId: string; provider: string }[];
  assert.equal(rows.every((row) => row.clinicId === fixture.clinicAId), true);
  assert.equal(rows.some((row) => row.clinicId === fixture.clinicBId), false);
  assert.equal(secretKeysPresent(body), false);
});

test("organization B cannot access organization A integration by provider", async () => {
  const res = await app.request("/api/v1/integrations/WHATSAPP", { headers: cookie(fixture.tokenB) });
  assert.equal(res.status, 200);
  const body = await json(res);
  const data = body["data"] as { connectionStatus: string; clinicId: string };
  assert.equal(data.clinicId, fixture.clinicBId);
  assert.equal(data.connectionStatus, "NOT_CONNECTED");
});

test("connect and disconnect stubs do not fake success", async () => {
  const connect = await app.request("/api/v1/integrations/META_ADS/connect", {
    method: "POST",
    headers: cookie(fixture.tokenA),
  });
  assert.equal(connect.status, 501);
  const connectBody = await json(connect);
  assert.equal((connectBody["error"] as { code: string })["code"], "PROVIDER_NOT_IMPLEMENTED");

  const disconnect = await app.request("/api/v1/integrations/WHATSAPP/disconnect", {
    method: "POST",
    headers: cookie(fixture.tokenA),
  });
  assert.equal(disconnect.status, 501);
  const still = await prisma.integration.findUnique({ where: { id: fixture.integrationAId } });
  assert.equal(still?.status, "ACTIVE");
  assert.equal(Boolean(still?.encryptedCredentials), true);
});

test("oauth routes are not implemented and do not redirect", async () => {
  const start = await app.request("/api/v1/integrations/WHATSAPP/oauth/start", { headers: cookie(fixture.tokenA) });
  assert.equal(start.status, 501);
  const callback = await app.request("/api/v1/integrations/WHATSAPP/oauth/callback?code=anything");
  assert.equal(callback.status, 501);
});

test("mock provider connect encrypts credentials and redacts them from APIs", async () => {
  registerProviderForTests({ ...mockIntegrationProvider, id: "META_ADS", displayName: "Mock Meta" });
  const connected = await integrationService.createConnection(fixture.ctxA, "META_ADS");
  assert.equal(connected.connectionStatus, "CONNECTED");
  assert.equal(secretKeysPresent(connected), false);

  const stored = await prisma.integration.findUnique({
    where: { clinicId_provider: { clinicId: fixture.clinicAId, provider: "META_ADS" } },
  });
  assert.equal(Boolean(stored?.encryptedCredentials), true);
  assert.equal(stored?.encryptedCredentials?.includes("mock-access-token"), false);
  const decrypted = credentialService.decrypt(stored?.encryptedCredentials);
  assert.equal(decrypted.accessToken, "mock-access-token");

  const api = await app.request("/api/v1/integrations/META_ADS", { headers: cookie(fixture.tokenA) });
  const apiBody = await json(api);
  assert.equal(secretKeysPresent(apiBody), false);

  const admin = await app.request("/api/v1/admin/integrations", { headers: cookie(fixture.tokenPlatform) });
  const adminBody = await json(admin);
  assert.equal(secretKeysPresent(adminBody), false);

  await writeAuditLog({
    actorId: fixture.ctxA.userId,
    organizationId: fixture.orgAId,
    clinicId: fixture.clinicAId,
    action: "integration.connect.test",
    metadata: { accessToken: "should-strip", provider: "META_ADS" },
  });
  const logs = await prisma.auditLog.findMany({
    where: { clinicId: fixture.clinicAId, action: "integration.connect.test" },
  });
  const metadata = logs[0]?.metadata as Record<string, unknown> | null;
  assert.equal(metadata ? "accessToken" in metadata : false, false);
  resetProviderRegistryForTests();
});

test("invalid encryption key fails safely", () => {
  assert.throws(() => parseIntegrationEncryptionKey("short", "development"), IntegrationError);
  const original = process.env["INTEGRATION_ENCRYPTION_KEY"];
  const ciphertext = encryptString(JSON.stringify({ accessToken: "x" }));
  process.env["INTEGRATION_ENCRYPTION_KEY"] = "ff".repeat(32);
  assert.throws(() => credentialService.decrypt(ciphertext), IntegrationError);
  process.env["INTEGRATION_ENCRYPTION_KEY"] = original;
});

test("webhook unknown provider, missing id, invalid signature, duplicate, and isolation", async () => {
  registerProviderForTests(mockIntegrationProvider);
  const unknown = await app.request("/api/v1/webhooks/not-a-provider", {
    method: "POST",
    body: "{}",
  });
  assert.equal(unknown.status, 422);

  const missingSignedBody = JSON.stringify({ type: "message" });
  const missingRes = await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: { "x-smrkomed-mock-signature": mockWebhookSignature(missingSignedBody), "content-type": "application/json" },
    body: missingSignedBody,
  });
  assert.equal(missingRes.status, 400);

  const unsigned = await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    body: JSON.stringify({ id: "evt_1", type: "message", account: "mock_account_001" }),
  });
  assert.equal(unsigned.status, 401);

  const payload = JSON.stringify({
    id: "evt_123",
    type: "message",
    account: "mock_account_001",
    clinicId: fixture.clinicBId,
  });
  const headers = { "x-smrkomed-mock-signature": mockWebhookSignature(payload), "content-type": "application/json" };
  const first = await app.request("/api/v1/webhooks/whatsapp", { method: "POST", headers, body: payload });
  assert.equal(first.status, 200);
  const firstBody = await json(first);
  const event = (firstBody["data"] as { event: { clinicId: string; organizationId: string } })["event"];
  assert.equal(event.clinicId, fixture.clinicAId);
  assert.equal(event.organizationId, fixture.orgAId);

  const second = await app.request("/api/v1/webhooks/whatsapp", { method: "POST", headers, body: payload });
  assert.equal(second.status, 200);
  const secondBody = await json(second);
  assert.equal((secondBody["data"] as { duplicate: boolean })["duplicate"], true);

  const unknownAccount = JSON.stringify({ id: "evt_other", type: "message", account: "someone_else" });
  const unknownRes = await app.request("/api/v1/webhooks/whatsapp", {
    method: "POST",
    headers: { "x-smrkomed-mock-signature": mockWebhookSignature(unknownAccount), "content-type": "application/json" },
    body: unknownAccount,
  });
  assert.equal(unknownRes.status, 404);

  const listed = await app.request("/api/v1/admin/integration-events?clinicId=" + fixture.clinicAId, {
    headers: cookie(fixture.tokenPlatform),
  });
  assert.equal(listed.status, 200);
  const listedBody = await json(listed);
  assert.equal(secretKeysPresent(listedBody), false);
  assert.equal(JSON.stringify(listedBody).includes("encryptedPayload"), false);

  const forbidden = await app.request("/api/v1/admin/integration-events", { headers: cookie(fixture.tokenA) });
  assert.equal(forbidden.status, 403);
  resetProviderRegistryForTests();
});

test("platform admin can list all integrations; clinic cannot use admin routes", async () => {
  const res = await app.request("/api/v1/admin/integrations?page=1&pageSize=100", { headers: cookie(fixture.tokenPlatform) });
  assert.equal(res.status, 200);
  const body = await json(res);
  const items = (body["data"] as { items: { clinicId: string }[] }).items;
  assert.equal(items.some((row) => row.clinicId === fixture.clinicAId), true);
  const clinicAdmin = await app.request("/api/v1/admin/integrations", { headers: cookie(fixture.tokenA) });
  assert.equal(clinicAdmin.status, 403);
});

test("admin disconnect remains not implemented", async () => {
  const res = await app.request(`/api/v1/admin/integrations/${fixture.integrationAId}/disconnect`, {
    method: "POST",
    headers: cookie(fixture.tokenPlatform),
  });
  assert.equal(res.status, 501);
});

test("status endpoint does not mark lastSyncAt on read", async () => {
  const before = await prisma.integration.findUnique({ where: { id: fixture.integrationAId } });
  const res = await app.request("/api/v1/integrations/WHATSAPP/status", { headers: cookie(fixture.tokenA) });
  assert.equal(res.status, 200);
  const after = await prisma.integration.findUnique({ where: { id: fixture.integrationAId } });
  assert.equal(after?.lastSyncAt?.toISOString() ?? null, before?.lastSyncAt?.toISOString() ?? null);
  const body = await json(res);
  assert.equal((body["data"] as { connectionStatus: string }).connectionStatus, "CONNECTED");
});
