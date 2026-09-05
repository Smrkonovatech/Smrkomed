import type { WhatsAppTemplateStatus } from "@smrkomed/database";
import { parseWhatsAppTemplateComponents } from "./template-variables";

export function mapMetaTemplateStatus(raw: string | undefined): WhatsAppTemplateStatus {
  const value = (raw ?? "").toUpperCase();
  if (value === "APPROVED") return "APPROVED";
  if (value === "REJECTED") return "REJECTED";
  if (value === "DISABLED") return "DISABLED";
  if (value === "PAUSED") return "PAUSED";
  return "PENDING";
}

export function isSendableTemplateStatus(status: WhatsAppTemplateStatus) {
  return status === "APPROVED";
}

/** @deprecated Prefer parseWhatsAppTemplateComponents — kept for call-site compatibility */
export function countBodyParameters(components: unknown) {
  return parseWhatsAppTemplateComponents(components).bodyParameterCount;
}
