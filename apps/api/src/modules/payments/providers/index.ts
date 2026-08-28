import type { PaymentGatewayProvider } from "@prisma/client";

import { cashfreeAdapter } from "./cashfree";
import { payuAdapter } from "./payu";
import { razorpayAdapter } from "./razorpay";
import type { PaymentGatewayAdapter } from "./types";

export type {
  CreateOrderInput,
  CreateOrderResult,
  CreateRefundInput,
  CreateRefundResult,
  GatewayCapabilities,
  GatewayCredentials,
  PaymentGatewayAdapter,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "./types";

const adapters: Record<PaymentGatewayProvider, PaymentGatewayAdapter> = {
  RAZORPAY: razorpayAdapter,
  CASHFREE: cashfreeAdapter,
  PAYU: payuAdapter,
};

export function getAdapter(provider: PaymentGatewayProvider): PaymentGatewayAdapter {
  const adapter = adapters[provider];
  if (!adapter) {
    throw new Error(`Unsupported payment provider: ${provider}`);
  }
  return adapter;
}

export const GATEWAY_CATALOG = [
  {
    provider: "RAZORPAY" as const,
    name: "Razorpay",
    capabilities: razorpayAdapter.capabilities,
  },
  {
    provider: "CASHFREE" as const,
    name: "Cashfree",
    capabilities: cashfreeAdapter.capabilities,
  },
  {
    provider: "PAYU" as const,
    name: "PayU",
    capabilities: payuAdapter.capabilities,
  },
];
