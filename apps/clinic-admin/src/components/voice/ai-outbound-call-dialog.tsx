"use client";

import { useState, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Globe2,
  Loader2,
  Phone,
  PhoneCall,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface AiOutboundCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  partnerName?: string | undefined;
  phoneNumber: string;
  treatment?: string | undefined;
  stage?: string | undefined;
  doctorName?: string | undefined;
  clinicName?: string | undefined;
  upcomingAppointment?: string | undefined;
  coupleId?: string | undefined;
}

export function AiOutboundCallDialog({
  open,
  onOpenChange,
  patientName,
  partnerName,
  phoneNumber,
  treatment = "IVF",
  stage = "Consultation",
  doctorName = "Dr. Ananya Rao",
  clinicName = "ABC Fertility Centre",
  upcomingAppointment,
  coupleId,
}: AiOutboundCallDialogProps) {
  const [language, setLanguage] = useState<"kn" | "en" | "hi">("kn");
  const [calling, setCalling] = useState(false);
  const [targetPhone, setTargetPhone] = useState(phoneNumber);
  const [callResult, setCallResult] = useState<{
    success: boolean;
    callId?: string;
    message?: string;
  } | null>(null);

  useEffect(() => {
    setTargetPhone(phoneNumber);
  }, [phoneNumber, open]);

  const greetingPreview =
    language === "kn"
      ? `ನಮಸ್ಕಾರ ${patientName} ಅವರೇ, ನಾನು ${clinicName} ಆಸ್ಪತ್ರೆಯ AI ಕಡೆಯಿಂದ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ. ನಿಮ್ಮ ${treatment} ಕನ್ಸಲ್ಟೇಶನ್ ಬಗ್ಗೆ ವಿಚಾರಿಸಲು ಕರೆ ಮಾಡಿದೆ. ನೀವು ಹೇಗಿದ್ದೀರಾ?`
      : language === "hi"
      ? `नमस्ते ${patientName} जी, मैं ${clinicName} से बात कर रहा हूँ। आपके आगामी परामर्श और स्वास्थ्य के बारे में जानने के लिए कॉल किया है। आप कैसे हैं?`
      : `Hello ${patientName}, this is the Care Assistant calling from ${clinicName} regarding your ${treatment} consultation with ${doctorName}. How are you feeling today?`;

  const handleInitiateCall = async () => {
    setCalling(true);
    setCallResult(null);

    const phoneToCall = targetPhone.trim() || phoneNumber.trim();
    if (!phoneToCall) {
      toast.error("Please enter a valid phone number to call.");
      setCalling(false);
      return;
    }

    try {
      const response = await fetch("/api/ai/outbound-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneToCall,
          patientName,
          partnerName,
          treatment,
          stage,
          doctorName,
          clinicName,
          upcomingAppointment,
          language,
          coupleId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg =
          data?.error?.message || data?.error?.details?.message || "Could not initiate call.";
        setCallResult({
          success: false,
          message: errorMsg,
        });
        toast.error(`Call failed: ${errorMsg}`);
      } else {
        const callId =
          data.data?.outbound_id || data.data?.id || "Initiated";
        setCallResult({
          success: true,
          callId: String(callId),
          message: `Phone call dispatched to ${data.details?.dialedNumber || phoneNumber} from ${
            data.details?.agentNumber || "+918064265889"
          }!`,
        });
        toast.success(
          `📞 Sarvam AI is calling ${patientName} at ${phoneNumber}!`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      setCallResult({
        success: false,
        message: msg,
      });
      toast.error(`Error: ${msg}`);
    } finally {
      setCalling(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!calling) {
          onOpenChange(val);
          if (!val) setCallResult(null);
        }
      }}
    >
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <PhoneCall className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                AI Voice Call — Sarvam AI
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Outbound call from caller <strong className="font-mono text-foreground">+918064265889</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Patient Details Card */}
          <div className="rounded-xl border bg-muted/40 p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                <User className="size-3.5 text-primary" />
                {patientName}
                {partnerName ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    & {partnerName}
                  </span>
                ) : null}
              </div>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider text-teal-700 border-teal-300 bg-teal-50 dark:text-teal-300 dark:border-teal-800 dark:bg-teal-950/40">
                {treatment} · {stage}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <span>
                Doctor: <strong className="text-foreground">{doctorName}</strong>
              </span>
              <span>
                Treatment: <strong className="text-foreground">{treatment}</strong>
              </span>
            </div>
          </div>

          {/* Destination Phone Input */}
          <div className="space-y-1.5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                <Phone className="size-3.5" />
                Mobile Number to Call:
              </span>
              <span className="text-[10px] text-muted-foreground font-normal">Pulls from patient record (editable)</span>
            </div>
            <Input
              type="tel"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              placeholder="e.g. 7795559724"
              className="h-10 text-base sm:text-sm font-mono font-semibold bg-background border-emerald-300 dark:border-emerald-700 focus-visible:ring-emerald-500"
            />
            <p className="text-[11px] text-muted-foreground">
              Sarvam AI will dial this exact number from caller ID <strong className="font-mono text-foreground">+918064265889</strong>.
            </p>
          </div>

          {/* Language Selection */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Globe2 className="size-3.5 text-primary" />
              Conversation Language
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { code: "kn", label: "ಕನ್ನಡ", sub: "Kannada" },
                { code: "en", label: "English", sub: "Indian accent" },
                { code: "hi", label: "हिन्दी", sub: "Hindi" },
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLanguage(item.code as "kn" | "en" | "hi")}
                  className={`rounded-lg border px-2.5 py-2 text-left transition-all ${
                    language === item.code
                      ? "border-emerald-600 bg-emerald-50/70 font-semibold text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200 shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <p className="text-xs">{item.label}</p>
                  <p className="text-[10px] opacity-75">{item.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Opening message preview */}
          <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary-soft/30 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-primary text-[11px]">
              <Sparkles className="size-3" />
              AI Opening Speech Preview:
            </div>
            <p className="text-muted-foreground italic leading-relaxed">
              &quot;{greetingPreview}&quot;
            </p>
          </div>

          {/* Result Banner */}
          {callResult ? (
            <div
              className={`rounded-xl border p-3.5 text-xs flex items-start gap-2.5 ${
                callResult.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                  : "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/20"
              }`}
            >
              {callResult.success ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">
                  {callResult.success ? "Call Placed Successfully!" : "Call Failed"}
                </p>
                <p className="opacity-90">{callResult.message}</p>
                {callResult.callId ? (
                  <p className="text-[10px] font-mono opacity-70">
                    Call ID: {callResult.callId}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="mt-4 sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={calling}
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            {callResult?.success ? "Close" : "Cancel"}
          </Button>

          <Button
            type="button"
            disabled={calling || !(targetPhone?.trim() || phoneNumber?.trim())}
            onClick={handleInitiateCall}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 shadow-sm"
          >
            {calling ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Dialing {targetPhone || phoneNumber}...
              </>
            ) : callResult?.success ? (
              <>
                <PhoneCall className="size-3.5" />
                Call Again
              </>
            ) : (
              <>
                <PhoneCall className="size-3.5" />
                Call {targetPhone || phoneNumber} Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
