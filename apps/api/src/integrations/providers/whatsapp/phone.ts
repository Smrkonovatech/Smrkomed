/** Normalize WhatsApp user identifiers to digits with country code. Does not invent a country. */
export function normalizeWhatsAppPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return `91${digits.slice(1)}`;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function phonesMatch(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  return normalizeWhatsAppPhone(a) === normalizeWhatsAppPhone(b);
}

export function maskPhone(value: string | null | undefined) {
  if (!value) return null;
  const digits = normalizeWhatsAppPhone(value);
  if (digits.length <= 4) return "••••";
  return `+${digits.slice(0, digits.length - 4).replace(/\d/g, "•")}${digits.slice(-4)}`;
}
