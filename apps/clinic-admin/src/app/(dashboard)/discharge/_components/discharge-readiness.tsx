"use client";

import { useState } from "react";
import { PlayCircle, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoPatient } from "../demoDischarges";

export function DischargeReadiness({ 
  patient, 
  setPatient 
}: { 
  patient: DemoPatient, 
  setPatient: (p: DemoPatient) => void 
}) {
  const [isChecking, setIsChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [stage, setStage] = useState(0);

  const stages = [
    "Checking clinical documentation...",
    "Checking investigations...",
    "Checking medication reconciliation...",
    "Checking billing...",
    "Checking insurance...",
    "Checking pharmacy...",
    "Checking follow-up...",
    "Checking doctor review..."
  ];

  const handleCheck = () => {
    setIsChecking(true);
    setStage(0);
    
    let currentStage = 0;
    const interval = setInterval(() => {
      currentStage++;
      if (currentStage >= stages.length) {
        clearInterval(interval);
        setIsChecking(false);
        setChecked(true);
      } else {
        setStage(currentStage);
      }
    }, 400); // Fast animation for demo
  };

  const readinessPercent = Math.round((patient.readinessComplete / patient.readinessTotal) * 100);

  return (
    <Card className="shadow-sm border-t-4 border-t-emerald-500 h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Readiness Engine</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 pt-4 pb-2">
        {(!checked && !isChecking) && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-8">
            <div className="relative size-32 rounded-full border-8 border-muted flex items-center justify-center">
              <span className="text-3xl font-bold text-muted-foreground">?</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-[200px]">
              Verify all operational requirements for discharge.
            </p>
            <Button onClick={handleCheck} size="lg" className="w-full mt-4">
              <PlayCircle className="mr-2 size-5" />
              Check Readiness
            </Button>
          </div>
        )}

        {isChecking && (
          <div className="h-full flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-6"></div>
            <p className="text-sm font-medium animate-pulse">{stages[stage]}</p>
          </div>
        )}

        {checked && (
          <div className="h-full flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4">
            <div className="relative size-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" className="stroke-muted" strokeWidth="12" fill="none" />
                <circle 
                  cx="80" cy="80" r="70" 
                  className={readinessPercent === 100 ? "stroke-emerald-500" : "stroke-amber-500"} 
                  strokeWidth="12" fill="none" 
                  strokeDasharray="440"
                  strokeDashoffset={440 - (440 * readinessPercent) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{readinessPercent}%</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center mt-1 leading-tight">
                  Operationally<br/>Ready
                </span>
              </div>
            </div>
            
            <div className="mt-6 text-sm font-medium text-center">
              <span className={readinessPercent === 100 ? "text-emerald-600" : "text-amber-600"}>
                {patient.readinessComplete} / {patient.readinessTotal} Areas Complete
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
