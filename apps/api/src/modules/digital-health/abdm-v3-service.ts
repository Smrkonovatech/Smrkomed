import { randomUUID } from "node:crypto";
import { abdmV3Client, AbdmV3ClientError } from "./abdm-v3-client";
import { getAbdmConfig } from "./abdm-config";

export interface V3EnrollmentOtpResponse {
  txnId: string;
  message: string;
}

export interface V3AbhaProfile {
  firstName: string;
  middleName?: string;
  lastName?: string;
  dob: string;
  mobile: string | null;
  gender: string;
  photo?: string;
  phrAddress?: string[];
  address?: string;
  districtCode?: string;
  stateCode?: string;
  pinCode?: string | number;
  abhaType?: string;
  stateName?: string;
  districtName?: string;
  ABHANumber: string;
  abhaStatus?: string;
  kycPhoto?: string;
}

export interface V3EnrollmentResponse {
  message: string;
  txnId: string;
  tokens: {
    token: string;
    expiresIn: number;
    refreshToken: string;
    refreshExpiresIn: number;
  };
  ABHAProfile: V3AbhaProfile;
  isNew: boolean;
}

export interface V3AddressSuggestionsResponse {
  txnId: string;
  abhaAddressList: string[];
}

export interface V3LoginVerifyResponse {
  txnId: string;
  authResult: string;
  message: string;
  token?: string;
  refreshToken?: string;
  accounts?: Array<{
    ABHANumber: string;
    preferredAbhaAddress?: string;
    name?: string;
    gender?: string;
    dob?: string;
    status?: string;
    profilePhoto?: string;
    kycVerified?: boolean;
  }>;
}

