"use client";

import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  PhoneCall,
  PhoneOff,
  RefreshCw,
  X,
  Loader2,
  Clock,
  Volume2,
  Edit2,
  AlertCircle,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { RegisteredPatientInfo } from "./qr-register-tile";

interface QrActionOptionsProps {
  patient: RegisteredPatientInfo;
  onReset?: () => void;
}

type CallState = "IDLE" | "CALLING" | "RINGING" | "CONNECTED" | "COMPLETED" | "FAILED";

export function QrActionOptions({ patient, onReset }: QrActionOptionsProps) {
  const [activeModal, setActiveModal] = useState<"CARE_VOICE" | "CARE_CONNECT" | null>(null);

  // Care Voice call state
  const [callState, setCallState] = useState<CallState>("IDLE");
  const [targetPhone, setTargetPhone] = useState<string>(patient.phone);
  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(false);
  const [phoneInput, setPhoneInput] = useState<string>(patient.phone);
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "kn" | "hi" | "ta" | "te">("en");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(90);
  const [callError, setCallError] = useState<string | null>(null);
  const [callerNumber, setCallerNumber] = useState<string>("+91 80 6426 5889");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Care Connect WhatsApp state
  const [waMessage, setWaMessage] = useState(
    `hi bro`,
  );

  // Sync targetPhone if patient changes
  useEffect(() => {
    setTargetPhone(patient.phone);
    setPhoneInput(patient.phone);
  }, [patient.phone]);

  // Countdown timer when call is CONNECTED
  useEffect(() => {
    if (callState === "CONNECTED") {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setCallState("COMPLETED");
            toast.info("Care Voice call reached the 90-second duration limit.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callState]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  };

  // Handle Care Voice Initiation
  const handleInitiateCareVoiceCall = async (overridePhone?: string) => {
    const phoneToCall = (overridePhone || targetPhone).trim();
    if (!phoneToCall || phoneToCall.replace(/\D/g, "").length < 10) {
      toast.error("Please provide a valid 10-digit phone number.");
      return;
    }

    setCallState("CALLING");
    setCallError(null);
    setSecondsRemaining(90);

    try {
      const response = await fetch("/api/ai/outbound-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneToCall,
          patientName: patient.fullName,
          clinicName: patient.clinicName,
          callType: "CARE_VOICE_CHECKIN",
          maxDurationSeconds: 90,
          language: selectedLanguage,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg =
          data?.error?.message ||
          data?.error?.details?.error?.message ||
          "Could not initiate Care Voice call.";
        setCallError(errorMsg);
        setCallState("FAILED");
        toast.error(`Call failed: ${errorMsg}`);
        return;
      }

      if (data.details?.agentNumber) {
        setCallerNumber(data.details.agentNumber);
      }

      // Transition from CALLING to RINGING immediately
      setCallState("RINGING");
      toast.success(`📞 Incoming Care Voice call dispatched to ${phoneToCall}!`);

      // Automatically transition to CONNECTED after 3 seconds for active conversation timer
      setTimeout(() => {
        setCallState((current) => (current === "RINGING" ? "CONNECTED" : current));
      }, 3500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error contacting call server";
      setCallError(msg);
      setCallState("FAILED");
      toast.error(msg);
    }
  };

  const handleEndCallEarly = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallState("COMPLETED");
  };

  const handleCloseVoiceModal = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setActiveModal(null);
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
          Select Care Voice for an instant AI voice call to your phone (90s) or Care Connect for WhatsApp.
        </p>
      </div>

      {/* 2 Core Options: Care Voice & Care Connect */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        {/* OPTION 1: CARE VOICE (AI PHONE CALL) */}
        <div
          onClick={() => {
            setActiveModal("CARE_VOICE");
            if (callState === "COMPLETED" || callState === "FAILED") {
              setCallState("IDLE");
            }
          }}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-[var(--shadow-lift)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <PhoneCall className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                AI VOICE CALL
              </span>
              <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-bold">
                90S MAX
              </span>
            </div>
          </div>

          <h4 className="mt-4 text-lg font-bold text-foreground group-hover:text-primary transition-colors">
            Care Voice
          </h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Receive an incoming call on your phone from our AI Care Voice assistant for quick arrival check-in.
          </p>

          <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-primary">
            <span>Call My Phone</span>
            <span className="font-mono text-[11px]">({targetPhone})</span>
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
            Instant WhatsApp concierge with your check-in confirmation and care coordination desk.
          </p>

          <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-success">
            <span>Open Care Connect</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* ===================== MODAL 1: CARE VOICE (AI OUTBOUND CALL - 90S MAX) ===================== */}
      {activeModal === "CARE_VOICE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-[var(--shadow-lift)]">
            <button
              onClick={handleCloseVoiceModal}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <PhoneCall className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">Care Voice</h3>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    AI ASSISTANT
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {patient.clinicName} · Reception Desk
                </p>
              </div>
            </div>

            {/* STATE 1: IDLE - Ready to trigger call */}
            {callState === "IDLE" && (
              <div className="mt-5 space-y-4">
                {/* Duration Limit Pill */}
                <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-xs text-amber-700 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span>Maximum Call Limit:</span>
                  </div>
                  <span className="rounded-md bg-amber-500/20 px-2 py-0.5 font-bold font-mono">
                    90 SECONDS
                  </span>
                </div>

                {/* Patient Phone Display & Edit */}
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Receiving Mobile Number:
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingPhone(!isEditingPhone)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <Edit2 className="h-3 w-3" />
                      {isEditingPhone ? "Done" : "Edit"}
                    </button>
                  </div>

                  {isEditingPhone ? (
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="text-sm font-mono rounded-xl"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          setTargetPhone(phoneInput);
                          setIsEditingPhone(false);
                          toast.success("Phone number updated for call.");
                        }}
                        className="rounded-xl text-xs"
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-1 text-lg font-bold font-mono text-foreground">
                      {targetPhone}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    An incoming voice call from <strong className="text-foreground">{callerNumber}</strong> will ring this phone.
                  </p>
                </div>

                {/* Language Selector */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Preferred Voice Language:
                  </label>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    {[
                      { code: "en", label: "English" },
                      { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
                      { code: "hi", label: "हिंदी (Hindi)" },
                      { code: "ta", label: "தமிழ் (Tamil)" },
                      { code: "te", label: "తెలుగు (Telugu)" },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setSelectedLanguage(lang.code as "en" | "kn" | "hi" | "ta" | "te")}
                        className={`rounded-xl border py-1.5 px-2 text-xs font-medium transition-all ${selectedLanguage === lang.code
                          ? "border-primary bg-primary-soft text-primary font-bold shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                          }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>

                  {/* Greeting Preview */}
                  <div className="mt-2.5 rounded-xl border border-primary/15 bg-primary-soft/40 p-2.5 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-primary block mb-0.5">Opening Greeting (English):</span>
                    <p className="font-medium text-foreground">
                      &ldquo;Hi {patient.firstName || "there"}, I&apos;m Care Voice from Hospex Fertility Clinic. How can I help you today?&rdquo;
                    </p>
                    {selectedLanguage !== "en" && (
                      <p className="mt-1 text-[10px] text-primary/85">
                        ↳ Follow-up conversation continues in{" "}
                        <strong className="font-semibold text-primary">
                          {
                            ({
                              kn: "ಕನ್ನಡ (Kannada)",
                              hi: "हिंदी (Hindi)",
                              ta: "தமிழ் (Tamil)",
                              te: "తెలుగు (Telugu)",
                              en: "English",
                            } as Record<string, string>)[selectedLanguage] || "English"
                          }
                        </strong>{" "}
                        based on your responses.
                      </p>
                    )}
                  </div>
                </div>

                {/* Call Initiation Action */}
                <div className="pt-2">
                  <Button
                    onClick={() => handleInitiateCareVoiceCall()}
                    className="w-full h-12 rounded-xl gradient-brand text-primary-foreground font-bold text-sm shadow-[var(--shadow-lift)] flex items-center justify-center gap-2"
                  >
                    <PhoneCall className="h-4 w-4" />
                    Call My Phone Now (90s Max)
                  </Button>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Free instant call · Powered by Hospex & SmrkoMed Care Voice
                  </p>
                </div>
              </div>
            )}

            {/* STATE 2: CALLING - Dispatching outbound call */}
            {callState === "CALLING" && (
              <div className="mt-6 py-6 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-soft text-primary animate-pulse">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    Dispatching Care Voice Call...
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connecting to {targetPhone} via Hospex Secure Voice Gateway
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
                  Setting up 90-second reception assistance session.
                </div>
              </div>
            )}

            {/* STATE 3: RINGING - Call is ringing on patient's device */}
            {callState === "RINGING" && (
              <div className="mt-6 py-6 text-center space-y-4 animate-in fade-in">
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-success-soft text-success">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-3xl bg-success/20 opacity-75"></span>
                  <PhoneCall className="h-8 w-8 animate-bounce" />
                </div>
                <div>
                  <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success animate-pulse">
                    RINGING YOUR PHONE
                  </span>
                  <h4 className="text-lg font-bold text-foreground mt-2">
                    Pick Up Your Phone!
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Incoming call from:{" "}
                    <span className="font-bold text-foreground font-mono">{callerNumber}</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-success/30 bg-success-soft/30 p-3.5 text-xs text-foreground">
                  <p className="font-semibold text-success">
                    Hospex Care Voice is connecting with you
                  </p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Pick up to speak directly with our AI concierge regarding your visit and consultation.
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCallState("CONNECTED")}
                  className="rounded-xl text-xs"
                >
                  Answered? Start 90s Timer
                </Button>
              </div>
            )}

            {/* STATE 4: CONNECTED - Active conversation with 90s countdown & audio wave */}
            {callState === "CONNECTED" && (
              <div className="mt-5 space-y-4 animate-in fade-in">
                {/* Audio Waveform Animation */}
                <div className="rounded-2xl border border-primary/20 bg-primary-soft/30 p-5 text-center">
                  <div className="flex items-center justify-center gap-1.5 h-10 mb-3">
                    {[40, 75, 55, 95, 65, 85, 45, 90, 50, 70, 60].map((height, i) => (
                      <span
                        key={i}
                        className="w-1.5 rounded-full bg-primary animate-pulse"
                        style={{
                          height: `${height}%`,
                          animationDelay: `${(i % 5) * 150}ms`,
                          animationDuration: "800ms",
                        }}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary">
                    <Radio className="h-3.5 w-3.5 animate-pulse text-rose-500" />
                    <span>CARE VOICE CALL IN PROGRESS</span>
                  </div>

                  {/* Digital Countdown Timer */}
                  <div className="mt-3">
                    <span className="text-4xl font-extrabold font-mono tracking-tight text-foreground">
                      {formatTime(secondsRemaining)}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Remaining of 90-second maximum call limit
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 w-full bg-border rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-1000 ease-linear rounded-full"
                      style={{ width: `${((90 - secondsRemaining) / 90) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Call Guidance Information */}
                <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-primary" />
                    Speaking with Care Voice Concierge:
                  </p>
                  <p className="text-[11px]">
                    Ask about doctor consultation queues, specialist availability, or hospital amenities. The call will automatically conclude within 90 seconds.
                  </p>
                </div>

                {/* End Call Action */}
                <Button
                  variant="destructive"
                  onClick={handleEndCallEarly}
                  className="w-full h-11 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <PhoneOff className="h-4 w-4" />
                  Conclude Call / Finished Speaking
                </Button>
              </div>
            )}

            {/* STATE 5: COMPLETED - 90s session completed */}
            {callState === "COMPLETED" && (
              <div className="mt-5 space-y-4 text-center animate-in fade-in">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success border border-success/30">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-bold text-success">
                    SESSION CONCLUDED
                  </span>
                  <h4 className="text-base font-bold text-foreground mt-1.5">
                    Care Voice Check-In Complete
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your 90-second reception consultation has wrapped up. Your presence is verified for {patient.clinicName}.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-muted/40 p-4 text-xs text-left space-y-2">
                  <div className="flex items-center justify-between font-semibold text-foreground">
                    <span>What to do next:</span>
                    <span className="text-[11px] text-primary">Ground Floor Lounge</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    1. Please take a seat in Lounge 1 or approach Counter 2 if you require physical documents.
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    2. We will notify you when your doctor is ready for your consultation.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCallState("IDLE");
                    }}
                    className="flex-1 rounded-xl text-xs"
                  >
                    Call Again (90s)
                  </Button>
                  <Button
                    onClick={() => {
                      setActiveModal("CARE_CONNECT");
                    }}
                    className="flex-1 rounded-xl bg-success hover:bg-success/90 text-success-foreground text-xs font-bold"
                  >
                    <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                    Open WhatsApp
                  </Button>
                </div>
              </div>
            )}

            {/* STATE 6: FAILED - Error state */}
            {callState === "FAILED" && (
              <div className="mt-5 space-y-4 text-center animate-in fade-in">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    Call Connection Issue
                  </h4>
                  <p className="text-xs text-destructive mt-1">
                    {callError || "Unable to reach your phone number."}
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={() => handleInitiateCareVoiceCall()}
                    className="w-full h-11 rounded-xl gradient-brand text-primary-foreground text-xs font-bold"
                  >
                    <RefreshCw className="mr-2 h-3.5 w-3.5" />
                    Retry Care Voice Call
                  </Button>
                  <a
                    href="tel:+918040001200"
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-xs font-semibold hover:bg-muted"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call Reception Desk (+91 80 4000 1200)
                  </a>
                </div>
              </div>
            )}
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
                <p className="text-xs text-muted-foreground">{patient.clinicName} (+91 866 071 7328)</p>
              </div>
            </div>

            {/* WhatsApp Preview Box */}
            <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>Care Connect Message Preview:</span>
                <span className="text-success font-bold">Front Desk</span>
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

