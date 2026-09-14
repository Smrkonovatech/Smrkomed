"use client";

import { CheckCircle2, Download, Printer, FileText, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoPatient } from "../demoDischarges";

export function DischargeCompletion({ patient, setPatient }: { patient: DemoPatient; setPatient: (p: DemoPatient) => void }) {
  
  const handleComplete = () => {
    const newPatient = { ...patient };
    newPatient.status = "DISCHARGED";
    setPatient(newPatient);
  };

  if (patient.status === "DISCHARGED") {
    return (
      <Card className="shadow-sm border-2 border-emerald-500 bg-emerald-50">
        <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="size-16 text-emerald-500" />
            <div>
              <h3 className="text-2xl font-bold text-emerald-800">DISCHARGE COMPLETED</h3>
              <p className="text-emerald-700 font-medium">Patient successfully discharged just now.</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Button variant="outline" className="w-full justify-start gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-100">
              <Printer className="size-4" />
              Print Final Documents
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-100">
              <FileText className="size-4" />
              View Final Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-2 border-primary bg-primary/5">
      <CardContent className="pt-6">
        <div className="text-center space-y-4 mb-8">
          <h3 className="text-2xl font-bold text-primary tracking-tight">READY TO COMPLETE DISCHARGE</h3>
          <p className="text-slate-600">
            All clearances are resolved and the doctor has approved the discharge summary for <span className="font-bold">{patient.name}</span>.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Button variant="outline" className="h-24 flex flex-col gap-2" disabled>
            <FileText className="size-6 text-muted-foreground" />
            <span className="text-xs">View Summary</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2" disabled>
            <Printer className="size-6 text-muted-foreground" />
            <span className="text-xs">Print Docs</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2" disabled>
            <Download className="size-6 text-muted-foreground" />
            <span className="text-xs">Download PDF</span>
          </Button>
          <Button variant="outline" className="h-24 flex flex-col gap-2" disabled>
            <Calendar className="size-6 text-muted-foreground" />
            <span className="text-xs">Follow-up</span>
          </Button>
        </div>

        <Button size="lg" className="w-full h-14 text-lg font-bold" onClick={handleComplete}>
          Complete Discharge
        </Button>
      </CardContent>
    </Card>
  );
}
