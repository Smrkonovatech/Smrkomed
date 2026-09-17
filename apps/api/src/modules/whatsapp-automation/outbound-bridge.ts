import { createHmac } from "node:crypto";
import { prisma } from "@smrkomed/database";
import type { TenantContext } from "@smrkomed/database";

import { metaConfig } from "../../integrations/providers/whatsapp/config";
import { normalizeWhatsAppPhone } from "../../integrations/providers/whatsapp/phone";
import { resolveWhatsAppSenderCredentials } from "../../integrations/providers/whatsapp/service";
import { sendTextMessage, sendTemplateMessage } from "../../integrations/providers/whatsapp/graph";

async function clinicTenant(clinicId: string): Promise<TenantContext | null> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    include: { organization: true },
  });
  if (!clinic) return null;
  return {
    userId: "system-worker",
    role: "CLINIC_ADMIN",
    clinicId: clinic.id,
    organizationId: clinic.organizationId,
    clinicName: clinic.name,
    organizationName: clinic.organization.name,
  };
}

/**
 * Sweeps outbound WhatsApp messages marked as "pending_meta_*" and dispatches
 * them through Meta Graph API if this instance has valid Meta credentials.
 */
export async function processPendingOutboundMessages(limit = 25, clinicId?: string) {
  const cfg = metaConfig();
  // Proceed if this instance has any Meta configuration (token or app secret).
  // Per-message credential resolution (resolveWhatsAppSenderCredentials) handles
  // the actual token fetch — from env WHATSAPP_ACCESS_TOKEN or encrypted DB row.
  const hasMetaConfig = Boolean(cfg.directAccessToken || cfg.appSecret || cfg.appId);
  if (!hasMetaConfig) {
    return { dispatched: 0, skipped: true as const, reason: "no_meta_config" };
  }

  const whereClause: any = {
    direction: "OUTBOUND",
    providerMessageId: { startsWith: "pending_meta_" },
  };
  if (clinicId) {
    whereClause.conversation = { clinicId };
  }

  const pending = await prisma.message.findMany({
    where: whereClause,
    include: {
      conversation: {
        include: {
          clinic: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  if (pending.length === 0) {
    return { dispatched: 0, skipped: false as const };
  }

  console.log(`[WhatsApp Outbound Bridge] Found ${pending.length} pending messages to dispatch to Meta Graph API`);

  let dispatched = 0;
  const results: Array<{ id: string; success: boolean; metaId?: string; error?: string }> = [];

  for (const msg of pending) {
    const conv = msg.conversation;
    if (!conv || !conv.contactPhone) {
      await prisma.message.update({
        where: { id: msg.id },
        data: { providerMessageId: `failed_nophone_${Date.now()}`, status: "FAILED" },
      });
      continue;
    }

    const tenant = await clinicTenant(conv.clinicId);
    if (!tenant) {
      console.warn(`[WhatsApp Outbound Bridge] Could not build tenant for clinic ${conv.clinicId}`);
      continue;
    }

    let creds: { token: string; phoneNumberId: string } | null = null;
    try {
      creds = await resolveWhatsAppSenderCredentials(tenant);
    } catch (err) {
      console.warn(
        `[WhatsApp Outbound Bridge] Could not resolve credentials for clinic ${conv.clinicId}:`,
        err instanceof Error ? err.message : err,
      );
      continue;
    }

    if (!creds?.token || !creds.phoneNumberId) {
      continue;
    }

    const recipient = normalizeWhatsAppPhone(conv.contactPhone);
    if (!recipient || recipient.length < 10) {
      await prisma.message.update({
        where: { id: msg.id },
        data: { providerMessageId: `failed_badrecipient_${Date.now()}`, status: "FAILED" },
      });
      continue;
    }

    try {
      const graphResult = await sendTextMessage({
        phoneNumberId: creds.phoneNumberId,
        accessToken: creds.token,
        to: recipient,
        body: msg.content,
      });

      const messages = graphResult["messages"];
      const metaId =
        Array.isArray(messages) && messages[0] && typeof messages[0] === "object"
          ? String((messages[0] as { id?: string }).id ?? "")
          : "";

      if (metaId) {
        await prisma.message.update({
          where: { id: msg.id },
          data: {
            providerMessageId: metaId,
            status: "SENT",
          },
        });

        await prisma.auditLog.create({
          data: {
            organizationId: tenant.organizationId,
            clinicId: tenant.clinicId,
            actorId: tenant.userId,
            action: "whatsapp.message.send.session.success",
            entityType: "Message",
            entityId: msg.id,
            metadata: {
              source: msg.senderType === "AI" ? "WHATSAPP_AI" : "WHATSAPP_STAFF",
              bridge: "worker_outbound",
              metaMessageId: metaId,
            },
          },
        }).catch(() => undefined);

        dispatched += 1;
        results.push({ id: msg.id, success: true, metaId });
        console.log(`[WhatsApp Outbound Bridge] Dispatched message ${msg.id} -> Meta ${metaId}`);
      } else {
        throw new Error("Meta Graph API returned no message id");
      }
    } catch (metaErr) {
      const errStr = metaErr instanceof Error ? metaErr.message : String(metaErr);
      console.error(`[WhatsApp Outbound Bridge] Meta dispatch failed for message ${msg.id}:`, errStr);

      const is24hWindowError =
        errStr.includes("131047") ||
        errStr.includes("24 hours") ||
        errStr.includes("SESSION_WINDOW_EXPIRED") ||
        errStr.includes("Re-engagement");

      if (is24hWindowError) {
        console.log(`[WhatsApp Outbound Bridge] 24h window closed for ${recipient}. Attempting approved template fallback...`);
        const template = await prisma.whatsAppTemplate.findFirst({
          where: { clinicId: conv.clinicId, status: "APPROVED", parameterCount: 0 },
        });
        if (template) {
          try {
            const tmplResult = await sendTemplateMessage({
              phoneNumberId: creds.phoneNumberId,
              accessToken: creds.token,
              to: recipient,
              name: template.name,
              language: template.language || "en_US",
            });
            const tmplMessages = tmplResult["messages"];
            const metaId =
              Array.isArray(tmplMessages) && tmplMessages[0] && typeof tmplMessages[0] === "object"
                ? String((tmplMessages[0] as { id?: string }).id ?? "")
                : "";
            if (metaId) {
              await prisma.message.update({
                where: { id: msg.id },
                data: {
                  providerMessageId: metaId,
                  status: "SENT",
                },
              });
              await prisma.auditLog.create({
                data: {
                  organizationId: tenant.organizationId,
                  clinicId: tenant.clinicId,
                  actorId: tenant.userId,
                  action: "whatsapp.message.send.template.fallback",
                  entityType: "Message",
                  entityId: msg.id,
                  metadata: {
                    source: "WHATSAPP_STAFF",
                    bridge: "worker_outbound_fallback",
                    metaMessageId: metaId,
                    template: template.name,
                  },
                },
              }).catch(() => undefined);
              dispatched += 1;
              results.push({ id: msg.id, success: true, metaId });
              console.log(`[WhatsApp Outbound Bridge] Fallback template ${template.name} sent to ${recipient} -> Meta ${metaId}`);
              continue;
            }
          } catch (tmplErr) {
            console.error(`[WhatsApp Outbound Bridge] Template fallback failed:`, tmplErr);
          }
        }
      }

      results.push({ id: msg.id, success: false, error: errStr });

      // If attempts exceed, mark failed
      const msgProviderId = msg.providerMessageId ?? "";
      if (msgProviderId.includes("_retry2_")) {
        await prisma.message.update({
          where: { id: msg.id },
          data: { providerMessageId: `failed_meta_${Date.now()}`, status: "FAILED" },
        });
      } else if (msgProviderId.includes("_retry1_")) {
        await prisma.message.update({
          where: { id: msg.id },
          data: { providerMessageId: `pending_meta_retry2_${Date.now()}` },
        });
      } else {
        await prisma.message.update({
          where: { id: msg.id },
          data: { providerMessageId: `pending_meta_retry1_${Date.now()}` },
        });
      }
    }
  }

  return { dispatched, results };
}

/**
 * Computes an HMAC signature using META_APP_SECRET to securely trigger outbound
 * dispatch on the production server from local development.
 */
export function computeOutboundBridgeSignature(timestamp: number): string {
  const secret = metaConfig().appSecret || "smrkomed-fallback-outbound-secret";
  return createHmac("sha256", secret).update(`smrkomed_outbound_${timestamp}`).digest("hex");
}

export function verifyOutboundBridgeSignature(signature: string, timestamp: number): boolean {
  if (Math.abs(Date.now() - timestamp) > 300_000) {
    // expired if timestamp > 5 minutes off
    return false;
  }
  const expected = computeOutboundBridgeSignature(timestamp);
  return expected === signature;
}

/**
 * Triggers the remote production worker to immediately sweep and dispatch
 * any pending outbound messages to Meta Graph API.
 */
export async function triggerRemoteOutboundDispatch(): Promise<void> {
  const remoteUrl = process.env["REMOTE_API_URL"] || "https://smrkomed-api-production.up.railway.app";
  const now = Date.now();
  const sig = computeOutboundBridgeSignature(now);

  try {
    const res = await fetch(`${remoteUrl}/api/v1/internal/dispatch-outbound`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bridge-signature": sig,
        "x-bridge-timestamp": String(now),
      },
      body: JSON.stringify({ trigger: "local_outbound_send" }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      console.log("[WhatsApp Outbound Bridge] Remote dispatch response:", data);
    } else {
      console.warn(`[WhatsApp Outbound Bridge] Remote dispatch returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn("[WhatsApp Outbound Bridge] Remote trigger failed (worker will pick up):", err instanceof Error ? err.message : err);
  }
}
