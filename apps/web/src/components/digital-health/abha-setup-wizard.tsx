"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiPost } from "@/lib/api/client";
import { CONSENT_VERSION } from "@/lib/abdm/status";
import { cn } from "@/lib/utils";

type Connection = {
  connected: boolean;
  environment: string;
  demoLinkAllowed: boolean;
  message: string;
  authMethods: Array<{ id: string; label: string; description: string; sandboxOnly?: boolean }>;
};

type PatientSnapshot = {
  id: string;
  name: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
};

type Step =
  | "entry"
  | "path_has"
  | "path_create"
  | "details"
  | "consent"
  | "auth_method"
  | "otp"
  | "discover"
  | "match"
  | "success_link"
  | "success_create"
  | "error";

export function AbhaSetupWizard({
  open,
  onOpenChange,
  patientId,
  connection,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  connection: Connection;
  onCompleted: () => void;
}) {
  const [step, setStep] = useState<Step>("entry");
  const [busy, setBusy] = useState(false);
  const [patient, setPatient] = useState<PatientSnapshot | null>(null);
  const [purpose, setPurpose] = useState<"LINK_EXISTING" | "CREATE_ABHA" | "DISCOVER">("LINK_EXISTING");
  const [abhaInput, setAbhaInput] = useState("");
  const [authMethod, setAuthMethod] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [discoverFound, setDiscoverFound] = useState<{
    abhaMasked: string;
    verifiedName: string;
    message: string;
  } | null>(null);
  const [successMasked, setSuccessMasked] = useState<string | null>(null);
  const [sandboxHint, setSandboxHint] = useState(false);

  const methods = connection.authMethods?.length
    ? connection.authMethods
    : connection.demoLinkAllowed
      ? [
          {
            id: "sandbox_otp",
            label: "Sandbox OTP (MOCK)",
            description: "Test only — enter any 6-digit code. Not a real ABDM OTP.",
            sandboxOnly: true,
          },
        ]
      : [];

  useEffect(() => {
    if (!open) {
      setStep("entry");
      setBusy(false);
      setAbhaInput("");
      setOtp(["", "", "", "", "", ""]);
      setConsentAgreed(false);
      setSessionId(null);
      setMessage(null);
      setDiscoverFound(null);
      setSuccessMasked(null);
    }
  }, [open]);

  useEffect(() => {
    if (step !== "otp" || !expiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [step, expiresAt]);

  const otpValue = useMemo(() => otp.join(""), [otp]);

  async function startPath(path: "HAS_ABHA" | "NO_ABHA" | "NOT_SURE") {
    setBusy(true);
    try {
      const res = await apiPost<{
        patient: PatientSnapshot;
        message: string;
        connection: Connection;
      }>(`/api/v1/digital-health/patients/${patientId}/journey/start`, { path });
      setPatient(res.patient);
      setMessage(res.message);
      if (path === "HAS_ABHA") {
        setPurpose("LINK_EXISTING");
        setStep("path_has");
      } else if (path === "NOT_SURE") {
        setPurpose("DISCOVER");
        setStep("details");
      } else {
        setPurpose("CREATE_ABHA");
        setStep("path_create");
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to start ABHA setup.");
    } finally {
      setBusy(false);
    }
  }

  async function recordConsent() {
    if (!consentAgreed) {
      toast.error("Please agree to continue.");
      return;
    }
    setBusy(true);
    try {
      await apiPost(`/api/v1/digital-health/patients/${patientId}/journey/consent`, {
        sessionPurpose: purpose,
        consentVersion: CONSENT_VERSION,
        agreed: true,
      });
      setStep("auth_method");
      if (!authMethod && methods[0]) setAuthMethod(methods[0].id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to record consent.");
    } finally {
      setBusy(false);
    }
  }

  async function startAuth() {
    if (!authMethod) {
      toast.error("Choose an authentication method.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{
        sessionId: string;
        expiresAt: string;
        message: string;
        sandboxMode?: boolean;
      }>(`/api/v1/digital-health/patients/${patientId}/journey/auth/start`, {
        purpose,
        authMethod,
      });
      setSessionId(res.sessionId);
      setExpiresAt(res.expiresAt);
      setSandboxHint(Boolean(res.sandboxMode));
      setMessage(res.message);
      setStep("otp");
      toast.message(res.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "We couldn't start verification. Please try again.");
      setStep("error");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (!sessionId || otpValue.length !== 6) {
      toast.error("Enter the 6-digit OTP.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{ message: string; sandboxMode?: boolean }>(
        `/api/v1/digital-health/patients/${patientId}/journey/auth/verify`,
        { sessionId, otp: otpValue },
      );
      setSandboxHint(Boolean(res.sandboxMode));
      setMessage(res.message);
      if (purpose === "CREATE_ABHA" || purpose === "DISCOVER") {
        await runDiscoverThenCreate();
      } else {
        await finishLink();
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "We couldn't complete verification right now.");
    } finally {
      setBusy(false);
    }
  }

  async function runDiscoverThenCreate() {
    try {
      const discovered = await apiPost<{
        found: boolean;
        abhaMasked?: string;
        verifiedName?: string;
        message: string;
      }>(`/api/v1/digital-health/patients/${patientId}/journey/discover`, {
        forceMockFound: false,
      });
      if (discovered.found && discovered.abhaMasked) {
        setDiscoverFound({
          abhaMasked: discovered.abhaMasked,
          verifiedName: discovered.verifiedName ?? patient?.name ?? "",
          message: discovered.message,
        });
        setStep("discover");
        return;
      }
      if (purpose === "DISCOVER" || purpose === "CREATE_ABHA") {
        if (!sessionId) return;
        const created = await apiPost<{
          message: string;
          identity: { abhaMasked: string | null };
          sandboxMode?: boolean;
        }>(`/api/v1/digital-health/patients/${patientId}/journey/create`, {
          sessionId,
          detailsConfirmed: true,
        });
        setSuccessMasked(created.identity.abhaMasked);
        setMessage(created.message);
        setStep("success_create");
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Discovery failed.");
      setStep("error");
    }
  }

  async function finishLink() {
    if (abhaInput.trim().length < 8) {
      setStep("match");
      return;
    }
    setBusy(true);
    try {
      await apiPost(`/api/v1/digital-health/patients/${patientId}/journey/match-confirm`, {
        confirmed: true,
        abhaNumber: abhaInput.trim(),
        sessionId: sessionId ?? undefined,
      });
      await apiPost(`/api/v1/digital-health/patients/${patientId}/abha/link`, {
        abhaNumber: abhaInput.trim(),
      });
      // Sandbox may allow verify; production stays pending honestly.
      try {
        await apiPost(`/api/v1/digital-health/patients/${patientId}/abha/verify`, {});
      } catch {
        // leave pending
      }
      setSuccessMasked(null);
      setStep("success_link");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to link ABHA.");
      setStep("error");
    } finally {
      setBusy(false);
    }
  }

  async function linkExistingFromDiscover() {
    setStep("match");
    setMessage(
      "We found an existing ABHA association. Enter the patient's ABHA number to link — do not create another.",
    );
  }

  function onOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      const el = document.getElementById(`abha-otp-${index + 1}`);
      el?.focus();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "entry" && "Set up ABHA"}
            {step === "path_has" && "Link existing ABHA"}
            {step === "path_create" && "Create ABHA"}
            {step === "details" && "Confirm patient details"}
            {step === "consent" && "Your consent is required"}
            {step === "auth_method" && "Choose authentication"}
            {step === "otp" && "Enter OTP"}
            {step === "discover" && "Existing ABHA found"}
            {step === "match" && "Verify identity match"}
            {step === "success_link" && "ABHA linked successfully"}
            {step === "success_create" && "ABHA creation recorded"}
            {step === "error" && "Unable to continue"}
          </DialogTitle>
          <DialogDescription>
            ABHA helps patients securely connect digital health records across participating providers.
            Each person needs their own ABHA — couples do not share one.
          </DialogDescription>
        </DialogHeader>

        {(connection.environment === "sandbox" || sandboxHint || !connection.connected) && (
          <p className="rounded-md bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-sky-900 uppercase">
            ABDM Sandbox / Mock paths labelled clearly — never production ABHA invention
          </p>
        )}

        {step === "entry" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Do not assume the patient has no ABHA just because SmrkoMed has no record yet.
            </p>
            <Button className="h-auto w-full justify-start py-3 text-left" disabled={busy} onClick={() => void startPath("HAS_ABHA")}>
              <span>
                <span className="block font-semibold">I already have an ABHA</span>
                <span className="text-xs font-normal opacity-80">Find and link an existing ABHA</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto w-full justify-start py-3 text-left"
              disabled={busy}
              onClick={() => void startPath("NO_ABHA")}
            >
              <span>
                <span className="block font-semibold">I don&apos;t have an ABHA</span>
                <span className="text-xs font-normal opacity-80">Assisted creation through ABDM</span>
              </span>
            </Button>
            <button
              type="button"
              className="text-sm text-primary underline"
              disabled={busy}
              onClick={() => void startPath("NOT_SURE")}
            >
              Not sure if I have one?
            </button>
          </div>
        )}

        {step === "path_has" && (
          <div className="space-y-3">
            <div>
              <Label>ABHA Number</Label>
              <Input
                className="mt-1"
                value={abhaInput}
                onChange={(e) => setAbhaInput(e.target.value)}
                placeholder="14-digit ABHA"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Or continue with mobile authentication if preferred by ABDM.
              </p>
            </div>
            <Button
              disabled={busy || abhaInput.trim().length < 8}
              onClick={() => {
                setPurpose("LINK_EXISTING");
                setStep("consent");
              }}
            >
              Continue
            </Button>
          </div>
        )}

        {step === "path_create" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              SmrkoMed can help create an ABHA through the ABDM system. The patient must complete identity
              verification and consent. SmrkoMed will not invent an official ABHA number.
            </p>
            <Button
              disabled={busy}
              onClick={() => {
                setPurpose("CREATE_ABHA");
                setStep("details");
              }}
            >
              Start ABHA Creation
            </Button>
          </div>
        )}

        {step === "details" && patient && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Verify these details before authentication.</p>
            <dl className="rounded-xl border bg-muted/20 px-3 py-2 text-sm">
              <Row label="Name" value={patient.name} />
              <Row label="Date of birth" value={patient.dateOfBirth ?? "—"} />
              <Row label="Gender" value={patient.gender ?? "—"} />
              <Row label="Mobile" value={patient.phone ?? "—"} />
            </dl>
            <Button disabled={busy} onClick={() => setStep("consent")}>
              Details are correct
            </Button>
          </div>
        )}

        {step === "consent" && (
          <div className="space-y-3">
            <p className="text-sm">
              SmrkoMed is helping create/link ABHA with the Ayushman Bharat Digital Mission. Information is
              processed through ABDM for the selected purpose only.
            </p>
            <ul className="list-inside list-disc text-xs text-muted-foreground">
              <li>Purpose: ABHA {purpose === "CREATE_ABHA" ? "creation" : "linking / discovery"}</li>
              <li>Data: demographics needed for ABDM authentication</li>
              <li>Requester: this clinic via SmrkoMed</li>
              <li>Consent version: {CONSENT_VERSION}</li>
            </ul>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={consentAgreed} onCheckedChange={(v) => setConsentAgreed(Boolean(v))} />
              I Agree & Continue
            </label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button disabled={busy || !consentAgreed} onClick={() => void recordConsent()}>
                I Agree & Continue
              </Button>
            </div>
          </div>
        )}

        {step === "auth_method" && (
          <div className="space-y-3">
            {!methods.length ? (
              <p className="text-sm text-muted-foreground">
                No authentication methods available. Configure ABDM credentials or enable sandbox demo mode.
              </p>
            ) : (
              methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAuthMethod(m.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left text-sm",
                    authMethod === m.id ? "border-primary bg-primary-soft/40" : "hover:border-primary/40",
                  )}
                >
                  <span className="font-semibold">{m.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{m.description}</span>
                </button>
              ))
            )}
            <Button disabled={busy || !authMethod} onClick={() => void startAuth()}>
              Continue
            </Button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the OTP sent to the registered mobile number. OTP is never stored or shown in logs.
            </p>
            {sandboxHint && (
              <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
                SANDBOX MOCK: Enter any 6-digit code. This is not a real ABDM OTP.
              </p>
            )}
            <div className="flex justify-center gap-2">
              {otp.map((d, i) => (
                <Input
                  key={i}
                  id={`abha-otp-${i}`}
                  className="h-11 w-10 text-center text-lg"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => onOtpChange(i, e.target.value)}
                  autoComplete="one-time-code"
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")} · Max 3
              attempts
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy || otpValue.length !== 6} onClick={() => void verifyOtp()}>
                Verify OTP
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => void startAuth()}>
                Resend OTP
              </Button>
              <Button variant="ghost" onClick={() => setStep("auth_method")}>
                Change method
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === "discover" && discoverFound && (
          <div className="space-y-3">
            <p className="text-sm font-medium">We found an existing ABHA associated with your verified details.</p>
            <p className="text-xs text-muted-foreground">{discoverFound.message}</p>
            <dl className="rounded-xl border px-3 py-2 text-sm">
              <Row label="ABHA" value={discoverFound.abhaMasked} />
              <Row label="Name" value={discoverFound.verifiedName} />
            </dl>
            <p className="text-xs text-amber-800">
              Do not create another ABHA. Prefer linking the existing one.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => void linkExistingFromDiscover()}>Link Existing ABHA</Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === "match" && (
          <div className="space-y-3">
            <p className="text-sm">Please verify this is the correct patient.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border p-3 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase">SmrkoMed Patient</p>
                <p className="mt-1 font-medium">{patient?.name}</p>
                <p className="text-xs text-muted-foreground">
                  DOB: {patient?.dateOfBirth ?? "—"} · {patient?.gender ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border p-3 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase">ABDM profile</p>
                <p className="mt-1 font-medium">{patient?.name}</p>
                <p className="text-xs text-muted-foreground">Confirm demographics match before linking.</p>
              </div>
            </div>
            <div>
              <Label>ABHA Number to link</Label>
              <Input
                className="mt-1"
                value={abhaInput}
                onChange={(e) => setAbhaInput(e.target.value)}
                placeholder="14-digit ABHA"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy || abhaInput.trim().length < 8} onClick={() => void finishLink()}>
                Confirm & Link
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await apiPost(`/api/v1/digital-health/patients/${patientId}/journey/match-confirm`, {
                    confirmed: false,
                  });
                  toast.message("Linking stopped due to mismatch review.");
                  onOpenChange(false);
                }}
              >
                Details do not match
              </Button>
            </div>
          </div>
        )}

        {(step === "success_link" || step === "success_create") && (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              {step === "success_link" ? "ABHA linked successfully" : "Your ABHA journey was recorded"}
            </p>
            <dl className="rounded-xl border px-3 py-2 text-sm">
              <Row label="Patient" value={patient?.name ?? "—"} />
              <Row
                label="ABHA Number"
                value={
                  successMasked ??
                  (abhaInput
                    ? `XX-XXXX-XXXX-${abhaInput.replace(/\D/g, "").slice(-4)}`
                    : "Pending ABDM confirmation")
                }
              />
              <Row label="Status" value={step === "success_link" ? "Linked / verification pending" : "Creation intent"} />
            </dl>
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
            <Button
              onClick={() => {
                onCompleted();
                onOpenChange(false);
              }}
            >
              Continue to Digital Health
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-3">
            <p className="text-sm">
              We couldn&apos;t complete verification right now. Please try again. Clinic workflows can continue
              without ABDM.
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setStep("auth_method")}>Retry</Button>
              <Button variant="outline" onClick={() => setStep("entry")}>
                Try another path
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
