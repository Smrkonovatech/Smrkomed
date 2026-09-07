import { publicEncrypt, constants, randomUUID } from "node:crypto";
import { getAbdmConfig } from "./abdm-config";

let cachedPublicKeyPem: string | null = null;
let cachedKeyExpiresAt = 0;

/**
 * Normalizes raw base64 public key into standard PEM format.
 */
export function formatPublicKeyPem(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (trimmed.startsWith("-----BEGIN PUBLIC KEY-----")) {
    return trimmed;
  }
  // Wrap lines at 64 characters if raw base64 string
  const formatted = trimmed.match(/.{1,64}/g)?.join("\n") ?? trimmed;
  return `-----BEGIN PUBLIC KEY-----\n${formatted}\n-----END PUBLIC KEY-----`;
}

/**
 * Encrypts sensitive data (Aadhaar, Mobile, OTP, Password)
 * conforming to ABDM V3 spec: RSA/ECB/OAEPWithSHA-1AndMGF1Padding
 */
export function encryptWithAbdmPublicKey(publicKeyPem: string, plainText: string): string {
  const pem = formatPublicKeyPem(publicKeyPem);
  const buffer = Buffer.from(plainText, "utf-8");
  const encrypted = publicEncrypt(
    {
      key: pem,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha1",
    },
    buffer,
  );
  return encrypted.toString("base64");
}

/**
 * Fetches and caches the ABDM V3 public certificate from:
 * GET {ABHA_BASE_URL}/v3/profile/public/certificate
 */
export async function getAbdmPublicKey(getGatewayToken: () => Promise<string>): Promise<string> {
  const now = Date.now();
  if (cachedPublicKeyPem && cachedKeyExpiresAt - now > 60_000) {
    return cachedPublicKeyPem;
  }

  const config = getAbdmConfig();
  const token = await getGatewayToken();

  const baseUrl =
    config.environment === "production"
      ? "https://abha.abdm.gov.in/api/abha"
      : "https://abhasbx.abdm.gov.in/abha/api";

  const certUrl = `${baseUrl}/v3/profile/public/certificate`;
  const response = await fetch(certUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      "REQUEST-ID": randomUUID(),
      TIMESTAMP: new Date().toISOString(),
      "X-CM-ID": config.environment === "production" ? "abdm" : "sbx",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Failed to fetch ABDM V3 public certificate (HTTP ${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { publicKey?: string };
  if (!data?.publicKey) {
    throw new Error("ABDM V3 public certificate response did not contain a valid publicKey.");
  }

  cachedPublicKeyPem = formatPublicKeyPem(data.publicKey);
  // Cache for 1 hour
  cachedKeyExpiresAt = now + 60 * 60 * 1000;

  return cachedPublicKeyPem;
}

export function clearPublicKeyCache(): void {
  cachedPublicKeyPem = null;
  cachedKeyExpiresAt = 0;
}
