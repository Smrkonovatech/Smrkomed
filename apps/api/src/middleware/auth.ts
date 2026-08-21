import { encode, decode } from "@auth/core/jwt";
import type { StaffRole } from "@smrkomed/database";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";

import { env, sessionCookieName } from "../config/env";
import { unauthenticated } from "../lib/errors";
import type { AppEnv, AuthClaims } from "../types";

export type { AuthClaims };

const STAFF_ROLES = new Set<StaffRole>([
  "CLINIC_ADMIN",
  "DOCTOR",
  "CARE_COORDINATOR",
  "NURSE",
  "RECEPTIONIST",
  "PLATFORM_ADMIN",
  "ORGANIZATION_ADMIN",
  "COUNSELOR",
  "MARKETING",
  "READ_ONLY",
]);

const cookieNames = ["authjs.session-token", "__Secure-authjs.session-token"] as const;

/**
 * Verifies the Auth.js session JWT issued by apps/web.
 * Login stays in Next.js; this API only decrypts the existing cookie.
 * The salt must match the cookie name Auth.js used when encrypting the token.
 */
export async function decodeSessionToken(token: string, salt = sessionCookieName()) {
  return decode({ token, secret: env.authSecret, salt });
}

export async function encodeSessionToken(claims: AuthClaims, salt = sessionCookieName()) {
  return encode({
    token: {
      id: claims.id,
      sub: claims.id,
      organizationId: claims.organizationId,
      organizationName: claims.organizationName,
      clinicId: claims.clinicId,
      clinicName: claims.clinicName,
      role: claims.role,
      ...(claims.name ? { name: claims.name } : {}),
      ...(claims.email ? { email: claims.email } : {}),
    },
    secret: env.authSecret,
    salt,
    maxAge: 60 * 60 * 24 * 30,
  });
}

function parseClaims(payload: Record<string, unknown> | null): AuthClaims | null {
  if (!payload) return null;
  const id = typeof payload["id"] === "string" ? payload["id"] : typeof payload["sub"] === "string" ? payload["sub"] : null;
  const organizationId = typeof payload["organizationId"] === "string" ? payload["organizationId"] : null;
  const organizationName = typeof payload["organizationName"] === "string" ? payload["organizationName"] : null;
  const clinicId = typeof payload["clinicId"] === "string" ? payload["clinicId"] : null;
  const clinicName = typeof payload["clinicName"] === "string" ? payload["clinicName"] : null;
  const role = payload["role"];
  if (!id || !organizationId || !organizationName || !clinicId || !clinicName) return null;
  if (typeof role !== "string" || !STAFF_ROLES.has(role as StaffRole)) return null;
  const name = typeof payload["name"] === "string" ? payload["name"] : null;
  const email = typeof payload["email"] === "string" ? payload["email"] : null;
  return {
    id,
    organizationId,
    organizationName,
    clinicId,
    clinicName,
    role: role as StaffRole,
    ...(name === null ? {} : { name }),
    ...(email === null ? {} : { email }),
  };
}

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  let token: string | undefined;
  let salt = sessionCookieName();
  let cookieName: string | null = null;
  for (const name of cookieNames) {
    const value = getCookie(c, name);
    if (value) {
      token = value;
      salt = name;
      cookieName = name;
      break;
    }
  }
  if (!token) {
    const header = c.req.header("authorization");
    if (header?.startsWith("Bearer ")) {
      token = header.slice("Bearer ".length);
      salt = sessionCookieName();
      cookieName = "authorization";
    }
  }
  if (!token) throw unauthenticated();

  let payload: Record<string, unknown> | null = null;
  try {
    payload = (await decodeSessionToken(token, salt)) as Record<string, unknown> | null;
  } catch (error) {
    console.error("AUTH_DECODE_FAILED", {
      path: c.req.path,
      cookieName,
      errorName: error instanceof Error ? error.name : "unknown",
      // Never log token, secret, or cookie value.
    });
    throw unauthenticated("Session could not be verified. Sign out and sign in again.");
  }

  const claims = parseClaims(payload);
  if (!claims) {
    console.error("AUTH_CLAIMS_INVALID", {
      path: c.req.path,
      cookieName,
      hasPayload: Boolean(payload),
    });
    throw unauthenticated("Invalid session.");
  }
  c.set("claims", claims);
  await next();
});
