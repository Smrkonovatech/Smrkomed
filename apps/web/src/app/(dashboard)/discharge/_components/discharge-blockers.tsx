"use client";

import { AlertTriangle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoPatient } from "../demoDischarges";

export function DischargeBlockers({ 
  patient, 
  setPatient 
}: { 
  patient: DemoPatient, 
  setPatient: (p: DemoPatient) => void 
}) {
  const blockers = patient.blockers.filter(b => b.status === "BLOCKED" || b.status === "PENDING");

  if (blockers.length === 0) {
    return (
      <Card className="shadow-sm bg-emerald-50/50 border-emerald-500/20">
        <CardContent className="py-4 flex items-center justify-center text-emerald-700 font-medium">
          No operational blockers.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-rose-200 bg-rose-50/30">
      <CardHeader className="pb-3 border-b border-rose-100">
        <CardTitle className="text-sm font-bold text-rose-700 flex items-center gap-2 uppercase tracking-wide">
          <AlertTriangle className="size-4" />
          Why can't this patient be discharged yet?
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {blockers.map(blocker => (
          <div key={blocker.id} className="bg-white border border-rose-100 p-3 rounded-md shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="font-semibold text-sm text-slate-800">{blocker.label}</p>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                {blocker.status}
              </span>
            </div>
            {blocker.reason && (
              <p className="text-xs text-slate-600 mb-3">{blocker.reason}</p>
            )}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
              <p className="text-xs text-muted-foreground">
                Responsible: <span className="font-medium text-slate-700">{blocker.responsibleRole}</span>
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-primary -mr-2"
                onClick={() => {
                  const newPatient = { ...patient };
                  const bIndex = newPatient.blockers.findIndex(b => b.id === blocker.id);
                  if (bIndex > -1) {
                    const blocker = newPatient.blockers[bIndex];
                    if (blocker) { blocker.status = "CLEARED"; }
                    newPatient.readinessComplete += 1;
                    if (newPatient.readinessComplete === newPatient.readinessTotal) {
                      newPatient.status = "READY_FOR_DOCTOR_REVIEW";
                    }
                    setPatient(newPatient);
                  }
                }}
              >
                Resolve
                <ChevronRight className="ml-1 size-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