export class AbdmV3Service {
  private isLive(): boolean {
    const config = getAbdmConfig();
    return Boolean(config.isEnabled && !config.demoMode && config.clientId && config.clientSecret);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. ABHA CREATION VIA AADHAAR (Section 3.0)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Request Aadhaar OTP for ABHA creation.
   * Calls POST /v3/enrollment/request/otp with encrypted Aadhaar.
   */
  async requestAadhaarEnrolOtp(aadhaarNumber: string): Promise<V3EnrollmentOtpResponse> {
    const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
    if (cleanAadhaar.length !== 12) {
      throw new AbdmV3ClientError("INVALID_AADHAAR", "Aadhaar number must be exactly 12 digits.", 400);
    }

    if (!this.isLive()) {
      return {
        txnId: randomUUID(),
        message: `OTP sent to Aadhaar-registered mobile (SANDBOX DEMO). Enter any 6-digit OTP.`,
      };
    }

    const encryptedAadhaar = await abdmV3Client.encrypt(cleanAadhaar);
    return abdmV3Client.request<V3EnrollmentOtpResponse>("/v3/enrollment/request/otp", {
      method: "POST",
      body: {
        txnId: "",
        scope: ["abha-enrol"],
        loginHint: "aadhaar",
        loginId: encryptedAadhaar,
        otpSystem: "aadhaar",
      },
    });
  }

  /**
   * Enrol ABHA using the received Aadhaar OTP.
   * Calls POST /v3/enrollment/enrol/byAadhaar with encrypted OTP.
   */
  async enrolByAadhaar(input: {
    txnId: string;
    otp: string;
    mobile: string;
  }): Promise<V3EnrollmentResponse> {
    const cleanMobile = input.mobile.replace(/\D/g, "");

    if (!this.isLive()) {
      const mockAbha = `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        message: "Account created successfully (SANDBOX DEMO)",
        txnId: input.txnId,
        tokens: {
          token: "mock-v3-token-" + randomUUID(),
          expiresIn: 1800,
          refreshToken: "mock-v3-refresh-" + randomUUID(),
          refreshExpiresIn: 1296000,
        },
        ABHAProfile: {
          firstName: "Demo",
          lastName: "Patient",
          dob: "01-01-1995",
          gender: "F",
          mobile: cleanMobile,
          ABHANumber: mockAbha,
          abhaStatus: "ACTIVE",
          stateName: "Karnataka",
          districtName: "Bengaluru",
          pinCode: "560001",
          phrAddress: [`demo${Math.floor(100 + Math.random() * 900)}@sbx`],
        },
        isNew: true,
      };
    }

    const encryptedOtp = await abdmV3Client.encrypt(input.otp);
    return abdmV3Client.request<V3EnrollmentResponse>("/v3/enrollment/enrol/byAadhaar", {
      method: "POST",
      body: {
        authData: {
          authMethods: ["otp"],
          otp: {
            txnId: input.txnId,
            otpValue: encryptedOtp,
            mobile: cleanMobile,
          },
        },
        consent: {
          code: "abha-enrollment",
          version: "1.4",
        },
      },
    });
  }

  /**
   * Get ABHA Address suggestions for newly enrolled ABHA.
   * Calls GET /v3/enrollment/enrol/suggestion
   */
  async getAddressSuggestions(txnId: string): Promise<V3AddressSuggestionsResponse> {
    if (!this.isLive()) {
      return {
        txnId,
        abhaAddressList: ["smrko.patient95", "patient.smrkomed", "patient1995", "smrko_care"],
      };
    }

    return abdmV3Client.request<V3AddressSuggestionsResponse>("/v3/enrollment/enrol/suggestion", {
      method: "GET",
      headers: {
        Transaction_Id: txnId,
      },
    });
  }

  /**
   * Set custom ABHA Address against enrollment transaction ID.
   * Calls POST /v3/enrollment/enrol/abha-address
   */
  async createCustomAbhaAddress(input: {
    txnId: string;
    abhaAddress: string;
    preferred?: number | undefined;
  }): Promise<{ txnId: string; healthIdNumber: string; preferredAbhaAddress: string }> {
    if (!this.isLive()) {
      return {
        txnId: input.txnId,
        healthIdNumber: "91-XXXX-XXXX-1234",
        preferredAbhaAddress: input.abhaAddress,
      };
    }

    return abdmV3Client.request("/v3/enrollment/enrol/abha-address", {
      method: "POST",
      body: {
        txnId: input.txnId,
        abhaAddress: input.abhaAddress,
        preferred: input.preferred ?? 1,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. ABHA VERIFICATION & LOGIN (Section 7.0)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Request OTP for ABHA Login (via Mobile or Aadhaar or ABHA Number).
   * Calls POST /v3/profile/login/request/otp
   */
  async requestLoginOtp(input: {
    loginType: "mobile" | "aadhaar" | "abha-number";
    identifier: string;
  }): Promise<V3EnrollmentOtpResponse> {
    if (!this.isLive()) {
      return {
        txnId: randomUUID(),
        message: `OTP sent to registered ${input.loginType} (SANDBOX DEMO). Enter any 6-digit OTP.`,
      };
    }

    const cleanId = input.identifier.replace(/[-\s]/g, "");
    const encryptedId = await abdmV3Client.encrypt(cleanId);

    const scopeMap = {
      mobile: ["abha-login", "mobile-verify"],
      aadhaar: ["abha-login", "aadhaar-verify"],
      "abha-number": ["abha-login", "aadhaar-verify"],
    };

    const otpSystem = input.loginType === "mobile" ? "abdm" : "aadhaar";

    return abdmV3Client.request<V3EnrollmentOtpResponse>("/v3/profile/login/request/otp", {
      method: "POST",
      body: {
        scope: scopeMap[input.loginType],
        loginHint: input.loginType,
        loginId: encryptedId,
        otpSystem,
      },
    });
  }

  /**
   * Verify login OTP and obtain profile token or list of linked accounts.
   * Calls POST /v3/profile/login/verify
   */
  async verifyLoginOtp(input: {
    txnId: string;
    otp: string;
    loginType: "mobile" | "aadhaar" | "abha-number";
  }): Promise<V3LoginVerifyResponse> {
    if (!this.isLive()) {
      const mockAbha = `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        txnId: input.txnId,
        authResult: "success",
        message: "OTP verified successfully (SANDBOX DEMO)",
        token: "mock-v3-login-token-" + randomUUID(),
        accounts: [
          {
            ABHANumber: mockAbha,
            preferredAbhaAddress: "patient@sbx",
            name: "Verified Demo Patient",
            gender: "F",
            dob: "15-05-1992",
            status: "ACTIVE",
            kycVerified: true,
          },
        ],
      };
    }

    const encryptedOtp = await abdmV3Client.encrypt(input.otp);
    const scopeMap = {
      mobile: ["abha-login", "mobile-verify"],
      aadhaar: ["abha-login", "aadhaar-verify"],
      "abha-number": ["abha-login", "aadhaar-verify"],
    };

    return abdmV3Client.request<V3LoginVerifyResponse>("/v3/profile/login/verify", {
      method: "POST",
      body: {
        scope: scopeMap[input.loginType],
        authData: {
          authMethods: ["otp"],
          otp: {
            txnId: input.txnId,
            otpValue: encryptedOtp,
          },
        },
      },
    });
  }

