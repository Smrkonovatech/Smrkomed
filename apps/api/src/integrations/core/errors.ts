export const INTEGRATION_ERROR_CODES = [
  "PROVIDER_NOT_SUPPORTED",
  "PROVIDER_NOT_IMPLEMENTED",
  "PROVIDER_DISCONNECT_NOT_IMPLEMENTED",
  "CONNECTION_FAILED",
  "AUTHORIZATION_FAILED",
  "TOKEN_EXPIRED",
  "INVALID_CREDENTIALS",
  "WEBHOOK_VERIFICATION_FAILED",
  "WEBHOOK_VERIFICATION_NOT_IMPLEMENTED",
  "DUPLICATE_EVENT",
  "PROVIDER_RATE_LIMITED",
  "INVALID_STATE_TRANSITION",
  "UNKNOWN_INTEGRATION",
  "MISSING_EVENT_ID",
  "UNSUPPORTED_EVENT",
  "ENCRYPTION_KEY_INVALID",
  "MOCK_PROVIDER_DISABLED",
  "OAUTH_NOT_IMPLEMENTED",
  "WHATSAPP_NOT_CONNECTED",
  "PHONE_NOT_REGISTERED",
  "INVALID_TEMPLATE",
  "TEMPLATE_NOT_APPROVED",
  "INVALID_RECIPIENT",
  "AUTHORIZATION_EXPIRED",
  "PROVIDER_UNAVAILABLE",
  "MESSAGE_SEND_FAILED",
  "CONNECTION_CONFLICT",
] as const;

export type IntegrationErrorCode = (typeof INTEGRATION_ERROR_CODES)[number];

export type IntegrationHttpStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 501;

export class IntegrationError extends Error {
  readonly code: IntegrationErrorCode;
  readonly httpStatus: IntegrationHttpStatus;
  readonly retryable: boolean;

  constructor(
    code: IntegrationErrorCode,
    message: string,
    httpStatus: IntegrationHttpStatus = 400,
    retryable = false,
  ) {
    super(message);
    this.name = "IntegrationError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.retryable = retryable;
  }
}

export function isIntegrationError(error: unknown): error is IntegrationError {
  return error instanceof IntegrationError;
}

export function notImplemented(operation: string, provider: string) {
  return new IntegrationError(
    "PROVIDER_NOT_IMPLEMENTED",
    `${provider} ${operation} is not implemented yet.`,
    501,
  );
}
