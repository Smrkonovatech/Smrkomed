export class TenantAccessError extends Error {
  readonly code = "TENANT_FORBIDDEN";

  constructor(message = "You do not have access to this resource.") {
    super(message);
    this.name = "TenantAccessError";
  }
}

export function isTenantAccessError(error: unknown): error is TenantAccessError {
  return error instanceof TenantAccessError;
}
