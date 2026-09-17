"use client";

import { use, useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, CreditCard, Building2, Phone, Calendar, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { loadRazorpayScript, type RazorpayPaymentSuccessResponse } from "@/lib/razorpay-client";

type InvoiceData = {
  id: string;
  invoiceNumber: string;
  title: string;
  description?: string | null;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  dueDate?: string | null;
  issuedAt: string;
  paidAt?: string | null;
  currency: string;
  clinic: {
    name: string;
    phone?: string | null;
    city?: string | null;
    address?: string | null;
    email?: string | null;
  };
  patient: {
    name: string;
    phone?: string;
    email?: string;
  };
  lines: Array<{
    id: string;
    description: string;
    quantity: number;
    unitAmount: number;
    lineTotal: number;
  }>;
  razorpayKeyId: string;
};

export default function PayInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<{
    paymentId: string;
    amount: number;
  } | null>(null);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/pay/${invoiceId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load invoice.");
      }
      setInvoice(data.invoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load invoice.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInvoice();
  }, [invoiceId]);

  const handlePay = async () => {
    if (!invoice || isPaying) return;

    try {
      setIsPaying(true);

      // 1. Ensure Razorpay checkout script is loaded
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        alert("Unable to load Razorpay SDK. Please check your internet connection.");
        return;
      }

      // 2. Create order on backend
      const orderRes = await fetch(`/api/pay/${invoice.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to initiate payment.");
      }

      // 3. Open Razorpay Checkout Modal
      const options = {
        key: orderData.key_id || invoice.razorpayKeyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: invoice.clinic.name || "Hospex",
        description: `Payment for Invoice #${invoice.invoiceNumber}`,
        order_id: orderData.order_id,
        prefill: {
          name: invoice.patient.name,
          contact: invoice.patient.phone || "",
          email: invoice.patient.email || "",
        },
        theme: {
          color: "#866BE3",
        },
        handler: async (response: RazorpayPaymentSuccessResponse) => {
          try {
            // 4. Verify signature on backend
            const verifyRes = await fetch(`/api/pay/${invoice.id}/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment verification failed.");
            }

            setPaymentSuccess({
              paymentId: response.razorpay_payment_id,
              amount: invoice.outstandingAmount,
            });
            void fetchInvoice();
          } catch (verifyErr) {
            alert(
              verifyErr instanceof Error
                ? verifyErr.message
                : "Payment verification failed. Please contact clinic support with your payment ID: " +
                    response.razorpay_payment_id,
            );
          }
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on("payment.failed", (response: any) => {
        alert(
          `Payment failed: ${response.error?.description || response.error?.reason || "Unknown error"}`,
        );
      });
      razorpayInstance.open();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to open payment gateway.");
    } finally {
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Loading invoice details…</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="size-12 mx-auto text-rose-500 mb-3" />
          <h2 className="text-lg font-bold text-gray-900">Invoice Not Available</h2>
          <p className="mt-1 text-sm text-gray-500">{error || "The requested invoice could not be found."}</p>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === "PAID" || Boolean(paymentSuccess);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-2">
            <Building2 className="size-3.5" />
            {invoice.clinic.name || "Hospex"}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Secure Bill Payment</h1>
          <p className="mt-1 text-sm text-gray-500">
            Invoice #{invoice.invoiceNumber} · {invoice.title}
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden">
          {/* Card Top Banner */}
          <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500 font-medium">Billed To</p>
              <p className="text-base font-bold text-gray-900">{invoice.patient.name}</p>
              {invoice.patient.phone && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Phone className="size-3" /> {invoice.patient.phone}
                </p>
              )}
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isPaid
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isPaid ? "PAID" : "PAYMENT DUE"}
              </span>
              {invoice.dueDate && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 justify-end">
                  <Calendar className="size-3" /> Due {new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          {/* Success Notification if just paid */}
          {paymentSuccess && (
            <div className="m-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 flex items-start gap-3">
              <CheckCircle2 className="size-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Payment Successful!</p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Thank you! Your payment of ₹{paymentSuccess.amount.toLocaleString("en-IN")} has been verified and recorded.
                </p>
                <p className="text-[11px] text-emerald-700 mt-1 font-mono">
                  Transaction ID: {paymentSuccess.paymentId}
                </p>
              </div>
            </div>
          )}

          {/* Line Items Table */}
          <div className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Invoice Summary</h3>
            <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
              {invoice.lines.map((line) => (
                <div key={line.id} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{line.description}</p>
                    <p className="text-xs text-gray-500">Qty: {line.quantity} × ₹{line.unitAmount.toLocaleString("en-IN")}</p>
                  </div>
                  <span className="font-semibold text-gray-900">
                    ₹{line.lineTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Section */}
            <div className="mt-4 pt-2 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>₹{invoice.totalAmount.toLocaleString("en-IN")}</span>
              </div>
              {invoice.paidAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Already Paid</span>
                  <span>- ₹{invoice.paidAmount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total Amount {isPaid ? "Paid" : "Due"}</span>
                <span className={isPaid ? "text-emerald-600" : "text-primary font-extrabold text-2xl"}>
                  ₹{(isPaid ? invoice.totalAmount : invoice.outstandingAmount).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* Action Button */}
            {!isPaid ? (
              <div className="mt-8 space-y-3">
                <Button
                  size="lg"
                  onClick={handlePay}
                  disabled={isPaying}
                  className="w-full h-12 rounded-xl text-base font-bold bg-[#866BE3] hover:bg-[#7254d1] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="size-5" />
                  {isPaying ? "Preparing Payment Gateway…" : `Pay ₹${invoice.outstandingAmount.toLocaleString("en-IN")} with Razorpay`}
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                  <ShieldCheck className="size-4 text-emerald-600" />
                  <span>256-bit Encrypted • UPI, Cards, NetBanking, Wallets supported</span>
                </div>
              </div>
            ) : (
              <div className="mt-8 text-center bg-gray-50 rounded-xl p-4 border border-gray-100">
                <CheckCircle2 className="size-8 text-emerald-600 mx-auto mb-1" />
                <p className="font-bold text-gray-900 text-sm">This invoice has been settled in full</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  A receipt has been recorded with the clinic medical records.
                </p>
              </div>
            )}
          </div>

          {/* Card Footer Clinic Contact */}
          <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-4 text-center text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700">{invoice.clinic.name || "Hospex"}</p>
            {invoice.clinic.address && <p>{invoice.clinic.address}{invoice.clinic.city ? `, ${invoice.clinic.city}` : ""}</p>}
            {invoice.clinic.phone && <p>Support: {invoice.clinic.phone}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
