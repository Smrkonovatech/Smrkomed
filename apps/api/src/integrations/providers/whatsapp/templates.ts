import type { WhatsAppTemplateStatus } from "@smrkomed/database";

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

export function countBodyParameters(components: unknown) {
  if (!Array.isArray(components)) return 0;
  let count = 0;
  for (const component of components) {
    if (!component || typeof component !== "object") continue;
    const row = component as { type?: string; text?: string };
    if ((row.type ?? "").toUpperCase() !== "BODY") continue;
    const matches = row.text?.match(/\{\{\d+\}\}/g) ?? [];
    count = Math.max(count, matches.length);
  }
  return count;
}
