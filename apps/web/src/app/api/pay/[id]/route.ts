import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@smrkomed/database";
import { createRazorpayOrder, getRazorpayCredentials } from "@/server/services/razorpay";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const invoice = await prisma.billingInvoice.findUnique({
      where: { id },
      include: {
        clinic: {
          select: { name: true, phone: true, city: true, address: true, email: true },
        },
        patient: {
          select: { firstName: true, lastName: true, phone: true, email: true, whatsappNumber: true },
        },
        couple: {
          include: {
            primaryPatient: {
              select: { firstName: true, lastName: true, phone: true, email: true, whatsappNumber: true },
            },
          },
        },
        lines: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }

    const patientRecord = invoice.patient ?? invoice.couple?.primaryPatient;
    const patientName = patientRecord
      ? `${patientRecord.firstName} ${patientRecord.lastName || ""}`.trim()
      : "Valued Patient";
    const patientPhone = patientRecord?.phone || patientRecord?.whatsappNumber || "";
    const patientEmail = patientRecord?.email || "";

    const total = Number(invoice.totalAmount);
    const paid = Number(invoice.paidAmount);
    const outstanding = Math.max(0, total - paid);

    const { keyId } = getRazorpayCredentials();

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        title: invoice.title,
        description: invoice.description,
        totalAmount: total,
        paidAmount: paid,
        outstandingAmount: outstanding,
        status: invoice.status,
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
        issuedAt: invoice.issuedAt.toISOString(),
        paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
        currency: invoice.currency || "INR",
        clinic: {
          name: invoice.clinic.name,
          phone: invoice.clinic.phone,
          city: invoice.clinic.city,
          address: invoice.clinic.address,
          email: invoice.clinic.email,
        },
        patient: {
          name: patientName,
          phone: patientPhone,
          email: patientEmail,
        },
        lines: invoice.lines.map((l) => ({
          id: l.id,
          description: l.description,
          quantity: l.quantity,
          unitAmount: Number(l.unitAmount),
          lineTotal: Number(l.lineTotal),
        })),
        razorpayKeyId: keyId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load invoice";
    console.error("[Get Public Invoice Error]:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/pay/[id]
 * Create Razorpay Order for this invoice
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const invoice = await prisma.billingInvoice.findUnique({
      where: { id },
      include: {
        clinic: { select: { id: true, name: true } },
        patient: { select: { firstName: true, lastName: true, phone: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });
    }

    if (invoice.status === "PAID") {
      return NextResponse.json(
        { success: false, error: "This invoice is already paid." },
        { status: 400 },
      );
    }

    const total = Number(invoice.totalAmount);
    const paid = Number(invoice.paidAmount);
    const outstanding = Math.max(0, total - paid);

    if (outstanding <= 0) {
      return NextResponse.json(
        { success: false, error: "No outstanding balance for this invoice." },
        { status: 400 },
      );
    }

    const amountInPaise = Math.round(outstanding * 100);

    const order = await createRazorpayOrder({
      amount: amountInPaise,
      currency: invoice.currency || "INR",
      receipt: `inv_${invoice.invoiceNumber}`,
      notes: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clinicId: invoice.clinicId,
      },
    });

    // Record or update pending payment in database
    await prisma.billingPayment.create({
      data: {
        clinicId: invoice.clinicId,
        invoiceId: invoice.id,
        patientId: invoice.patientId,
        coupleId: invoice.coupleId,
        provider: "RAZORPAY",
        amount: outstanding,
        currency: invoice.currency || "INR",
        status: "PENDING",
        gatewayOrderId: order.order_id,
        metadata: {
          order_id: order.order_id,
          receipt: order.receipt,
        },
      },
    });

    return NextResponse.json({
      success: true,
      order_id: order.order_id,
      amount: order.amount,
      currency: order.currency,
      key_id: order.key_id,
      invoiceNumber: invoice.invoiceNumber,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payment order";
    console.error("[Create Invoice Payment Order Error]:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
