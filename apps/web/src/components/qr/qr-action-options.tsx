"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  PhoneCall,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RegisteredPatientInfo } from "./qr-register-tile";

interface QrActionOptionsProps {
  patient: RegisteredPatientInfo;
  onReset?: () => void;
}

export function QrActionOptions({ patient, onReset }: QrActionOptionsProps) {
  const [activeModal, setActiveModal] = useState<"CARE_VOICE" | "CARE_CONNECT" | null>(null);

  // Care Voice call simulation state
  const [isSimulatingCall, setIsSimulatingCall] = useState(false);
  const [callStatus, setCallStatus] = useState<string>("Ready to connect via Care Voice");

  // Care Connect WhatsApp state
  const [waMessage, setWaMessage] = useState(
    `Hello Hospex Bangalore! I have just checked in at reception via QR Code. My name is ${patient.fullName} (Ref ID: ${patient.id.slice(0, 8)}). Please connect me on Care Connect.`,
  );

  // Handle Care Voice Action
  const handleCallClick = () => {
    setActiveModal("CARE_VOICE");
  };

  const handleSimulateCall = () => {
    setIsSimulatingCall(true);
    setCallStatus("Dialing Hospex Bangalore Reception via Care Voice (+91 80 4000 1200)...");

    setTimeout(() => {
      setCallStatus("Ringing Counter 2 (Ground Floor)...");
    }, 1200);

    setTimeout(() => {
      setCallStatus(
        "Connected with Hospex Reception Coordinator Meera via Care Voice: 'Hello, welcome to Hospex Bangalore! We see your check-in. Please take a seat in Lounge 1.'",
      );
    }, 2800);
  };

  // Handle Care Connect WhatsApp Action
  const handleWhatsAppClick = () => {
    setActiveModal("CARE_CONNECT");
  };

  const openExternalWhatsApp = () => {
    const phone = "918660717328";
    const encoded = encodeURIComponent(waMessage);
    window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
  };

  return (
    <div className="mx-auto w-full max-w-2xl text-foreground">
      {/* Registration Success Banner */}
      <div className="mb-6 overflow-hidden rounded-[28px] border border-border bg-card p-6 sm:p-7 shadow-[var(--shadow-lift)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success border border-success/30 shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-bold text-success">
                  CHECK-IN CONFIRMED
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  REF #{patient.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground mt-0.5">
                Welcome, {patient.fullName}
              </h2>
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3 text-primary" />
                Saved in {patient.clinicName} · {patient.clinicAddress}
              </p>
            </div>
          </div>

          {onReset && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="self-start sm:self-auto gap-1 text-xs rounded-xl"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              New Scan
            </Button>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="mb-6 text-center">
        <h3 className="text-lg font-bold text-foreground">
          Choose How You Would Like to Connect
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Select Care Voice or Care Connect to proceed with your Bangalore clinic visit.
        </p>
      </div>

      {/* 2 Core Options: Care Voice & Care Connect */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        {/* OPTION 1: CARE VOICE (CALLS) */}
        <div
          onClick={handleCallClick}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[var(--shadow-lift)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <PhoneCall className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              VOICE CALL
            </span>
          </div>

          <h4 className="mt-4 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
            Care Voice
          </h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Direct Care Voice audio line to Hospex Bangalore Reception & Clinical Desk.
          </p>

          <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-primary">
            <span>Call with Care Voice</span>
            <span className="font-mono text-[11px]">(+91 80 4000 1200)</span>
          </div>
        </div>

        {/* OPTION 2: CARE CONNECT (WHATSAPP) */}
        <div
          onClick={handleWhatsAppClick}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-success/60 hover:shadow-[var(--shadow-lift)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success-soft text-success group-hover:bg-success group-hover:text-white transition-colors">
              <MessageCircle className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
              WHATSAPP
            </span>
          </div>

          <h4 className="mt-4 text-lg font-bold text-foreground group-hover:text-success transition-colors">
            Care Connect
          </h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Instant WhatsApp concierge with your check-in confirmation and care coordination.
          </p>

          <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-success">
            <span>Open Care Connect</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* ===================== MODAL 1: CARE VOICE ===================== */}
      {activeModal === "CARE_VOICE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-[var(--shadow-lift)]">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <PhoneCall className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Care Voice · Reception Calling
                </h3>
                <p className="text-xs text-muted-foreground">Hospex Bangalore Center · Counter 2</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-primary/20 bg-primary-soft/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Care Voice Direct Line:
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    OPEN NOW
                  </span>
                </div>
                <p className="mt-1 text-xl font-bold text-primary">
                  +91 80 4000 1200
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Hours: Mon–Sat · 08:00 AM – 08:00 PM
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <span className="text-xs font-semibold text-muted-foreground">
                  Emergency Medical Helpline:
                </span>
                <p className="mt-0.5 text-base font-bold text-foreground">
                  +91 80 4000 1299
                </p>
              </div>
            </div>

            {/* Simulated Calling Feedback */}
            {isSimulatingCall && (
              <div className="mt-4 rounded-2xl bg-foreground p-3.5 text-background animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                  <p className="text-xs font-medium">{callStatus}</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <a
                href="tel:+918040001200"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl gradient-brand text-primary-foreground font-bold text-sm shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)]"
              >
                <Phone className="h-4 w-4" />
                Open Phone Dialer (+91 80 4000 1200)
              </a>

              <Button
                variant="outline"
                onClick={handleSimulateCall}
                className="h-10 text-xs rounded-xl"
              >
                Simulate Care Voice Call (In Browser)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL 2: CARE CONNECT (WHATSAPP) ===================== */}
      {activeModal === "CARE_CONNECT" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-[28px] border border-border bg-card p-6 shadow-[var(--shadow-lift)]">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success-soft text-success border border-success/30">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Care Connect · WhatsApp Concierge
                </h3>
                <p className="text-xs text-muted-foreground">Hospex Bangalore (+91 866 071 7328)</p>
              </div>
            </div>

            {/* Simulated WhatsApp Preview Box */}
            <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Care Connect Message Preview:</span>
                <span className="text-success font-bold">Bangalore Desk</span>
              </div>

              <div className="rounded-xl bg-card p-3.5 text-xs text-foreground shadow-sm border border-border">
                <p>{waMessage}</p>
                <div className="mt-2 text-right text-[10px] text-muted-foreground">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
                </div>
              </div>

              <div className="mt-3">
                <label className="text-[11px] text-muted-foreground">Customize message if needed:</label>
                <Input
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  className="mt-1 text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="mt-6">
              <Button
                onClick={openExternalWhatsApp}
                className="w-full bg-success hover:bg-success/90 text-success-foreground font-bold h-11 text-sm rounded-xl shadow-sm"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Launch Care Connect on WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
