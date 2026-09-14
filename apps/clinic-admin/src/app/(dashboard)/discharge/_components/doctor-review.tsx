"use client";

import { useState } from "react";
import { PenTool, CheckCircle, FileSignature, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DemoPatient } from "../demoDischarges";

export function DoctorReview({ patient, setPatient }: { patient: DemoPatient; setPatient: (p: DemoPatient) => void }) {
  const [showModal, setShowModal] = useState(false);

  const isReady = patient.status === "READY_FOR_DOCTOR_REVIEW";
  const isApproved = patient.status === "DOCTOR_APPROVED" || patient.status === "DISCHARGED";

  const handleApprove = () => {
    const newPatient = { ...patient };
    newPatient.status = "DOCTOR_APPROVED";
    
    const bIndex = newPatient.blockers.findIndex(b => b.category === "DOCTOR_REVIEW");
    if (bIndex > -1) {
      const b = newPatient.blockers[bIndex];
      if (b) { b.status = "CLEARED"; }
    }

    setPatient(newPatient);
    setShowModal(false);
  };

  return (
    <>
      <Card className={`shadow-sm border-2 ${isReady ? 'border-primary bg-primary/5' : isApproved ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200'}`}>
        <CardHeader className="pb-3 border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileSignature className="size-5" />
                Doctor Review
              </CardTitle>
              <CardDescription className="mt-1">Final clinical approval required for discharge</CardDescription>
            </div>
            {isApproved && (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full text-sm font-bold">
                <CheckCircle className="size-4" />
                APPROVED
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          
          {isApproved ? (
            <div className="flex flex-col items-center justify-center py-6">
              <CheckCircle className="size-12 text-emerald-500 mb-3" />
              <p className="font-bold text-lg text-emerald-800">Discharge Approved</p>
              <p className="text-sm text-emerald-600 mt-1">Approved by {patient.doctor} • Just now</p>
            </div>
          ) : isReady ? (
            <div className="space-y-6">
              <div className="bg-white rounded-md p-4 border text-sm space-y-3">
                <p className="font-medium text-slate-800">By approving this discharge, I confirm that:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>I have reviewed the patient's clinical course and investigations.</li>
                  <li>The AI-prepared discharge summary is accurate.</li>
                  <li>Discharge medications have been correctly reconciled.</li>
                  <li>The patient is clinically stable for discharge.</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="flex-1 gap-2 h-12 text-lg" 
                  onClick={() => setShowModal(true)}
                >
                  <PenTool className="size-5" />
                  Approve & Sign
                </Button>
                <Button variant="outline" className="flex-1 h-12 text-lg">
                  Request Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="size-10 mb-3 opacity-50" />
              <p className="font-medium">Not ready for doctor review.</p>
              <p className="text-sm">Complete all operational clearances first.</p>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Demo Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-[400px] shadow-lg animate-in zoom-in-95">
            <CardHeader>
              <CardTitle className="text-xl">Approve Discharge?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700">
                You are approving the discharge for <span className="font-bold">{patient.name}</span>.
              </p>
              <p className="text-sm text-slate-700 mt-2">
                By approving, you confirm the clinical information is accurate and ready for finalization.
              </p>
              <div className="flex justify-end gap-3 mt-8">
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={handleApprove} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle className="size-4" />
                  Approve & Sign
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
