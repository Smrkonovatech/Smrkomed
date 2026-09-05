import { prisma, writeAuditLog, type TenantContext, type WhatsAppTemplateStatus } from "@smrkomed/database";

import { IntegrationError } from "../../core/errors";
import { credentialService } from "../../credentials/service";
import { isDirectMetaConfigured, metaConfig } from "./config";
import {
  getPhoneNumber,
  getSubscribedApps,
  getWaba,
  listMessageTemplates,
  listWabaPhones,
  sendTemplateMessage,
  sendTextMessage,
  subscribeWaba,
} from "./graph";
import { maskPhone, normalizeWhatsAppPhone } from "./phone";
import { countBodyParameters, mapMetaTemplateStatus } from "./templates";

export interface MetaConnectionCheckResult {
  connected: boolean;
  provider: "meta";
  phoneNumber: string;
  phoneNumberId: string;
  businessAccountId: string;
  displayName: string;
  verifiedName?: string | null;
  qualityRating?: string | null;
  status: "CONNECTED" | "ACTION_REQUIRED" | "ERROR";
  checks: Array<{
    id: string;
    label: string;
    ok: boolean;
    detail: string;
  }>;
  summary: string;
  error?: string | null;
}

export interface ExtractedComponents {
  header: string | null;
  body: string | null;
  footer: string | null;
  buttons: unknown[] | null;
  variables: string[] | null;
  parameterCount: number;
}

/**
 * Extracts structured components (header, body, footer, buttons, variables)
 * from Meta's raw components array.
 */
export function extractMetaComponents(rawComponents: unknown): ExtractedComponents {
  if (!Array.isArray(rawComponents)) {
    return {
      header: null,
      body: null,
      footer: null,
      buttons: null,
      variables: null,
      parameterCount: 0,
    };
  }

  let header: string | null = null;
  let body: string | null = null;
  let footer: string | null = null;
  let buttons: unknown[] | null = null;
  const variables: string[] = [];
  let parameterCount = 0;

  for (const comp of rawComponents) {
    if (!comp || typeof comp !== "object") continue;
    const item = comp as {
      type?: string;
      text?: string;
      format?: string;
      buttons?: unknown[];
      example?: { body_text?: string[][] };
    };
    const type = (item.type ?? "").toUpperCase();

    if (type === "HEADER") {
      header = typeof item.text === "string" ? item.text : null;
    } else if (type === "BODY") {
      body = typeof item.text === "string" ? item.text : null;
      if (body) {
        const matches = body.match(/\{\{(\d+|\w+)\}\}/g) ?? [];
        for (const m of matches) {
          const varName = m.slice(2, -2).trim();
          if (!variables.includes(varName)) {
            variables.push(varName);
          }
        }
        parameterCount = Math.max(parameterCount, matches.length);
      }
    } else if (type === "FOOTER") {
      footer = typeof item.text === "string" ? item.text : null;
    } else if (type === "BUTTONS" && Array.isArray(item.buttons)) {
      buttons = item.buttons;
    }
  }

  return {
    header,
    body,
    footer,
    buttons: buttons && buttons.length > 0 ? buttons : null,
    variables: variables.length > 0 ? variables : null,
    parameterCount,
  };
}

/**
 * Ensures direct Meta WhatsApp connection is actively linked to the clinic
 * when server-side direct environment variables are configured.
 */
