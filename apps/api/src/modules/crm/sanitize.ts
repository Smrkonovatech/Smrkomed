import type { Prisma } from "@prisma/client";

const BLOCKED = /secret|token|credential|password|authorization|accessToken|refreshToken/i;

export function sanitizeActivityMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return strip(value) as Prisma.InputJsonValue;
}

function strip(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(strip);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !BLOCKED.test(key))
      .map(([key, nested]) => [key, strip(nested)]),
  );
}

export function maskPhone(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 4) return phone ?? null;
  return `******${digits.slice(-4)}`;
}
