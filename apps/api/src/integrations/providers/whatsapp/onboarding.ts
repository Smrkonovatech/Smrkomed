import { prisma, writeAuditLog, type TenantContext } from "@smrkomed/database";

import { IntegrationError } from "../../core/errors";
import { SAFE_INTEGRATION_SELECT, serializeIntegration } from "../../core/serializer";
import { canTransition } from "../../core/status";
import { credentialService } from "../../credentials/service";
import { integrationService } from "../../services/integration-service";
import { isDirectMetaConfigured, isMetaConfigured, isWhatsAppDemoMode, metaConfig } from "./config";
import { exchangeEmbeddedSignupCode, getPhoneNumber, getWaba, listWabaPhones, subscribeWaba } from "./graph";
import { consumeWhatsAppOauthState, createWhatsAppOauthState, loadValidWhatsAppOauthState } from "./oauth-state";
import { maskPhone } from "./phone";
import { ensureDirectWhatsAppConnection, verifyMetaWhatsAppConnection } from "./service";

export async function startWhatsAppConnect(ctx: TenantContext) {
  if (isWhatsAppDemoMode()) {
    const state = await createWhatsAppOauthState({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      clinicId: ctx.clinicId,
    });
    await writeAuditLog({
      actorId: ctx.userId,
      organizationId: ctx.organizationId,
      clinicId: ctx.clinicId,
      action: "whatsapp.connect.demo_start",
      entityType: "Integration",
      entityId: "WHATSAPP_CLOUD",
      metadata: { demo: true },
    });
    return {
      demo: true as const,
      state: state.id,
      message:
        "DEMO MODE: Meta credentials are not configured. You can simulate Embedded Signup locally. This is not a real Meta connection.",
    };
  }

  const cfg = metaConfig();

  // If Embedded Signup configuration ID is configured, support Embedded Signup flow
  if (cfg.configId && cfg.appId) {
    const current = await integrationService.getConnection(ctx, "WHATSAPP_CLOUD");
    if (canTransition(current.connectionStatus, "CONNECTING") && current.connectionStatus !== "CONNECTING") {
      await integrationService.updateConnectionStatus(ctx, "WHATSAPP_CLOUD", "CONNECTING").catch(() => undefined);
    }
    const state = await createWhatsAppOauthState({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      clinicId: ctx.clinicId,
    });
    await writeAuditLog({
      actorId: ctx.userId,
      organizationId: ctx.organizationId,
      clinicId: ctx.clinicId,
      action: "whatsapp.connect.attempt",
      entityType: "Integration",
      entityId: "WHATSAPP_CLOUD",
      metadata: { provider: "WHATSAPP_CLOUD" },
    });
    return {
      demo: false as const,
      state: state.id,
      appId: cfg.appId,
      configId: cfg.configId,
      graphVersion: cfg.graphVersion,
      expiresAt: state.expiresAt,
    };
  }

  if (isDirectMetaConfigured()) {
    await ensureDirectWhatsAppConnection(ctx);
    await writeAuditLog({
      actorId: ctx.userId,
      organizationId: ctx.organizationId,
      clinicId: ctx.clinicId,
      action: "whatsapp.connect.direct",
      entityType: "Integration",
      entityId: "WHATSAPP_CLOUD",
      metadata: { direct: true },
    });
    return {
      demo: false as const,
      direct: true as const,
      state: "direct_connected",
      phoneNumber: cfg.directDisplayPhoneNumber,
      message: "Direct Meta WhatsApp connection is active.",
    };
  }

  throw new IntegrationError(
    "PROVIDER_UNAVAILABLE",
    "WhatsApp Embedded Signup is not configured. Ask your SmrkoMed administrator to set META_APP_ID, META_APP_SECRET, WHATSAPP_CONFIGURATION_ID, and WHATSAPP_VERIFY_TOKEN — or enable WHATSAPP_DEMO_MODE for local testing.",
    501,
  );
}