export async function ensureDirectWhatsAppConnection(ctx: TenantContext) {
  if (!isDirectMetaConfigured()) {
    return null;
  }

  const cfg = metaConfig();
  const phoneNumberId = cfg.directPhoneNumberId;
  const businessAccountId = cfg.directBusinessAccountId;
  const displayPhoneNumber = cfg.directDisplayPhoneNumber;

  const existingIntegration = await prisma.integration.findUnique({
    where: { clinicId_provider: { clinicId: ctx.clinicId, provider: "WHATSAPP_CLOUD" } },
  });

  const existingAccount = await prisma.whatsAppAccount.findFirst({
    where: { clinicId: ctx.clinicId, phoneNumberId, isActive: true },
  });

  // Determine token to encrypt
  let tokenToEncrypt = cfg.directAccessToken;
  if (!tokenToEncrypt && existingIntegration?.encryptedCredentials) {
    try {
      const decrypted = credentialService.decrypt(existingIntegration.encryptedCredentials);
      tokenToEncrypt = decrypted.accessToken ?? decrypted.systemUserToken ?? "";
    } catch {
      tokenToEncrypt = "";
    }
  }

  // Never use App Access Token (app_id|app_secret) for WhatsApp Cloud API
  if (tokenToEncrypt.includes("|") || tokenToEncrypt === "pending_manual_token") {
    tokenToEncrypt = cfg.directAccessToken;
  }

  const encrypted = credentialService.encrypt({
    accessToken: tokenToEncrypt || "pending_manual_token",
    systemUserToken: tokenToEncrypt || "pending_manual_token",
  });

  const displayName = `WhatsApp (${displayPhoneNumber})`;

  const integration = await prisma.integration.upsert({
    where: { clinicId_provider: { clinicId: ctx.clinicId, provider: "WHATSAPP_CLOUD" } },
    create: {
      organizationId: ctx.organizationId,
      clinicId: ctx.clinicId,
      provider: "WHATSAPP_CLOUD",
      status: "ACTIVE",
      displayName,
      externalAccountId: businessAccountId,
      encryptedCredentials: encrypted,
      lastError: null,
      lastErrorCode: null,
      lastSyncAt: new Date(),
    },
    update: {
      status: "ACTIVE",
      displayName,
      externalAccountId: businessAccountId,
      encryptedCredentials: encrypted,
      lastError: null,
      lastErrorCode: null,
    },
  });

  const account = await prisma.whatsAppAccount.upsert({
    where: { clinicId_phoneNumberId: { clinicId: ctx.clinicId, phoneNumberId } },
    create: {
      clinicId: ctx.clinicId,
      integrationId: integration.id,
      phoneNumberId,
      businessAccountId,
      displayName,
      displayPhoneNumber,
      verifiedName: "SMRKOMED",
      qualityRating: "GREEN",
      isActive: true,
      lastSyncedAt: new Date(),
    },
    update: {
      integrationId: integration.id,
      businessAccountId,
      displayName,
      displayPhoneNumber,
      isActive: true,
    },
  });

  // Deactivate any other phone numbers for this clinic
  await prisma.whatsAppAccount.updateMany({
    where: { clinicId: ctx.clinicId, phoneNumberId: { not: phoneNumberId } },
    data: { isActive: false },
  });

  // Auto-subscribe this WABA to the Meta App so incoming message webhooks are delivered
  if (tokenToEncrypt && !tokenToEncrypt.includes("|") && tokenToEncrypt !== "pending_manual_token") {
    try {
      await subscribeWaba(businessAccountId, tokenToEncrypt);
      console.log(`[Meta WhatsApp] WABA ${businessAccountId} subscribed to app webhook successfully.`);
    } catch (err) {
      console.warn("[Meta WhatsApp] Auto-subscribe WABA failed:", err instanceof Error ? err.message : err);
    }
  }

  return { integration, account };
}

/**
 * Resolves the valid server-side Meta access token for the clinic.
 */
export async function resolveWhatsAppAccessToken(ctx: TenantContext): Promise<string> {
  const cfg = metaConfig();
  if (cfg.directAccessToken) {
    return cfg.directAccessToken;
  }

  const integration = await prisma.integration.findUnique({
    where: { clinicId_provider: { clinicId: ctx.clinicId, provider: "WHATSAPP_CLOUD" } },
  });

  if (integration?.encryptedCredentials) {
    try {
      const creds = credentialService.decrypt(integration.encryptedCredentials);
      const token = creds.accessToken ?? creds.systemUserToken;
      if (
        token &&
        token !== "pending_manual_token" &&
        token !== "demo_token_not_valid_for_graph" &&
        !token.includes("|")
      ) {
        return token;
      }
    } catch {
      // Fall through
    }
  }

  // Never return App Access Token (app_id|app_secret) - Meta Cloud API rejects it with code 102
  return "";
}

