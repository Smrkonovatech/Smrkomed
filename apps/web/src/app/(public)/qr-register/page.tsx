"use client";

import { useState, useRef, useEffect } from "react";
import {
  User,
  Phone,
  PhoneOff,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface RegisteredPatient {
  id: string;
  fullName: string;
  phone: string;
  clinicName: string;
  clinicId: string;
}

export default function QrRegisterPage() {
  // Screen steps: "WELCOME" | "REGISTER" | "CONNECT"
  const [screen, setScreen] = useState<"WELCOME" | "REGISTER" | "CONNECT">("WELCOME");

  // Form State for Screen 2
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registered Patient data
  const [patient, setPatient] = useState<RegisteredPatient | null>(null);

  // Call State for Screen 4 (Log in overlay)
  const [callState, setCallState] = useState<"IDLE" | "CONNECTING" | "CONNECTED" | "COMPLETED" | "FAILED">("IDLE");
  const [callDuration, setCallDuration] = useState<number>(0);
  const [callError, setCallError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live timer for connected call with 90s auto-completion
  useEffect(() => {
    if (callState === "CONNECTED") {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => {
          if (prev >= 89) {
            if (timerRef.current) clearInterval(timerRef.current);
            setCallState("COMPLETED");
            toast.info("Care Voice call completed.");
            return 90;
          }
          return prev + 1;
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

  // Auto-reset from COMPLETED to IDLE after 5 seconds
  useEffect(() => {
    if (callState === "COMPLETED") {
      resetTimerRef.current = setTimeout(() => {
        setCallState("IDLE");
      }, 5000);
    } else {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    }

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, [callState]);

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  };

  // Poll Sarvam call status when call is CONNECTED to automatically detect when patient hangs up
  useEffect(() => {
    if (callState !== "CONNECTED") return;

    const targetPhoneDigits = (patient?.phone || phone || "9606654032").replace(/\D/g, "").slice(-10);
    const callStartTime = Date.now();

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/ai/call-logs?limit=5");
        if (!res.ok) return;
        const data = await res.json();
        const items = data.items || [];

        // Find recent call matching the phone number
        const matchingCall = items.find((item: any) => {
          const userContactDigits = (item.user_contact || "").replace(/\D/g, "");
          const isPhoneMatch = userContactDigits.endsWith(targetPhoneDigits);
          const attemptTime = item.attempted_at ? new Date(item.attempted_at).getTime() : 0;
          const isRecent = Math.abs(attemptTime - callStartTime) < 300000 || (Date.now() - attemptTime < 300000);
          return isPhoneMatch && isRecent;
        });

        if (matchingCall) {
          // Check if call has ended or completed
          if (
            matchingCall.end_datetime ||
            matchingCall.ended_by ||
            matchingCall.duration_in_seconds > 0 ||
            matchingCall.connectivity_status === "failed" ||
            matchingCall.connectivity_status === "busy" ||
            matchingCall.connectivity_status === "no_answer"
          ) {
            clearInterval(pollInterval);
            if (matchingCall.duration_in_seconds) {
              setCallDuration(Math.round(matchingCall.duration_in_seconds));
            }
            setCallState("COMPLETED");
            toast.info("Care Voice call completed.");
          }
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [callState, patient?.phone, phone]);

  const handleEndCall = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallState("COMPLETED");
    toast.success("Call ended successfully.");
  };

  // Screen 2 Form Submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Please enter your full name.");
      toast.error("Please enter your full name.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsRegistering(true);

    try {
      const parts = trimmedName.split(/\s+/);
      const firstName = parts[0] || "Patient";
      const lastName = parts.slice(1).join(" ") || firstName;

      const response = await fetch("/api/qr/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          firstName,
          lastName,
          phone: cleanPhone,
          gender: gender === "Male" ? "MALE" : gender === "Female" ? "FEMALE" : "OTHER",
          purpose: "Consultation & Check-in",
        }),
      });

      const res = await response.json();

      if (!response.ok || !res.success) {
        throw new Error(res.error || "Registration failed. Please try again.");
      }

      setPatient({
        id: res.data?.patient?.id || "temp-id",
        fullName: trimmedName,
        phone: cleanPhone,
        clinicName: res.data?.clinic?.name || "Hospex Bangalore Clinic",
        clinicId: res.data?.clinic?.id || "hospex-blr-001",
      });

      toast.success("Registration successful! Welcome to SmrkoMed.");
      setScreen("CONNECT");
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err?.message || "Failed to submit details. Please try again.");
      toast.error(err?.message || "Registration failed.");
    } finally {
      setIsRegistering(false);
    }
  };

  // WhatsApp Connect Action
  const handleConnectWhatsApp = () => {
    const targetNumber = patient?.phone || phone || "8660717328";
    const clinicNumber = "918660717328";
    const patientName = patient?.fullName || fullName || "Patient";
    const message = `hi`;

    const waUrl = `https://wa.me/${clinicNumber}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
    toast.success("Opening WhatsApp Care Connect chat...");
  };

  // Voice Call Action (Screen 4 / Log in overlay)
  const handleInitiateCareVoice = async () => {
    const phoneToCall = patient?.phone || phone.replace(/\D/g, "") || "9606654032";
    setCallState("CONNECTING");
    setCallError(null);

    try {
      const response = await fetch("/api/ai/outbound-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneToCall,
          patientName: patient?.fullName || fullName || "Patient",
          clinicName: patient?.clinicName || "Hospex Bangalore Clinic",
          callType: "CARE_VOICE_CHECKIN",
          maxDurationSeconds: 90,
          language: "en",
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

      setCallState("CONNECTED");
      toast.success(`📞 Care Voice call connected to ${phoneToCall}!`);
    } catch (err: any) {
      console.error("Care Voice call error:", err);
      setCallError(err?.message || "Network error while connecting.");
      setCallState("FAILED");
      toast.error("Failed to connect call. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-0 sm:p-4 lg:p-6 select-none font-sans">
      {/* Mobile-First Device Wrapper */}
      <div className="w-full max-w-[390px] h-[100dvh] sm:h-[800px] sm:max-h-[92vh] sm:rounded-[38px] overflow-hidden shadow-2xl relative flex flex-col bg-white border border-slate-800/20">

        {/* ========================================================= */}
        {/* SCREEN 1: WELCOME SCREEN (Matches User 2nd Image Design)    */}
        {/* ========================================================= */}
        {screen === "WELCOME" && (
          <div className="relative w-full h-full flex flex-col justify-between bg-gradient-to-b from-[#00A3F5] via-[#43BEFB] to-[#A0E2FE] p-6 pb-7 overflow-hidden animate-in fade-in duration-300">
            {/* Top SMRKOMED Brand Header */}
            <div className="pt-4 flex flex-col items-center justify-center gap-1.5 z-10">
              <img
                src="/qr/Group_7.png"
                alt="SmrkoMed"
                className="h-7 w-auto object-contain drop-shadow-xs"
              />
              <span className="text-xl font-black tracking-[0.16em] text-white">
                SMRKOMED
              </span>
            </div>

            {/* Center Doctor Image with Fluffy Clouds */}
            <div className="relative flex-1 flex flex-col items-center justify-center -my-1">
              {/* Doctor Cut-out */}
              <div className="relative z-10 w-full flex justify-center">
                <img
                  src="/qr/1stscreen.png"
                  alt="Doctor with smartphone"
                  className="h-[310px] sm:h-[330px] w-auto object-contain pointer-events-none drop-shadow-md"
                />
              </div>

              {/* Cloud Horizon Overlay from Layer_1 (1).png */}
              <div className="absolute -inset-x-2 -bottom-5 pointer-events-none z-15 flex flex-col items-center">
                <img
                  src="/qr/clouds.png"
                  alt="Clouds overlay"
                  className="w-full h-auto object-cover scale-105 pointer-events-none"
                />
              </div>
            </div>

            {/* Typography: "One Connected Platform" */}
            <div className="text-left w-full pl-2 mb-5 z-20">
              <div className="text-[50px] leading-[0.95] font-light text-[#1F2937] tracking-tight">
                One
              </div>
              <div className="text-[50px] leading-[0.95] font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.12)]">
                Connected
              </div>
              <div className="text-[50px] leading-[0.95] font-light text-[#1F2937] tracking-tight">
                Platform
              </div>
            </div>

            {/* Purple Pill Button: "Meet Smrko AI" */}
            <div className="w-full z-20 space-y-4">
              <button
                type="button"
                onClick={() => setScreen("REGISTER")}
                className="w-full h-[52px] rounded-full bg-[#7E57C2] hover:bg-[#6D45B3] active:scale-[0.98] transition-all text-white font-bold text-base shadow-xl shadow-purple-900/25 flex items-center justify-center cursor-pointer"
              >
                Meet Smrko AI
              </button>

              {/* Bottom: "By SMRKONOVA" with Layer_1.png */}
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#1E293B]">
                <span>By</span>
                <img
                  src="/qr/Layer_1.png"
                  alt="SMRKONOVA"
                  className="h-3.5 w-auto object-contain inline-block"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 2: REGISTRATION SCREEN (Matches 2nd Image Design)   */}
        {/* ========================================================= */}
        {screen === "REGISTER" && (
          <div className="relative w-full h-full flex flex-col justify-between bg-gradient-to-b from-[#00A3F5] via-[#3EB9F7] to-[#8FD7FA] overflow-hidden animate-in fade-in duration-300">
            {/* Top Section with Headline & Doctor cut-out */}
            <div className="relative pt-6 px-6 text-center z-10 shrink-0 h-[260px] flex flex-col justify-between">
              {/* Subtle Back Link */}
              <button
                type="button"
                onClick={() => setScreen("WELCOME")}
                className="absolute top-5 left-5 text-white/80 hover:text-white transition p-1 z-20"
                title="Back to Welcome"
              >
                <ChevronLeft className="size-6" />
              </button>

              <div className="pt-1">
                <h2 className="text-[26px] font-extrabold text-white tracking-tight leading-tight">
                  Lets get started
                </h2>
                <p className="text-xs text-white/90 font-medium mt-1">
                  Please share a few details to continue
                </p>
              </div>

              {/* Doctor Visual */}
              <div className="mt-auto flex justify-center -mb-2">
                <img
                  src="/qr/2ndscreen.png"
                  alt="Doctor"
                  className="h-[200px] sm:h-[215px] w-auto object-contain pointer-events-none drop-shadow-sm"
                />
              </div>
            </div>

            {/* Bottom White Card */}
            <div className="relative -mt-4 z-20 bg-white rounded-t-[38px] px-6 pt-5 pb-6 shadow-2xl flex-1 flex flex-col justify-between">
              {/* SMRKOMED Logo */}
              <div className="flex items-center justify-center gap-2 mb-2 shrink-0">
                <img
                  src="/branding/smrkomed-mark.png"
                  alt="SmrkoMed"
                  className="h-7 w-auto object-contain"
                />
                <span className="text-xl font-black tracking-wider text-[#2D2A4A]">
                  SMRKOMED
                </span>
              </div>

              {/* Form fills remaining space and pins Continue to bottom */}
              <form onSubmit={handleRegisterSubmit} className="flex-1 flex flex-col justify-between">
                <div className="space-y-3 pt-1">
                  {/* Full Name */}
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-bold text-slate-800">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3.5 size-4 text-slate-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7E57C2] text-slate-800 placeholder-slate-400"
                        required
                      />
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-bold text-slate-800">
                      Mobile Number
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="absolute left-3.5 size-4 text-slate-400" />
                      <span className="absolute left-10 text-xs font-bold text-slate-600 border-r border-slate-200 pr-2">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Enter mobile number"
                        className="w-full pl-24 pr-4 py-2.5 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7E57C2] text-slate-800 placeholder-slate-400"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="space-y-1 text-left pt-0.5">
                    <label className="text-xs font-bold text-slate-800">
                      Gender
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {/* Male */}
                      <button
                        type="button"
                        onClick={() => setGender("Male")}
                        className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border transition-all cursor-pointer ${gender === "Male"
                          ? "border-sky-500 bg-sky-50/70 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                      >
                        <User className="size-5 text-[#00A3FF] mb-1" />
                        <span className="text-xs font-bold text-slate-800">
                          Male
                        </span>
                      </button>

                      {/* Female */}
                      <button
                        type="button"
                        onClick={() => setGender("Female")}
                        className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border transition-all cursor-pointer ${gender === "Female"
                          ? "border-pink-500 bg-pink-50/70 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                      >
                        <User className="size-5 text-[#FF3B80] mb-1" />
                        <span className="text-xs font-bold text-slate-800">
                          Female
                        </span>
                      </button>

                      {/* Other */}
                      <button
                        type="button"
                        onClick={() => setGender("Other")}
                        className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border transition-all cursor-pointer ${gender === "Other"
                          ? "border-purple-500 bg-purple-50/70 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                      >
                        <User className="size-5 text-[#866BE3] mb-1" />
                        <span className="text-xs font-bold text-slate-800">
                          Other
                        </span>
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-xs text-rose-500 text-left pt-0.5">
                      {error}
                    </p>
                  )}
                </div>

                {/* Continue Button */}
                <div className="pt-4 pb-1">
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full h-[52px] rounded-full bg-[#7E57C2] hover:bg-[#6D45B3] active:scale-[0.98] transition-all text-white font-bold text-base shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-white" />
                        <span>Saving details...</span>
                      </>
                    ) : (
                      <span>Continue</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 3 & 4: CONNECT OPTIONS (3rsscreen.png / Log in overlay) */}
        {/* ========================================================= */}
        {screen === "CONNECT" && (
          <div className="relative w-full h-full flex flex-col justify-between bg-gradient-to-b from-[#00A3F5] via-[#3EB9F7] to-[#8FD7FA] overflow-hidden animate-in fade-in duration-300">
            {/* Top Section with Multilingual Speech Bubbles & Consultation Graphic */}
            <div className="relative pt-6 px-4 text-center z-10 shrink-0 h-[300px] flex flex-col justify-between">
              {/* Back button */}
              <button
                type="button"
                onClick={() => setScreen("REGISTER")}
                className="absolute top-5 left-5 text-white/80 hover:text-white transition p-1 z-20"
                title="Back to Registration"
              >
                <ChevronLeft className="size-6" />
              </button>

              <div className="pt-1">
                <h2 className="text-3xl font-extrabold text-white tracking-tight">
                  Hello!
                </h2>
                <p className="text-xs text-white/90 font-medium mt-1">
                  How Would you like to connect today?
                </p>
              </div>

              {/* Multilingual Floating Badges & Waveform Area */}
              <div className="relative mt-2 h-[64px] w-full flex flex-col justify-between items-center text-[11px] font-bold">
                {/* Row 1 */}
                <div className="w-full flex items-center justify-between px-2">
                  <span className="px-3 py-1 rounded-full bg-[#B2EBF2]/80 text-[#006064] text-[10px] shadow-xs">
                    வணக்கம்
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white text-slate-700 text-[10px] shadow-xs border border-white/60">
                    "I want to book an appointment."
                  </span>
                </div>

                {/* Row 2 - Audio Wave Bars & Kannada/English */}
                <div className="w-full flex items-center justify-between px-1">
                  <span className="px-3 py-1 rounded-full bg-[#E0F7FA]/70 text-[#006064] text-[10px]">
                    ನಮಸ್ಕಾರ
                  </span>
                  {/* Visualizer bars */}
                  <div className="flex items-center gap-1 opacity-70">
                    {[6, 12, 18, 24, 16, 22, 14, 20, 10, 16, 8].map((h, i) => (
                      <span
                        key={i}
                        className="w-0.5 bg-white/80 rounded-full"
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E0F7FA]/70 text-[#006064] text-[10px]">
                    Hello
                  </span>
                </div>

                {/* Row 3 - Malayalam & Treatment Query */}
                <div className="w-full flex items-center justify-between px-3">
                  <span className="px-3 py-0.5 rounded-full bg-white/80 text-[#006064] text-[10px] shadow-xs">
                    നമസ്കാരം
                  </span>
                  <span className="px-3 py-0.5 rounded-full bg-white text-slate-700 text-[10px] shadow-xs border border-white/60">
                    "What treatments are available at the clinic?"
                  </span>
                </div>
              </div>

              {/* Doctor & Patient Image */}
              <div className="mt-auto flex justify-center -mb-3">
                <img
                  src="/qr/3rsscreen.png"
                  alt="Doctor consultation"
                  className="h-[210px] sm:h-[225px] w-auto object-contain pointer-events-none drop-shadow-sm"
                />
              </div>
            </div>

            {/* Bottom White Card with Connect Channels */}
            <div className="relative -mt-4 z-20 bg-white rounded-t-[38px] px-5 pt-6 pb-7 shadow-2xl flex-1 flex flex-col justify-start space-y-3.5">
              {/* Option 1: Chat with Care Connect (WhatsApp) */}
              <div
                onClick={handleConnectWhatsApp}
                className="p-4 rounded-[22px] bg-[#EBF8F4] border border-[#DCF3EB] hover:border-emerald-300 transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="size-12 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-sm">
                    {/* WhatsApp Icon */}
                    <svg className="size-6 fill-current" viewBox="0 0 24 24">
                      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.54.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      Chat with Care Connect
                    </h3>
                    <p className="text-[11px] text-slate-600 font-normal mt-0.5 max-w-[210px]">
                      Get answers, information and support on WhatsApp.
                    </p>
                  </div>
                </div>
                <div className="size-9 rounded-full bg-white text-[#25D366] flex items-center justify-center shadow-xs shrink-0">
                  <ChevronRight className="size-5" />
                </div>
              </div>

              {/* Option 2: Talk with Care Voice */}
              {/* IDLE STATE */}
              {callState === "IDLE" && (
                <div
                  onClick={handleInitiateCareVoice}
                  className="p-4 rounded-[22px] bg-[#F4F0FD] border border-[#E9E1F9] hover:border-purple-300 transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="size-12 rounded-full bg-[#7E57C2] text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Phone className="size-5 fill-current" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        Talk with Care Voice
                      </h3>
                      <p className="text-[11px] text-slate-600 font-normal mt-0.5 max-w-[210px]">
                        Have an important conversation with our AI assistant.
                      </p>
                    </div>
                  </div>
                  <div className="size-9 rounded-full bg-white text-[#7E57C2] flex items-center justify-center shadow-xs shrink-0">
                    <ChevronRight className="size-5" />
                  </div>
                </div>
              )}

              {/* CONNECTING STATE (Exact matching UI from Log in overlay.png with rotating spinner while dialing) */}
              {callState === "CONNECTING" && (
                <div className="p-4 rounded-[22px] bg-[#F4F0FD] border border-purple-200 transition-all flex items-center justify-between shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-3.5">
                    {/* Concentric rings around phone icon */}
                    <div className="relative flex items-center justify-center">
                      <span className="absolute size-14 rounded-full bg-purple-200/60 animate-ping" />
                      <div className="size-12 rounded-full bg-purple-100 ring-4 ring-purple-200/80 text-[#7E57C2] flex items-center justify-center shrink-0 z-10">
                        <Phone className="size-5 fill-current" />
                      </div>
                    </div>

                    <div className="text-left">
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        Connecting call...
                      </h3>
                      <p className="text-[12px] text-slate-700 font-semibold mt-0.5">
                        Calling {patient?.phone || phone || "9606654032"}
                      </p>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                        Please wait while we connect you.
                      </p>
                    </div>
                  </div>

                  {/* Circular Purple Spinner while connecting */}
                  <div className="pr-1">
                    <Loader2 className="size-6 text-[#7E57C2] animate-spin" />
                  </div>
                </div>
              )}

              {/* CONNECTED / ACTIVE STATE (Shows live timer and End Call button - NO rotating spinner!) */}
              {callState === "CONNECTED" && (
                <div className="p-4 rounded-[22px] bg-[#F4F0FD] border border-purple-200 transition-all flex items-center justify-between shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-3.5">
                    {/* Concentric rings with pulsing green active badge */}
                    <div className="relative flex items-center justify-center">
                      <span className="absolute size-12 rounded-full bg-emerald-300/60 animate-ping" />
                      <div className="size-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 z-10 shadow-sm">
                        <Phone className="size-5 fill-current" />
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">
                          Call in progress
                        </h3>
                        <span className="bg-emerald-100 text-emerald-700 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {formatDuration(callDuration)}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-700 font-semibold mt-0.5">
                        Connected: {patient?.phone || phone || "9606654032"}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                        AI Voice Assistant active
                      </p>
                    </div>
                  </div>

                  {/* End Call Button */}
                  <button
                    type="button"
                    onClick={handleEndCall}
                    className="bg-rose-500 hover:bg-rose-600 active:scale-95 transition-all text-white rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                    title="End Call"
                  >
                    <PhoneOff className="size-3.5" />
                    <span>End</span>
                  </button>
                </div>
              )}

              {/* COMPLETED STATE (Call is done - NO SPINNER, shows clear completion badge) */}
              {callState === "COMPLETED" && (
                <div className="p-4 rounded-[22px] bg-emerald-50/90 border border-emerald-200 transition-all flex items-center justify-between shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-3.5">
                    <div className="size-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="size-6 text-emerald-600" />
                    </div>

                    <div className="text-left">
                      <h3 className="text-sm font-bold text-emerald-950 leading-tight">
                        Call Completed
                      </h3>
                      <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                        Duration: {formatDuration(callDuration)}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-normal mt-0.5">
                        Thank you for speaking with Smrko AI.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCallState("IDLE")}
                    className="bg-white border border-emerald-200 hover:bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full transition shadow-2xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* FAILED CALL STATE */}
              {callState === "FAILED" && (
                <div className="p-4 rounded-[22px] bg-rose-50 border border-rose-200 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-700">Call Could Not Connect</span>
                    <button
                      type="button"
                      onClick={() => setCallState("IDLE")}
                      className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                  <p className="text-[11px] text-rose-600">
                    {callError || "Please check your network and phone number, then try again."}
                  </p>
                </div>
              )}

              {/* Patient Badge / Check-in Confirmation */}
              {patient && (
                <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" />
                    <span>Checked in as <strong>{patient.fullName}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPatient(null);
                      setScreen("REGISTER");
                    }}
                    className="text-[#7E57C2] font-semibold hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
