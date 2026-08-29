import { createHash } from "node:crypto";

export function buildIdempotencyKey(parts: {
  clinicId: string;
  flowId: string;
  triggerType: string;
  triggerEventId: string;
  patientId?: string | null;
}) {
  const raw = [parts.clinicId, parts.flowId, parts.triggerType, parts.triggerEventId, parts.patientId ?? ""].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 48);
}
