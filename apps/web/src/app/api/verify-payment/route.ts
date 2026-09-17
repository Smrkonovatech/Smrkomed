import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/server/services/razorpay";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const order_id = body.razorpay_order_id || body.order_id;
    const payment_id = body.razorpay_payment_id || body.payment_id;
    const signature = body.razorpay_signature || body.signature;

    if (!order_id || !payment_id || !signature) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required verification fields: order_id, payment_id, and signature are required.",
        },
        { status: 400 },
      );
    }

    const isValid = verifyRazorpaySignature({
      order_id,
      payment_id,
      signature,
    });

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment verification failed: Signature mismatch. Do not mark as paid.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Payment verified successfully",
        order_id,
        payment_id,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify Razorpay payment";
    console.error("[Razorpay Verify Payment Error]:", message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
