/** Normalize phone numbers for duplicate matching. Comparison uses the last 10 digits. */
export function digitsOnly(value: string | null | undefined) {
  return (value ?? "").replace(/\D/g, "");
}

export function phoneSuffix(value: string | null | undefined) {
  const digits = digitsOnly(value);
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export function phonesLikelyMatch(a: string | null | undefined, b: string | null | undefined) {
  const left = phoneSuffix(a);
  const right = phoneSuffix(b);
  return Boolean(left) && left === right && left.length >= 8;
}

export function normalizeEmail(value: string | null | undefined) {
  const trimmed = (value ?? "").trim().toLowerCase();
  return trimmed || null;
}
