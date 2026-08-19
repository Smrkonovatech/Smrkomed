export type RetryDecision = {
  retryable: boolean;
  reason: string;
};

const RETRYABLE_CODES = new Set(["PROVIDER_RATE_LIMITED", "CONNECTION_FAILED"]);

/**
 * Classifies integration failures for a future worker.
 * Phase 6 does not enqueue retries, poll Redis, or retry in a loop.
 */
export function classifyRetry(input: { code: string; httpStatus?: number }): RetryDecision {
  if (input.code === "INVALID_CREDENTIALS" || input.code === "AUTHORIZATION_FAILED" || input.code === "TOKEN_EXPIRED") {
    return { retryable: false, reason: "Credential or authorization failures require a new user action." };
  }
  if (RETRYABLE_CODES.has(input.code) || input.httpStatus === 429 || input.httpStatus === 503) {
    return { retryable: true, reason: "Temporary provider or network failure." };
  }
  return { retryable: false, reason: "Not retryable until a worker implements bounded backoff." };
}