/** Simulated Embedded Signup completion for development only. Never invents production Meta assets. */
export async function completeWhatsAppDemoConnect(
  ctx: TenantContext,
  input: { state: string; phoneLabel?: string },
) {
  if (!isWhatsAppDemoMode()) {
    throw new IntegrationError("PROVIDER_UNAVAILABLE", "Demo WhatsApp connect is not enabled.", 403);
  }
  const oauth = await loadValidWhatsAppOauthState(input.state, ctx);
  const phoneNumberId = `demo_phone_${oauth.clinicId.slice(-8)}`;
  const wabaId = `demo_waba_${oauth.organizationId.slice(-8)}`;
  const displayPhoneNumber = input.phoneLabel ?? "+91 ••••• ••000";
  const displayName = "Demo Clinic WhatsApp";
  const encrypted = credentialService.encrypt({
    accessToken: "demo_token_not_valid_for_graph",
    systemUserToken: "demo_token_not_valid_for_graph",
  });

  const integration = await prisma.integration.upsert({
    where: { clinicId_provider: { clinicId: oauth.clinicId, provider: "WHATSAPP_CLOUD" } },
    create: {
      organizationId: oauth.organizationId,
      clinicId: oauth.clinicId,
      provider: "WHATSAPP_CLOUD",
      status: "ACTIVE",
      displayName: `${displayName} (DEMO)`,
      externalAccountId: wabaId,
      encryptedCredentials: encrypted,
      lastError: null,
      lastErrorCode: null,
      lastSyncAt: new Date(),
    },
    update: {
      status: "ACTIVE",
      displayName: `${displayName} (DEMO)`,
      externalAccountId: wabaId,
      encryptedCredentials: encrypted,
      lastError: null,
      lastErrorCode: null,
      lastSyncAt: new Date(),
    },
    select: SAFE_INTEGRATION_SELECT,
  });

  await prisma.whatsAppAccount.upsert({
    where: { clinicId_phoneNumberId: { clinicId: oauth.clinicId, phoneNumberId } },
    create: {
      clinicId: oauth.clinicId,
      integrationId: integration.id,
      phoneNumberId,
      businessAccountId: wabaId,
      displayName: `${displayName} (DEMO)`,
      displayPhoneNumber,
      verifiedName: "DEMO / SIMULATED",
      qualityRating: "UNKNOWN",
      isActive: true,
      lastSyncedAt: new Date(),
    },
    update: {
      integrationId: integration.id,
      businessAccountId: wabaId,
      displayName: `${displayName} (DEMO)`,
      displayPhoneNumber,
      verifiedName: "DEMO / SIMULATED",
      isActive: true,
      lastSyncedAt: new Date(),
    },
  });

  await consumeWhatsAppOauthState(oauth.id);
  await writeAuditLog({
    actorId: ctx.userId,
    organizationId: ctx.organizationId,
    clinicId: ctx.clinicId,
    action: "whatsapp.connect.demo_success",
    entityType: "Integration",
    entityId: integration.id,
    metadata: { demo: true },
  });
  return {
    needsSelection: false as const,
    demo: true as const,
    integration: serializeIntegration(integration),
  };
}

