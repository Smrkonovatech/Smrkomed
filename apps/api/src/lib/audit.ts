import { writeTenantAuditLog, type TenantContext } from "@smrkomed/database";

export async function audit(
  ctx: TenantContext,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, string | number | boolean | null>,
) {
  await writeTenantAuditLog(ctx, {
    action,
    entityType,
    entityId,
    ...(metadata === undefined ? {} : { metadata }),
  });
}
