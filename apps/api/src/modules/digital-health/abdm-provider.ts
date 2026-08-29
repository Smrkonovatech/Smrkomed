import { createHash } from "node:crypto";

import { env } from "../../config/env";

export type AbdmConnectionStatus = "NOT_CONNECTED" | "CONNECTED" | "ERROR";

export type AbdmEnvironment = "sandbox" | "production" | "unconfigured";

export type AbdmConnectionInfo = {
  connected: boolean;
  status: AbdmConnectionStatus;
  environment: AbdmEnvironment;
  baseUrl: string | null;
  facilityId: string | null;
  facilityConfigured: boolean;
  lastCheckedAt: string;
  message: string;
  capabilities: {
    discoverPatient: boolean;
    linkAbha: boolean;
    verifyAbha: boolean;
    requestConsent: boolean;
    shareRecord: boolean;
  };
  /** Never includes secrets. */
  demoLinkAllowed: boolean;
};

export type AbdmLinkResult =
  | {
      ok: true;
      mode: "gateway" | "demo_intent";
      verificationRequired: boolean;
      message: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export type AbdmShareResult =
  | { ok: true; externalReferenceId: string; message: string }
  | { ok: false; code: string; message: string };

/** Normalize ABHA digits (14 digits typical). */
export function normalizeAbhaDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function maskAbha(raw: string): string {
  const digits = normalizeAbhaDigits(raw);
  if (digits.length < 4) return "XX-XXXX-XXXX-XXXX";
  const last4 = digits.slice(-4);
  return `XX-XXXX-XXXX-${last4}`;
}

export function hashAbha(raw: string): string {
  const digits = normalizeAbhaDigits(raw);
  return createHash("sha256").update(`smrkomed-abha:${digits}`).digest("hex");
}

/**
 * ABDM provider adapter — credentials stay server-side.
 * When not configured, all gateway operations fail honestly.
 */
export class AbdmProvider {
  getConnectionInfo(): AbdmConnectionInfo {
    const configured = Boolean(
      env.abdmEnabled && env.abdmBaseUrl && env.abdmClientId && env.abdmClientSecret,
    );
    const environment: AbdmEnvironment = !env.abdmEnabled
      ? "unconfigured"
      : env.abdmEnv === "production"
        ? "production"
        : "sandbox";

    if (!configured) {
      return {
        connected: false,
        status: "NOT_CONNECTED",
        environment,
        baseUrl: env.abdmBaseUrl || null,
        facilityId: env.abdmFacilityId || null,
        facilityConfigured: Boolean(env.abdmFacilityId),
        lastCheckedAt: new Date().toISOString(),
        message:
          "ABDM integration is not connected. Configure server-side ABDM credentials and set ABDM_ENABLED=1.",
        capabilities: {
          discoverPatient: false,
          linkAbha: false,
          verifyAbha: false,
          requestConsent: false,
          shareRecord: false,
        },
        demoLinkAllowed: env.abdmDemoMode,
      };
    }

    return {
      connected: true,
      status: "CONNECTED",
      environment,
      baseUrl: env.abdmBaseUrl,
      facilityId: env.abdmFacilityId || null,
      facilityConfigured: Boolean(env.abdmFacilityId),
      lastCheckedAt: new Date().toISOString(),
      message: `ABDM ${environment} credentials are configured. Gateway calls are available when endpoints respond.`,
      capabilities: {
        discoverPatient: true,
        linkAbha: true,
        verifyAbha: true,
        requestConsent: true,
        shareRecord: true,
      },
      demoLinkAllowed: env.abdmDemoMode && environment === "sandbox",
    };
  }

  async authenticate(): Promise<AbdmLinkResult> {
    const info = this.getConnectionInfo();
    if (!info.connected) {
      return {
        ok: false,
        code: "ABDM_NOT_CONNECTED",
        message: "ABDM integration is not connected.",
      };
    }
    // Real token exchange would call ABDM gateway here. Without a live endpoint contract
    // validated in this environment, we only confirm configuration presence.
    return {
      ok: true,
      mode: "gateway",
      verificationRequired: false,
      message: "ABDM client credentials are present. Live token exchange requires gateway reachability.",
    };
  }

  async verifyConnection(): Promise<AbdmConnectionInfo> {
    const info = this.getConnectionInfo();
    if (!info.connected) return info;
    try {
      // Lightweight reachability: HEAD/GET base URL if set (no secrets in logs).
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);
      const res = await fetch(info.baseUrl!, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }).finally(() => clearTimeout(timer));
      if (!res.ok && res.status >= 500) {
        return {
          ...info,
          status: "ERROR",
          message: "ABDM service is temporarily unavailable. Your patient records were not changed.",
        };
      }
      return {
        ...info,
        message: `ABDM endpoint responded with HTTP ${res.status}. Connection check completed (no secrets exchanged in this probe).`,
      };
    } catch {
      return {
        ...info,
        status: "ERROR",
        message: "ABDM service is temporarily unavailable. Your patient records were not changed.",
      };
    }
  }

  /**
   * Link ABHA. Does NOT fake OTP.
   * - Gateway configured: returns verification-required intent (caller stores PENDING).
   * - Demo mode only: allows local PENDING/LINKED intent labelled sandbox.
   */
  async linkAbha(input: {
    abhaNumber: string;
    patientName: string;
  }): Promise<AbdmLinkResult> {
    const digits = normalizeAbhaDigits(input.abhaNumber);
    if (digits.length < 8) {
      return { ok: false, code: "INVALID_ABHA", message: "Invalid ABHA identifier." };
    }

    const info = this.getConnectionInfo();
    if (info.connected) {
      return {
        ok: true,
        mode: "gateway",
        verificationRequired: true,
        message:
          "ABHA link initiated. Patient verification is required through the ABDM-approved channel. Status remains pending until the gateway confirms verification.",
      };
    }

    if (info.demoLinkAllowed) {
      return {
        ok: true,
        mode: "demo_intent",
        verificationRequired: true,
        message:
          "ABDM is not connected. Demo mode recorded a local link intent (SANDBOX). This is not an ABDM-verified identity.",
      };
    }

    return {
      ok: false,
      code: "ABDM_NOT_CONNECTED",
      message:
        "ABDM integration is not connected. Configure ABDM credentials for administrators, or enable ABDM_DEMO_MODE for sandbox link intents only.",
    };
  }

  async verifyAbha(_input: { abhaNumberHash: string }): Promise<AbdmLinkResult> {
    const info = this.getConnectionInfo();
    if (!info.connected) {
      if (info.demoLinkAllowed) {
        return {
          ok: true,
          mode: "demo_intent",
          verificationRequired: false,
          message:
            "Demo mode marked local verification complete (SANDBOX). Not an ABDM gateway verification.",
        };
      }
      return {
        ok: false,
        code: "ABDM_NOT_CONNECTED",
        message: "ABDM integration is not connected. Cannot verify ABHA with the gateway.",
      };
    }
    return {
      ok: true,
      mode: "gateway",
      verificationRequired: true,
      message:
        "Gateway verification must complete via ABDM patient/OTP flow. SMRKOMED will not invent OTP success.",
    };
  }

  async shareRecord(_input: {
    exchangeId: string;
    payloadSummary: string;
  }): Promise<AbdmShareResult> {
    const info = this.getConnectionInfo();
    if (!info.connected) {
      return {
        ok: false,
        code: "ABDM_NOT_CONNECTED",
        message: "ABDM integration is not connected. Record was prepared locally but not shared.",
      };
    }
    // Without a validated live share API in this environment, refuse to mark SHARED.
    return {
      ok: false,
      code: "ABDM_SHARE_NOT_IMPLEMENTED",
      message:
        "ABDM share endpoint is not fully wired for production exchange. Prepared records stay local until gateway share is confirmed.",
    };
  }
}

export const abdmProvider = new AbdmProvider();
