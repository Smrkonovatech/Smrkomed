"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Download, ExternalLink, QrCode, RefreshCw, Shield, UserCheck } from "lucide-react";

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
import { ApiError, apiGet, apiPost } from "@/lib/api/client";
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
  | "v3_aadhaar_input"
  | "v3_aadhaar_otp"
  | "v3_suggestions"
  | "v3_mobile_input"
  | "v3_mobile_otp"
  | "v3_account_select"
  | "v3_face_auth"
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
  const [aadhaarInput, setAadhaarInput] = useState("");
  const [mobileInput, setMobileInput] = useState("");
  const [authMethod, setAuthMethod] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [maskedMobile, setMaskedMobile] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [faceAuthQrUrl, setFaceAuthQrUrl] = useState<string | null>(null);
  const [accountsList, setAccountsList] = useState<
    Array<{
      ABHANumber: string;
      name?: string;
      preferredAbhaAddress?: string;
      gender?: string;
      dob?: string;
    }>
  >([]);
  const [v3Token, setV3Token] = useState<string | null>(null);

  const [verifiedProfile, setVerifiedProfile] = useState<{
    id?: string | undefined;
    name?: string | undefined;
    gender?: string | undefined;
    yearOfBirth?: number | null | undefined;
    photo?: string | undefined;
    abhaNumber?: string | undefined;
    abhaAddress?: string | undefined;
  } | null>(null);

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

  useEffect(() => {
    if (!open) {
      setStep("entry");
      setBusy(false);
      setAbhaInput("");
      setAadhaarInput("");
      setMobileInput("");
      setOtp(["", "", "", "", "", ""]);
      setConsentAgreed(false);
      setSessionId(null);
      setTransactionId(null);
      setMaskedMobile(null);
      setVerifiedProfile(null);
      setMessage(null);
      setDiscoverFound(null);
      setSuccessMasked(null);
      setSuggestions([]);
      setSelectedAddress("");
      setCustomAddress("");
      setFaceAuthQrUrl(null);
      setAccountsList([]);
      setV3Token(null);
    }
  }, [open]);

  useEffect(() => {
    if ((step !== "otp" && step !== "v3_aadhaar_otp" && step !== "v3_mobile_otp") || !expiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [step, expiresAt]);

  const otpValue = useMemo(() => otp.join(""), [otp]);

  // ─────────────────────────────────────────────────────────────────────────────
  // V3 ACTION HANDLERS
  // ─────────────────────────────────────────────────────────────────────────────

  // V3 Flow 1: Aadhaar OTP Enrolment
  async function startV3AadhaarEnrol() {
    const clean = aadhaarInput.replace(/\D/g, "");
    if (clean.length !== 12) {
      toast.error("Please enter a valid 12-digit Aadhaar number.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{ txnId: string; message: string }>(
        "/api/v1/digital-health/v3/enrol/aadhaar/request-otp",
        { aadhaarNumber: clean },
      );
      setTransactionId(res.txnId);
      setMessage(res.message);
      setExpiresAt(new Date(Date.now() + 10 * 60 * 1000).toISOString());
      setStep("v3_aadhaar_otp");
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to request Aadhaar OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyV3AadhaarOtp() {
    if (!transactionId || otpValue.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{
        message: string;
        txnId: string;
        tokens: { token: string };
        ABHAProfile: {
          firstName: string;
          lastName?: string;
          dob: string;
          gender: string;
          ABHANumber: string;
          phrAddress?: string[];
          photo?: string;
        };
      }>("/api/v1/digital-health/v3/enrol/aadhaar/verify", {
        txnId: transactionId,
        otp: otpValue,
        mobile: mobileInput.trim() || patient?.phone || "9999999999",
        patientId,
      });

      setSuccessMasked(res.ABHAProfile.ABHANumber);
      setVerifiedProfile({
        name: `${res.ABHAProfile.firstName} ${res.ABHAProfile.lastName ?? ""}`.trim(),
        gender: res.ABHAProfile.gender,
        photo: res.ABHAProfile.photo,
        abhaNumber: res.ABHAProfile.ABHANumber,
        abhaAddress: res.ABHAProfile.phrAddress?.[0],
      });

      // Load address suggestions for the user to pick
      try {
        const suggRes = await apiGet<{ abhaAddressList: string[] }>(
          `/api/v1/digital-health/v3/enrol/suggestions?txnId=${res.txnId}`,
        );
        if (suggRes.abhaAddressList && suggRes.abhaAddressList.length > 0 && suggRes.abhaAddressList[0]) {
          setSuggestions(suggRes.abhaAddressList);
          setSelectedAddress(suggRes.abhaAddressList[0]);
          setStep("v3_suggestions");
          return;
        }
      } catch {
        // if suggestions not supported, go to success
      }

      setStep("success_link");
      toast.success("ABHA created and linked successfully!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Aadhaar OTP verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveV3Address() {
    const addressToSet = customAddress.trim() || selectedAddress;
    if (!addressToSet || !transactionId) {
      setStep("success_link");
      return;
    }
    setBusy(true);
    try {
      await apiPost("/api/v1/digital-health/v3/enrol/abha-address", {
        txnId: transactionId,
        abhaAddress: addressToSet,
        patientId,
      });
      if (verifiedProfile) {
        setVerifiedProfile({ ...verifiedProfile, abhaAddress: addressToSet });
      }
      setStep("success_link");
      toast.success(`ABHA address ${addressToSet} set successfully!`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to set custom ABHA address.");
      setStep("success_link");
    } finally {
      setBusy(false);
    }
  }

  // V3 Flow 2: Mobile OTP Login / Verification
  async function startV3MobileLogin() {
    const clean = mobileInput.replace(/\D/g, "");
    if (clean.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{ txnId: string; message: string }>(
        "/api/v1/digital-health/v3/auth/request-otp",
        { loginType: "mobile", identifier: clean },
      );
      setTransactionId(res.txnId);
      setMessage(res.message);
      setExpiresAt(new Date(Date.now() + 10 * 60 * 1000).toISOString());
      setStep("v3_mobile_otp");
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to request mobile OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyV3MobileOtp() {
    if (!transactionId || otpValue.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost<{
        txnId: string;
        token?: string;
        accounts?: Array<{
          ABHANumber: string;
          preferredAbhaAddress?: string;
          name?: string;
          gender?: string;
          dob?: string;
        }>;
      }>("/api/v1/digital-health/v3/auth/verify-otp", {
        txnId: transactionId,
        otp: otpValue,
        loginType: "mobile",
        patientId,
      });

      if (res.token) setV3Token(res.token);

      if (res.accounts && res.accounts.length > 1) {
        setAccountsList(res.accounts);
        setStep("v3_account_select");
        return;
      }

      if (res.accounts && res.accounts.length === 1 && res.accounts[0]) {
        const acc = res.accounts[0];
        setSuccessMasked(acc.ABHANumber);
        setVerifiedProfile({
          name: acc.name,
          abhaNumber: acc.ABHANumber,
          abhaAddress: acc.preferredAbhaAddress,
          gender: acc.gender,
        });
        setStep("success_link");
        toast.success("ABHA verified and linked!");
        return;
      }

      setStep("success_link");
      toast.success("Verified successfully!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Mobile OTP verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function selectV3Account(account: { ABHANumber: string; name?: string; preferredAbhaAddress?: string }) {
    if (!transactionId || !v3Token) return;
    setBusy(true);
    try {
      await apiPost("/api/v1/digital-health/v3/auth/select-account", {
        txnId: transactionId,
        abhaNumber: account.ABHANumber,
        tToken: v3Token,
        patientId,
      });
      setSuccessMasked(account.ABHANumber);
      setVerifiedProfile({
        name: account.name,
        abhaNumber: account.ABHANumber,
        abhaAddress: account.preferredAbhaAddress,
      });
      setStep("success_link");
      toast.success("Account selected and linked!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to select account.");
    } finally {
      setBusy(false);
    }
  }

  // V3 Flow 3: FaceAuth QR
  async function startV3FaceAuth() {
    setBusy(true);
    try {
      const res = await apiPost<{ txnId: string; qrCodeUrl: string; message: string }>(
        "/api/v1/digital-health/v3/face-auth/init",
        {},
      );
      setTransactionId(res.txnId);
      setFaceAuthQrUrl(res.qrCodeUrl);
      setMessage(res.message);
      setStep("v3_face_auth");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to initialize FaceAuth.");
    } finally {
      setBusy(false);
    }
  }

  function onOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      const el = document.getElementById(`v3-otp-${index + 1}`);
      el?.focus();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            {step === "entry" && "Set up ABHA (Ayushman Bharat Health Account)"}
            {step === "v3_aadhaar_input" && "Create ABHA via Aadhaar OTP (V3)"}
            {step === "v3_aadhaar_otp" && "Enter Aadhaar OTP"}
            {step === "v3_suggestions" && "Choose Your ABHA Address"}
            {step === "v3_mobile_input" && "Verify & Link ABHA via Mobile OTP"}
            {step === "v3_mobile_otp" && "Enter Mobile OTP"}
            {step === "v3_account_select" && "Select ABHA Account"}
            {step === "v3_face_auth" && "ABHA Mobile App FaceAuth"}
            {step === "success_link" && "ABHA Connected & Verified"}
            {step === "error" && "Verification Interrupted"}
          </DialogTitle>
          <DialogDescription>
            ABHA empowers patients to connect their health records securely across Indian healthcare providers under ABDM.
          </DialogDescription>
        </DialogHeader>

        {connection.environment === "sandbox" && (
          <div className="flex items-center gap-2 rounded-md bg-sky-50 px-3 py-1.5 text-xs text-sky-800">
            <span className="font-semibold uppercase tracking-wide">ABDM Sandbox (V3)</span>
            <span>· SBXID_071353 active</span>
          </div>
        )}

        {/* ─── Step: ENTRY / CHOICES ─── */}
        {step === "entry" && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Choose an official ABDM V3 action for this patient:
            </p>

            <Button
              className="h-auto w-full justify-start py-3.5 text-left border"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setOtp(["", "", "", "", "", ""]);
                setStep("v3_aadhaar_input");
              }}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Create New ABHA (Instant Aadhaar OTP)
                </div>
                <p className="text-xs text-muted-foreground font-normal">
                  Creates official 14-digit ABHA with instant KYC & photo from UIDAI
                </p>
              </div>
            </Button>

            <Button
              className="h-auto w-full justify-start py-3.5 text-left border"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setOtp(["", "", "", "", "", ""]);
                setStep("v3_mobile_input");
              }}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Link Existing ABHA (Mobile OTP)
                </div>
                <p className="text-xs text-muted-foreground font-normal">
                  Fetches existing ABHA cards linked to patient&apos;s mobile number
                </p>
              </div>
            </Button>

            <Button
              className="h-auto w-full justify-start py-3 text-left border"
              variant="ghost"
              disabled={busy}
              onClick={() => void startV3FaceAuth()}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <QrCode className="h-4 w-4 text-purple-600" />
                  Create via FaceAuth (Scan QR on ABHA App)
                </div>
                <p className="text-[11px] text-muted-foreground font-normal">
                  Patient scans a QR code using the official ABHA mobile app
                </p>
              </div>
            </Button>
          </div>
        )}

        {/* ─── Step: V3 AADHAAR INPUT ─── */}
        {step === "v3_aadhaar_input" && (
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="v3-aadhaar">Patient&apos;s 12-digit Aadhaar Number</Label>
              <Input
                id="v3-aadhaar"
                className="mt-1.5 font-mono text-base tracking-wider"
                placeholder="1234 5678 9012"
                maxLength={14}
                value={aadhaarInput}
                onChange={(e) => setAadhaarInput(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Encrypted using ABDM RSA public certificate. Plaintext Aadhaar is never saved.
              </p>
            </div>

            <div>
              <Label htmlFor="v3-mobile">Mobile Number (for SMS notifications)</Label>
              <Input
                id="v3-mobile"
                className="mt-1.5 font-mono"
                placeholder="10-digit mobile"
                maxLength={10}
                value={mobileInput}
                onChange={(e) => setMobileInput(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("entry")}>
                Back
              </Button>
              <Button disabled={busy || aadhaarInput.replace(/\D/g, "").length !== 12} onClick={() => void startV3AadhaarEnrol()}>
                {busy ? "Requesting OTP…" : "Request Aadhaar OTP"}
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step: V3 AADHAAR OTP ─── */}
        {step === "v3_aadhaar_otp" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit OTP sent to patient&apos;s Aadhaar-linked mobile number:
            </p>

            <div className="flex justify-center gap-2 py-2">
              {otp.map((d, i) => (
                <Input
                  key={i}
                  id={`v3-otp-${i}`}
                  className="h-11 w-11 text-center text-lg font-mono"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => onOtpChange(i, e.target.value)}
                />
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("v3_aadhaar_input")}>
                Back
              </Button>
              <Button disabled={busy || otpValue.length !== 6} onClick={() => void verifyV3AadhaarOtp()}>
                {busy ? "Verifying…" : "Verify & Enrol"}
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step: V3 SUGGESTIONS & CUSTOM ADDRESS ─── */}
        {step === "v3_suggestions" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm font-medium">Choose an ABHA Address (@sbx / @abdm):</p>
            <div className="space-y-2">
              {suggestions.map((addr) => (
                <button
                  key={addr}
                  type="button"
                  onClick={() => {
                    setSelectedAddress(addr);
                    setCustomAddress("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm text-left transition-all",
                    selectedAddress === addr ? "border-primary bg-primary/10 font-medium" : "hover:border-primary/40",
                  )}
                >
                  <span>{addr}@sbx</span>
                  {selectedAddress === addr && <CheckCircle className="h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>

            <div>
              <Label htmlFor="custom-address">Or enter custom preferred address</Label>
              <Input
                id="custom-address"
                className="mt-1"
                placeholder="e.g. rahul.sharma"
                value={customAddress}
                onChange={(e) => {
                  setCustomAddress(e.target.value);
                  setSelectedAddress("");
                }}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("success_link")}>
                Skip
              </Button>
              <Button disabled={busy || (!selectedAddress && !customAddress)} onClick={() => void saveV3Address()}>
                {busy ? "Saving…" : "Confirm ABHA Address"}
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step: V3 MOBILE INPUT ─── */}
        {step === "v3_mobile_input" && (
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="v3-login-mobile">Patient&apos;s Mobile Number</Label>
              <Input
                id="v3-login-mobile"
                className="mt-1.5 font-mono text-base"
                placeholder="10-digit mobile"
                maxLength={10}
                value={mobileInput}
                onChange={(e) => setMobileInput(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                ABDM will return any active ABHA numbers associated with this mobile number.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("entry")}>
                Back
              </Button>
              <Button disabled={busy || mobileInput.replace(/\D/g, "").length !== 10} onClick={() => void startV3MobileLogin()}>
                {busy ? "Sending OTP…" : "Send Mobile OTP"}
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step: V3 MOBILE OTP ─── */}
        {step === "v3_mobile_otp" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit OTP sent to <span className="font-mono font-semibold">{mobileInput}</span>:
            </p>

            <div className="flex justify-center gap-2 py-2">
              {otp.map((d, i) => (
                <Input
                  key={i}
                  id={`v3-otp-${i}`}
                  className="h-11 w-11 text-center text-lg font-mono"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => onOtpChange(i, e.target.value)}
                />
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("v3_mobile_input")}>
                Back
              </Button>
              <Button disabled={busy || otpValue.length !== 6} onClick={() => void verifyV3MobileOtp()}>
                {busy ? "Verifying…" : "Verify OTP"}
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step: V3 ACCOUNT SELECT (When mobile has multiple ABHAs) ─── */}
        {step === "v3_account_select" && (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium">Multiple ABHA accounts found for this mobile number. Select one:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {accountsList.map((acc) => (
                <div
                  key={acc.ABHANumber}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm hover:border-primary/50 cursor-pointer"
                  onClick={() => void selectV3Account(acc)}
                >
                  <div>
                    <p className="font-semibold text-foreground">{acc.name ?? "Patient"}</p>
                    <p className="font-mono text-xs text-muted-foreground">{acc.ABHANumber}</p>
                    {acc.preferredAbhaAddress && (
                      <p className="text-xs text-primary">{acc.preferredAbhaAddress}</p>
                    )}
                  </div>
                  <Button size="sm">Select</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Step: V3 FACEAUTH QR CODE ─── */}
        {step === "v3_face_auth" && (
          <div className="space-y-4 text-center pt-2">
            <p className="text-sm font-medium">Scan with the official ABHA Mobile App</p>
            {faceAuthQrUrl && (
              <div className="mx-auto flex flex-col items-center justify-center p-4 border rounded-xl bg-card">
                <div className="h-44 w-44 rounded-lg bg-muted flex items-center justify-center border font-mono text-xs text-center p-2 break-all">
                  {faceAuthQrUrl}
                </div>
                <a
                  href={faceAuthQrUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center gap-1.5 text-xs text-primary underline"
                >
                  <span>Open FaceAuth URL directly</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Once scanned, the ABHA app performs biometric face capture via UIDAI RD service.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setStep("entry")}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step: SUCCESS LINK / CARD DISPLAY ─── */}
        {step === "success_link" && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-emerald-500/10 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
                    ABHA Digital Health Card
                  </span>
                  <p className="text-base font-semibold text-foreground mt-0.5">
                    {verifiedProfile?.name ?? "Verified Patient"}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  VERIFIED
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">ABHA Number</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {successMasked ?? verifiedProfile?.abhaNumber ?? "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">ABHA Address</span>
                  <span className="font-semibold text-foreground">
                    {verifiedProfile?.abhaAddress ?? "—"}
                  </span>
                </div>
                {verifiedProfile?.gender && (
                  <div>
                    <span className="text-muted-foreground block">Gender</span>
                    <span className="font-medium text-foreground">{verifiedProfile.gender}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                onClick={() => {
                  onCompleted();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step: ERROR ─── */}
        {step === "error" && (
          <div className="space-y-3 pt-2">
            <p className="text-sm text-danger">
              We couldn&apos;t complete the verification. Please verify the credentials or try another method.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setStep("entry")}>
                Try Again
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
