"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoPatient } from "../demoDischarges";

export function Clearances({ patient }: { patient: DemoPatient; setPatient: (p: DemoPatient) => void }) {
  
  const billingBlocker = patient.blockers.find(b => b.category === "BILLING");
  const insuranceBlocker = patient.blockers.find(b => b.category === "INSURANCE");
  const pharmacyBlocker = patient.blockers.find(b => b.category === "PHARMACY");

  const renderClearanceItem = (title: string, blocker?: { status: string, reason?: string }) => {
    if (!blocker || blocker.status === "CLEARED") {
      return (
        <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">Cleared</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-600">CLEARED</span>
        </div>
      );
    }
    
    if (blocker.status === "BLOCKED") {
      return (
        <div className="flex items-center justify-between p-3 rounded-lg border bg-orange-500/5 border-orange-500/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-orange-500" />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{blocker.reason || "Action required"}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-orange-600">BLOCKED</span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 border-slate-200">
        <div className="flex items-center gap-3">
          <div className="size-5 rounded-full border-2 border-slate-300" />
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-500">PENDING</span>
      </div>
    );
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg">Administrative Clearances</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {renderClearanceItem("Billing", billingBlocker)}
        {renderClearanceItem("Insurance", insuranceBlocker)}
        {renderClearanceItem("Pharmacy", pharmacyBlocker)}
      </CardContent>
    </Card>
  );
}
