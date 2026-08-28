import { createHmac, timingSafeEqual } from "node:crypto";

import type {
  CreateOrderInput,
  CreateOrderResult,
  CreateRefundInput,
  CreateRefundResult,
  GatewayCredentials,
  PaymentGatewayAdapter,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "./types";

const BASE_URL = "https://api.razorpay.com/v1";

function useMock(credentials: GatewayCredentials) {
  return process.env["PAYMENTS_MOCK"] === "1" || (credentials.keyId ?? "").startsWith("mock_");
}

function basicAuth(credentials: GatewayCredentials) {
  const keyId = credentials.keyId ?? "";
  const keySecret = credentials.keySecret ?? "";
  return Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

async function razorpayFetch(credentials: GatewayCredentials, path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${basicAuth(credentials)}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error("Payment gateway request failed");
  }
  return res.json() as Promise<Record<string, unknown>>;
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const razorpayAdapter: PaymentGatewayAdapter = {
  provider: "RAZORPAY",
  capabilities: {
    upi: true,
    cards: true,
    netBanking: true,
    paymentLinks: true,
    refunds: true,
  },

  async testConnection(credentials, _mode) {
    if (useMock(credentials)) {
      return { ok: true, message: "Mock Razorpay connection OK" };
    }
    if (!credentials.keyId || !credentials.keySecret) {
      return { ok: false, message: "Missing Razorpay credentials" };
    }
    try {
      await razorpayFetch(credentials, "/orders?count=1");
      return { ok: true, message: "Razorpay connection OK" };
    } catch {
      return { ok: false, message: "Unable to reach Razorpay" };
    }
  },

  async createOrder(credentials, _mode, input: CreateOrderInput): Promise<CreateOrderResult> {
    if (useMock(credentials)) {
      return {
        gatewayOrderId: `order_mock_${input.receipt}`,
        paymentLinkUrl: null,
        paymentLinkId: null,
      };
    }
    const amountPaise = Math.round(input.amountInr * 100);
    const data = await razorpayFetch(credentials, "/orders", {
      method: "POST",
      body: JSON.stringify({
        amount: amountPaise,
        currency: input.currency || "INR",
        receipt: input.receipt,
        notes: input.notes ?? {},
      }),
    });
    return {
      gatewayOrderId: String(data["id"] ?? ""),
      paymentLinkUrl: null,
      paymentLinkId: null,
      raw: data,
    };
  },

  async createPaymentLink(credentials, _mode, input): Promise<CreateOrderResult> {
    if (useMock(credentials)) {
      const orderId = `order_mock_${input.receipt}`;
      const linkId = `plink_mock_${input.receipt}`;
      return {
        gatewayOrderId: orderId,
        paymentLinkId: linkId,
        paymentLinkUrl: `https://rzp.io/mock/${linkId}`,
      };
    }
    const amountPaise = Math.round(input.amountInr * 100);
    const data = await razorpayFetch(credentials, "/payment_links", {
      method: "POST",
      body: JSON.stringify({
        amount: amountPaise,
        currency: input.currency || "INR",
        accept_partial: false,
        description: input.description ?? input.receipt,
        reference_id: input.receipt.slice(0, 40),
        customer: {
          name: input.customer?.name,
          email: input.customer?.email,
          contact: input.customer?.phone,
        },
        notes: input.notes ?? {},
      }),
    });
    const orderId =
      typeof data["order_id"] === "string"
        ? data["order_id"]
        : typeof (data["id"] as string | undefined) === "string"
          ? String(data["id"])
          : `plink_${input.receipt}`;
    return {
      gatewayOrderId: orderId,
      paymentLinkId: String(data["id"] ?? ""),
      paymentLinkUrl: typeof data["short_url"] === "string" ? data["short_url"] : null,
      raw: data,
    };
  },

  async verifyPayment(credentials, _mode, input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (useMock(credentials)) {
      if (!input.gatewayPaymentId) {
        return { ok: false, status: "PENDING", failureReason: "Payment id required" };
      }
      if (input.signature && input.gatewayOrderId && credentials.keySecret) {
        const expected = createHmac("sha256", credentials.keySecret)
          .update(`${input.gatewayOrderId}|${input.gatewayPaymentId}`)
          .digest("hex");
        if (!safeEqual(expected, input.signature)) {
          return { ok: false, status: "FAILED", failureReason: "Invalid signature" };
        }
      }
      return {
        ok: true,
        status: "SUCCESS",
        gatewayPaymentId: input.gatewayPaymentId,
        method: "upi",
      };
    }
    if (!input.gatewayPaymentId) {
      return { ok: false, status: "PENDING", failureReason: "Payment id required" };
    }
    if (input.signature && input.gatewayOrderId && credentials.keySecret) {
      const expected = createHmac("sha256", credentials.keySecret)
        .update(`${input.gatewayOrderId}|${input.gatewayPaymentId}`)
        .digest("hex");
      if (!safeEqual(expected, input.signature)) {
        return { ok: false, status: "FAILED", failureReason: "Invalid signature" };
      }
    }
    try {
      const data = await razorpayFetch(credentials, `/payments/${input.gatewayPaymentId}`);
      const status = String(data["status"] ?? "");
      if (status === "captured" || status === "authorized") {
        return {
          ok: true,
          status: "SUCCESS",
          gatewayPaymentId: String(data["id"] ?? input.gatewayPaymentId),
          method: typeof data["method"] === "string" ? data["method"] : null,
        };
      }
      if (status === "failed") {
        return {
          ok: false,
          status: "FAILED",
          gatewayPaymentId: input.gatewayPaymentId,
          failureReason: typeof data["error_description"] === "string" ? data["error_description"] : "Payment failed",
        };
      }
      return { ok: false, status: "PROCESSING", gatewayPaymentId: input.gatewayPaymentId };
    } catch {
      return { ok: false, status: "FAILED", failureReason: "Unable to verify payment" };
    }
  },

  async createRefund(credentials, _mode, input: CreateRefundInput): Promise<CreateRefundResult> {
    if (useMock(credentials)) {
      return {
        ok: true,
        gatewayRefundId: `rfnd_mock_${input.gatewayPaymentId}_${Math.round(input.amountInr * 100)}`,
        status: "SUCCESS",
      };
    }
    try {
      const data = await razorpayFetch(credentials, `/payments/${input.gatewayPaymentId}/refund`, {
        method: "POST",
        body: JSON.stringify({
          amount: Math.round(input.amountInr * 100),
          notes: input.reason ? { reason: input.reason } : undefined,
        }),
      });
      const status = String(data["status"] ?? "");
      return {
        ok: status === "processed" || status === "pending",
        gatewayRefundId: String(data["id"] ?? ""),
        status: status === "processed" ? "SUCCESS" : status === "failed" ? "FAILED" : "PROCESSING",
      };
    } catch {
      return { ok: false, status: "FAILED", failureReason: "Refund request failed" };
    }
  },

  verifyWebhookSignature(credentials, rawBody, headers) {
    const signature = headers["x-razorpay-signature"] ?? headers["X-Razorpay-Signature"];
    const secret = credentials.webhookSecret ?? credentials.keySecret;
    if (!signature || !secret) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    return safeEqual(expected, signature);
  },

  parseWebhook(rawBody) {
    const payload = JSON.parse(rawBody) as {
      event?: string;
      id?: string;
      payload?: {
        payment?: { entity?: Record<string, unknown> };
        order?: { entity?: Record<string, unknown> };
      };
    };
    const payment = payload.payload?.payment?.entity ?? {};
    const order = payload.payload?.order?.entity ?? {};
    const gatewayPaymentId = typeof payment["id"] === "string" ? payment["id"] : undefined;
    const gatewayOrderId =
      typeof payment["order_id"] === "string"
        ? payment["order_id"]
        : typeof order["id"] === "string"
          ? order["id"]
          : undefined;
    const amountPaise = typeof payment["amount"] === "number" ? payment["amount"] : undefined;
    const statusRaw = typeof payment["status"] === "string" ? payment["status"] : undefined;
    let status: string | undefined;
    if (statusRaw === "captured" || statusRaw === "authorized") status = "SUCCESS";
    else if (statusRaw === "failed") status = "FAILED";
    else if (statusRaw) status = "PROCESSING";

    // Prefer SmrkoMed payment id from order notes when gatewayOrderId lookup is not yet available.
    const notes = (payment["notes"] ?? order["notes"]) as Record<string, unknown> | undefined;
    const smrkomedPaymentId =
      notes && typeof notes["smrkomedPaymentId"] === "string" ? notes["smrkomedPaymentId"] : undefined;

    return {
      externalEventId: String(payload.id ?? `${payload.event ?? "event"}_${gatewayPaymentId ?? gatewayOrderId ?? Date.now()}`),
      eventType: String(payload.event ?? "payment.unknown"),
      gatewayOrderId,
      gatewayPaymentId,
      status,
      amountInr: amountPaise !== undefined ? amountPaise / 100 : undefined,
      smrkomedPaymentId,
    };
  },
};