async function resolveAccessToken(
  ctx: TenantContext,
  oauthClinicId: string,
  input: { code?: string },
) {
  if (input.code) {
    const tokenJson = await exchangeEmbeddedSignupCode(input.code);
    const accessToken = typeof tokenJson["access_token"] === "string" ? tokenJson["access_token"] : "";
    if (!accessToken) {
      await writeAuditLog({
        actorId: ctx.userId,
        organizationId: ctx.organizationId,
        clinicId: ctx.clinicId,
        action: "whatsapp.connect.failure",
        entityType: "Integration",
        metadata: { reason: "token_exchange" },
      });
      throw new IntegrationError("AUTHORIZATION_FAILED", "WhatsApp authorization did not return an access token.", 401);
    }
    return accessToken;
  }
  const pending = await prisma.integration.findUnique({
    where: { clinicId_provider: { clinicId: oauthClinicId, provider: "WHATSAPP_CLOUD" } },
  });
  if (!pending || pending.status !== "PENDING" || !pending.encryptedCredentials) {
    throw new IntegrationError("AUTHORIZATION_FAILED", "WhatsApp connection state is not ready for account selection.", 401);
  }
  const token = credentialService.decrypt(pending.encryptedCredentials).accessToken
    ?? credentialService.decrypt(pending.encryptedCredentials).systemUserToken;
  if (!token) {
    throw new IntegrationError("AUTHORIZATION_FAILED", "WhatsApp authorization requires attention.", 401);
  }
  return token;
}

export async function completeWhatsAppConnect(
  ctx: TenantContext,
  input: { state: string; code?: string; wabaId?: string; phoneNumberId?: string },
) {
  const oauth = await loadValidWhatsAppOauthState(input.state, ctx);
  const accessToken = await resolveAccessToken(ctx, oauth.clinicId, input);

  let wabaId = input.wabaId ?? "";
  let phoneNumberId = input.phoneNumberId ?? "";
  if (!wabaId) {
    const pending = await prisma.integration.findUnique({
      where: { clinicId_provider: { clinicId: oauth.clinicId, provider: "WHATSAPP_CLOUD" } },
      select: { externalAccountId: true, status: true },
    });
    wabaId = pending?.externalAccountId ?? "";
  }
  if (!wabaId) {
    throw new IntegrationError("AUTHORIZATION_FAILED", "WhatsApp Business Account was not returned by Meta.", 422);
  }

  if (!phoneNumberId) {
    const phones = await listWabaPhones(wabaId, accessToken);
    const data = Array.isArray(phones["data"])
      ? (phones["data"] as Array<{ id?: string; display_phone_number?: string }>)
      : [];
    if (data.length === 1 && data[0]?.id) {
      phoneNumberId = data[0].id;
    } else if (data.length > 1) {
      await prisma.integration.upsert({
        where: { clinicId_provider: { clinicId: oauth.clinicId, provider: "WHATSAPP_CLOUD" } },
        create: {
          organizationId: oauth.organizationId,
          clinicId: oauth.clinicId,
          provider: "WHATSAPP_CLOUD",
          status: "PENDING",
          displayName: "WhatsApp",
          externalAccountId: wabaId,
          encryptedCredentials: credentialService.encrypt({ accessToken, systemUserToken: accessToken }),
        },
        update: {
          status: "PENDING",
          externalAccountId: wabaId,
          encryptedCredentials: credentialService.encrypt({ accessToken, systemUserToken: accessToken }),
        },
      });
      return {
        needsSelection: true as const,
        demo: false as const,
        wabaId,
        state: input.state,
        phones: data.map((row) => ({
          id: row.id ?? "",
          displayPhoneNumber: maskPhone(row.display_phone_number ?? null),
        })),
      };
    } else {
      throw new IntegrationError("PHONE_NOT_REGISTERED", "No WhatsApp phone number is available on this account.", 422);
    }
  }

  const existingPhone = await prisma.whatsAppAccount.findFirst({
    where: { phoneNumberId, isActive: true, clinicId: { not: oauth.clinicId } },
  });
  if (existingPhone) {
    throw new IntegrationError("CONNECTION_CONFLICT", "This WhatsApp number is already connected to another clinic.", 409);
  }

  await subscribeWaba(wabaId, accessToken);
  const [waba, phone] = await Promise.all([getWaba(wabaId, accessToken), getPhoneNumber(phoneNumberId, accessToken)]);
  const displayName = typeof waba["name"] === "string" ? waba["name"] : "WhatsApp Business";
  const displayPhoneNumber = typeof phone["display_phone_number"] === "string" ? phone["display_phone_number"] : null;
  const verifiedName = typeof phone["verified_name"] === "string" ? phone["verified_name"] : null;
  const qualityRating = typeof phone["quality_rating"] === "string" ? phone["quality_rating"] : null;
  const encrypted = credentialService.encrypt({ accessToken, systemUserToken: accessToken });

  const integration = await prisma.integration.upsert({
    where: { clinicId_provider: { clinicId: oauth.clinicId, provider: "WHATSAPP_CLOUD" } },
    create: {
      organizationId: oauth.organizationId,
      clinicId: oauth.clinicId,
      provider: "WHATSAPP_CLOUD",
      status: "ACTIVE",
      displayName,
      externalAccountId: wabaId,
      encryptedCredentials: encrypted,
      lastError: null,
      lastErrorCode: null,
      lastSyncAt: new Date(),
    },
    update: {
      status: "ACTIVE",
      displayName,
      externalAccountId: wabaId,
      encryptedCredentials: encrypted,
      lastError: null,
      lastErrorCode: null,
      lastSyncAt: new Date(),
    },
    select: SAFE_INTEGRATION_SELECT,
  });

  await prisma.whatsAppAccount.upsert({
    where: { clinicId_phoneNumberId: { clinicId: oauth.clinicId, phoneNumberId } },
    create: {
      clinicId: oauth.clinicId,
      integrationId: integration.id,
      phoneNumberId,
      businessAccountId: wabaId,
      displayName,
      displayPhoneNumber,
      verifiedName,
      qualityRating,
      isActive: true,
      lastSyncedAt: new Date(),
    },
    update: {
      integrationId: integration.id,
      businessAccountId: wabaId,
      displayName,
      displayPhoneNumber,
      verifiedName,
      qualityRating,
      isActive: true,
      lastSyncedAt: new Date(),
    },
  });

  await prisma.whatsAppAccount.updateMany({
    where: { clinicId: oauth.clinicId, phoneNumberId: { not: phoneNumberId } },
    data: { isActive: false },
  });

  await consumeWhatsAppOauthState(oauth.id);
  await writeAuditLog({
    actorId: ctx.userId,
    organizationId: ctx.organizationId,
    clinicId: ctx.clinicId,
    action: "whatsapp.connect.success",
    entityType: "Integration",
    entityId: integration.id,
    metadata: { provider: "WHATSAPP_CLOUD", connectionStatus: "CONNECTED" },
  });
  return { needsSelection: false as const, demo: false as const, integration: serializeIntegration(integration) };
}

