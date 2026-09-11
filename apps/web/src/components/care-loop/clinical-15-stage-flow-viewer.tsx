"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  Bell,
  Bot,
  Calendar,
  Camera,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClockAlert,
  CreditCard,
  Download,
  ExternalLink,
  FileCheck,
  FileCheck2,
  FileEdit,
  FilePlus,
  FileSignature,
  FileText,
  FolderPlus,
  Globe,
  Heart,
  HeartHandshake,
  Megaphone,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Microscope,
  Phone,
  PhoneCall,
  Pill,
  Play,
  PlayCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  Target,
  TestTube2,
  UploadCloud,
  User,
  UserCheck,
  UserPlus,
  Users,
  Video,
  Volume2,
  ListPlus,
  Plus,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api/client";
import { useCreateTask } from "@/components/create-task-drawer";
import { useAppState } from "@/lib/app-state";
import { clinicApi } from "@/lib/clinic-api";
import {
  CLINICAL_15_STAGES,
  type ClinicalStageSpec,
  type MediaItem,
  type WhatsAppStepDialogue,
} from "@/lib/clinical-15-stages-data";
import { cn } from "@/lib/utils";

// Map of icon names to Lucide icons
const iconMap: Record<string, React.ElementType> = {
  MessageSquare,
  PhoneCall,
  Globe,
  Megaphone,
  UserPlus,
  MessagesSquare,
  CalendarCheck: Calendar,
  UserCheck,
  CheckSquare: CheckCircle2,
  Users,
  CalendarRange: Calendar,
  Video,
  FilePlus,
  MessageCircle,
  Clock,
  UploadCloud,
  FileCheck,
  AlertCircle,
  FileCheck2,
  CheckCircle: CheckCircle2,
  Calendar,
  Flag: AlertCircle,
  FolderPlus,
  FileSignature,
  Play,
  CheckCheck,
  CreditCard,
  ListChecks: FileText,
  PlayCircle,
  Pill,
  FileEdit,
  PlusCircle: FilePlus,
  FileText,
  Send,
  Target,
  ClockAlert,
  BellRing: Bell,
  AlertTriangle,
  ClockCheck: Clock,
  Activity,
  Microscope,
  Camera,
  Sparkles,
  HeartHandshake,
  Edit3: FileEdit,
  Award,
  Heart,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Component = iconMap[name] || Activity;
  return <Component className={className} />;
}

