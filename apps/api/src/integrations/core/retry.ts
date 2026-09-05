export type RetryDecision = {
  retryable: boolean;
  reason: string;
};

/** Transient: rate limit, timeout, temporary Meta/network outage. */
const RETRYABLE_CODES = new Set([
  "PROVIDER_RATE_LIMITED",
  "CONNECTION_FAILED",
  "PROVIDER_UNAVAILABLE",
]);

/**
 * Permanent: invalid/rejected template, invalid phone/params, permission/auth.
 * MESSAGE_SEND_FAILED is only retryable when httpStatus is 5xx/429 (ambiguous
 * after a Meta success+timeout is handled by outbound step idempotency).
 */
const PERMANENT_CODES = new Set([
  "INVALID_CREDENTIALS",
  "AUTHORIZATION_FAILED",
  "TOKEN_EXPIRED",
  "AUTHORIZATION_EXPIRED",
  "TEMPLATE_NOT_APPROVED",
  "INVALID_TEMPLATE",
  "INVALID_RECIPIENT",
  "WHATSAPP_NOT_CONNECTED",
  "PHONE_NOT_REGISTERED",
]);

/**
 * Classifies integration failures for bounded automation retries.
 * Transient → retry with backoff. Permanent → fail immediately.
 */
export function classifyRetry(input: { code: string; httpStatus?: number }): RetryDecision {
  if (PERMANENT_CODES.has(input.code)) {
    return { retryable: false, reason: "Permanent configuration or validation failure." };
  }
  if (input.code === "MESSAGE_SEND_FAILED") {
    if (input.httpStatus === 429 || (input.httpStatus !== undefined && input.httpStatus >= 500)) {
      return { retryable: true, reason: "Temporary provider or network failure." };
    }
    return { retryable: false, reason: "Permanent send failure — do not retry endlessly." };
  }
  if (
    RETRYABLE_CODES.has(input.code) ||
    input.httpStatus === 429 ||
    (input.httpStatus !== undefined && input.httpStatus >= 500)
  ) {
    return { retryable: true, reason: "Temporary provider or network failure." };
  }
  return { retryable: false, reason: "Not a transient failure — do not retry endlessly." };
}