export async function testWhatsAppConnection(ctx: TenantContext) {
  if (isDirectMetaConfigured()) {
    const metaResult = await verifyMetaWhatsAppConnection(ctx);
    const lastWebhook = await prisma.integrationEvent.findFirst({
      where: { clinicId: ctx.clinicId, provider: "WHATSAPP_CLOUD" },
      orderBy: { receivedAt: "desc" },
      select: { receivedAt: true },
    });
    const templates = await prisma.whatsAppTemplate.count({
      where: { clinicId: ctx.clinicId, status: "APPROVED" },
    });

    const checks = [
      ...metaResult.checks,
      {
        id: "webhook",
        label: "Webhooks",
        ok: true,
        detail: lastWebhook
          ? `Last event ${lastWebhook.receivedAt.toISOString()}`
          : "Webhook endpoint ready. Waiting for incoming events.",
      },
      {
        id: "templates",
        label: "Template availability",
        ok: templates > 0,
        detail:
          templates > 0
            ? `${templates} approved template(s) synced`
            : "No approved templates yet — click 'Sync from Meta'",
      },
    ];

    const healthy = metaResult.connected;
    return {
      healthy,
      demo: false,
      direct: true,
      checkedAt: new Date().toISOString(),
      summary: healthy
        ? "WhatsApp Connection Healthy"
        : "WhatsApp connection check requires attention.",
      checks,
    };
  }

  const status = await integrationService.getConnection(ctx, "WHATSAPP_CLOUD");
  const account = await prisma.whatsAppAccount.findFirst({
    where: { clinicId: ctx.clinicId, isActive: true },
  });
  const lastWebhook = await prisma.integrationEvent.findFirst({
    where: { clinicId: ctx.clinicId, provider: "WHATSAPP_CLOUD" },
    orderBy: { receivedAt: "desc" },
    select: { receivedAt: true },
  });
  const templates = await prisma.whatsAppTemplate.count({
    where: { clinicId: ctx.clinicId, status: "APPROVED" },
  });
  const demo =
    account?.verifiedName === "DEMO / SIMULATED" ||
    (status.displayName ?? "").includes("(DEMO)");

  const checks = [
    {
      id: "meta",
      label: "Meta connection",
      ok: isMetaConfigured() || demo,
      detail: demo
        ? "DEMO / SIMULATED — not a live Meta App connection"
        : isMetaConfigured()
          ? "Platform Meta App is configured"
          : "Platform Meta App credentials are missing",
    },
    {
      id: "business",
      label: "Business account",
      ok: Boolean(account?.businessAccountId) && status.connectionStatus === "CONNECTED",
      detail: account?.businessAccountId ? "WhatsApp Business Account linked" : "No WABA linked",
    },
    {
      id: "phone",
      label: "Phone number",
      ok: Boolean(account?.phoneNumberId && account.isActive),
      detail: account?.displayPhoneNumber
        ? `Active number ${maskPhone(account.displayPhoneNumber)}`
        : "No active phone number",
    },
    {
      id: "webhook",
      label: "Webhooks",
      ok: Boolean(isMetaConfigured() || demo),
      detail: lastWebhook
        ? `Last event ${lastWebhook.receivedAt.toISOString()}`
        : demo
          ? "DEMO — webhook events not received from Meta"
          : "Waiting for first webhook event",
    },
    {
      id: "messaging",
      label: "Messaging capability",
      ok: status.connectionStatus === "CONNECTED" && Boolean(account),
      detail:
        status.connectionStatus === "CONNECTED"
          ? demo
            ? "DEMO — Graph sends are not live"
            : "Ready to send approved templates"
          : "Connect WhatsApp to enable messaging",
    },
    {
      id: "templates",
      label: "Template availability",
      ok: templates > 0 || demo,
      detail:
        templates > 0
          ? `${templates} approved template(s)`
          : demo
            ? "DEMO — sync templates after live connect"
            : "No approved templates yet — sync from Meta",
    },
  ];

  const healthy = checks.every((c) => c.ok);
  return {
    healthy,
    demo,
    checkedAt: new Date().toISOString(),
    summary: healthy
      ? demo
        ? "Demo WhatsApp connection looks ready for local testing."
        : "WhatsApp Connection Healthy"
      : "Action Required",
    checks,
  };
}

export function publicWhatsAppAccount(row: {
  displayName: string | null;
  displayPhoneNumber: string | null;
  businessAccountId: string | null;
  phoneNumberId: string;
  qualityRating: string | null;
  isActive: boolean;
  lastSyncedAt: Date | null;
  verifiedName: string | null;
}) {
  return {
    displayName: row.displayName,
    verifiedName: row.verifiedName,
    displayPhoneNumber: maskPhone(row.displayPhoneNumber),
    businessAccountId: row.businessAccountId ? `••••${row.businessAccountId.slice(-4)}` : null,
    phoneNumberId: `••••${row.phoneNumberId.slice(-4)}`,
    qualityRating: row.qualityRating,
    isActive: row.isActive,
    lastSyncedAt: row.lastSyncedAt,
    connectionStatus: row.isActive ? ("CONNECTED" as const) : ("DISCONNECTED" as const),
    demo: row.verifiedName === "DEMO / SIMULATED",
  };
}
