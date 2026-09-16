"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle2, AlertCircle, ArrowUpRight } from "lucide-react";

interface BillingSummaryModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  p360?: any;
  coupleId?: string;
}

export function BillingSummaryModal({
  isOpen,
  onOpenChange,
  p360,
  coupleId,
}: BillingSummaryModalProps) {
  const invoices = p360?.invoices || [];
  const summary = p360?.summaryCards || {};
  const outstanding = Number(summary?.outstandingAmountInr || 0);
  const paymentStatus = summary?.paymentStatus || (outstanding > 0 ? "OUTSTANDING" : "CLEAR");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Billing & Payment Overview
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Financial records and ledger for this couple
              </p>
            </div>
          </div>
          <Badge
            className={`text-xs px-2.5 py-1 ${
              paymentStatus === "OUTSTANDING"
                ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            {paymentStatus === "OUTSTANDING" ? `Due: ₹${outstanding.toLocaleString("en-IN")}` : "All Cleared (₹0 due)"}
          </Badge>
        </DialogHeader>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[11px] text-gray-500 font-medium">Status</p>
              <p className="text-sm font-bold text-gray-900 mt-1 flex items-center gap-1.5">
                {paymentStatus === "OUTSTANDING" ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Pending
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Clear
                  </>
                )}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[11px] text-gray-500 font-medium">Outstanding</p>
              <p className={`text-sm font-bold mt-1 ${outstanding > 0 ? "text-amber-700" : "text-gray-900"}`}>
                ₹{outstanding.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-[11px] text-gray-500 font-medium">Invoices</p>
              <p className="text-sm font-bold text-gray-900 mt-1">
                {invoices.length} recorded
              </p>
            </div>
          </div>

          {/* Invoices List */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              Invoices & Receipts
            </h3>

            {invoices.length > 0 ? (
              <div className="space-y-2">
                {invoices.map((inv: any, idx: number) => {
                  const invTotal = Number(inv.totalAmount || inv.total || 0);
                  const invPaid = Number(inv.paidAmount || inv.paid || 0);
                  const invBalance = Math.max(0, invTotal - invPaid);
                  const dateStr = inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

                  return (
                    <div
                      key={inv.id || idx}
                      className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors bg-white flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-800">
                            {inv.invoiceNumber || `INV-${inv.id?.slice(-6)?.toUpperCase() || "001"}`}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] py-0 px-1.5 font-semibold ${
                              inv.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {inv.status || (invBalance === 0 ? "PAID" : "PENDING")}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{dateStr}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-900">
                          ₹{invTotal.toLocaleString("en-IN")}
                        </p>
                        {invBalance > 0 && (
                          <p className="text-[10px] text-amber-600 font-semibold">
                            ₹{invBalance.toLocaleString("en-IN")} due
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center border rounded-xl border-dashed border-gray-200">
                <p className="text-xs text-gray-500 font-medium">No invoices generated yet</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Billing items will automatically reflect as consultations and medications are ordered.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Close
          </Button>
          <Link href="/billing">
            <Button size="sm" className="bg-[#866BE3] hover:bg-[#7254d1] text-white text-xs gap-1.5">
              Open Billing Module
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
