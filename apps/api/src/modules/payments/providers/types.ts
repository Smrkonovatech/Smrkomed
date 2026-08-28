export type GatewayCredentials = {
  keyId?: string;
  keySecret?: string;
  appId?: string;
  secretKey?: string;
  merchantKey?: string;
  merchantSalt?: string;
  webhookSecret?: string;
  [k: string]: string | undefined;
};

export type GatewayCapabilities = {
  upi: boolean;
  cards: boolean;
  netBanking: boolean;
  paymentLinks: boolean;
  refunds: boolean;
};

export type CreateOrderInput = {
  amountInr: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
  customer?: { name?: string; email?: string; phone?: string };
};

export type CreateOrderResult = {
  gatewayOrderId: string;
  paymentLinkUrl?: string | null;
  paymentLinkId?: string | null;
  raw?: unknown;
};

export type CreateRefundInput = {
  gatewayPaymentId: string;
  amountInr: number;
  reason?: string | undefined;
};

export type CreateRefundResult = {
  ok: boolean;
  gatewayRefundId?: string | null;
  status: "SUCCESS" | "FAILED" | "PENDING" | "PROCESSING";
  failureReason?: string | null | undefined;
};

export type VerifyPaymentInput = {
  gatewayOrderId?: string | null;
  gatewayPaymentId?: string | null;
  signature?: string | null;
};

export type VerifyPaymentResult = {
  ok: boolean;
  status: "SUCCESS" | "FAILED" | "PENDING" | "PROCESSING";
  gatewayPaymentId?: string | null;
  method?: string | null;
  failureReason?: string | null;
};

export interface PaymentGatewayAdapter {
  readonly provider: "RAZORPAY" | "CASHFREE" | "PAYU";
  readonly capabilities: GatewayCapabilities;
  testConnection(credentials: GatewayCredentials, mode: "TEST" | "LIVE"): Promise<{ ok: boolean; message: string }>;
  createOrder(credentials: GatewayCredentials, mode: "TEST" | "LIVE", input: CreateOrderInput): Promise<CreateOrderResult>;
  createPaymentLink(
    credentials: GatewayCredentials,
    mode: "TEST" | "LIVE",
    input: CreateOrderInput & { description?: string },
  ): Promise<CreateOrderResult>;
  verifyPayment(credentials: GatewayCredentials, mode: "TEST" | "LIVE", input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  createRefund(credentials: GatewayCredentials, mode: "TEST" | "LIVE", input: CreateRefundInput): Promise<CreateRefundResult>;
  verifyWebhookSignature(
    credentials: GatewayCredentials,
    rawBody: string,
    headers: Record<string, string | undefined>,
  ): boolean;
  parseWebhook(rawBody: string): {
    externalEventId: string;
    eventType: string;
    gatewayOrderId?: string | undefined;
    gatewayPaymentId?: string | undefined;
    status?: string | undefined;
    amountInr?: number | undefined;
    smrkomedPaymentId?: string | undefined;
  };
}
