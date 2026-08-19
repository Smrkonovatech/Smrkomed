import { notImplemented } from "../core/errors";
import type { StoredCredentials } from "../core/types";
import { decryptString, encryptString } from "./encryption";

const SECRET_FIELDS = ["accessToken", "refreshToken", "clientSecret", "appSecret", "systemUserToken"] as const;

export const credentialService = {
  encrypt(credentials: StoredCredentials) {
    return encryptString(JSON.stringify(credentials));
  },

  decrypt(ciphertext: string | null | undefined): StoredCredentials {
    if (!ciphertext) return {};
    const parsed = JSON.parse(decryptString(ciphertext)) as StoredCredentials;
    return parsed;
  },

  remove() {
    return null;
  },

  async rotateCredentials() {
    throw notImplemented("credential rotation", "Integration");
  },

  containsSecrets(value: unknown) {
    if (!value || typeof value !== "object") return false;
    const record = value as Record<string, unknown>;
    return SECRET_FIELDS.some((field) => field in record);
  },
};
