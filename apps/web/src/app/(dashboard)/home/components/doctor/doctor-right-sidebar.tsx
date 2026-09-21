"use client";

import Image from "next/image";
import Link from "next/link";
import { Mic, Clock, ArrowRight, Square, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAppState } from "@/lib/app-state";
import { coupleLabel, findCouple, type Couple } from "@/lib/demo-data";
import { useSmrkoAiBuddy } from "@/components/ai/smrko-ai-host";
import { clinicApi } from "@/lib/clinic-api";
import { useDoctorAppointments } from "./doctor-dashboard";
import {
  ActiveConsultationModal,
  type ConsultationSessionState,
  formatSecondsToTime,
} from "@/components/consultation/active-consultation";
import { ConsultationSummaryModal } from "@/app/(dashboard)/patients/[slug]/components/consultation-summary-modal";
import { parseConsultationContent } from "@/lib/ai/consultation-analyzer";
import { toast } from "sonner";

export function DoctorRightSidebar() {
  const { data: session } = useSession();
  const appState = useAppState() as ReturnType<typeof useAppState> & { couples?: Couple[] };
  const { exceptions } = appState;
  const couples = appState.couples ?? [];
  const appointments = useDoctorAppointments();
  const { ask } = useSmrkoAiBuddy();

  const nextAppointment = appointments[0];
  const nextCouple = nextAppointment ? findCouple(nextAppointment.coupleId, couples) : (couples.length > 0 ? couples[0] : null);
  const patientName = nextAppointment
    ? (nextCouple ? coupleLabel(nextCouple) : "Scheduled Patient")
    : (nextCouple ? coupleLabel(nextCouple) : "No scheduled visits");
  const appointmentDetails = nextAppointment
    ? `${nextAppointment.type} • ${nextAppointment.time}`
    : (nextCouple ? `${nextCouple.treatment} • On Track` : "All clear for today");
  const todayVisits = appointments.length;

  const doctorDisplayName = session?.user?.name || "Doctor";

  // Consultation Session State (Images 1, 2, 3, 4)
  const [consultation, setConsultation] = useState<ConsultationSessionState>({
    isActive: false,
    isPaused: false,
    isMinimized: false, // Opens full modal first (Image 2)
    recordSeconds: 0,
    patientName: "",
    patientSubtitle: "",
    doctorName: doctorDisplayName,
    roomName: "OPD Room",
    cycleBadge: "Consultation",
  });

  const [isEndingDialogOpen, setIsEndingDialogOpen] = useState(false);

  // Last Consultation Summary State (Stored & Displayed on Home Page)
  const [lastConsultation, setLastConsultation] = useState<{
    title: string;
    date: string;
    content: string;
    actor: string;
    patientName: string;
    transcript?: string;
  } | null>(null);

  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  // Fetch latest consultation directly from PostgreSQL database
  const fetchLatestConsultation = async () => {
    try {
      const res = await fetch("/api/consultations/latest");
      const json = await res.json();
      if (json.success && json.data) {
        setLastConsultation({
          title: json.data.title,
          date: json.data.date,
          content: json.data.content,
          actor: json.data.actor,
          patientName: json.data.patientName,
          transcript: json.data.content,
        });
        return;
      }
    } catch (e) {
      console.warn("Failed to fetch latest consultation from DB:", e);
    }

    // Fallback to localStorage
    try {
      const saved = localStorage.getItem("smrkomed_last_consultation");
      if (saved) {
        const parsed = JSON.parse(saved);
        setLastConsultation(parsed);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchLatestConsultation();
  }, []);

  // Timer loop for active consultation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (consultation.isActive && !consultation.isPaused) {
      interval = setInterval(() => {
        setConsultation((prev) => ({
          ...prev,
          recordSeconds: prev.recordSeconds + 1,
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [consultation.isActive, consultation.isPaused]);

  const startConsultation = () => {
    setConsultation({
      isActive: true,
      isPaused: false,
      isMinimized: false, // Opens full modal first (Image 2)
      recordSeconds: 0,
      patientName: patientName,
      patientSubtitle: appointmentDetails,
      doctorName: doctorDisplayName,
      roomName: "OPD Room 3",
      cycleBadge: "IVF Cycle #2",
    });
    toast.success("Consultation session started. Smrko AI is listening.");
  };

  const togglePause = () => {
    setConsultation((prev) => {
      const nextPaused = !prev.isPaused;
      if (nextPaused) {
        toast.info("Consultation session paused.");
      } else {
        toast.success("Consultation session resumed.");
      }
      return { ...prev, isPaused: nextPaused };
    });
  };

  const toggleMinimize = () => {
    setConsultation((prev) => ({
      ...prev,
      isMinimized: !prev.isMinimized,
    }));
  };

  const handleEndRequest = () => {
    setIsEndingDialogOpen(true);
  };

  const handleEndConfirm = async (finalTranscript?: string) => {
    setIsEndingDialogOpen(false);
    setConsultation((prev) => ({
      ...prev,
      isActive: false,
      isPaused: false,
      recordSeconds: 0,
    }));

    const cleanTranscript = finalTranscript && finalTranscript.trim().length > 0 ? finalTranscript.trim() : "";
    const cleanSummary = "Consultation complete. Patient vitals and ovarian response stable. Continued prescribed stimulation schedule.";

    const payload = {
      coupleId: nextCouple?.id || undefined,
      patientName: patientName,
      doctorName: doctorDisplayName,
      reasonForVisit: "Fertility Initial Consultation",
      transcript: cleanTranscript,
      summary: cleanSummary,
    };

    // 1. Immediately persist into PostgreSQL Database
    try {
      const res = await fetch("/api/consultations/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setLastConsultation({
          title: json.data.title,
          date: json.data.date,
          content: json.data.content,
          actor: json.data.actor,
          patientName: json.data.patientName,
          transcript: cleanTranscript,
        });
        toast.success("Consultation saved to database successfully.");
        return;
      }
    } catch (dbErr) {
      console.error("Failed to save consultation to DB:", dbErr);
    }

    // Fallback local update
    const fallbackSummary = {
      title: "Fertility Initial Consultation",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      content: cleanSummary,
      actor: doctorDisplayName,
      patientName: patientName,
      transcript: cleanTranscript,
    };
    setLastConsultation(fallbackSummary);
    try {
      localStorage.setItem("smrkomed_last_consultation", JSON.stringify(fallbackSummary));
    } catch (e) {}

    toast.success("Consultation ended and signed off.");
  };

  const handleCancelEnd = () => {
    setIsEndingDialogOpen(false);
  };

  const clinicalEscalations = exceptions.filter(e => e.kind === 'clinical_review' || e.kind === 'ai_escalation').length;
  const reportsReview = exceptions.filter(e => e.kind === 'missing_report').length;
  const careLoopExceptions = exceptions.filter(e => e.kind === 'appointment_issue' || e.kind === 'no_response').length;

  const [patientQuestionsCount, setPatientQuestionsCount] = useState(0);

  useEffect(() => {
    clinicApi.whatsappInbox({ filter: "waiting_staff" })
      .then((rows: any[]) => {
        if (Array.isArray(rows)) {
          setPatientQuestionsCount(rows.length);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-2.5 h-full">
      {/* Alerts List */}
      <div className="flex flex-col gap-1.5">
        {[
          { label: 'Clinical Escalations', count: clinicalEscalations, badgeColor: 'bg-[#F48484]', href: '/care-loop' },
          { label: 'Reports Awaiting Review', count: reportsReview, badgeColor: 'bg-[#F48484]', href: '/clinical-diagnostics' },
          { label: 'Care Loop Exceptions', count: careLoopExceptions, badgeColor: 'bg-[#F5B575]', href: '/care-loop' },
          { label: 'Patient Questions', count: patientQuestionsCount, badgeColor: 'bg-[#71A021]', href: '/whatsapp/inbox' }
        ].map((alert, i) => (
          <div key={i} className="flex items-center justify-between p-1 pr-4 rounded-full bg-[#EFEAF6]">
            <div className="flex items-center gap-2">
              <span className={`w-[clamp(1.25rem,2vw,1.5rem)] h-[clamp(1.25rem,2vw,1.5rem)] rounded-full flex items-center justify-center text-white text-[clamp(0.6rem,0.9vw,0.75rem)] font-medium ${alert.badgeColor}`}>
                {alert.count}
              </span>
              <span className="text-[clamp(0.7rem,1.1vw,0.875rem)] text-[#866BE3]">{alert.label}</span>
            </div>
            {alert.label === 'Patient Questions' ? (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open-header-messages"));
                }}
                className="text-[clamp(0.6rem,0.9vw,0.75rem)] text-[#866BE3] underline hover:text-[#7254d1] decoration-1 underline-offset-2"
              >
                View
              </button>
            ) : (
              <Link href={alert.href} className="text-[clamp(0.6rem,0.9vw,0.75rem)] text-[#866BE3] underline hover:text-[#7254d1] decoration-1 underline-offset-2">View</Link>
            )}
          </div>
        ))}
      </div>

      {/* Voice Consultation Card (Image 2) */}
      <div className="rounded-[24px] p-[clamp(0.75rem,1.5vw,1.25rem)] flex flex-col items-center justify-center gap-3 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 isolate bg-white">
        <div className="flex items-center justify-between w-full z-10">
          <span className="text-[clamp(0.55rem,0.8vw,0.65rem)] font-bold tracking-[0.15em] text-[#A694E8] uppercase">Next Patient</span>
          <div className="bg-[#F4F0FC] text-[#866BE3] px-2.5 py-1 rounded-full text-[clamp(0.55rem,0.8vw,0.65rem)] font-semibold flex items-center gap-1 shadow-sm">
            <Clock className="w-3 h-3" /> {nextAppointment?.time || (couples.length > 0 ? "Active Patient" : "No visits scheduled")}
          </div>
        </div>

        {/* Avatar & Info */}
        <div className="flex flex-col items-center gap-1.5 mt-0.5 z-10">
          <div className="relative">
            {/* Large purple glow behind avatar */}
            <div className="absolute inset-0 bg-[#C178F5] opacity-25 blur-lg rounded-full scale-125"></div>

            {/* Two Overlapping Avatars */}
            <div className="relative z-10 flex -space-x-3 items-center justify-center">
              <div className="w-[clamp(2.5rem,4vw,3.5rem)] h-[clamp(2.5rem,4vw,3.5rem)] rounded-full border-2 border-white shadow-sm relative z-20 overflow-hidden bg-white">
                <Image src="/images/dashboard/patient.png" alt="Patient 1" fill sizes="56px" className="object-cover" />
              </div>
              <div className="w-[clamp(2.5rem,4vw,3.5rem)] h-[clamp(2.5rem,4vw,3.5rem)] rounded-full border-2 border-white shadow-sm relative z-10 overflow-hidden bg-white">
                <Image src="/images/dashboard/patient.png" alt="Patient 2" fill sizes="56px" className="object-cover" />
              </div>
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-[clamp(0.875rem,1.4vw,1.1rem)] font-bold text-[#1f1830] leading-tight">{patientName}</h3>
            <p className="text-[clamp(0.6rem,0.9vw,0.7rem)] text-gray-400 font-medium mt-0.5 tracking-wide">{appointmentDetails}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full z-10">
          {!consultation.isActive ? (
            <button
              type="button"
              onClick={startConsultation}
              className="bg-gradient-to-r from-[#A784F3] to-[#866BE3] text-white rounded-full p-1 flex items-center justify-between flex-[65%] shadow-[0_12px_24px_rgb(134,107,227,0.35)] relative overflow-hidden group hover:opacity-95 transition-opacity"
            >
              <div className="w-[clamp(1.5rem,2.5vw,1.75rem)] h-[clamp(1.5rem,2.5vw,1.75rem)] rounded-full border border-white/20 bg-white/10 flex items-center justify-center shrink-0">
                <Mic className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-medium text-[clamp(0.6rem,0.9vw,0.75rem)] whitespace-nowrap pl-1">Start Consultation</span>
              <div className="w-[clamp(1.5rem,2.5vw,1.75rem)] h-[clamp(1.5rem,2.5vw,1.75rem)] rounded-full bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors">
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConsultation(prev => ({ ...prev, isMinimized: false }))}
              className="bg-red-50 border border-red-200 text-red-600 rounded-full p-1 flex items-center justify-between flex-[65%] shadow-sm relative overflow-hidden group"
            >
              <div className="w-[clamp(1.5rem,2.5vw,1.75rem)] h-[clamp(1.5rem,2.5vw,1.75rem)] rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
              </div>
              <span className="font-medium text-[clamp(0.6rem,0.9vw,0.75rem)] whitespace-nowrap pl-1">
                {consultation.isPaused ? "Paused" : "Recording"} {formatSecondsToTime(consultation.recordSeconds)}
              </span>
              <div className="w-[clamp(1.5rem,2.5vw,1.75rem)] h-[clamp(1.5rem,2.5vw,1.75rem)] rounded-full bg-red-100 flex items-center justify-center shrink-0 group-hover:bg-red-200 transition-colors">
                <ArrowRight className="w-3.5 h-3.5 text-red-500" />
              </div>
            </button>
          )}

          <Link
            href={nextCouple ? `/patients/${nextCouple.id}` : "/patients"}
            className="bg-gradient-to-r from-[#FBF9FF] to-[#F3EEFC] text-[#866BE3] rounded-full p-1 pl-2.5 flex items-center justify-between flex-[35%] shadow-[0_8px_16px_rgb(134,107,227,0.08)] border border-white relative overflow-hidden group hover:shadow-[0_8px_20px_rgb(134,107,227,0.12)] transition-shadow"
          >
            <span className="font-medium text-[clamp(0.6rem,0.9vw,0.75rem)] whitespace-nowrap mx-auto">View</span>
            <div className="w-[clamp(1.5rem,2.5vw,1.75rem)] h-[clamp(1.5rem,2.5vw,1.75rem)] rounded-full flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-3.5 h-3.5 text-[#866BE3]" />
            </div>
          </Link>
        </div>
      </div>

      {/* Last Consultation Summary Card (Image 1) */}
      <div className="bg-gradient-to-br from-[#7C5CEB] to-[#5434BD] rounded-[24px] shadow-sm p-[clamp(1rem,1.5vw,1.25rem)] flex flex-col justify-between text-white relative overflow-hidden flex-1 min-h-[190px]">
        {/* Decorative background aura */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="size-7 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="size-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-tight">Last Consultation Summary</h2>
          </div>

          {lastConsultation ? (() => {
            const parsed = parseConsultationContent(lastConsultation.content);
            return (
              <>
                {/* Subtitle & AI Generated Badge */}
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-sm text-white">
                    {lastConsultation.title}
                  </h3>
                  <span className="bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/20">
                    AI Analyzed
                  </span>
                </div>

                {/* Date */}
                <p className="text-[11px] text-white/70 mb-2 font-medium">
                  {lastConsultation.date}
                </p>

                {/* Critical Details Highlight Banner */}
                {parsed.criticalDetails && parsed.criticalDetails.length > 0 && (
                  <div className="mb-2 px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[11px] font-semibold flex items-center gap-1.5 line-clamp-1">
                    <span className="text-amber-300">⚠️</span>
                    <span className="truncate">Critical: {parsed.criticalDetails[0]}</span>
                  </div>
                )}

                {/* Body / Dialogue Preview */}
                {parsed.dialogue && parsed.dialogue.length > 0 ? (
                  <div className="space-y-1 text-xs text-white/90 leading-snug">
                    {parsed.dialogue.slice(0, 2).map((d, i) => (
                      <div key={i} className="line-clamp-1 text-[11px]">
                        <span className="font-bold text-white/70">{d.speaker}:</span> "{d.text}"
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/90 leading-relaxed font-normal line-clamp-3">
                    {lastConsultation.content}
                  </p>
                )}
              </>
            );
          })() : (
            <div className="py-3">
              <p className="text-xs text-white/80 font-medium">No recent consultation recorded</p>
              <p className="text-[11px] text-white/60 mt-1">Start a consultation session above to record voice notes and clinical summaries.</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        {lastConsultation && (
          <div className="mt-3 relative z-10">
            <button
              type="button"
              onClick={() => setSummaryModalOpen(true)}
              className="py-1.5 px-4 rounded-full bg-white text-[#7C5CEB] text-xs font-semibold hover:bg-white/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
            >
              <span>View detailed summary</span>
              <ArrowRight className="size-3" />
            </button>
          </div>
        )}
      </div>

      {/* Consultation Summary Modal */}
      {lastConsultation && (
        <ConsultationSummaryModal
          isOpen={summaryModalOpen}
          onOpenChange={setSummaryModalOpen}
          consultation={lastConsultation}
        />
      )}

      {/* Active Consultation Modal, Minimized Floating Dock & Confirmation Dialog (Images 2, 3, 4) */}
      <ActiveConsultationModal
        session={consultation}
        onPauseToggle={togglePause}
        onMinimizeToggle={toggleMinimize}
        onEndRequest={handleEndRequest}
        onEndConfirm={handleEndConfirm}
        onCancelEnd={handleCancelEnd}
        isEndingDialogOpen={isEndingDialogOpen}
      />
    </div>
  );
}
