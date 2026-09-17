import { createHmac, timingSafeEqual } from "node:crypto";

export interface CreateOrderParams {
  amount: number; // In paise (minimum 100 paise = ₹1)
  currency?: string | undefined;
  receipt?: string | undefined;
  notes?: Record<string, string | number> | undefined;
}

export interface VerifyPaymentParams {
  order_id?: string | undefined;
  razorpay_order_id?: string | undefined;
  payment_id?: string | undefined;
  razorpay_payment_id?: string | undefined;
  signature?: string | undefined;
  razorpay_signature?: string | undefined;
}

export function getRazorpayCredentials() {
  const keyId =
    process.env["RAZORPAY_KEY_ID"] ||
    process.env["NEXT_PUBLIC_RAZORPAY_KEY_ID"] ||
    "rzp_test_TcYdEzKDyLHssH";
  const keySecret =
    process.env["RAZORPAY_KEY_SECRET"] ||
    "PO8Br4tkbVAc1IWDXSAXEdpO";

  return { keyId, keySecret };
}

/**
 * Creates an order via Razorpay API.
 */
export async function createRazorpayOrder(params: CreateOrderParams) {
  const { keyId, keySecret } = getRazorpayCredentials();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured.");
  }

  const amount = Math.round(params.amount);
  if (isNaN(amount) || amount < 100) {
    throw new Error("Minimum amount must be at least 100 paise (₹1).");
  }

  const currency = (params.currency || "INR").toUpperCase();
  const receipt = params.receipt || `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      notes: params.notes || {},
    }),
  });

  const order = (await response.json()) as {
    id?: string;
    amount?: number;
    currency?: string;
    receipt?: string;
    status?: string;
    error?: { description?: string };
  };

  if (!response.ok || !order.id) {
    const errorMsg = order.error?.description || "Failed to create Razorpay order";
    throw new Error(errorMsg);
  }

  return {
    order_id: order.id,
    id: order.id,
    amount: order.amount ?? amount,
    currency: order.currency ?? currency,
    receipt: order.receipt ?? receipt,
    status: order.status ?? "created",
    key_id: keyId,
  };
}

/**
 * Verifies Razorpay payment signature using HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET).
 */
export function verifyRazorpaySignature(params: VerifyPaymentParams): boolean {
  const { keySecret } = getRazorpayCredentials();
  if (!keySecret) {
    throw new Error("Razorpay secret key is not configured.");
  }

  const orderId = params.razorpay_order_id || params.order_id;
  const paymentId = params.razorpay_payment_id || params.payment_id;
  const signature = params.razorpay_signature || params.signature;

  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  try {
    const expectedBuf = Buffer.from(expectedSignature, "utf-8");
    const signatureBuf = Buffer.from(signature, "utf-8");

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }

    return timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}
