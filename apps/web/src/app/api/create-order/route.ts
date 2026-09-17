import { NextRequest, NextResponse } from "next/server";
import { createRazorpayOrder } from "@/server/services/razorpay";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { amount, currency = "INR", receipt, notes } = body;

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { success: false, error: "Amount in paise is required." },
        { status: 400 },
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      return NextResponse.json(
        { success: false, error: "Minimum amount must be at least 100 paise (₹1)." },
        { status: 400 },
      );
    }

    const order = await createRazorpayOrder({
      amount: numAmount,
      currency,
      receipt,
      notes,
    });

    return NextResponse.json(
      {
        success: true,
        order_id: order.order_id,
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        key_id: order.key_id,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create Razorpay order";
    console.error("[Razorpay Create Order Error]:", message);

    if (message.toLowerCase().includes("auth") || message.toLowerCase().includes("credentials")) {
      return NextResponse.json(
        { success: false, error: "Authentication failed. Check Razorpay credentials." },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