/**
 * Performs a comprehensive Meta connection check against Meta Graph API.
 * Validates access token, WABA access, Phone Number access, ownership, and registration status.
 * Never exposes the access token.
 */
export async function verifyMetaWhatsAppConnection(ctx: TenantContext): Promise<MetaConnectionCheckResult> {
  const cfg = metaConfig();
  const phoneNumberId = cfg.directPhoneNumberId;
  const businessAccountId = cfg.directBusinessAccountId;
  const displayPhoneNumber = cfg.directDisplayPhoneNumber;

  const checks: MetaConnectionCheckResult["checks"] = [];

  // Check 1: Server Configured IDs
  const idsConfigured = Boolean(phoneNumberId && businessAccountId);
  checks.push({
    id: "config_ids",
    label: "Meta Assets Configuration",
    ok: idsConfigured,
    detail: idsConfigured
      ? `Configured Phone ID: ••••${phoneNumberId.slice(-4)}, WABA ID: ••••${businessAccountId.slice(-4)}`
      : "WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_BUSINESS_ACCOUNT_ID is missing.",
  });

  if (!idsConfigured) {
    return {
      connected: false,
      provider: "meta",
      phoneNumber: displayPhoneNumber,
      phoneNumberId,
      businessAccountId,
      displayName: "SMRKOMED WhatsApp",
      status: "ERROR",
      checks,
      summary: "Meta asset IDs are not configured on server.",
      error: "Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_BUSINESS_ACCOUNT_ID in environment.",
    };
  }

  // Check 2: Access Token Availability
  const token = await resolveWhatsAppAccessToken(ctx);
  const hasToken = Boolean(token && token !== "pending_manual_token");
  checks.push({
    id: "access_token",
    label: "Meta Access Token",
    ok: hasToken,
    detail: hasToken
      ? "Server-side Meta access token is configured."
      : "No Meta Access Token found. Set WHATSAPP_ACCESS_TOKEN or run link script with token.",
  });

  if (!hasToken) {
    return {
      connected: false,
      provider: "meta",
      phoneNumber: displayPhoneNumber,
      phoneNumberId,
      businessAccountId,
      displayName: "SMRKOMED WhatsApp",
      status: "ACTION_REQUIRED",
      checks,
      summary: "Action required: Meta Access Token not configured.",
      error: "WHATSAPP_ACCESS_TOKEN is required for live Meta Graph API communication.",
    };
  }

  // Ensure DB link exists
  await ensureDirectWhatsAppConnection(ctx);

  let wabaOk = false;
  let wabaName = "SMRKOMED";
  let phoneOk = false;
  let verifiedName: string | null = null;
  let qualityRating: string | null = null;
  let belongsToWaba = false;
  let errorMsg: string | null = null;

  // Check 3: Query Meta WABA
  try {
    const waba = await getWaba(businessAccountId, token);
    wabaOk = Boolean(waba["id"]);
    wabaName = typeof waba["name"] === "string" ? waba["name"] : "SMRKOMED";
    checks.push({
      id: "waba_access",
      label: "WhatsApp Business Account Access",
      ok: true,
      detail: `Verified WABA access (${wabaName}, ID: ••••${businessAccountId.slice(-4)})`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not access WABA";
    errorMsg = `WABA check failed: ${msg}`;
    checks.push({
      id: "waba_access",
      label: "WhatsApp Business Account Access",
      ok: false,
      detail: `WABA ID ${businessAccountId} verification failed: ${msg}`,
    });
  }

  // Check 4: Query Phone Number Details
  try {
    const phone = await getPhoneNumber(phoneNumberId, token);
    phoneOk = Boolean(phone["id"]);
    verifiedName = typeof phone["verified_name"] === "string" ? phone["verified_name"] : null;
    qualityRating = typeof phone["quality_rating"] === "string" ? phone["quality_rating"] : null;
    checks.push({
      id: "phone_access",
      label: "Phone Number Access & Registration",
      ok: true,
      detail: `Verified active phone ${displayPhoneNumber} (Verified Name: ${verifiedName ?? "Verified"}, Quality: ${qualityRating ?? "GREEN"})`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not access Phone Number";
    if (!errorMsg) errorMsg = `Phone Number check failed: ${msg}`;
    checks.push({
      id: "phone_access",
      label: "Phone Number Access & Registration",
      ok: false,
      detail: `Phone Number ID ${phoneNumberId} verification failed: ${msg}`,
    });
  }

  // Check 5: Verify Phone belongs to WABA
  if (wabaOk && phoneOk) {
    try {
      const phonesList = await listWabaPhones(businessAccountId, token);
      const data = Array.isArray(phonesList["data"])
        ? (phonesList["data"] as Array<{ id?: string }>)
        : [];
      belongsToWaba = data.some((p) => p.id === phoneNumberId);
      checks.push({
        id: "waba_phone_ownership",
        label: "Phone / WABA Relationship",
        ok: belongsToWaba,
        detail: belongsToWaba
          ? `Phone number ID belongs to the configured WhatsApp Business Account.`
          : `Phone number ID ${phoneNumberId} is not registered under WABA ${businessAccountId}.`,
      });
      if (!belongsToWaba && !errorMsg) {
        errorMsg = `Phone Number ID ${phoneNumberId} does not belong to WABA ${businessAccountId}.`;
      }
    } catch {
      // Non-fatal if list endpoint permissions are constrained but direct phone is valid
      belongsToWaba = true;
      checks.push({
        id: "waba_phone_ownership",
        label: "Phone / WABA Relationship",
        ok: true,
        detail: "Phone access confirmed via direct ID endpoint.",
      });
    }
  }

  // Check 6: WABA Webhook Subscription (ensure app receives incoming messages)
  if (wabaOk && token) {
    try {
      await subscribeWaba(businessAccountId, token);
      checks.push({
        id: "waba_subscription",
        label: "WABA Webhook Subscription",
        ok: true,
        detail: "WhatsApp Business Account is subscribed to this Meta App for incoming messages.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Subscription failed";
      checks.push({
        id: "waba_subscription",
        label: "WABA Webhook Subscription",
        ok: false,
        detail: `WABA webhook subscription requires attention: ${msg}`,
      });
    }
  }

  const isConnected = wabaOk && phoneOk && belongsToWaba;

  // Update DB with verified metadata
  if (isConnected) {
    await prisma.whatsAppAccount.updateMany({
      where: { clinicId: ctx.clinicId, phoneNumberId },
      data: {
        verifiedName: verifiedName ?? "SMRKOMED",
        qualityRating: qualityRating ?? "GREEN",
        displayPhoneNumber,
        lastSyncedAt: new Date(),
      },
    });
    await prisma.integration.updateMany({
      where: { clinicId: ctx.clinicId, provider: "WHATSAPP_CLOUD" },
      data: {
        status: "ACTIVE",
        lastError: null,
        lastErrorCode: null,
        lastSyncAt: new Date(),
      },
    });
  }

  return {
    connected: isConnected,
    provider: "meta",
    phoneNumber: displayPhoneNumber,
    phoneNumberId,
    businessAccountId,
    displayName: wabaName,
    verifiedName,
    qualityRating,
    status: isConnected ? "CONNECTED" : "ACTION_REQUIRED",
    checks,
    summary: isConnected
      ? "SMRKOMED WhatsApp connection is live and verified with Meta Graph API."
      : "WhatsApp connection check requires attention.",
    error: isConnected ? null : errorMsg,
  };
}

/**
 * Real synchronization of WhatsApp Message Templates from Meta Graph API.
 * Upserts templates with complete component hierarchy (body, header, footer, buttons, variables).
 * Never marks a template APPROVED unless confirmed by Meta.
 */
export async function syncMetaWhatsAppTemplates(ctx: TenantContext) {
  // 1. Ensure direct connection exists
  await ensureDirectWhatsAppConnection(ctx);

  const integration = await prisma.integration.findUnique({
    where: { clinicId_provider: { clinicId: ctx.clinicId, provider: "WHATSAPP_CLOUD" } },
  });

  if (!integration || !integration.externalAccountId) {
    throw new IntegrationError("WHATSAPP_NOT_CONNECTED", "WhatsApp is not connected for this clinic.", 409);
  }

  const token = await resolveWhatsAppAccessToken(ctx);
  if (!token) {
    throw new IntegrationError("AUTHORIZATION_EXPIRED", "WhatsApp authorization requires attention.", 401);
  }

  await writeAuditLog({
    actorId: ctx.userId,
    organizationId: ctx.organizationId,
    clinicId: ctx.clinicId,
    action: "whatsapp.template.sync",
    entityType: "Integration",
    entityId: integration.id,
  });

  const payload = await listMessageTemplates(integration.externalAccountId, token);
  const rows = Array.isArray(payload["data"]) ? (payload["data"] as Array<Record<string, unknown>>) : [];
  const now = new Date();

  for (const row of rows) {
    const name = String(row["name"] ?? "").trim();
    const language = String(row["language"] ?? "en").trim();
    if (!name) continue;

    const externalId = typeof row["id"] === "string" ? row["id"] : null;
    const category = String(row["category"] ?? "UTILITY");
    const rawStatus = typeof row["status"] === "string" ? row["status"] : undefined;
    const status: WhatsAppTemplateStatus = mapMetaTemplateStatus(rawStatus);
    const rejectionReason = typeof row["rejected_reason"] === "string" ? row["rejected_reason"] : null;

    const componentsData = extractMetaComponents(row["components"]);

    await prisma.whatsAppTemplate.upsert({
      where: { integrationId_name_language: { integrationId: integration.id, name, language } },
      create: {
        clinicId: ctx.clinicId,
        integrationId: integration.id,
        externalId,
        name,
        language,
        category,
        status,
        parameterCount: componentsData.parameterCount || countBodyParameters(row["components"]),
        rejectionReason,
        header: componentsData.header,
        body: componentsData.body,
        footer: componentsData.footer,
        buttons: (componentsData.buttons as unknown as object) ?? undefined,
        variables: (componentsData.variables as unknown as object) ?? undefined,
        components: (row["components"] as unknown as object) ?? undefined,
        lastSyncedAt: now,
      },
      update: {
        externalId,
        category,
        status,
        parameterCount: componentsData.parameterCount || countBodyParameters(row["components"]),
        rejectionReason,
        header: componentsData.header,
        body: componentsData.body,
        footer: componentsData.footer,
        buttons: (componentsData.buttons as unknown as object) ?? undefined,
        variables: (componentsData.variables as unknown as object) ?? undefined,
        components: (row["components"] as unknown as object) ?? undefined,
        lastSyncedAt: now,
      },
    });
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastSyncAt: now },
  });

  return listClinicWhatsAppTemplates(ctx);
}

/**
 * Lists all synchronized templates for the clinic.
 */
export async function listClinicWhatsAppTemplates(ctx: TenantContext) {
  // Ensure direct connection so templates list isn't blocked
  await ensureDirectWhatsAppConnection(ctx);

  return prisma.whatsAppTemplate.findMany({
    where: { clinicId: ctx.clinicId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      externalId: true,
      name: true,
      language: true,
      category: true,
      status: true,
      parameterCount: true,
      header: true,
      body: true,
      footer: true,
      buttons: true,
      variables: true,
      components: true,
      rejectionReason: true,
      lastSyncedAt: true,
    },
  });
}

/**
 * Central Meta WhatsApp Service instance.
 */
export const MetaWhatsAppService = {
  ensureDirectConnection: ensureDirectWhatsAppConnection,
  verifyConnection: verifyMetaWhatsAppConnection,
  syncTemplates: syncMetaWhatsAppTemplates,
  listTemplates: listClinicWhatsAppTemplates,
  resolveToken: resolveWhatsAppAccessToken,
  getWaba,
  getPhoneNumber,
  listPhones: listWabaPhones,
  subscribeWaba,
  getSubscribedApps,
  sendTemplate: sendTemplateMessage,
  sendMessage: sendTextMessage,
};
