import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { AppEnv } from "../types";

export const razorpayRoutes = new Hono<AppEnv>();

function getRazorpayConfig() {
  const keyId =
    process.env["RAZORPAY_KEY_ID"] ||
    process.env["NEXT_PUBLIC_RAZORPAY_KEY_ID"] ||
    "rzp_test_TcYdEzKDyLHssH";
  const keySecret =
    process.env["RAZORPAY_KEY_SECRET"] ||
    "PO8Br4tkbVAc1IWDXSAXEdpO";

  return { keyId, keySecret };
}

// POST /api/create-order or /api/v1/payments/create-order
razorpayRoutes.post("/create-order", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { amount, currency = "INR", receipt, notes } = body;

    if (amount === undefined || amount === null) {
      return c.json({ success: false, error: "Amount in paise is required." }, 400);
    }

    const numAmount = Math.round(Number(amount));
    if (isNaN(numAmount) || numAmount < 100) {
      return c.json({ success: false, error: "Minimum amount must be at least 100 paise (₹1)." }, 400);
    }

    const { keyId, keySecret } = getRazorpayConfig();
    if (!keyId || !keySecret) {
      return c.json({ success: false, error: "Razorpay credentials are not configured." }, 500);
    }

    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
    const orderPayload = {
      amount: numAmount,
      currency: (currency || "INR").toUpperCase(),
      receipt: receipt || `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      notes: notes || {},
    };

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = (await response.json()) as {
      id?: string;
      amount?: number;
      currency?: string;
      receipt?: string;
      status?: string;
      error?: { description?: string };
    };

    if (!response.ok || !data.id) {
      const errMsg = data.error?.description || "Failed to create order with Razorpay API";
      const status = response.status === 401 ? 401 : 500;
      return c.json({ success: false, error: errMsg }, status);
    }

    return c.json({
      success: true,
      order_id: data.id,
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      receipt: data.receipt,
      status: data.status,
      key_id: keyId,
    }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return c.json({ success: false, error: message }, 500);
  }
});

// POST /api/verify-payment or /api/v1/payments/verify-payment
razorpayRoutes.post("/verify-payment", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const order_id = body.razorpay_order_id || body.order_id;
    const payment_id = body.razorpay_payment_id || body.payment_id;
    const signature = body.razorpay_signature || body.signature;

    if (!order_id || !payment_id || !signature) {
      return c.json(
        {
          success: false,
          error: "Missing required verification fields: order_id, payment_id, and signature are required.",
        },
        400,
      );
    }

    const { keySecret } = getRazorpayConfig();
    if (!keySecret) {
      return c.json({ success: false, error: "Razorpay secret key is not configured." }, 500);
    }

    const expectedSignature = createHmac("sha256", keySecret)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    let isMatch = false;
    try {
      const expectedBuf = Buffer.from(expectedSignature, "utf-8");
      const signatureBuf = Buffer.from(signature, "utf-8");
      isMatch =
        expectedBuf.length === signatureBuf.length &&
        timingSafeEqual(expectedBuf, signatureBuf);
    } catch {
      isMatch = false;
    }

    if (!isMatch) {
      return c.json(
        {
          success: false,
          error: "Payment verification failed: Signature mismatch. Do not mark as paid.",
        },
        400,
      );
    }

    return c.json(
      {
        success: true,
        message: "Payment verified successfully",
        order_id,
        payment_id,
      },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return c.json({ success: false, error: message }, 500);
  }
});