  /**
   * In mobile login where multiple ABHAs exist, select specific ABHA user account.
   * Calls POST /v3/profile/login/verify/user
   */
  async selectLoginUser(input: {
    txnId: string;
    abhaNumber: string;
    tToken: string;
  }): Promise<{ token: string; expiresIn: number; refreshToken?: string }> {
    if (!this.isLive()) {
      return {
        token: "mock-v3-selected-token-" + randomUUID(),
        expiresIn: 1800,
        refreshToken: "mock-v3-refresh-" + randomUUID(),
      };
    }

    return abdmV3Client.request("/v3/profile/login/verify/user", {
      method: "POST",
      headers: {
        "T-token": `Bearer ${input.tToken}`,
      },
      body: {
        ABHANumber: input.abhaNumber,
        txnId: input.txnId,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. PROFILE & IDENTITY ASSETS (Section 9.0, 10.0, 11.0)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get official ABHA profile details using patient X-token.
   * Calls GET /v3/profile/account
   */
  async getProfile(xToken: string): Promise<V3AbhaProfile> {
    if (!this.isLive()) {
      return {
        firstName: "Verified",
        lastName: "Patient",
        dob: "01-01-1995",
        gender: "F",
        mobile: "******9999",
        ABHANumber: "91-1234-5678-9012",
        abhaStatus: "ACTIVE",
        phrAddress: ["patient@sbx"],
      };
    }

    return abdmV3Client.request<V3AbhaProfile>("/v3/profile/account", {
      method: "GET",
      headers: {
        "X-token": `Bearer ${xToken}`,
      },
    });
  }

  /**
   * Get official ABHA Card (base64 or PDF stream).
   * Calls GET /v3/profile/account/abha-card
   */
  async getAbhaCard(xToken: string): Promise<{ cardData?: string; contentType?: string }> {
    if (!this.isLive()) {
      return {
        cardData: "SAMPLE_CARD_DATA_DEMO",
        contentType: "image/png",
      };
    }

    return abdmV3Client.request("/v3/profile/account/abha-card", {
      method: "GET",
      headers: {
        "X-token": `Bearer ${xToken}`,
      },
    });
  }

  /**
   * Get official QR code for patient ABHA profile.
   * Calls GET /v3/profile/account/qrCode
   */
  async getQrCode(xToken: string): Promise<{ qrCode?: string }> {
    if (!this.isLive()) {
      return { qrCode: "data:image/png;base64,SAMPLE_QR_MOCK" };
    }

    return abdmV3Client.request("/v3/profile/account/qrCode", {
      method: "GET",
      headers: {
        "X-token": `Bearer ${xToken}`,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. FACE AUTH ENROLLMENT (Section 6.2.2)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generate transaction ID and QR code URL for FaceAuth on ABHA mobile app.
   * Calls POST /v3/enrollment/enrol/auth/init
   */
  async initFaceAuth(): Promise<{ txnId: string; qrCodeUrl: string; message: string }> {
    const config = getAbdmConfig();
    const phrBase =
      config.environment === "production" ? "https://phr.abdm.gov.in" : "https://phrsbx.abdm.gov.in";

    if (!this.isLive()) {
      const mockTxn = randomUUID();
      return {
        txnId: mockTxn,
        qrCodeUrl: `${phrBase}/face-auth?txnId=${mockTxn}`,
        message: "Transaction ID generated successfully (SANDBOX DEMO)",
      };
    }

    const res = await abdmV3Client.request<{ txnId: string; message: string }>(
      "/v3/enrollment/enrol/auth/init",
      {
        method: "POST",
        body: {
          scope: ["abha-enrol", "face-auth"],
        },
      },
    );

    return {
      txnId: res.txnId,
      qrCodeUrl: `${phrBase}/face-auth?txnId=${res.txnId}`,
      message: res.message,
    };
  }

  /**
   * Poll face capture status from mobile app.
   * Calls POST /v3/enrollment/enrol/capturePID
   */
  async pollFaceAuthCapture(txnId: string): Promise<{ status: string; message: string }> {
    if (!this.isLive()) {
      return { status: "COMPLETE", message: "PID captured successfully (SANDBOX DEMO)" };
    }

    return abdmV3Client.request("/v3/enrollment/enrol/capturePID", {
      method: "POST",
      body: {
        scope: ["abha-enrol", "face-verify"],
        txnId,
      },
    });
  }
}

export const abdmV3Service = new AbdmV3Service();
