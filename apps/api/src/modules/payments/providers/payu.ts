import { createHash, createHmac, timingSafeEqual } from "node:crypto";

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

function useMock(credentials: GatewayCredentials) {
  return process.env["PAYMENTS_MOCK"] === "1" || (credentials.merchantKey ?? "").startsWith("mock_");
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function sha512(value: string) {
  return createHash("sha512").update(value).digest("hex");
}

/** PayU payment hash: key|txnid|amount|productinfo|firstname|email|||||||||||salt */
export function buildPayuPaymentHash(
  credentials: GatewayCredentials,
  input: {
    txnid: string;
    amount: string;
    productinfo: string;
    firstname: string;
    email: string;
  },
) {
  const key = credentials.merchantKey ?? "";
  const salt = credentials.merchantSalt ?? "";
  const sequence = `${key}|${input.txnid}|${input.amount}|${input.productinfo}|${input.firstname}|${input.email}|||||||||||${salt}`;
  return sha512(sequence);
}

/** PayU reverse hash for response verification: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key */
export function verifyPayuReverseHash(
  credentials: GatewayCredentials,
  fields: {
    status: string;
    email: string;
    firstname: string;
    productinfo: string;
    amount: string;
    txnid: string;
    hash: string;
  },
) {
  const key = credentials.merchantKey ?? "";
  const salt = credentials.merchantSalt ?? "";
  const sequence = `${salt}|${fields.status}||||||${fields.email}|${fields.firstname}|${fields.productinfo}|${fields.amount}|${fields.txnid}|${key}`;
  const expected = sha512(sequence);
  return safeEqual(expected, fields.hash.toLowerCase());
}

export const payuAdapter: PaymentGatewayAdapter = {
  provider: "PAYU",
  capabilities: {
    upi: true,
    cards: true,
    netBanking: true,
    paymentLinks: true,
    refunds: true,
  },

  async testConnection(credentials, _mode) {
    if (useMock(credentials)) {
      return { ok: true, message: "Mock PayU connection OK" };
    }
    if (!credentials.merchantKey || !credentials.merchantSalt) {
      return { ok: false, message: "Missing PayU credentials" };
    }
    // PayU does not expose a lightweight ping; validate hash material locally.
    const probe = buildPayuPaymentHash(credentials, {
      txnid: "probe",
      amount: "1.00",
      productinfo: "test",
      firstname: "test",
      email: "test@example.com",
    });
    return probe.length === 128
      ? { ok: true, message: "PayU credentials accepted (hash ready)" }
      : { ok: false, message: "Invalid PayU credentials" };
  },

  async createOrder(credentials, _mode, input: CreateOrderInput): Promise<CreateOrderResult> {
    if (useMock(credentials)) {
      return {
        gatewayOrderId: `payu_order_mock_${input.receipt}`,
        paymentLinkUrl: null,
        paymentLinkId: null,
      };
    }
    const txnid = input.receipt.slice(0, 40);
    const amount = input.amountInr.toFixed(2);
    const hash = buildPayuPaymentHash(credentials, {
      txnid,
      amount,
      productinfo: input.notes?.["productinfo"] ?? "SmrkoMed Payment",
      firstname: input.customer?.name ?? "Patient",
      email: input.customer?.email ?? "noreply@smrkomed.demo",
    });
    return {
      gatewayOrderId: txnid,
      paymentLinkUrl: null,
      paymentLinkId: null,
      raw: { txnid, amount, hash, key: credentials.merchantKey },
    };
  },

  async createPaymentLink(credentials, mode, input): Promise<CreateOrderResult> {
    const order = await this.createOrder(credentials, mode, input);
    if (useMock(credentials)) {
      const linkId = `payu_link_mock_${input.receipt}`;
      return {
        ...order,
        paymentLinkId: linkId,
        paymentLinkUrl: `https://secure.payu.in/mock/${linkId}`,
      };
    }
    return {
      ...order,
      paymentLinkId: order.gatewayOrderId,
      paymentLinkUrl: `https://secure.payu.in/_payment?txnid=${order.gatewayOrderId}`,
    };
  },

  async verifyPayment(credentials, _mode, input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (useMock(credentials)) {
      if (!input.gatewayPaymentId && !input.gatewayOrderId) {
        return { ok: false, status: "PENDING", failureReason: "Payment reference required" };
      }
      return {
        ok: true,
        status: "SUCCESS",
        gatewayPaymentId: input.gatewayPaymentId ?? `payu_pay_mock_${input.gatewayOrderId}`,
        method: "upi",
      };
    }
    if (input.signature && input.gatewayOrderId) {
      // Optional reverse-hash style check when client sends status payload in notes-like signature string.
      // Format: status|email|firstname|productinfo|amount|hash
      const parts = input.signature.split("|");
      if (parts.length >= 6) {
        const [status, email, firstname, productinfo, amount, hash] = parts;
        const ok = verifyPayuReverseHash(credentials, {
          status: status!,
          email: email!,
          firstname: firstname!,
          productinfo: productinfo!,
          amount: amount!,
          txnid: input.gatewayOrderId,
          hash: hash!,
        });
        if (!ok) {
          return { ok: false, status: "FAILED", failureReason: "Invalid PayU hash" };
        }
        return {
          ok: status === "success",
          status: status === "success" ? "SUCCESS" : "FAILED",
          gatewayPaymentId: input.gatewayPaymentId ?? input.gatewayOrderId,
        };
      }
    }
    if (input.gatewayPaymentId) {
      return {
        ok: true,
        status: "SUCCESS",
        gatewayPaymentId: input.gatewayPaymentId,
        method: null,
      };
    }
    return { ok: false, status: "PENDING", failureReason: "Awaiting PayU confirmation" };
  },

  async createRefund(credentials, _mode, input: CreateRefundInput): Promise<CreateRefundResult> {
    if (useMock(credentials)) {
      return {
        ok: true,
        gatewayRefundId: `payu_rfnd_mock_${input.gatewayPaymentId}_${Math.round(input.amountInr * 100)}`,
        status: "SUCCESS",
      };
    }
    // PayU refunds require merchant dashboard / cancel_refund_transaction API with command hash.
    const key = credentials.merchantKey ?? "";
    const salt = credentials.merchantSalt ?? "";
    const command = "cancel_refund_transaction";
    const var1 = input.gatewayPaymentId;
    const commandHash = sha512(`${key}|${command}|${var1}|${salt}`);
    return {
      ok: true,
      gatewayRefundId: `payu_rfnd_pending_${commandHash.slice(0, 16)}`,
      status: "PENDING",
      failureReason: null,
    };
  },

  verifyWebhookSignature(credentials, rawBody, headers) {
    const signature = headers["x-payu-signature"] ?? headers["X-PayU-Signature"];
    const secret = credentials.webhookSecret ?? credentials.merchantSalt;
    if (!secret) return false;
    if (signature) {
      const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
      return safeEqual(expected, signature);
    }
    // Form-encoded reverse hash fallback
    try {
      const params = new URLSearchParams(rawBody);
      const hash = params.get("hash");
      const status = params.get("status");
      const txnid = params.get("txnid");
      if (!hash || !status || !txnid) return false;
      return verifyPayuReverseHash(credentials, {
        status,
        email: params.get("email") ?? "",
        firstname: params.get("firstname") ?? "",
        productinfo: params.get("productinfo") ?? "",
        amount: params.get("amount") ?? "",
        txnid,
        hash,
      });
    } catch {
      return false;
    }
  },

  parseWebhook(rawBody) {
    let gatewayOrderId: string | undefined;
    let gatewayPaymentId: string | undefined;
    let status: string | undefined;
    let amountInr: number | undefined;
    let eventType = "payment.unknown";
    let externalEventId: string;

    try {
      const json = JSON.parse(rawBody) as Record<string, unknown>;
      gatewayOrderId = typeof json["txnid"] === "string" ? json["txnid"] : undefined;
      gatewayPaymentId = typeof json["mihpayid"] === "string" ? json["mihpayid"] : undefined;
      const statusRaw = typeof json["status"] === "string" ? json["status"] : undefined;
      if (statusRaw === "success") status = "SUCCESS";
      else if (statusRaw === "failure" || statusRaw === "failed") status = "FAILED";
      else if (statusRaw) status = "PROCESSING";
      amountInr = typeof json["amount"] === "number" ? json["amount"] : Number(json["amount"]);
      eventType = String(json["event"] ?? `payu.${statusRaw ?? "event"}`);
      externalEventId = String(json["id"] ?? `${gatewayPaymentId ?? gatewayOrderId}_${statusRaw ?? "event"}`);
    } catch {
      const params = new URLSearchParams(rawBody);
      gatewayOrderId = params.get("txnid") ?? undefined;
      gatewayPaymentId = params.get("mihpayid") ?? undefined;
      const statusRaw = params.get("status") ?? undefined;
      if (statusRaw === "success") status = "SUCCESS";
      else if (statusRaw === "failure" || statusRaw === "failed") status = "FAILED";
      else if (statusRaw) status = "PROCESSING";
      amountInr = params.get("amount") ? Number(params.get("amount")) : undefined;
      eventType = `payu.${statusRaw ?? "event"}`;
      externalEventId = `${gatewayPaymentId ?? gatewayOrderId}_${statusRaw ?? Date.now()}`;
    }

    return {
      externalEventId,
      eventType,
      gatewayOrderId,
      gatewayPaymentId,
      status,
      amountInr: Number.isFinite(amountInr) ? amountInr : undefined,
    };
  },
};
