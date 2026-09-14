"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, User, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

import { INITIAL_DEMO_DATA, DemoPatient } from "../demoDischarges";

import { DischargeReadiness } from "../_components/discharge-readiness";
import { DischargeBlockers } from "../_components/discharge-blockers";
import { DischargeAiPrep } from "../_components/discharge-ai-prep";
import { ClinicalSummary } from "../_components/clinical-summary";
import { InvestigationSummary } from "../_components/investigation-summary";
import { MedicationReconciliation } from "../_components/medication-reconciliation";
import { DischargeInstructions } from "../_components/discharge-instructions";
import { Clearances } from "../_components/clearances";
import { FollowUpPlan } from "../_components/follow-up-plan";
import { DoctorReview } from "../_components/doctor-review";
import { DischargeTimeline } from "../_components/discharge-timeline";
import { DischargeCompletion } from "../_components/discharge-completion";

export default function DischargeWorkspace() {
  const routeParams = useParams<{ patientId: string }>();
  const patientId = routeParams?.patientId;
  const [patient, setPatient] = useState<DemoPatient | null>(null);

  useEffect(() => {
    if (!patientId) return;
    const data = INITIAL_DEMO_DATA.find(p => p.id === patientId);
    if (data) setPatient(data);
  }, [patientId]);

  if (!patient) return <div className="p-12 text-center text-muted-foreground">Patient not found or loading...</div>;

  return (
    <div className="flex-1 space-y-6 p-6 pb-24 pt-6 bg-slate-50/50">
      
      {/* Top Row: Header */}
      <div className="flex flex-col gap-4 pb-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="h-8 gap-1 -ml-2 text-muted-foreground">
            <Link href="/discharge">
              <ArrowLeft className="size-4" />
              Back to Command Center
            </Link>
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
              {patient.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary">{patient.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1 font-medium">
                  <User className="size-4" />
                  {patient.age} yrs • MRN {patient.mrn}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-4" />
                  {patient.doctor} • {patient.treatment}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 border p-4 rounded-md text-right min-w-[250px]">
            <p className="text-xs font-semibold text-muted-foreground tracking-wider mb-1">ESTIMATED DISCHARGE WINDOW</p>
            <p className="font-bold text-lg text-primary">{patient.estimatedWindow}</p>
            <p className="text-xs text-muted-foreground mt-1">Based on operational readiness.</p>
            <p className="text-[10px] text-muted-foreground mt-2">Last updated: Just now</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column (8 cols) - Clinical & AI Prep */}
        <div className="md:col-span-8 space-y-6">
          {/* Row 1 */}
          <div className="grid gap-6 md:grid-cols-2">
            <DischargeReadiness patient={patient} setPatient={setPatient} />
            <DischargeAiPrep patient={patient} />
          </div>

          {/* Row 2 */}
          <ClinicalSummary />
          <InvestigationSummary />

          {/* Row 3 */}
          <MedicationReconciliation />
          <DischargeInstructions />
        </div>

        {/* Right Column (4 cols) - Blockers & Admin */}
        <div className="md:col-span-4 space-y-6">
          <DischargeBlockers patient={patient} setPatient={setPatient} />
          
          {/* Row 4 */}
          <Clearances patient={patient} setPatient={setPatient} />
          
          {/* Row 5 */}
          <FollowUpPlan patient={patient} setPatient={setPatient} />
          
          <DischargeTimeline patient={patient} />
        </div>
      </div>

      {/* Bottom Area - Doctor Review & Finalization */}
      <div className="max-w-4xl mx-auto space-y-6 pt-8 border-t">
        <DoctorReview patient={patient} setPatient={setPatient} />
        {patient.status === "DOCTOR_APPROVED" || patient.status === "DISCHARGED" ? (
          <DischargeCompletion patient={patient} setPatient={setPatient} />
        ) : null}
      </div>
      
    </div>
  );
}
