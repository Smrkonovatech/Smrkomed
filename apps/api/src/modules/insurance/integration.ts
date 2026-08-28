/**
 * Insurance integration abstraction.
 * Active provider: Manual / Demo. NHCX and real insurer adapters are not connected.
 */

export type InsuranceIntegrationStatus = {
  mode: "MANUAL_DEMO" | "NHCX_NOT_CONNECTED";
  label: string;
  nhcxConnected: boolean;
  note: string;
};

export interface InsuranceIntegrationAdapter {
  readonly id: string;
  readonly label: string;
  getStatus(): InsuranceIntegrationStatus;
  /** Future: submit pre-auth to external network. Manual adapter records locally only. */
  submitPreAuthorization(input: {
    claimNumber: string;
    amountRequested: number;
  }): Promise<{ accepted: boolean; externalReference: string | null; message: string }>;
}

export class ManualInsuranceProvider implements InsuranceIntegrationAdapter {
  readonly id = "manual-demo";
  readonly label = "Manual / Demo";

  getStatus(): InsuranceIntegrationStatus {
    return {
      mode: "MANUAL_DEMO",
      label: "Manual / Demo",
      nhcxConnected: false,
      note: "Clinic staff manage insurance workflows inside SmrkoMed. No live insurer or NHCX API is connected.",
    };
  }

  async submitPreAuthorization(input: {
    claimNumber: string;
    amountRequested: number;
  }) {
    return {
      accepted: true,
      externalReference: null,
      message: `Pre-authorisation recorded locally for ${input.claimNumber} (₹${input.amountRequested}). Manual / Demo mode — not sent to any insurer.`,
    };
  }
}

/** Placeholder for future NHCX adapter — not connected. */
export class NhcxInsuranceProviderStub implements InsuranceIntegrationAdapter {
  readonly id = "nhcx";
  readonly label = "NHCX";

  getStatus(): InsuranceIntegrationStatus {
    return {
      mode: "NHCX_NOT_CONNECTED",
      label: "NHCX — Not Connected",
      nhcxConnected: false,
      note: "NHCX integration is not implemented. Do not configure credentials here.",
    };
  }

  async submitPreAuthorization(_input: {
    claimNumber: string;
    amountRequested: number;
  }): Promise<{ accepted: boolean; externalReference: string | null; message: string }> {
    throw new Error("NHCX is not connected. Use Manual / Demo mode.");
  }
}

export function getActiveInsuranceIntegration(): InsuranceIntegrationAdapter {
  return new ManualInsuranceProvider();
}

export function getInsuranceIntegrationOverview() {
  const active = getActiveInsuranceIntegration();
  const nhcx = new NhcxInsuranceProviderStub();
  return {
    active: active.getStatus(),
    future: [nhcx.getStatus()],
  };
}
