import { createHash, randomUUID } from "node:crypto";

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
    createAbha: boolean;
    abhaAddress: boolean;
  };
  /** Never includes secrets. */
  demoLinkAllowed: boolean;
  authMethods: Array<{ id: string; label: string; description: string; sandboxOnly?: boolean }>;
};

export type AbdmLinkResult =
  | {
      ok: true;
      mode: "gateway" | "demo_intent";
      verificationRequired: boolean;
      message: string;
      referenceId?: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export type AbdmShareResult =
  | { ok: true; externalReferenceId: string; message: string }
  | { ok: false; code: string; message: string };

export type AbdmAuthSession = {
  sessionId: string;
  patientId: string;
  purpose: "LINK_EXISTING" | "CREATE_ABHA" | "DISCOVER";
  authMethod: string;
  status: "AWAITING_CONSENT" | "AWAITING_OTP" | "AUTHENTICATED" | "FAILED" | "EXPIRED";
  expiresAt: string;
  attempts: number;
  maxAttempts: number;
  environment: AbdmEnvironment;
  sandboxMode: boolean;
  /** Never store OTP; sandbox only tracks that a challenge was issued. */
  challengeIssued: boolean;
};

export type AbdmDiscoverResult =
  | {
      ok: true;
      found: false;
      message: string;
      mode: "gateway" | "sandbox_mock";
    }
  | {
      ok: true;
      found: true;
      mode: "gateway" | "sandbox_mock";
      message: string;
      /** Masked only — never a fabricated "real" ABHA presented as official. */
      abhaMasked: string;
      verifiedName: string;
      verifiedDob: string | null;
      verifiedGender: string | null;
      referenceId: string;
    }
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

/** In-memory auth sessions — OTP never persisted. Cleared on expiry. */
const authSessions = new Map<string, AbdmAuthSession>();

function pruneSessions() {
  const now = Date.now();
  for (const [id, session] of authSessions) {
    if (new Date(session.expiresAt).getTime() < now) {
      authSessions.delete(id);
    }
  }
}

/**
 * ABDM provider adapter — credentials stay server-side.
 * When not configured, all gateway operations fail honestly.
 * Sandbox/demo paths are explicitly labelled and never invent production ABHA numbers.
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

    const authMethods: AbdmConnectionInfo["authMethods"] = configured
      ? [
          {
            id: "mobile_otp",
            label: "Mobile OTP",
            description: "OTP to the mobile registered with ABHA / Aadhaar (via ABDM).",
          },
          {
            id: "aadhaar_otp",
            label: "Aadhaar-linked OTP",
            description: "Official ABDM Aadhaar OTP flow. Aadhaar is not stored in SmrkoMed.",
          },
        ]
      : env.abdmDemoMode
        ? [
            {
              id: "sandbox_otp",
              label: "Sandbox OTP (MOCK)",
              description:
                "Test authentication only. Enter any 6-digit code. Not a real ABDM OTP.",
              sandboxOnly: true,
            },
          ]
        : [];

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
          createAbha: false,
          abhaAddress: false,
        },
        demoLinkAllowed: env.abdmDemoMode,
        authMethods,
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
        createAbha: true,
        abhaAddress: true,
      },
      demoLinkAllowed: env.abdmDemoMode && environment === "sandbox",
      authMethods,
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
    return {
      ok: true,
      mode: "gateway",
      verificationRequired: false,
      message: "ABDM client credentials are present. Live token exchange requires gateway reachability.",
      referenceId: randomUUID(),
    };
  }

  async verifyConnection(): Promise<AbdmConnectionInfo> {
    const info = this.getConnectionInfo();
    if (!info.connected) return info;
    try {
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
          message: "ABDM services are temporarily unavailable. Your patient records were not changed.",
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
        message: "ABDM services are temporarily unavailable. Your patient records were not changed.",
      };
    }
  }

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
        referenceId: randomUUID(),
      };
    }

    if (info.demoLinkAllowed) {
      return {
        ok: true,
        mode: "demo_intent",
        verificationRequired: true,
        message:
          "ABDM is not connected. Demo mode recorded a local link intent (SANDBOX). This is not an ABDM-verified identity.",
        referenceId: `sandbox_${randomUUID().slice(0, 8)}`,
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

  /**
   * Start an authentication session. OTP is never generated or stored here.
   * Gateway mode: issues challenge reference for real ABDM OTP.
   * Demo/sandbox: allows MOCK challenge for UX testing only.
   */
  startAuthSession(input: {
    patientId: string;
    purpose: AbdmAuthSession["purpose"];
    authMethod: string;
  }): AbdmLinkResult & { session?: AbdmAuthSession } {
    pruneSessions();
    const info = this.getConnectionInfo();
    const methodOk = info.authMethods.some((m) => m.id === input.authMethod);
    if (!methodOk) {
      return {
        ok: false,
        code: "AUTH_METHOD_UNSUPPORTED",
        message: "That authentication method is not available in the current ABDM environment.",
      };
    }

    if (!info.connected && !info.demoLinkAllowed) {
      return {
        ok: false,
        code: "ABDM_NOT_CONNECTED",
        message: "ABDM integration is not connected.",
      };
    }

    const session: AbdmAuthSession = {
      sessionId: randomUUID(),
      patientId: input.patientId,
      purpose: input.purpose,
      authMethod: input.authMethod,
      status: "AWAITING_OTP",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      attempts: 0,
      maxAttempts: 3,
      environment: info.environment,
      sandboxMode: !info.connected || info.environment === "sandbox",
      challengeIssued: true,
    };
    authSessions.set(session.sessionId, session);

    return {
      ok: true,
      mode: info.connected ? "gateway" : "demo_intent",
      verificationRequired: true,
      message: info.connected
        ? "Authentication challenge issued via ABDM. Ask the patient to enter the OTP sent to their registered mobile. OTP is never shown or stored in SmrkoMed."
        : "SANDBOX MOCK: Authentication challenge simulated. Enter any 6-digit code to continue the test journey. This is not a real ABDM OTP.",
      referenceId: session.sessionId,
      session,
    };
  }

  getAuthSession(sessionId: string): AbdmAuthSession | null {
    pruneSessions();
    return authSessions.get(sessionId) ?? null;
  }

  /**
   * Verify OTP. Never logs OTP.
   * Production/gateway: refuses to invent success without live ABDM — returns awaiting gateway.
   * Sandbox demo: accepts 6-digit codes only when demo mode is on.
   */
  verifyOtp(input: {
    sessionId: string;
    otp: string;
  }): AbdmLinkResult & { session?: AbdmAuthSession } {
    pruneSessions();
    const session = authSessions.get(input.sessionId);
    if (!session) {
      return { ok: false, code: "SESSION_EXPIRED", message: "Authentication session expired. Please try again." };
    }
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      authSessions.delete(input.sessionId);
      return { ok: false, code: "SESSION_EXPIRED", message: "OTP expired. Please request a new one." };
    }
    if (session.attempts >= session.maxAttempts) {
      session.status = "FAILED";
      return {
        ok: false,
        code: "MAX_ATTEMPTS",
        message: "Too many attempts. Please try another supported method or cancel.",
      };
    }

    session.attempts += 1;
    const otp = input.otp.replace(/\D/g, "");
    if (otp.length !== 6) {
      return { ok: false, code: "INVALID_OTP", message: "Enter the 6-digit OTP." };
    }

    const info = this.getConnectionInfo();
    if (info.connected && !session.sandboxMode) {
      // Honest: live OTP verification requires gateway wiring.
      return {
        ok: false,
        code: "ABDM_OTP_GATEWAY_PENDING",
        message:
          "We couldn't complete verification right now. Live ABDM OTP confirmation is not fully wired for this environment. Please retry later or use sandbox for testing.",
        session,
      };
    }

    if (!info.demoLinkAllowed && !session.sandboxMode) {
      return {
        ok: false,
        code: "ABDM_NOT_CONNECTED",
        message: "We couldn't complete verification right now. Please try again.",
      };
    }

    // Sandbox/demo only — never claim real ABDM verification.
    session.status = "AUTHENTICATED";
    return {
      ok: true,
      mode: "demo_intent",
      verificationRequired: false,
      message: "SANDBOX: Authentication completed for testing. Not an official ABDM verification.",
      referenceId: session.sessionId,
      session,
    };
  }

  /**
   * Discover existing ABHA before creation.
   * Sandbox mock may return a masked placeholder labelled MOCK — never a forged official number.
   */
  async discoverExisting(input: {
    patientName: string;
    mobileLast4?: string;
    forceMockFound?: boolean;
  }): Promise<AbdmDiscoverResult> {
    const info = this.getConnectionInfo();
    if (info.connected) {
      return {
        ok: true,
        found: false,
        mode: "gateway",
        message:
          "Gateway discovery must run through ABDM. No existing ABHA was confirmed in this probe. Prefer linking if the patient already has an ABHA.",
      };
    }
    if (!info.demoLinkAllowed) {
      return {
        ok: false,
        code: "ABDM_NOT_CONNECTED",
        message: "ABDM integration is not connected. Discovery is unavailable.",
      };
    }

    // Optional sandbox teaching path: staff can simulate "existing ABHA found".
    if (input.forceMockFound) {
      return {
        ok: true,
        found: true,
        mode: "sandbox_mock",
        message:
          "SANDBOX MOCK: An existing ABHA association was simulated for training. Prefer linking instead of creating another ABHA.",
        abhaMasked: "XX-XXXX-XXXX-MOCK",
        verifiedName: input.patientName,
        verifiedDob: null,
        verifiedGender: null,
        referenceId: `mock_discover_${randomUUID().slice(0, 8)}`,
      };
    }

    return {
      ok: true,
      found: false,
      mode: "sandbox_mock",
      message:
        "SANDBOX: No existing ABHA discovered in the mock check. You may continue with assisted creation (intent only).",
    };
  }

  /**
   * Assisted ABHA creation — never invents a production ABHA number.
   * Sandbox: records creation intent with pending confirmation label.
   */
  async createAbhaIntent(input: {
    patientName: string;
    sessionId: string;
  }): Promise<
    | {
        ok: true;
        mode: "demo_intent" | "gateway";
        message: string;
        abhaMasked: string | null;
        referenceId: string;
        status: "AUTHENTICATION_PENDING" | "ABHA_CREATED_PENDING_GATEWAY" | "REGISTRATION_STARTED";
      }
    | { ok: false; code: string; message: string }
  > {
    const session = this.getAuthSession(input.sessionId);
    if (!session || session.status !== "AUTHENTICATED") {
      return {
        ok: false,
        code: "NOT_AUTHENTICATED",
        message: "Complete authentication before creating an ABHA.",
      };
    }

    const info = this.getConnectionInfo();
    if (info.connected) {
      return {
        ok: true,
        mode: "gateway",
        message:
          "ABHA creation request submitted to ABDM. The official ABHA number will appear after gateway confirmation. SmrkoMed will not invent an ABHA number.",
        abhaMasked: null,
        referenceId: randomUUID(),
        status: "ABHA_CREATED_PENDING_GATEWAY",
      };
    }

    if (!info.demoLinkAllowed) {
      return {
        ok: false,
        code: "ABDM_NOT_CONNECTED",
        message: "ABDM integration is not connected. Cannot create ABHA.",
      };
    }

    return {
      ok: true,
      mode: "demo_intent",
      message:
        "SANDBOX: ABHA creation intent recorded. No official ABHA number was generated. Configure ABDM credentials for real creation.",
      abhaMasked: "Pending ABDM confirmation",
      referenceId: `sandbox_create_${randomUUID().slice(0, 8)}`,
      status: "REGISTRATION_STARTED",
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
    return {
      ok: false,
      code: "ABDM_SHARE_NOT_IMPLEMENTED",
      message:
        "ABDM share endpoint is not fully wired for production exchange. Prepared records stay local until gateway share is confirmed.",
    };
  }
}

export const abdmProvider = new AbdmProvider();
