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

const API_VERSION = "2023-08-01";

function useMock(credentials: GatewayCredentials) {
  return process.env["PAYMENTS_MOCK"] === "1" || (credentials.appId ?? "").startsWith("mock_");
}

function baseUrl(mode: "TEST" | "LIVE") {
  return mode === "LIVE" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function cashfreeFetch(
  credentials: GatewayCredentials,
  mode: "TEST" | "LIVE",
  path: string,
  init?: RequestInit,
) {
  const res = await fetch(`${baseUrl(mode)}${path}`, {
    ...init,
    headers: {
      "x-client-id": credentials.appId ?? "",
      "x-client-secret": credentials.secretKey ?? "",
      "x-api-version": API_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error("Payment gateway request failed");
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export const cashfreeAdapter: PaymentGatewayAdapter = {
  provider: "CASHFREE",
  capabilities: {
    upi: true,
    cards: true,
    netBanking: true,
    paymentLinks: true,
    refunds: true,
  },

  async testConnection(credentials, mode) {
    if (useMock(credentials)) {
      return { ok: true, message: "Mock Cashfree connection OK" };
    }
    if (!credentials.appId || !credentials.secretKey) {
      return { ok: false, message: "Missing Cashfree credentials" };
    }
    try {
      await cashfreeFetch(credentials, mode, "/orders?limit=1");
      return { ok: true, message: "Cashfree connection OK" };
    } catch {
      return { ok: false, message: "Unable to reach Cashfree" };
    }
  },

  async createOrder(credentials, mode, input: CreateOrderInput): Promise<CreateOrderResult> {
    if (useMock(credentials)) {
      return {
        gatewayOrderId: `cf_order_mock_${input.receipt}`,
        paymentLinkUrl: null,
        paymentLinkId: null,
      };
    }
    const data = await cashfreeFetch(credentials, mode, "/orders", {
      method: "POST",
      body: JSON.stringify({
        order_id: input.receipt.slice(0, 45),
        order_amount: input.amountInr,
        order_currency: input.currency || "INR",
        customer_details: {
          customer_id: input.customer?.phone ?? input.receipt,
          customer_name: input.customer?.name,
          customer_email: input.customer?.email,
          customer_phone: input.customer?.phone ?? "9999999999",
        },
        order_note: input.notes ? JSON.stringify(input.notes) : undefined,
      }),
    });
    return {
      gatewayOrderId: String(data["order_id"] ?? input.receipt),
      paymentLinkUrl: typeof data["payment_link"] === "string" ? data["payment_link"] : null,
      paymentLinkId: null,
      raw: data,
    };
  },

  async createPaymentLink(credentials, mode, input): Promise<CreateOrderResult> {
    if (useMock(credentials)) {
      const orderId = `cf_order_mock_${input.receipt}`;
      const linkId = `cf_link_mock_${input.receipt}`;
      return {
        gatewayOrderId: orderId,
        paymentLinkId: linkId,
        paymentLinkUrl: `https://payments.cashfree.com/mock/${linkId}`,
      };
    }
    const data = await cashfreeFetch(credentials, mode, "/links", {
      method: "POST",
      body: JSON.stringify({
        link_id: input.receipt.slice(0, 45),
        link_amount: input.amountInr,
        link_currency: input.currency || "INR",
        link_purpose: input.description ?? input.receipt,
        customer_details: {
          customer_phone: input.customer?.phone ?? "9999999999",
          customer_email: input.customer?.email,
          customer_name: input.customer?.name,
        },
      }),
    });
    return {
      gatewayOrderId: String(data["link_id"] ?? input.receipt),
      paymentLinkId: String(data["cf_link_id"] ?? data["link_id"] ?? ""),
      paymentLinkUrl: typeof data["link_url"] === "string" ? data["link_url"] : null,
      raw: data,
    };
  },

  async verifyPayment(credentials, mode, input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (useMock(credentials)) {
      if (!input.gatewayPaymentId && !input.gatewayOrderId) {
        return { ok: false, status: "PENDING", failureReason: "Payment reference required" };
      }
      return {
        ok: true,
        status: "SUCCESS",
        gatewayPaymentId: input.gatewayPaymentId ?? `cf_pay_mock_${input.gatewayOrderId}`,
        method: "upi",
      };
    }
    if (!input.gatewayOrderId) {
      return { ok: false, status: "PENDING", failureReason: "Order id required" };
    }
    try {
      const data = await cashfreeFetch(credentials, mode, `/orders/${input.gatewayOrderId}`);
      const status = String(data["order_status"] ?? "");
      if (status === "PAID") {
        return {
          ok: true,
          status: "SUCCESS",
          gatewayPaymentId: input.gatewayPaymentId ?? String(data["cf_order_id"] ?? input.gatewayOrderId),
          method: null,
        };
      }
      if (status === "ACTIVE" || status === "PENDING") {
        return {
          ok: false,
          status: "PROCESSING",
          gatewayPaymentId: input.gatewayPaymentId ?? null,
        };
      }
      return {
        ok: false,
        status: "FAILED",
        gatewayPaymentId: input.gatewayPaymentId ?? null,
        failureReason: "Order not paid",
      };
    } catch {
      return { ok: false, status: "FAILED", failureReason: "Unable to verify payment" };
    }
  },

  async createRefund(credentials, mode, input: CreateRefundInput): Promise<CreateRefundResult> {
    if (useMock(credentials)) {
      return {
        ok: true,
        gatewayRefundId: `cf_rfnd_mock_${input.gatewayPaymentId}_${Math.round(input.amountInr * 100)}`,
        status: "SUCCESS",
      };
    }
    try {
      const data = await cashfreeFetch(credentials, mode, `/orders/${input.gatewayPaymentId}/refunds`, {
        method: "POST",
        body: JSON.stringify({
          refund_amount: input.amountInr,
          refund_id: `rfnd_${Date.now()}`,
          refund_note: input.reason,
        }),
      });
      const status = String(data["refund_status"] ?? "");
      return {
        ok: status === "SUCCESS" || status === "PENDING",
        gatewayRefundId: String(data["cf_refund_id"] ?? data["refund_id"] ?? ""),
        status: status === "SUCCESS" ? "SUCCESS" : status === "FAILED" ? "FAILED" : "PROCESSING",
      };
    } catch {
      return { ok: false, status: "FAILED", failureReason: "Refund request failed" };
    }
  },

  verifyWebhookSignature(credentials, rawBody, headers) {
    const signature = headers["x-webhook-signature"] ?? headers["X-Webhook-Signature"];
    const timestamp = headers["x-webhook-timestamp"] ?? headers["X-Webhook-Timestamp"] ?? "";
    const secret = credentials.webhookSecret ?? credentials.secretKey;
    if (!signature || !secret) return false;
    const expected = createHmac("sha256", secret).update(timestamp + rawBody).digest("base64");
    return safeEqual(expected, signature);
  },

  parseWebhook(rawBody) {
    const payload = JSON.parse(rawBody) as {
      type?: string;
      event_time?: string;
      data?: {
        order?: Record<string, unknown>;
        payment?: Record<string, unknown>;
      };
    };
    const order = payload.data?.order ?? {};
    const payment = payload.data?.payment ?? {};
    const gatewayOrderId = typeof order["order_id"] === "string" ? order["order_id"] : undefined;
    const gatewayPaymentId =
      typeof payment["cf_payment_id"] === "string"
        ? String(payment["cf_payment_id"])
        : typeof payment["payment_id"] === "string"
          ? payment["payment_id"]
          : undefined;
    const amount =
      typeof order["order_amount"] === "number"
        ? order["order_amount"]
        : typeof payment["payment_amount"] === "number"
          ? payment["payment_amount"]
          : undefined;
    const orderStatus = typeof order["order_status"] === "string" ? order["order_status"] : undefined;
    let status: string | undefined;
    if (orderStatus === "PAID" || payload.type === "PAYMENT_SUCCESS_WEBHOOK") status = "SUCCESS";
    else if (orderStatus === "EXPIRED" || payload.type === "PAYMENT_FAILED_WEBHOOK") status = "FAILED";
    else if (orderStatus) status = "PROCESSING";

    return {
      externalEventId: String(
        payload.event_time
          ? `${payload.type ?? "event"}_${gatewayPaymentId ?? gatewayOrderId}_${payload.event_time}`
          : `${payload.type ?? "event"}_${gatewayPaymentId ?? gatewayOrderId ?? Date.now()}`,
      ),
      eventType: String(payload.type ?? "payment.unknown"),
      gatewayOrderId,
      gatewayPaymentId,
      status,
      amountInr: typeof amount === "number" ? amount : undefined,
    };
  },
};