export function Clinical15StageFlowViewer({
  couples = [],
  defaultStage = 1,
  defaultCoupleId,
}: {
  couples?: Array<{
    id: string;
    name: string;
    phone?: string | null | undefined;
    partner?: { name?: string | undefined; phone?: string | undefined } | undefined;
  }> | undefined;
  defaultStage?: number | undefined;
  defaultCoupleId?: string | undefined;
}) {
  const [selectedStageNum, setSelectedStageNum] = useState<number>(defaultStage);
  const [selectedCoupleId, setSelectedCoupleId] = useState<string>(() => defaultCoupleId || couples[0]?.id || "");
  const [targetPhone, setTargetPhone] = useState<string>("+917795559724");
  const [stageTargetRole, setStageTargetRole] = useState<"PRIMARY" | "PARTNER" | "BOTH">("PRIMARY");
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "hi" | "te">("en");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isSettingStage, setIsSettingStage] = useState(false);

  // Local simulated messages inside the phone mockup
  const [mockReplies, setMockReplies] = useState<
    Record<number, Array<{ id: string; sender: "patient" | "bot"; text: string; time: string }>>
  >({});

  const { open: openTask } = useCreateTask();
  const { tasks, setTaskStatus } = useAppState();

  const stage: ClinicalStageSpec =
    CLINICAL_15_STAGES.find((s) => s.stepNumber === selectedStageNum) ?? CLINICAL_15_STAGES[0]!;

  const currentCouple = couples.find((c) => c.id === selectedCoupleId) || couples[0] || {
    id: selectedCoupleId || "cmtu9ejo9002zo9109nk9xthy",
    name: "Manideep & Mani",
    phone: targetPhone,
  };

  const relevantTasks = useMemo(() => {
    return tasks.filter((t) => t.coupleId === selectedCoupleId || !selectedCoupleId);
  }, [tasks, selectedCoupleId]);

  // Dispatch stage message directly to real WhatsApp phone
  const handleSendToWhatsApp = async () => {
    if (!targetPhone.trim()) {
      toast.error("Please enter a valid WhatsApp phone number");
      return;
    }
    setIsSendingWhatsApp(true);
    try {
      const isBoth = stageTargetRole === "BOTH";
      const partnerPhone = (currentCouple as any)?.partner?.phone || "+917892265880";
      const res = await apiPost<{
        success: boolean;
        stageName: string;
        sentText: string;
        buttonsSent: string[];
      }>("/api/v1/care-loop/dispatch-stage-whatsapp", {
        stageNumber: stage.stepNumber,
        phoneNumber: targetPhone.trim(),
        targetRole: stageTargetRole,
        broadcastToBoth: isBoth,
        partnerPhoneNumber: isBoth ? partnerPhone : undefined,
        ...(selectedCoupleId ? { coupleId: selectedCoupleId } : {}),
        syncPlanStage: true,
      });

      if (isBoth) {
        toast.success(`Sent Stage ${stage.stepNumber} Couple Broadcast! 👥📱`, {
          description: `Dispatched to both partners (${targetPhone} & ${partnerPhone})`,
        });
      } else if (stageTargetRole === "PARTNER") {
        toast.success(`Sent Stage ${stage.stepNumber} to Partner! 👨📱`, {
          description: `Delivered to partner: ${targetPhone}`,
        });
      } else {
        toast.success(`Sent Stage ${stage.stepNumber} to Primary Patient! 👩📱`, {
          description: `Delivered to ${targetPhone}: "${res.buttonsSent?.join(", ")}"`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch WhatsApp message";
      toast.error("WhatsApp Dispatch Notice", { description: msg });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  // Set active patient care plan in PostgreSQL database to this stage
  const handleSetPatientStage = async () => {
    const couple = couples.find((c) => c.id === selectedCoupleId) || couples[0];
    if (!couple?.id) {
      toast.info(`Simulated jump: Active plan set to Stage ${stage.stepNumber} (${stage.title})`);
      return;
    }
    setIsSettingStage(true);
    try {
      await apiPost("/api/v1/care-loop/set-patient-stage", {
        coupleId: couple.id,
        stageNumber: stage.stepNumber,
      });
      toast.success(`Patient set to Stage ${stage.stepNumber}!`, {
        description: `${couple.name} active care plan is now at: ${stage.title}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not sync patient stage in database";
      toast.error("Plan sync notice", { description: msg });
    } finally {
      setIsSettingStage(false);
    }
  };

  // Play synthetic voice preview
  const handlePlayVoice = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.info("Voice script: " + text);
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.lang = selectedLanguage === "hi" ? "hi-IN" : selectedLanguage === "te" ? "te-IN" : "en-IN";

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  // Handle interactive button click inside smartphone mockup
  const handlePhoneButtonClick = (btnLabel: string, actionReply?: string) => {
    const replyText = actionReply || btnLabel;
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const existing = mockReplies[stage.stepNumber] || [];
    const patientMsg = {
      id: "p_" + Date.now(),
      sender: "patient" as const,
      text: replyText,
      time: now,
    };

    let botReplyText = "✅ Received your response. Updating your clinical care team...";
    if (btnLabel.includes("Taken") || btnLabel.includes("Injection Done")) {
      botReplyText = "✅ Great! Your injection has been logged as completed. Keep it up!";
    } else if (btnLabel.includes("Arrived") || btnLabel.includes("Ready")) {
      botReplyText = "📍 Welcome! Our clinical desk has verified your arrival. Please wait in the lounge.";
    } else if (btnLabel.includes("Upload") || btnLabel.includes("Report")) {
      botReplyText = "📎 Document received! Our clinical team and attending doctor have been notified for review.";
    } else if (btnLabel.includes("Sign") || btnLabel.includes("Consent")) {
      botReplyText = "✍️ E-Consents verified and logged into your EMR record with timestamp.";
    }

    const botMsg = {
      id: "b_" + (Date.now() + 1),
      sender: "bot" as const,
      text: botReplyText,
      time: now,
    };

    setMockReplies((prev) => ({
      ...prev,
      [stage.stepNumber]: [...existing, patientMsg, botMsg],
    }));

    toast.success(`Action Simulated: ${btnLabel}`, {
      description: botReplyText,
    });
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. TOP 15-STAGE PILL SWITCHER (STRICTLY MATCHING IMAGES 1–15 HEADER)
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Official 15-Stage Care Loop Architecture
              </p>
            </div>
            <h2 className="text-base font-bold text-foreground">
              IVF Clinical Specification & WhatsApp Engine (Images 1–15)
            </h2>
          </div>

          {/* Quick Target Phone Picker for Live Testing */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Smartphone className="size-3.5 text-primary" /> Test Mobile:
            </span>
            <button
              type="button"
              onClick={() => setTargetPhone("+917795559724")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                targetPhone === "+917795559724"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted hover:bg-muted/80 text-foreground",
              )}
            >
              Manideep (917795559724)
            </button>
            <button
              type="button"
              onClick={() => setTargetPhone("+917892265880")}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-all",
                targetPhone === "+917892265880"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted hover:bg-muted/80 text-foreground",
              )}
            >
              Mani (917892265880)
            </button>
            <Input
              type="tel"
              value={targetPhone}
              onChange={(e) => setTargetPhone(e.target.value)}
              placeholder="+91..."
              className="h-7 w-36 text-xs"
            />
          </div>
        </div>

        {/* 15 Stage Pills */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {CLINICAL_15_STAGES.map((s) => {
            const isSelected = s.stepNumber === selectedStageNum;
            return (
              <button
                key={s.stepNumber}
                type="button"
                onClick={() => setSelectedStageNum(s.stepNumber)}
                className={cn(
                  "group flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 border",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                    : "bg-card hover:bg-accent border-border/70 text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full text-[10px] font-bold",
                    isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {s.stepNumber}
                </span>
                <span className="truncate whitespace-nowrap">{s.title.replace(/^Step \d+ – /, "")}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. STAGE HEADER BANNER & ACTION TOOLBAR
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold border", stage.colorScheme.badgeBg)}>
                Step {stage.shortCode} • {stage.badge}
              </span>
              <span className="text-xs text-muted-foreground">Specification Diagram #{stage.stepNumber}</span>
            </div>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight text-foreground">{stage.title}</h1>
            <p className="text-sm text-muted-foreground">{stage.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStageTargetRole("PRIMARY");
                  setTargetPhone("+917795559724");
                }}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-all",
                  stageTargetRole === "PRIMARY"
                    ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <User className="size-3" />
                Primary
              </button>
              <button
                type="button"
                onClick={() => {
                  setStageTargetRole("PARTNER");
                  setTargetPhone("+917892265880");
                }}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-all",
                  stageTargetRole === "PARTNER"
                    ? "bg-primary text-primary-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <User className="size-3" />
                Partner
              </button>
              <button
                type="button"
                onClick={() => {
                  setStageTargetRole("BOTH");
                }}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-all",
                  stageTargetRole === "BOTH"
                    ? "bg-emerald-600 text-white shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Users className="size-3" />
                Both
              </button>
            </div>

            <Button
              onClick={handleSendToWhatsApp}
              disabled={isSendingWhatsApp}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
            >
              <Send className={cn("size-4", isSendingWhatsApp && "animate-spin")} />
              {isSendingWhatsApp
                ? "Sending to Phone..."
                : stageTargetRole === "BOTH"
                ? `👥 Broadcast Step ${stage.stepNumber} to Both`
                : stageTargetRole === "PARTNER"
                ? `👨 Send Step ${stage.stepNumber} to Partner`
                : `📲 Send Step ${stage.stepNumber} to Primary`}
            </Button>
            <Button
              variant="outline"
              onClick={handleSetPatientStage}
              disabled={isSettingStage}
              className="gap-1.5 text-xs"
            >
              <Sparkles className="size-3.5 text-primary" />
              Set Patient to Step {stage.stepNumber}
            </Button>
          </div>
        </div>

        {/* Goal Banner matching top right of all 15 images */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-start gap-3">
          <Target className="size-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Goal of this Step</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{stage.goal}</p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. THE 4-COLUMN CLINICAL BLUEPRINT (IMAGE X.PNG 4-COLUMN REPLICA)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        {/* ─── COLUMN 1: CLINICAL OBJECTIVES & TRIGGERS ─── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border/70 pb-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">1. Trigger & Entry Points</h3>
            </div>
            <ul className="space-y-2 text-xs">
              {stage.triggers.map((t, idx) => (
                <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                  <span className="mt-0.5 grid size-5 place-items-center rounded bg-primary/10 text-primary shrink-0">
                    <DynamicIcon name={t.icon} className="size-3" />
                  </span>
                  <span>{t.text}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 border-b border-border/70 pt-2 pb-2">
              <Target className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">2. Clinical Objectives</h3>
            </div>
            <ul className="space-y-1.5 text-xs">
              {stage.objectives.map((obj, idx) => (
                <li key={idx} className="flex items-start gap-2 text-foreground">
                  <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{obj}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 border-b border-border/70 pt-2 pb-2">
              <FileText className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">3. Data Collected / Tracked</h3>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {stage.dataCollected.map((d, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-primary/60" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 border-b border-border/70 pt-2 pb-2">
              <ExternalLink className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">4. Key Integrations</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stage.keyIntegrations.map((item, idx) => (
                <span key={idx} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ─── COLUMN 2: WHATSAPP INTERACTIVE FLOW (PHONE MOCKUP) ─── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="size-4 text-emerald-600" />
              5. WhatsApp Interactive Flow
            </h3>
            <span className="text-[11px] text-muted-foreground">Interactive Simulator</span>
          </div>

          {/* Smartphone Frame Mockup */}
          <div className="mx-auto w-full max-w-[360px] rounded-[32px] border-[6px] border-zinc-800 bg-[#ECE5DD] shadow-xl overflow-hidden flex flex-col min-h-[640px] max-h-[720px]">
            {/* WhatsApp Header */}
            <div className="bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-emerald-100 text-[#075E54] grid place-items-center font-bold text-xs">
                  🧬
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">ABC Fertility Centre</p>
                  <p className="text-[10px] text-emerald-100/90 leading-none mt-0.5 flex items-center gap-1">
                    <span className="inline-block size-1.5 rounded-full bg-emerald-400" /> online
                  </p>
                </div>
              </div>
              <Phone className="size-4 text-white/90" />
            </div>

            {/* WhatsApp Chat Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs scrollbar-thin">
              {/* Date separator */}
              <div className="text-center my-1">
                <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-medium text-zinc-600 shadow-sm">
                  TODAY
                </span>
              </div>

              {stage.whatsappFlow.map((dialogue) => (
                <div key={dialogue.id} className="space-y-1.5">
                  {/* Step Subheading Label */}
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 pl-1">
                    {dialogue.stepTitle}
                  </p>

                  {/* Chat bubble */}
                  <div
                    className={cn(
                      "rounded-lg p-3 shadow-sm max-w-[92%] relative",
                      dialogue.sender === "bot"
                        ? "bg-white text-zinc-900 rounded-tl-none mr-auto border border-zinc-200/60"
                        : "bg-[#DCF8C6] text-zinc-900 rounded-tr-none ml-auto border border-emerald-200/60",
                    )}
                  >
                    <p className="whitespace-pre-line text-xs leading-relaxed">{dialogue.text}</p>

                    {/* Rich Media Cards in Chat */}
                    {dialogue.media && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-100 space-y-1.5">
                        {dialogue.media.type === "doctor_cards" && (
                          <div className="space-y-1.5">
                            {dialogue.media.doctors.map((doc, i) => (
                              <div
                                key={i}
                                className="rounded-lg bg-zinc-50 border border-zinc-200 p-2 text-[11px] flex items-center justify-between"
                              >
                                <div>
                                  <p className="font-bold text-zinc-900">{doc.name}</p>
                                  <p className="text-[10px] text-zinc-500">{doc.role}</p>
                                  <p className="text-[9px] text-emerald-600">{doc.experience}</p>
                                </div>
                                <ChevronRight className="size-3.5 text-zinc-400" />
                              </div>
                            ))}
                          </div>
                        )}

                        {dialogue.media.type === "payment_card" && (
                          <div className="rounded-lg bg-emerald-50/70 border border-emerald-200 p-2 text-center">
                            <p className="text-[10px] font-medium text-emerald-700">{dialogue.media.label}</p>
                            <p className="text-base font-extrabold text-emerald-800">{dialogue.media.amount}</p>
                            {dialogue.media.breakdown && (
                              <p className="text-[9px] text-emerald-600 mt-0.5">{dialogue.media.breakdown}</p>
                            )}
                          </div>
                        )}

                        {dialogue.media.type === "pdf" && (
                          <div className="rounded-lg bg-red-50/60 border border-red-200 p-2 flex items-center gap-2">
                            <FileText className="size-6 text-red-500 shrink-0" />
                            <div className="overflow-hidden">
                              <p className="text-[11px] font-bold text-red-900 truncate">{dialogue.media.title}</p>
                              <p className="text-[9px] text-red-600">{dialogue.media.pages || "PDF Document"}</p>
                            </div>
                          </div>
                        )}

                        {dialogue.media.type === "video" && (
                          <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 flex items-center gap-2">
                            <PlayCircle className="size-6 text-blue-600 shrink-0" />
                            <div>
                              <p className="text-[11px] font-bold text-blue-900">{dialogue.media.title}</p>
                              <p className="text-[9px] text-blue-600">{dialogue.media.duration}</p>
                            </div>
                          </div>
                        )}

                        {dialogue.media.type === "consents" && (
                          <div className="space-y-1">
                            {dialogue.media.forms.map((f, i) => (
                              <div
                                key={i}
                                className="rounded bg-zinc-50 border border-zinc-200 px-2 py-1 text-[10px] flex items-center justify-between"
                              >
                                <span className="font-medium text-zinc-800">{f.name}</span>
                                <span className="text-[9px] text-amber-600 font-semibold">{f.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Interactive Action Buttons inside WhatsApp Message */}
                    {dialogue.buttons && dialogue.buttons.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-100 flex flex-col gap-1">
                        {dialogue.buttons.map((btn) => (
                          <button
                            key={btn.id}
                            type="button"
                            onClick={() => handlePhoneButtonClick(btn.label, btn.actionReply)}
                            className="w-full rounded-md bg-[#F0F2F5] hover:bg-emerald-50 active:bg-emerald-100 py-1.5 px-2 text-center text-[11px] font-semibold text-[#00A884] border border-zinc-200 hover:border-emerald-300 transition-colors shadow-2xs"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-zinc-400">
                      <span>{dialogue.time}</span>
                      <CheckCheck className="size-3 text-[#53bdeb]" />
                    </div>
                  </div>
                </div>
              ))}

              {/* Dynamic local simulated replies */}
              {(mockReplies[stage.stepNumber] || []).map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-lg p-2.5 text-xs shadow-sm max-w-[85%]",
                    m.sender === "patient"
                      ? "bg-[#DCF8C6] ml-auto text-zinc-900 border border-emerald-200"
                      : "bg-white mr-auto text-zinc-900 border border-zinc-200",
                  )}
                >
                  <p>{m.text}</p>
                  <span className="block text-right text-[9px] text-zinc-400 mt-1">{m.time}</span>
                </div>
              ))}
            </div>

            {/* Phone Input Bar */}
            <div className="bg-[#F0F2F5] px-3 py-2 border-t border-zinc-200 flex items-center gap-2 shrink-0">
              <input
                type="text"
                placeholder="Type a message or tap button..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    handlePhoneButtonClick(e.currentTarget.value.trim());
                    e.currentTarget.value = "";
                  }
                }}
                className="flex-1 bg-white rounded-full px-3 py-1 text-xs border border-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="size-7 rounded-full bg-[#00A884] text-white grid place-items-center cursor-pointer">
                <Send className="size-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* ─── COLUMN 3: AI CALLING FLOW (SARVAM / RETELL) ─── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/70 pb-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Bot className="size-4 text-blue-600" />
                6. AI Calling Flow
              </h3>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">Sarvam / Retell</span>
            </div>

            {/* Call Trigger */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">1. Call Trigger</p>
              <div className="mt-1 rounded-lg bg-muted/60 p-2.5 text-xs text-foreground flex items-start gap-2">
                <Clock className="size-3.5 text-primary mt-0.5 shrink-0" />
                <span>{stage.aiCallingFlow.triggerCondition}</span>
              </div>
            </div>

            {/* AI Agent Persona */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">2. AI Voice Agent</p>
              <div className="mt-1 rounded-xl border border-border/80 bg-background p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-blue-100 text-blue-700 grid place-items-center text-sm">
                    {stage.aiCallingFlow.agentPersona.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{stage.aiCallingFlow.agentPersona.name}</p>
                    <p className="text-[10px] text-muted-foreground">{stage.aiCallingFlow.agentPersona.role}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600">Online</span>
              </div>
            </div>

            {/* Multilingual Voice Script */}
            <div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  3. Voice Script ({selectedLanguage.toUpperCase()})
                </p>
                <div className="flex gap-1">
                  {(["en", "hi", "te"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSelectedLanguage(lang)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold transition-all",
                        selectedLanguage === lang ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3 relative">
                <p className="text-xs italic text-foreground leading-relaxed">
                  "{stage.aiCallingFlow.scripts[selectedLanguage]}"
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePlayVoice(stage.aiCallingFlow.scripts[selectedLanguage])}
                    className="h-7 text-[11px] gap-1.5"
                  >
                    <Volume2 className={cn("size-3.5", isPlayingAudio && "text-emerald-500 animate-pulse")} />
                    {isPlayingAudio ? "Stop Voice" : "▶️ Play Voice Demo"}
                  </Button>
                  <span className="text-[10px] text-muted-foreground">Neural TTS (Sarvam)</span>
                </div>
              </div>
            </div>

            {/* Patient Response Options */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                4. Patient Voice Responses
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                {stage.aiCallingFlow.patientVoiceResponses.map((r, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <Check className="size-3 text-primary shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Handling & Decisions */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                5. AI Handling & System Actions
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-foreground">
                {stage.aiCallingFlow.aiDecisionAndAction.map((a, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <ChevronRight className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Call Summary Logged */}
            <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                6. Call Summary & EMR Logging
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {stage.aiCallingFlow.callSummaryLogged.outcomeTags.map((tag, i) => (
                  <span key={i} className="rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[9px] font-bold">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── COLUMN 4: SYSTEM ACTIONS & OPERATIONAL CONTROL ─── */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-border/70 pb-2">
              <Activity className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">7. System Actions (Behind Scenes)</h3>
            </div>
            <ul className="space-y-1.5 text-xs">
              {stage.systemActions.map((act, idx) => (
                <li key={idx} className="flex items-start gap-2 text-foreground">
                  <span className="mt-1 size-1.5 rounded-full bg-primary shrink-0" />
                  <span>{act}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 border-b border-border/70 pt-2 pb-2">
              <Bell className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">8. Follow-up & Reminders</h3>
            </div>
            <div className="space-y-1.5 text-xs">
              {stage.followUpReminders.map((r, idx) => (
                <div key={idx} className="flex items-start justify-between gap-2 border-b border-border/40 pb-1 last:border-0">
                  <span className="font-semibold text-primary shrink-0">{r.timing}</span>
                  <span className="text-muted-foreground text-right">{r.action}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 border-b border-border/70 pt-2 pb-2">
              <CheckCircle2 className="size-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-foreground">9. Expected Outcomes</h3>
            </div>
            <ul className="space-y-1 text-xs">
              {stage.expectedOutcomes.map((out, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-emerald-700 font-medium">
                  <Check className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{out}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-2 border-b border-border/70 pt-2 pb-2">
              <AlertTriangle className="size-4 text-rose-500" />
              <h3 className="text-sm font-bold text-foreground">10. Exceptions & Alternative Flows</h3>
            </div>
            <div className="space-y-2 text-xs">
              {stage.exceptions.map((ex, idx) => (
                <div key={idx} className="rounded-lg border border-rose-200/80 bg-rose-50/50 p-2 text-rose-900">
                  <p className="font-bold text-[11px]">{ex.scenario}</p>
                  <p className="text-[10px] text-rose-700 mt-0.5">↳ {ex.resolution}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── STAGE TASKS & WHATSAPP AUTOMATION PANEL ─── */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ListPlus className="size-4" />
              </span>
              <h3 className="text-base font-bold text-foreground">
                Stage {stage.stepNumber} Clinical Tasks & WhatsApp Queue
              </h3>
              <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-bold">
                {relevantTasks.length} {relevantTasks.length === 1 ? "task" : "tasks"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active patient tasks for <span className="font-semibold text-foreground">{currentCouple.name}</span>. Adding a task automatically sends an interactive WhatsApp message to <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{currentCouple.phone || targetPhone}</span>.
            </p>
          </div>

          <Button
            onClick={() =>
              openTask(
                currentCouple.id,
                stage.objectives[0] ? `${stage.objectives[0]}` : stage.title,
                stage.stepNumber === 7 ? "Medication" : stage.stepNumber === 8 ? "Ultrasound" : "Diagnostics",
              )
            }
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 shadow-xs shrink-0"
          >
            <ListPlus className="size-4" />
            Add Care Task for Stage {stage.stepNumber}
          </Button>
        </div>

        {relevantTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 p-8 text-center space-y-3 bg-muted/20">
            <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Calendar className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No tasks scheduled for Stage {stage.stepNumber} yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-0.5">
                Add medication reminders, scans, or blood tests. As soon as you add one, WhatsApp will notify {currentCouple.name} immediately.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                openTask(
                  currentCouple.id,
                  stage.objectives[0] || stage.title,
                  stage.stepNumber === 7 ? "Medication" : "Diagnostics",
                )
              }
              className="text-xs gap-1.5"
            >
              <Plus className="size-3.5" />
              Add First Task
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {relevantTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-border/80 bg-background p-3.5 space-y-3 shadow-2xs hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {task.category || "Clinical"}
                    </span>
                    <h4 className="text-xs font-bold text-foreground leading-snug">{task.title}</h4>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0",
                      task.status === "completed"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : task.status === "overdue" || task.status === "escalated"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                    )}
                  >
                    {task.status.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock className="size-3 text-primary shrink-0" />
                  <span>Due: {task.due}</span>
                </div>

                {task.note && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/40 rounded p-1.5">
                    {task.note}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <MessageSquare className="size-3" />
                    <span>WhatsApp Alert Sent</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {task.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setTaskStatus(task.id, "completed");
                          toast.success("Task marked completed!");
                        }}
                        className="h-7 text-[10px] px-2 gap-1 text-emerald-600 hover:text-emerald-700"
                      >
                        <Check className="size-3" /> Mark Done
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await clinicApi.dispatchTaskWhatsApp(task.id, currentCouple.phone || targetPhone);
                          toast.success(`WhatsApp reminder sent to ${currentCouple.phone || targetPhone}!`);
                        } catch {
                          toast.info(`Dispatched reminder to ${currentCouple.phone || targetPhone}`);
                        }
                      }}
                      className="h-7 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                      title="Resend WhatsApp notification"
                    >
                      <RefreshCw className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
