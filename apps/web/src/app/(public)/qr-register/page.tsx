"use client";

import { useState } from "react";
import { QrScannerView } from "@/components/qr/qr-scanner-view";
import { QrRegisterTile, type RegisteredPatientInfo } from "@/components/qr/qr-register-tile";
import { QrActionOptions } from "@/components/qr/qr-action-options";
import { Building2, ShieldCheck, Sparkles } from "lucide-react";

export default function QrRegisterPage() {
  // Step 1: "SCANNING", Step 2: "REGISTER", Step 3: "ACTIONS"
  const [step, setStep] = useState<"SCANNING" | "REGISTER" | "ACTIONS">("SCANNING");
  const [registeredPatient, setRegisteredPatient] = useState<RegisteredPatientInfo | null>(null);

  const handleScanComplete = () => {
    setStep("REGISTER");
  };

  const handleRegistrationSuccess = (patient: RegisteredPatientInfo) => {
    setRegisteredPatient(patient);
    setStep("ACTIONS");
  };

  const handleReset = () => {
    setRegisteredPatient(null);
    setStep("SCANNING");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgb(123_79_224/0.10),_transparent_60%),var(--background)] text-foreground flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-[0.16em] text-primary">SMRKOMED</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                HOSPEX BANGALORE
              </span>
            </div>
            <h1 className="text-sm font-bold tracking-tight text-foreground">
              Patient Reception & Self Check-In
            </h1>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1 text-xs text-muted-foreground shadow-sm">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>12 Lavelle Road · Counter 2</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="my-auto py-6 w-full">
        {step === "SCANNING" && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="mb-6 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
                <Sparkles className="h-3.5 w-3.5" />
                Hospital Reception Check-In
              </span>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Hospex Bangalore QR Check-In
              </h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                Optical scanner verifying your presence at Hospex Clinic Bangalore Center.
              </p>
            </div>

            <QrScannerView onScanComplete={handleScanComplete} />
          </div>
        )}

        {step === "REGISTER" && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-300">
            <QrRegisterTile
              onSuccess={handleRegistrationSuccess}
              onCancel={() => setStep("SCANNING")}
            />
          </div>
        )}

        {step === "ACTIONS" && registeredPatient && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-300">
            <QrActionOptions
              patient={registeredPatient}
              onReset={handleReset}
            />
          </div>
        )}
      </main>

      {/* Bottom Footer */}
      <footer className="mx-auto w-full max-w-3xl py-4 text-center text-xs text-muted-foreground border-t border-border/60">
        <p>
          Hospex Healthcare · Powered by SmrkoMed · Persisted directly to Bangalore Clinic Database
        </p>
      </footer>
    </div>
  );
}
