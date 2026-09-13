import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  type KeyObject,
} from "node:crypto";
import type { V3KeyMaterial } from "./abdm-v3-types";

const X25519_SPKI_PREFIX = Buffer.from("302a300506032b656e032100", "hex");

export interface HipEphemeralKeyExchange {
  keyMaterial: V3KeyMaterial;
  privateKey: KeyObject;
}

/**
 * Generates an ephemeral Curve25519 (X25519) key pair and 32-byte random nonce
 * for ABDM FHIR Data Exchange encryption.
 */
export function generateHipKeyMaterial(expiryHours = 24): HipEphemeralKeyExchange {
  const { publicKey, privateKey } = generateKeyPairSync("x25519");
  const der = publicKey.export({ type: "spki", format: "der" });
  const rawKey = der.subarray(der.length - 32);
  const nonce = randomBytes(32).toString("base64");

  const expiry = new Date(Date.now() + expiryHours * 3600 * 1000).toISOString();

  const keyMaterial: V3KeyMaterial = {
    cryptoAlg: "ECDH",
    curve: "Curve25519",
    dhPublicKey: {
      expiry,
      parameters: "Curve25519/32byte random key",
      keyValue: rawKey.toString("base64"),
    },
    nonce,
  };

  return { keyMaterial, privateKey };
}

/**
 * Restores a remote Curve25519 public key from a Base64 string (either raw 32-byte or DER/SPKI).
 */
export function importCurve25519PublicKey(keyValueBase64: string): KeyObject {
  const clean = keyValueBase64.trim().replace(/\s+/g, "");
  const buf = Buffer.from(clean, "base64");

  if (buf.length === 32) {
    // Wrap raw 32-byte X25519 key in ASN.1 SPKI header
    const spki = Buffer.concat([X25519_SPKI_PREFIX, buf]);
    return createPublicKey({ key: spki, format: "der", type: "spki" });
  }

  // Otherwise assume DER SPKI format
  return createPublicKey({ key: buf, format: "der", type: "spki" });
}

/**
 * Performs Diffie-Hellman key agreement using local private key and remote public key.
 * Returns the 32-byte shared secret.
 */
export function calculateSharedSecret(
  localPrivateKey: KeyObject,
  remotePublicKeyInput: KeyObject | string,
): Buffer {
  const remoteKey =
    typeof remotePublicKeyInput === "string"
      ? importCurve25519PublicKey(remotePublicKeyInput)
      : remotePublicKeyInput;

  return diffieHellman({
    privateKey: localPrivateKey,
    publicKey: remoteKey,
  });
}

/**
 * Derives a 32-byte symmetric AES-256 key from ECDH shared secret and nonces using HKDF-SHA256.
 */
export function deriveSymmetricKey(
  sharedSecret: Buffer,
  hipNonceBase64: string,
  hiuNonceBase64: string,
): Buffer {
  const hipNonce = Buffer.from(hipNonceBase64, "base64");
  const hiuNonce = Buffer.from(hiuNonceBase64, "base64");

  // XOR the two nonces as salt per ABDM data flow specification
  const minLen = Math.min(hipNonce.length, hiuNonce.length);
  const salt = Buffer.alloc(minLen);
  for (let i = 0; i < minLen; i += 1) {
    salt[i] = (hipNonce[i] ?? 0) ^ (hiuNonce[i] ?? 0);
  }

  return Buffer.from(
    hkdfSync("sha256", sharedSecret, salt, "ABDM-FHIR-DATA-ENCRYPTION", 32),
  );
}

/**
 * Encrypts a FHIR bundle JSON string with AES-256-GCM.
 * Output format: [12-byte IV][16-byte Auth Tag][Ciphertext] encoded as Base64.
 */
export function encryptFhirPayload(
  payloadJson: string,
  aesKey: Buffer,
): { encryptedContent: string; checksum: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey, iv);

  const payloadBuf = Buffer.from(payloadJson, "utf8");
  const encrypted = Buffer.concat([cipher.update(payloadBuf), cipher.final()]);
  const tag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, tag, encrypted]);
  const checksum = createHash("md5").update(payloadJson, "utf8").digest("hex");

  return {
    encryptedContent: combined.toString("base64"),
    checksum,
  };
}

/**
 * Decrypts an AES-256-GCM encrypted FHIR payload created by encryptFhirPayload.
 */
export function decryptFhirPayload(
  encryptedBase64: string,
  aesKey: Buffer,
): string {
  const combined = Buffer.from(encryptedBase64, "base64");
  if (combined.length < 28) {
    throw new Error("Invalid encrypted payload length (minimum 28 bytes for IV + Tag).");
  }

  const iv = combined.subarray(0, 12);
  const tag = combined.subarray(12, 28);
  const ciphertext = combined.subarray(28);

  const decipher = createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

export interface HiuEphemeralKeyExchange {
  keyMaterial: V3KeyMaterial;
  privateKey: KeyObject;
}

/**
 * Generates an ephemeral Curve25519 key pair for HIU data requests.
 */
export function generateHiuKeyMaterial(expiryHours = 24): HiuEphemeralKeyExchange {
  const { publicKey, privateKey } = generateKeyPairSync("x25519");
  const der = publicKey.export({ type: "spki", format: "der" });
  const rawKey = der.subarray(der.length - 32);
  const nonce = randomBytes(32).toString("base64");

  const expiry = new Date(Date.now() + expiryHours * 3600 * 1000).toISOString();

  const keyMaterial: V3KeyMaterial = {
    cryptoAlg: "ECDH",
    curve: "Curve25519",
    dhPublicKey: {
      expiry,
      parameters: "Curve25519/32byte random key",
      keyValue: rawKey.toString("base64"),
    },
    nonce,
  };

  return { keyMaterial, privateKey };
}

/**
 * Decrypts a pushed encrypted FHIR entry using the HIU's private key, HIU nonce,
 * and HIP's key material. Verifies MD5 checksum.
 */
export function decryptHiuDataPushEntry(
  encryptedContent: string,
  expectedChecksum: string,
  hiuPrivateKey: KeyObject,
  hiuNonce: string,
  hipKeyMaterial: V3KeyMaterial,
): { fhirJson: string; verified: boolean; fhirBundle: Record<string, unknown> } {
  // 1. Calculate shared secret between HIU private key and HIP public key
  const sharedSecret = calculateSharedSecret(hiuPrivateKey, hipKeyMaterial.dhPublicKey.keyValue);

  // 2. Derive AES key using HIP nonce and HIU nonce
  const aesKey = deriveSymmetricKey(sharedSecret, hipKeyMaterial.nonce, hiuNonce);

  // 3. Decrypt ciphertext
  const fhirJson = decryptFhirPayload(encryptedContent, aesKey);

  // 4. Verify checksum
  const calculatedChecksum = createHash("md5").update(fhirJson, "utf8").digest("hex");
  const verified = calculatedChecksum.toLowerCase() === expectedChecksum.toLowerCase();

  let fhirBundle: Record<string, unknown> = {};
  try {
    fhirBundle = JSON.parse(fhirJson) as Record<string, unknown>;
  } catch {
    // If not JSON, fhirBundle stays empty
  }

  return { fhirJson, verified, fhirBundle };
}

