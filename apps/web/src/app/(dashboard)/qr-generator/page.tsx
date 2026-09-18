"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QrCodeView } from "@/components/qr/qr-code-view";

interface ClinicData {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  doctors: { id: string; name: string; specialty: string }[];
}

export default function QrGeneratorDashboardPage() {
  const [clinicData, setClinicData] = useState<ClinicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }

    fetch("/api/qr/clinic-info")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.clinic) {
          setClinicData(data.clinic);
        }
      })
      .catch((err) => console.error("Error fetching clinic data:", err))
      .finally(() => setLoading(false));
  }, []);

  const qrRegistrationUrl = `${origin || "https://smrkomed.demo"}/qr-register`;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 text-foreground">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-4 w-4" />
            <span>Reception Operations</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Hospex Reception QR Code Generator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate and display scannable check-in QR codes for walk-in patients at Hospex Bangalore Clinic.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => window.open("/qr-register", "_blank")}
            className="font-bold gap-2 rounded-xl"
          >
            <Smartphone className="h-4 w-4" />
            Test Patient Scan Flow
          </Button>
        </div>
      </div>

      {/* Target Clinic Verification Badge */}
      <div className="rounded-[24px] border border-primary/20 bg-primary-soft/50 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl gradient-brand text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Target Clinic: Hospex Bangalore Center
                </h3>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                  STRICT BANGALORE ISOLATION
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                12 Lavelle Road, Bangalore 560001 · All registrations persist to Bangalore DB (NOT Kochi)
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-primary/20 sm:pl-4">
            <span className="text-[11px] font-semibold text-primary">
              Assigned Doctors:
            </span>
            <p className="text-xs font-bold text-foreground">
              Dr. Manideep · Dr. Ananya Rao
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: QR Standee Preview & Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Official QR Standee Display */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center rounded-[28px] border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
          <div className="mb-4 text-center">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              RECEPTION COUNTER 2 STAND
            </span>
            <h3 className="mt-2 text-xl font-bold text-foreground">
              Scan to Register & Check In
            </h3>
            <p className="text-xs text-muted-foreground">
              Point your smartphone camera to access registration and the 3 connection options.
            </p>
          </div>

          {/* QR Code Canvas/SVG */}
          <div className="my-4">
            <QrCodeView
              url={qrRegistrationUrl}
              clinicName="Hospex Bangalore Clinic"
              city="Bangalore"
              size={240}
              showActions={true}
            />
          </div>

          <div className="mt-2 text-center text-xs text-muted-foreground">
            <span className="font-mono text-[11px]">
              {qrRegistrationUrl}
            </span>
          </div>
        </div>

        {/* Right Column: Flow Breakdown & Details */}
        <div className="lg:col-span-6 space-y-6">
          {/* Step-by-Step Flow Explanation */}
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h3 className="text-base font-bold text-foreground">
              Complete End-to-End Workflow
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              When a patient scans this QR code, the following sequence executes:
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Optical Scanner Animation
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Scanner animation aligns and verifies the Hospex Bangalore reception code with haptic and audio feedback.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Opens Register Tile
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Smoothly slides open a registration form capturing Full Name, Phone, Age, Purpose, and Preferred Doctor.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Persisted in Bangalore Hospex Clinic DB
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Saves directly into PostgreSQL via Prisma for Bangalore Hospex Clinic (12 Lavelle Road) and strictly bypasses Kochi.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                  4
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Presents the 3 Core Options
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Patient receives 3 interactive choices:
                  </p>
                  <ul className="mt-1.5 list-disc pl-4 text-[11px] text-muted-foreground space-y-0.5">
                    <li><strong>Call:</strong> Direct line to Bangalore reception dialer (+91 80 4000 1200)</li>
                    <li><strong>Chat in WhatsApp:</strong> Pre-filled check-in message to WhatsApp concierge</li>
                    <li><strong>Chat with Smrko AI:</strong> Interactive AI chatbot providing real-time guidance</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Card */}
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h4 className="text-sm font-bold text-foreground">
              Reception Standee Deployment
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Print this standee to display at Reception Counter 2 or provide it on the check-in iPad kiosk.
            </p>
            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                onClick={() => window.open("/qr-register", "_blank")}
                className="gap-2 text-xs font-semibold rounded-xl"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview Patient Screen
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
