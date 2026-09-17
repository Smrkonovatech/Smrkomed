import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@smrkomed/database";
import { verifyRazorpaySignature } from "@/server/services/razorpay";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const order_id = body.razorpay_order_id || body.order_id;
    const payment_id = body.razorpay_payment_id || body.payment_id;
    const signature = body.razorpay_signature || body.signature;

    if (!order_id || !payment_id || !signature) {
      return NextResponse.json(
        { success: false, error: "Missing required payment verification details." },
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
        { success: false, error: "Payment verification failed: Signature mismatch." },
        { status: 400 },
      );
    }

    const invoice = await prisma.billingInvoice.findUnique({
      where: { id },
      include: {
        clinic: true,
        patient: true,
        couple: { include: { primaryPatient: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }

    const now = new Date();
    const total = Number(invoice.totalAmount);

    // 1. Update invoice to PAID
    const updatedInvoice = await prisma.billingInvoice.update({
      where: { id: invoice.id },
      data: {
        status: "PAID",
        paidAmount: invoice.totalAmount,
        paidAt: now,
      },
    });

    // 2. Update or create BillingPayment record
    const existingPayment = await prisma.billingPayment.findFirst({
      where: { invoiceId: invoice.id, gatewayOrderId: order_id },
      orderBy: { createdAt: "desc" },
    });

    if (existingPayment) {
      await prisma.billingPayment.update({
        where: { id: existingPayment.id },
        data: {
          status: "SUCCESS",
          gatewayPaymentId: payment_id,
          paidAt: now,
          metadata: {
            order_id,
            payment_id,
            signature,
            verifiedAt: now.toISOString(),
          },
        },
      });
    } else {
      await prisma.billingPayment.create({
        data: {
          clinicId: invoice.clinicId,
          invoiceId: invoice.id,
          patientId: invoice.patientId,
          coupleId: invoice.coupleId,
          provider: "RAZORPAY",
          amount: invoice.totalAmount,
          currency: invoice.currency || "INR",
          status: "SUCCESS",
          gatewayOrderId: order_id,
          gatewayPaymentId: payment_id,
          paidAt: now,
          metadata: {
            order_id,
            payment_id,
            signature,
            verifiedAt: now.toISOString(),
          },
        },
      });
    }

    // 3. Mark any related PAYMENT CareTask as completed
    if (invoice.coupleId) {
      await prisma.careTask.updateMany({
        where: {
          clinicId: invoice.clinicId,
          coupleId: invoice.coupleId,
          category: "PAYMENT",
          status: { in: ["WAITING", "IN_PROGRESS", "OVERDUE"] },
          title: { contains: invoice.invoiceNumber },
        },
        data: {
          status: "COMPLETED",
        },
      }).catch(() => undefined);
    }

    // 4. Send WhatsApp confirmation to patient if phone exists
    const patientRecord = invoice.patient ?? invoice.couple?.primaryPatient;
    const phone = patientRecord?.phone || patientRecord?.whatsappNumber;
    const patientName = patientRecord ? `${patientRecord.firstName} ${patientRecord.lastName || ""}`.trim() : "Patient";
    const clinicName = invoice.clinic?.name || "Hospex";

    if (phone) {
      const confirmationMsg = `✅ *Payment Successful!*\n\nDear *${patientName}*,\nWe have successfully received your payment of *₹${total.toLocaleString("en-IN")}* for invoice *#${invoice.invoiceNumber}*.\n\n💳 *Payment ID:* ${payment_id}\n🏥 *Clinic:* ${clinicName}\n📅 *Date:* ${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}\n\nThank you for choosing ${clinicName}!`;

      // Call API internal dispatch or send-to-recipient via loopback
      try {
        const apiUrl = process.env["API_URL"] || "http://localhost:4000";
        // Create conversation message or send via webhook/service
        const conv = await prisma.conversation.findFirst({
          where: {
            clinicId: invoice.clinicId,
            channel: "WHATSAPP",
            OR: [
              ...(patientRecord ? [{ patientId: patientRecord.id }] : []),
              { contactPhone: phone },
              { contactPhone: `+${phone.replace(/\D/g, "")}` },
            ],
          },
        });

        if (conv) {
          await prisma.message.create({
            data: {
              conversationId: conv.id,
              direction: "OUTBOUND",
              senderType: "SYSTEM",
              content: confirmationMsg,
              messageType: "text",
              status: "SENT",
            },
          });
        }
      } catch (err) {
        console.error("[Verify Payment] WhatsApp notification record error:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and recorded successfully.",
      invoiceNumber: updatedInvoice.invoiceNumber,
      paidAmount: total,
      paymentId: payment_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment verification failed";
    console.error("[Payment Verification Error]:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
