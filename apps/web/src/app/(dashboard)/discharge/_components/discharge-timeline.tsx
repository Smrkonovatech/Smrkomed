"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoPatient } from "../demoDischarges";

export function DischargeTimeline({ patient }: { patient: DemoPatient }) {
  
  const getStatusIcon = (status: string) => {
    if (status === "DONE") return <CheckCircle2 className="size-5 text-emerald-500" />;
    return <Circle className="size-5 text-muted-foreground" />;
  };

  const getEventClass = (status: string) => {
    if (status === "DONE") return "opacity-100";
    return "opacity-50";
  };

  const { timeline } = patient;

  // Derive dynamic state for clearances and doctor based on real patient status
  const clearancesDone = patient.readinessComplete === patient.readinessTotal;
  const doctorDone = patient.status === "DOCTOR_APPROVED" || patient.status === "DISCHARGED";
  const dischargedDone = patient.status === "DISCHARGED";

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg">Timeline</CardTitle>
      </CardHeader>
      <CardContent className="pt-6 relative">
        <div className="absolute left-[35px] top-6 bottom-6 w-0.5 bg-border" />
        
        <div className="space-y-6 relative">
          <div className="flex gap-4">
            <div className="relative z-10 bg-background rounded-full p-1 border">
              {getStatusIcon(timeline.treatmentCompleted.status)}
            </div>
            <div>
              <p className="text-sm font-medium">Treatment Completed</p>
              <p className="text-xs text-muted-foreground">{timeline.treatmentCompleted.time || "Pending"} • {timeline.treatmentCompleted.by}</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="relative z-10 bg-background rounded-full p-1 border">
              {getStatusIcon(timeline.dischargeInitiated.status)}
            </div>
            <div>
              <p className="text-sm font-medium">Discharge Initiated</p>
              <p className="text-xs text-muted-foreground">{timeline.dischargeInitiated.time || "Pending"} • {timeline.dischargeInitiated.by}</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="relative z-10 bg-background rounded-full p-1 border border-purple-200">
              <CheckCircle2 className="size-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-800">Information Prepared</p>
              <p className="text-xs text-muted-foreground">{timeline.informationPrepared.time || "Pending"} • SmrkoMed AI</p>
            </div>
          </div>
          
          <div className={`flex gap-4 ${getEventClass(clearancesDone ? "DONE" : "PENDING")}`}>
            <div className="relative z-10 bg-background rounded-full p-1 border">
              {getStatusIcon(clearancesDone ? "DONE" : "PENDING")}
            </div>
            <div>
              <p className="text-sm font-medium">Clearances Completed</p>
              <p className="text-xs text-muted-foreground">{clearancesDone ? "Just now • Admin Team" : "Pending"}</p>
            </div>
          </div>

          <div className={`flex gap-4 ${getEventClass(doctorDone ? "DONE" : "PENDING")}`}>
            <div className="relative z-10 bg-background rounded-full p-1 border">
               {getStatusIcon(doctorDone ? "DONE" : "PENDING")}
            </div>
            <div>
              <p className="text-sm font-medium">Doctor Approved</p>
              <p className="text-xs text-muted-foreground">{doctorDone ? `Just now • ${patient.doctor}` : "Awaiting sign-off"}</p>
            </div>
          </div>

          <div className={`flex gap-4 ${getEventClass(dischargedDone ? "DONE" : "PENDING")}`}>
            <div className="relative z-10 bg-background rounded-full p-1 border">
              {getStatusIcon(dischargedDone ? "DONE" : "PENDING")}
            </div>
            <div>
              <p className="text-sm font-medium">Discharged</p>
              <p className="text-xs text-muted-foreground">{dischargedDone ? "Just now" : "Awaiting completion"}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
