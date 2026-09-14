"use client";

import { Calendar, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoPatient } from "../demoDischarges";

export function FollowUpPlan({ patient, setPatient }: { patient: DemoPatient; setPatient: (p: DemoPatient) => void }) {
  
  const followUpBlocker = patient.blockers.find(b => b.category === "FOLLOW_UP");
  const isPending = followUpBlocker && (followUpBlocker.status === "PENDING" || followUpBlocker.status === "BLOCKED");

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="size-5" />
          Follow-up Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {isPending ? (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-md text-center space-y-3">
            <p className="text-sm font-medium text-orange-800">Follow-up appointment not scheduled.</p>
            <Button 
              size="sm" 
              className="w-full bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                const newPatient = { ...patient };
                const bIndex = newPatient.blockers.findIndex(b => b.category === "FOLLOW_UP");
                if (bIndex > -1) {
                  const b = newPatient.blockers[bIndex];
                  if (b) { b.status = "CLEARED"; }
                  newPatient.readinessComplete += 1;
                  if (newPatient.readinessComplete === newPatient.readinessTotal) {
                    newPatient.status = "READY_FOR_DOCTOR_REVIEW";
                  }
                  setPatient(newPatient);
                }
              }}
            >
              Schedule Follow-up
            </Button>
          </div>
        ) : (
          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-md space-y-2">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-sm text-emerald-900">Post-OP Review</h4>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Scheduled</span>
            </div>
            <p className="text-sm text-slate-700">Dr. Shreya • Video Consult</p>
            <p className="text-sm font-medium text-emerald-800 mt-2">23 Sep 2026 • 10:00 AM</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
