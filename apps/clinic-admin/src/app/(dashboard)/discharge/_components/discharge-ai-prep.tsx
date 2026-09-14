"use client";

import { Sparkles, FileText, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoPatient } from "../demoDischarges";
import { Progress } from "@/components/ui/progress";

export function DischargeAiPrep({ patient }: { patient: DemoPatient }) {
  return (
    <Card className="shadow-sm border-t-4 border-t-purple-500 h-full flex flex-col bg-purple-50/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
          <Sparkles className="size-5" />
          AI Preparation
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pt-4">
        <p className="text-sm text-muted-foreground mb-6">
          SmrkoMed has prepared the discharge draft using available clinical records.
        </p>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-end mb-1">
              <span className="text-xs font-bold tracking-wider text-muted-foreground">INFORMATION COVERAGE</span>
              <span className="text-lg font-bold text-purple-700">{patient.aiCoverage}%</span>
            </div>
            <Progress value={patient.aiCoverage} className="h-2 bg-purple-100" />
          </div>

          <div className="pt-4 border-t border-purple-500/10">
            <h4 className="text-xs font-bold text-muted-foreground tracking-wider mb-3">SOURCES USED</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Consultation Note (18 Sep)</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Procedure Report (18 Sep)</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Medication Record (18 Sep)</span>
              </li>
            </ul>
          </div>
        </div>

      </CardContent>
      <CardFooter className="pt-0">
        <Button variant="outline" className="w-full gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800">
          <FileText className="size-4" />
          Review Draft Summary
        </Button>
      </CardFooter>
    </Card>
  );
}
