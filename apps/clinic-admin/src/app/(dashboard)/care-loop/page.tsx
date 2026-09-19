"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  ListChecks,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import React, { useMemo, useState } from "react";

import { Clinical15StageFlowViewer } from "@/components/care-loop/clinical-15-stage-flow-viewer";
import { useCreateTask } from "@/components/create-task-drawer";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";
import { coupleFullLabel } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export type CareLoopStatus = "On Track" | "Waiting" | "Needs Attention" | "Escalated";

export interface CareLoopItem {
  id: string;
  name: string;
  type: "couple" | "single";
  code: string;
  age: string;
  partnerA: {
    name: string;
    age: string;
    avatar: string;
  };
  partnerB?: {
    name: string;
    age: string;
    avatar: string;
  } | undefined;
  journey: string;
  stage: string;
  status: CareLoopStatus;
  healthScore: number;
  secondaryScore: number;
  activities: string[];
  aiAssistance: string[];
  nextAction: {
    title: string;
    timing: string;
    isUrgent?: boolean | undefined;
    type?: "calendar" | "document" | "warning" | undefined;
  };
  lastActivity: {
    text: string;
    time: string;
    channel: "whatsapp" | "sent" | "file" | "alert" | "ai";
  };
  detailedActivity: Array<{
    title: string;
    time: string;
    status: "completed" | "pending" | "waiting" | "alert" | "overdue";
  }>;
  detailedAi: Array<{
    title: string;
    time: string;
  }>;
  slug: string;
}

const DEFAULT_CARE_LOOP_ITEMS: CareLoopItem[] = [
  {
    id: "cpl-00124",
    name: "Priya & Arjun",
    type: "couple",
    code: "CPL-00124",
    age: "32 & 34 yrs",
    partnerA: {
      name: "Priya Sharma",
      age: "32 yrs",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
    },
    partnerB: {
      name: "Arjun Mehta",
      age: "34 yrs",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
    },
    journey: "IVF",
    stage: "Stimulation Day 8",
    status: "On Track",
    healthScore: 82,
    secondaryScore: 39,
    activities: [
      "Medication reminder sent",
      "Scan appointment confirmed",
      "Patient responded",
    ],
    aiAssistance: [
      "Conversation summarised",
      "Follow-up task suggested",
    ],
    nextAction: {
      title: "Follicular scan",
      timing: "Tomorrow, 10:30 AM",
      type: "calendar",
    },
    lastActivity: {
      text: "Patient replied",
      time: "Today, 9:42 AM",
      channel: "whatsapp",
    },
    detailedActivity: [
      { title: "Medication reminder sent", time: "Today, 8:00 AM", status: "completed" },
      { title: "Scan appointment confirmed", time: "Yesterday, 6:20 PM", status: "completed" },
      { title: "Patient responded", time: "Yesterday, 5:14 PM", status: "completed" },
    ],
    detailedAi: [
      { title: "Conversation summarised", time: "Today, 9:40 AM" },
      { title: "Follow-up task suggested", time: "Today, 9:38 AM" },
      { title: "Prepared patient education message", time: "Yesterday, 4:10 PM" },
    ],
    slug: "c-86et26y6-mu25beue",
  },
  {
    id: "pat-00876",
    name: "Ananya S.",
    type: "single",
    code: "PAT-00876",
    age: "29 yrs",
    partnerA: {
      name: "Ananya S.",
      age: "29 yrs",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    },
    journey: "IVF",
    stage: "FET Preparation",
    status: "Waiting",
    healthScore: 60,
    secondaryScore: 80,
    activities: [
      "Report requested",
      "Reminder sent (2)",
      "No response yet",
    ],
    aiAssistance: [
      "Missing document detected",
      "Follow-up message drafted",
    ],
    nextAction: {
      title: "Upload hormone report",
      timing: "Due today",
      isUrgent: true,
      type: "document",
    },
    lastActivity: {
      text: "Reminder sent",
      time: "Yesterday, 6:20 PM",
      channel: "sent",
    },
    detailedActivity: [
      { title: "Report requested", time: "Yesterday, 10:00 AM", status: "pending" },
      { title: "Reminder sent (2)", time: "Yesterday, 6:20 PM", status: "pending" },
      { title: "No response yet", time: "Today, 8:00 AM", status: "waiting" },
    ],
    detailedAi: [
      { title: "Missing document detected", time: "Yesterday, 9:45 AM" },
      { title: "Follow-up message drafted", time: "Yesterday, 6:15 PM" },
    ],
    slug: "ananya-s",
  },
  {
    id: "pat-00531",
    name: "Rahul K.",
    type: "single",
    code: "PAT-00531",
    age: "35 yrs",
    partnerA: {
      name: "Rahul K.",
      age: "35 yrs",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    },
    journey: "Maternity",
    stage: "2nd Trimester Week 22",
    status: "On Track",
    healthScore: 76,
    secondaryScore: 76,
    activities: [
      "Appointment confirmed",
      "Education material sent",
      "Vitals updated",
    ],
    aiAssistance: [
      "Patient query summarised",
      "Prepared counselling notes",
    ],
    nextAction: {
      title: "Routine consultation",
      timing: "18 Sep 2026",
      type: "calendar",
    },
    lastActivity: {
      text: "Vitals logged",
      time: "Today, 8:10 AM",
      channel: "file",
    },
    detailedActivity: [
      { title: "Appointment confirmed", time: "Today, 8:00 AM", status: "completed" },
      { title: "Education material sent", time: "Yesterday, 2:00 PM", status: "completed" },
      { title: "Vitals updated", time: "Today, 8:10 AM", status: "completed" },
    ],
    detailedAi: [
      { title: "Patient query summarised", time: "Today, 8:05 AM" },
      { title: "Prepared counselling notes", time: "Today, 8:08 AM" },
    ],
    slug: "rahul-k",
  },
  {
    id: "pat-00762",
    name: "Meera R.",
    type: "single",
    code: "PAT-00762",
    age: "31 yrs",
    partnerA: {
      name: "Meera R.",
      age: "31 yrs",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80",
    },
    journey: "IVF",
    stage: "Pre-treatment",
    status: "Needs Attention",
    healthScore: 40,
    secondaryScore: 40,
    activities: [
      "Lab report pending",
      "Follow-up overdue",
      "Coordinator notified",
    ],
    aiAssistance: [
      "Detected missing report",
      "Drafted message to patient",
    ],
    nextAction: {
      title: "Doctor review",
      timing: "Today",
      isUrgent: true,
      type: "warning",
    },
    lastActivity: {
      text: "Task overdue",
      time: "Today, 7:15 AM",
      channel: "alert",
    },
    detailedActivity: [
      { title: "Lab report pending", time: "Yesterday, 4:00 PM", status: "pending" },
      { title: "Follow-up overdue", time: "Today, 7:15 AM", status: "overdue" },
      { title: "Coordinator notified", time: "Today, 7:20 AM", status: "alert" },
    ],
    detailedAi: [
      { title: "Detected missing report", time: "Today, 7:00 AM" },
      { title: "Drafted message to patient", time: "Today, 7:10 AM" },
    ],
    slug: "meera-r",
  },
  {
    id: "cpl-00211",
    name: "Kavya & Rohit",
    type: "couple",
    code: "CPL-00211",
    age: "30 & 32 yrs",
    partnerA: {
      name: "Kavya Sharma",
      age: "30 yrs",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80",
    },
    partnerB: {
      name: "Rohit Varma",
      age: "32 yrs",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80",
    },
    journey: "IVF",
    stage: "Embryology Day 3",
    status: "Escalated",
    healthScore: 30,
    secondaryScore: 36,
    activities: [
      "Embryology update received",
      "Patient has questions",
      "Escalated to doctor",
    ],
    aiAssistance: [
      "Conversation summarised",
      "Prepared explanation draft",
    ],
    nextAction: {
      title: "Review embryo report",
      timing: "Today",
      isUrgent: true,
      type: "warning",
    },
    lastActivity: {
      text: "Escalated by AI",
      time: "Today, 6:50 AM",
      channel: "ai",
    },
    detailedActivity: [
      { title: "Embryology update received", time: "Yesterday, 5:00 PM", status: "completed" },
      { title: "Patient has questions", time: "Yesterday, 9:30 PM", status: "waiting" },
      { title: "Escalated to doctor", time: "Today, 6:50 AM", status: "alert" },
    ],
    detailedAi: [
      { title: "Conversation summarised", time: "Today, 6:48 AM" },
      { title: "Prepared explanation draft", time: "Today, 6:49 AM" },
    ],
    slug: "kavya-rohit",
  },
  {
    id: "pat-00901",
    name: "Sneha T.",
    type: "single",
    code: "PAT-00901",
    age: "28 yrs",
    partnerA: {
      name: "Sneha T.",
      age: "28 yrs",
      avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&auto=format&fit=crop&q=80",
    },
    journey: "IUI",
    stage: "Monitoring Day 12",
    status: "On Track",
    healthScore: 80,
    secondaryScore: 76,
    activities: [
      "Scan completed",
      "Results reviewed",
      "Next steps communicated",
    ],
    aiAssistance: [
      "Summary prepared",
      "Follow-up scheduled",
    ],
    nextAction: {
      title: "IUI procedure",
      timing: "16 Sep 2026",
      type: "calendar",
    },
    lastActivity: {
      text: "Results added",
      time: "Yesterday, 5:30 PM",
      channel: "file",
    },
    detailedActivity: [
      { title: "Scan completed", time: "Yesterday, 11:00 AM", status: "completed" },
      { title: "Results reviewed", time: "Yesterday, 2:30 PM", status: "completed" },
      { title: "Next steps communicated", time: "Yesterday, 5:30 PM", status: "completed" },
    ],
    detailedAi: [
      { title: "Summary prepared", time: "Yesterday, 2:35 PM" },
      { title: "Follow-up scheduled", time: "Yesterday, 5:32 PM" },
    ],
    slug: "sneha-t",
  },
  {
    id: "cpl-00345",
    name: "Vikram & Neha",
    type: "couple",
    code: "CPL-00345",
    age: "33 & 31 yrs",
    partnerA: {
      name: "Neha Joshi",
      age: "31 yrs",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80",
    },
    partnerB: {
      name: "Vikram Joshi",
      age: "33 yrs",
      avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100&auto=format&fit=crop&q=80",
    },
    journey: "IVF",
    stage: "Post Transfer Day 5",
    status: "Waiting",
    healthScore: 60,
    secondaryScore: 65,
    activities: [
      "BhCG reminder sent",
      "Education material shared",
      "Patient acknowledged",
    ],
    aiAssistance: [
      "Prepared follow-up message",
      "Monitoring for symptoms",
    ],
    nextAction: {
      title: "BhCG test",
      timing: "19 Sep 2026",
      type: "calendar",
    },
    lastActivity: {
      text: "Patient replied",
      time: "Today, 8:05 AM",
      channel: "whatsapp",
    },
    detailedActivity: [
      { title: "BhCG reminder sent", time: "Yesterday, 9:00 AM", status: "completed" },
      { title: "Education material shared", time: "Yesterday, 11:30 AM", status: "completed" },
      { title: "Patient acknowledged", time: "Today, 8:05 AM", status: "completed" },
    ],
    detailedAi: [
      { title: "Prepared follow-up message", time: "Yesterday, 8:50 AM" },
      { title: "Monitoring for symptoms", time: "Today, 8:10 AM" },
    ],
    slug: "vikram-neha",
  },
  {
    id: "pat-00654",
    name: "Radhika M.",
    type: "single",
    code: "PAT-00654",
    age: "30 yrs",
    partnerA: {
      name: "Radhika M.",
      age: "30 yrs",
      avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&auto=format&fit=crop&q=80",
    },
    journey: "Fertility",
    stage: "Investigation",
    status: "On Track",
    healthScore: 78,
    secondaryScore: 78,
    activities: [
      "Lab tests completed",
      "Results summarised",
      "Consultation scheduled",
    ],
    aiAssistance: [
      "Drafted consultation summary",
      "Suggested next tests",
    ],
    nextAction: {
      title: "Consultation",
      timing: "17 Sep 2026",
      type: "calendar",
    },
    lastActivity: {
      text: "Reports added",
      time: "Yesterday, 4:10 PM",
      channel: "file",
    },
    detailedActivity: [
      { title: "Lab tests completed", time: "Yesterday, 10:00 AM", status: "completed" },
      { title: "Results summarised", time: "Yesterday, 1:00 PM", status: "completed" },
      { title: "Consultation scheduled", time: "Yesterday, 4:10 PM", status: "completed" },
    ],
    detailedAi: [
      { title: "Drafted consultation summary", time: "Yesterday, 1:15 PM" },
      { title: "Suggested next tests", time: "Yesterday, 1:20 PM" },
    ],
    slug: "radhika-m",
  },
];

type FilterTab = "All" | "Needs Attention" | "Waiting" | "Escalated" | "On Track";
type DetailTab = "Overview" | "Journey" | "Activity" | "AI" | "Tasks";

export default function CareLoopPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stageParam = searchParams.get("stage");
  const parsedStage = stageParam ? parseInt(stageParam, 10) : 1;
  const initialStage = isNaN(parsedStage) ? 1 : Math.max(1, Math.min(15, parsedStage));
  const initialCoupleId = searchParams.get("coupleId") ?? undefined;

  const { couples } = useAppState();
  const { open: openCreateTask } = useCreateTask();

  // Navigation & View mode
  const [showSimulator, setShowSimulator] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [journeyFilter, setJourneyFilter] = useState("All");
  const [doctorFilter, setDoctorFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected item for drawer
  const [selectedId, setSelectedId] = useState<string>("cpl-00124");
  const [detailTab, setDetailTab] = useState<DetailTab>("Overview");
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({
    "cpl-00124": true,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  // Merge live database couples into list if available
  const allItems = useMemo(() => {
    const items = [...DEFAULT_CARE_LOOP_ITEMS];
    if (couples && couples.length > 0) {
      couples.forEach((c) => {
        const alreadyExists = items.some((item) => item.slug === c.slug || item.id === c.id);
        if (!alreadyExists) {
          items.push({
            id: c.id,
            name: coupleFullLabel(c),
            type: "couple",
            code: `CPL-${c.id.slice(-5).toUpperCase()}`,
            age: "30 & 32 yrs",
            partnerA: {
              name: c.primary.name,
              age: "30 yrs",
              avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
            },
            partnerB: c.partner
              ? {
                  name: c.partner.name,
                  age: "32 yrs",
                  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
                }
              : undefined,
            journey: c.treatment || "IVF",
            stage: c.stage || "Monitoring",
            status: "On Track",
            healthScore: 85,
            secondaryScore: 60,
            activities: [
              "Consultation note created",
              "Treatment cycle updated",
              "Patient care loop active",
            ],
            aiAssistance: [
              "Care plan synchronised",
              "Communication logs updated",
            ],
            nextAction: {
              title: "Clinical Follow-up",
              timing: "In 2 days",
              type: "calendar",
            },
            lastActivity: {
              text: "Profile updated",
              time: "Today",
              channel: "whatsapp",
            },
            detailedActivity: [
              { title: "Consultation note created", time: "Today", status: "completed" },
              { title: "Treatment cycle updated", time: "Yesterday", status: "completed" },
            ],
            detailedAi: [
              { title: "Care plan synchronised", time: "Today" },
            ],
            slug: c.slug,
          });
        }
      });
    }
    return items;
  }, [couples]);

  // Metric counts
  const counts = useMemo(() => {
    return {
      all: 126,
      needsAttention: 18,
      waiting: 11,
      escalated: 4,
      onTrack: 93,
    };
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (activeTab === "Needs Attention" && item.status !== "Needs Attention") return false;
      if (activeTab === "Waiting" && item.status !== "Waiting") return false;
      if (activeTab === "Escalated" && item.status !== "Escalated") return false;
      if (activeTab === "On Track" && item.status !== "On Track") return false;

      if (journeyFilter !== "All" && item.journey !== journeyFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.journey.toLowerCase().includes(q) ||
          item.stage.toLowerCase().includes(q) ||
          item.nextAction.title.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [allItems, activeTab, journeyFilter, searchQuery]);

  const selectedItem = useMemo(() => {
    return allItems.find((item) => item.id === selectedId) || allItems[0];
  }, [allItems, selectedId]);

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleSelectAll = () => {
    const allChecked = filteredItems.every((item) => checkedIds[item.id]);
    const updated: Record<string, boolean> = {};
    filteredItems.forEach((item) => {
      updated[item.id] = !allChecked;
    });
    setCheckedIds(updated);
  };

  const isAllChecked = filteredItems.length > 0 && filteredItems.every((item) => checkedIds[item.id]);

  return (
    <div className="mx-auto w-full max-w-[1780px] space-y-6 pb-12">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Care Loop
            </h1>
            <button
              type="button"
              onClick={() => setShowSimulator(!showSimulator)}
              className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50/80 px-2.5 py-1 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
            >
              <Sparkles className="size-3 text-purple-600" />
              {showSimulator ? "Exit Simulator" : "15-Stage Simulator"}
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-500 font-normal">
            Keep every patient journey moving forward.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-slate-400">Monday, 15 Sep 2026</p>
            <p className="text-sm font-semibold text-slate-800">9:42 AM</p>
          </div>
          <button
            type="button"
            onClick={() => openCreateTask()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5046e5] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4338ca] active:scale-[0.98]"
          >
            <Plus className="size-4 stroke-[2.5]" />
            Create Task
          </button>
        </div>
      </div>

      {/* Simulator Viewer if toggled */}
      {showSimulator ? (
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
          <Clinical15StageFlowViewer
            defaultStage={initialStage}
            defaultCoupleId={initialCoupleId}
            couples={couples.map((c) => ({
              id: c.id,
              name: coupleFullLabel(c),
              phone: c.primary.phone,
            }))}
          />
        </div>
      ) : (
        <>
          {/* 2. Top Metric Cards Row (5 Cards) */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
            {/* 1. Active Care Loops */}
            <button
              type="button"
              onClick={() => setActiveTab("All")}
              className={cn(
                "flex flex-col justify-between rounded-2xl border bg-white p-4 text-left transition-all duration-150 hover:shadow-md",
                activeTab === "All"
                  ? "border-[#5046e5] ring-2 ring-[#5046e5]/20 shadow-sm"
                  : "border-slate-200/80 shadow-xs"
              )}
            >
              <div className="flex items-start justify-between">
                <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <Users className="size-4.5" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {counts.all}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Active Care Loops</p>
              </div>
              <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <span>↑ 12%</span>
                <span className="font-normal text-slate-400">vs last week</span>
              </div>
            </button>

            {/* 2. Needs Attention */}
            <button
              type="button"
              onClick={() => setActiveTab("Needs Attention")}
              className={cn(
                "flex flex-col justify-between rounded-2xl border bg-white p-4 text-left transition-all duration-150 hover:shadow-md",
                activeTab === "Needs Attention"
                  ? "border-rose-500 ring-2 ring-rose-500/20 shadow-sm"
                  : "border-slate-200/80 shadow-xs"
              )}
            >
              <div className="flex items-start justify-between">
                <span className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="size-4.5" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {counts.needsAttention}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Needs Attention</p>
              </div>
              <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                <span>↑ 6%</span>
                <span className="font-normal text-slate-400">vs last week</span>
              </div>
            </button>

            {/* 3. Waiting on Patient */}
            <button
              type="button"
              onClick={() => setActiveTab("Waiting")}
              className={cn(
                "flex flex-col justify-between rounded-2xl border bg-white p-4 text-left transition-all duration-150 hover:shadow-md",
                activeTab === "Waiting"
                  ? "border-amber-500 ring-2 ring-amber-500/20 shadow-sm"
                  : "border-slate-200/80 shadow-xs"
              )}
            >
              <div className="flex items-start justify-between">
                <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="size-4.5" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {counts.waiting}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Waiting on Patient</p>
              </div>
              <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                <span>↓ 2%</span>
                <span className="font-normal text-slate-400">vs last week</span>
              </div>
            </button>

            {/* 4. Escalated */}
            <button
              type="button"
              onClick={() => setActiveTab("Escalated")}
              className={cn(
                "flex flex-col justify-between rounded-2xl border bg-white p-4 text-left transition-all duration-150 hover:shadow-md",
                activeTab === "Escalated"
                  ? "border-purple-500 ring-2 ring-purple-500/20 shadow-sm"
                  : "border-slate-200/80 shadow-xs"
              )}
            >
              <div className="flex items-start justify-between">
                <span className="grid size-9 place-items-center rounded-xl bg-purple-50 text-purple-600">
                  <ShieldAlert className="size-4.5" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {counts.escalated}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">Escalated</p>
              </div>
              <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                <span>↑ 1%</span>
                <span className="font-normal text-slate-400">vs last week</span>
              </div>
            </button>

            {/* 5. On Track */}
            <button
              type="button"
              onClick={() => setActiveTab("On Track")}
              className={cn(
                "col-span-2 sm:col-span-1 flex flex-col justify-between rounded-2xl border bg-white p-4 text-left transition-all duration-150 hover:shadow-md",
                activeTab === "On Track"
                  ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                  : "border-slate-200/80 shadow-xs"
              )}
            >
              <div className="flex items-start justify-between">
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-4.5" />
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                  {counts.onTrack}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">On Track</p>
              </div>
              <div className="mt-2.5 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <span>↑ 15%</span>
                <span className="font-normal text-slate-400">vs last week</span>
              </div>
            </button>
          </div>

          {/* 3. Filter Bar (Pills on left + Dropdowns on right) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("All")}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs",
                  activeTab === "All"
                    ? "bg-[#5046e5] text-white"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                )}
              >
                All ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("Needs Attention")}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs",
                  activeTab === "Needs Attention"
                    ? "bg-[#5046e5] text-white"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                )}
              >
                Needs Attention ({counts.needsAttention})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("Waiting")}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs",
                  activeTab === "Waiting"
                    ? "bg-[#5046e5] text-white"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                )}
              >
                Waiting ({counts.waiting})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("Escalated")}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs",
                  activeTab === "Escalated"
                    ? "bg-[#5046e5] text-white"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                )}
              >
                Escalated ({counts.escalated})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("On Track")}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs",
                  activeTab === "On Track"
                    ? "bg-[#5046e5] text-white"
                    : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50"
                )}
              >
                On Track ({counts.onTrack})
              </button>
            </div>

            {/* Dropdown Filters on Right */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <select
                  value={journeyFilter}
                  onChange={(e) => setJourneyFilter(e.target.value)}
                  className="h-9 cursor-pointer appearance-none rounded-xl border border-slate-200/80 bg-white pl-3.5 pr-8 text-xs font-medium text-slate-700 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5046e5]/20"
                >
                  <option value="All">All Journeys</option>
                  <option value="IVF">IVF</option>
                  <option value="Maternity">Maternity</option>
                  <option value="IUI">IUI</option>
                  <option value="Fertility">Fertility</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="relative">
                <select
                  value={doctorFilter}
                  onChange={(e) => setDoctorFilter(e.target.value)}
                  className="h-9 cursor-pointer appearance-none rounded-xl border border-slate-200/80 bg-white pl-3.5 pr-8 text-xs font-medium text-slate-700 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#5046e5]/20"
                >
                  <option value="All">All Doctors</option>
                  <option value="Dr. Priya Sharma">Dr. Priya Sharma</option>
                  <option value="Dr. Jismon J Chacko">Dr. Jismon J Chacko</option>
                  <option value="Dr. Ananya Rao">Dr. Ananya Rao</option>
                  <option value="Dr. Rahul Menon">Dr. Rahul Menon</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              </div>

              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50"
              >
                <SlidersHorizontal className="size-3.5 text-slate-400" />
                More Filters
              </button>
            </div>
          </div>

          {/* 4. Main Table + Detail Panel Split Layout */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            {/* Table Area */}
            <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                      <th className="w-10 px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isAllChecked}
                          onChange={toggleSelectAll}
                          className="size-4 rounded border-slate-300 text-[#5046e5] focus:ring-[#5046e5]"
                        />
                      </th>
                      <th className="px-3 py-3 font-semibold">Patient / Couple</th>
                      <th className="px-3 py-3 font-semibold">Journey & Stage</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-3 py-3 font-semibold">
                        <div>Care Loop Activity</div>
                        <div className="text-[10px] font-normal normal-case text-slate-400">Recent actions</div>
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        <div>AI Assistance</div>
                        <div className="text-[10px] font-normal normal-case text-slate-400">What AI has done</div>
                      </th>
                      <th className="px-3 py-3 font-semibold">
                        <div>Next Action</div>
                        <div className="text-[10px] font-normal normal-case text-slate-400">What happens next</div>
                      </th>
                      <th className="px-3 py-3 font-semibold">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => {
                      const isSelected = item.id === selectedId;
                      const isChecked = Boolean(checkedIds[item.id]);

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          className={cn(
                            "cursor-pointer transition-colors duration-150",
                            isSelected
                              ? "bg-purple-50/40 ring-1 ring-inset ring-[#5046e5]/30"
                              : "hover:bg-slate-50/80"
                          )}
                        >
                          {/* Checkbox */}
                          <td
                            className="px-3 py-3.5 text-center"
                            onClick={(e) => toggleCheck(item.id, e)}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="size-4 rounded border-slate-300 text-[#5046e5] focus:ring-[#5046e5]"
                            />
                          </td>

                          {/* Patient / Couple */}
                          <td className="px-3 py-3.5">
                            <div className="flex items-center gap-3">
                              {item.type === "couple" ? (
                                <div className="flex -space-x-2 shrink-0">
                                  <img
                                    src={item.partnerA.avatar}
                                    alt={item.partnerA.name}
                                    className="size-8 rounded-full border-2 border-white object-cover"
                                  />
                                  {item.partnerB && (
                                    <img
                                      src={item.partnerB.avatar}
                                      alt={item.partnerB.name}
                                      className="size-8 rounded-full border-2 border-white object-cover"
                                    />
                                  )}
                                </div>
                              ) : (
                                <img
                                  src={item.partnerA.avatar}
                                  alt={item.partnerA.name}
                                  className="size-8 shrink-0 rounded-full object-cover"
                                />
                              )}
                              <div>
                                <p className="font-bold text-slate-900 text-xs leading-snug">
                                  {item.name}
                                </p>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                  <span>{item.code}</span>
                                  <span>•</span>
                                  <span>{item.age}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Journey & Stage */}
                          <td className="px-3 py-3.5">
                            <p className="font-bold text-slate-800 text-xs leading-snug">
                              {item.journey}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                              {item.stage}
                            </p>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3.5">
                            <div>
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                                  item.status === "On Track" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                  item.status === "Waiting" && "bg-amber-50 text-amber-700 border border-amber-200",
                                  item.status === "Needs Attention" && "bg-rose-50 text-rose-700 border border-rose-200",
                                  item.status === "Escalated" && "bg-purple-50 text-purple-700 border border-purple-200"
                                )}
                              >
                                {item.status}
                              </span>
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="flex h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      item.status === "On Track" && "bg-emerald-500",
                                      item.status === "Waiting" && "bg-amber-500",
                                      item.status === "Needs Attention" && "bg-rose-500",
                                      item.status === "Escalated" && "bg-purple-500"
                                    )}
                                    style={{ width: `${item.healthScore}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-600">
                                  {item.healthScore}%
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {item.secondaryScore}%
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Care Loop Activity */}
                          <td className="px-3 py-3.5">
                            <ul className="space-y-1 text-[11px] text-slate-600 min-w-[170px]">
                              {item.activities.map((act, idx) => (
                                <li key={idx} className="flex items-center gap-1.5 leading-snug">
                                  {act.includes("reminder") || act.includes("confirmed") || act.includes("responded") || act.includes("updated") || act.includes("completed") || act.includes("summarised") || act.includes("scheduled") ? (
                                    <Check className="size-3 shrink-0 text-emerald-600 stroke-[2.5]" />
                                  ) : (
                                    <span className="size-1 rounded-full bg-slate-400 shrink-0" />
                                  )}
                                  <span className="truncate">{act}</span>
                                </li>
                              ))}
                            </ul>
                          </td>

                          {/* AI Assistance */}
                          <td className="px-3 py-3.5">
                            <ul className="space-y-1 text-[11px] text-slate-600 min-w-[170px]">
                              {item.aiAssistance.map((ai, idx) => (
                                <li key={idx} className="flex items-center gap-1.5 leading-snug">
                                  <Check className="size-3 shrink-0 text-purple-600 stroke-[2.5]" />
                                  <span className="truncate">{ai}</span>
                                </li>
                              ))}
                            </ul>
                          </td>

                          {/* Next Action */}
                          <td className="px-3 py-3.5">
                            <div className="flex items-start gap-2 min-w-[140px]">
                              {item.nextAction.isUrgent ? (
                                <AlertCircle className="size-3.5 shrink-0 text-rose-500 mt-0.5" />
                              ) : item.nextAction.type === "document" ? (
                                <FileText className="size-3.5 shrink-0 text-slate-400 mt-0.5" />
                              ) : (
                                <Calendar className="size-3.5 shrink-0 text-[#5046e5] mt-0.5" />
                              )}
                              <div>
                                <p className="font-semibold text-slate-800 text-[11px] leading-snug">
                                  {item.nextAction.title}
                                </p>
                                <p
                                  className={cn(
                                    "text-[10px] mt-0.5 font-medium",
                                    item.nextAction.isUrgent ? "text-rose-600 font-semibold" : "text-slate-400"
                                  )}
                                >
                                  {item.nextAction.timing}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Last Activity */}
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <div className="text-[11px]">
                              <p className="text-slate-400 text-[10px]">{item.lastActivity.time}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {item.lastActivity.channel === "whatsapp" && (
                                  <MessageSquare className="size-3 text-emerald-600 fill-emerald-100" />
                                )}
                                {item.lastActivity.channel === "sent" && (
                                  <Send className="size-3 text-blue-500" />
                                )}
                                {item.lastActivity.channel === "file" && (
                                  <FileText className="size-3 text-slate-400" />
                                )}
                                {item.lastActivity.channel === "alert" && (
                                  <AlertTriangle className="size-3 text-rose-500" />
                                )}
                                {item.lastActivity.channel === "ai" && (
                                  <Sparkles className="size-3 text-purple-600" />
                                )}
                                <span className="font-medium text-slate-700 text-xs">
                                  {item.lastActivity.text}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 5. Pagination Controls Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                <div>
                  Showing 1–{filteredItems.length} of {counts.all} patients
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    className="grid size-7 place-items-center rounded-lg border border-slate-200/80 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="grid size-7 place-items-center rounded-lg bg-[#5046e5] font-bold text-white shadow-xs"
                  >
                    1
                  </button>
                  <button
                    type="button"
                    className="grid size-7 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    2
                  </button>
                  <button
                    type="button"
                    className="grid size-7 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    3
                  </button>
                  <button
                    type="button"
                    className="grid size-7 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    4
                  </button>
                  <button
                    type="button"
                    className="grid size-7 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    5
                  </button>
                  <span className="px-1 text-slate-400">...</span>
                  <button
                    type="button"
                    className="grid size-7 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
                  >
                    16
                  </button>
                  <button
                    type="button"
                    className="grid size-7 place-items-center rounded-lg border border-slate-200/80 text-slate-500 hover:bg-slate-50"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span>Rows per page</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
                  >
                    <option value={8}>8</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 6. Selected Patient Inspection Panel (Right Drawer) */}
            {selectedItem && (
              <div className="w-full shrink-0 lg:w-[380px] xl:w-[420px] rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                {/* Drawer Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {selectedItem.type === "couple" ? (
                      <div className="flex -space-x-2 shrink-0">
                        <img
                          src={selectedItem.partnerA.avatar}
                          alt={selectedItem.partnerA.name}
                          className="size-10 rounded-full border-2 border-white object-cover"
                        />
                        {selectedItem.partnerB && (
                          <img
                            src={selectedItem.partnerB.avatar}
                            alt={selectedItem.partnerB.name}
                            className="size-10 rounded-full border-2 border-white object-cover"
                          />
                        )}
                      </div>
                    ) : (
                      <img
                        src={selectedItem.partnerA.avatar}
                        alt={selectedItem.partnerA.name}
                        className="size-10 shrink-0 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <h2 className="text-base font-bold text-slate-900 leading-snug">
                        {selectedItem.name}
                      </h2>
                      <p className="text-xs text-slate-400 font-medium">
                        {selectedItem.code}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedId("")}
                    className="grid size-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Status Badges Row */}
                <div className="mt-4 flex items-center justify-between border-y border-slate-100 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold",
                      selectedItem.status === "On Track" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                      selectedItem.status === "Waiting" && "bg-amber-50 text-amber-700 border border-amber-200",
                      selectedItem.status === "Needs Attention" && "bg-rose-50 text-rose-700 border border-rose-200",
                      selectedItem.status === "Escalated" && "bg-purple-50 text-purple-700 border border-purple-200"
                    )}
                  >
                    {selectedItem.status}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Care Loop Health
                    </span>
                    <span className="text-xs font-bold text-emerald-600 tabular-nums">
                      {selectedItem.healthScore}%
                    </span>
                    <div className="h-2 w-14 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${selectedItem.healthScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="mt-3 border-b border-slate-100">
                  <nav className="flex gap-4">
                    {(["Overview", "Journey", "Activity", "AI", "Tasks"] as DetailTab[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setDetailTab(tab)}
                        className={cn(
                          "pb-2.5 text-xs font-semibold transition border-b-2",
                          detailTab === tab
                            ? "border-[#5046e5] text-[#5046e5]"
                            : "border-transparent text-slate-400 hover:text-slate-700"
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                {detailTab === "Overview" && (
                  <div className="mt-4 space-y-5">
                    {/* Partners Info */}
                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50/70 p-3 text-xs border border-slate-100">
                      <div>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                          Partner A
                        </p>
                        <p className="font-bold text-slate-800 mt-0.5">{selectedItem.partnerA.name}</p>
                        <p className="text-slate-500 text-[11px]">{selectedItem.partnerA.age}</p>
                      </div>
                      {selectedItem.partnerB ? (
                        <div>
                          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                            Partner B
                          </p>
                          <p className="font-bold text-slate-800 mt-0.5">{selectedItem.partnerB.name}</p>
                          <p className="text-slate-500 text-[11px]">{selectedItem.partnerB.age}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                            Patient ID
                          </p>
                          <p className="font-bold text-slate-800 mt-0.5">{selectedItem.code}</p>
                          <p className="text-slate-500 text-[11px]">Single Patient</p>
                        </div>
                      )}
                    </div>

                    {/* Journey & Current Stage */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-slate-400">Journey: </span>
                          <span className="font-bold text-slate-800">{selectedItem.journey}</span>
                        </div>
                        <Link
                          href={`/patients/${selectedItem.slug}`}
                          className="font-semibold text-[#5046e5] hover:underline inline-flex items-center gap-0.5"
                        >
                          View Journey →
                        </Link>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-slate-400">Current Stage: </span>
                          <span className="font-bold text-slate-800">{selectedItem.stage}</span>
                        </div>
                        <Link
                          href={`/patients/${selectedItem.slug}`}
                          className="font-semibold text-[#5046e5] hover:underline inline-flex items-center gap-0.5"
                        >
                          View Timeline →
                        </Link>
                      </div>
                    </div>

                    {/* Next Key Action */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Next Key Action
                      </h3>
                      <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 p-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-[#5046e5]">
                            <Calendar className="size-4" />
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {selectedItem.nextAction.title}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {selectedItem.nextAction.timing}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push("/appointments")}
                          className="rounded-lg bg-[#5046e5] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#4338ca] transition"
                        >
                          View in Schedule
                        </button>
                      </div>
                    </div>

                    {/* Recent Care Loop Activity */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Recent Care Loop Activity
                      </h3>
                      <ul className="mt-2 space-y-2.5 text-xs">
                        {selectedItem.detailedActivity.map((act, i) => (
                          <li key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="grid size-4 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                                <Check className="size-2.5 stroke-[3]" />
                              </span>
                              <span className="font-medium text-slate-700">{act.title}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-normal">{act.time}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => router.push(`/patients/${selectedItem.slug}`)}
                        className="mt-2 text-xs font-semibold text-[#5046e5] hover:underline"
                      >
                        View all activity →
                      </button>
                    </div>

                    {/* AI Assistance */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        AI Assistance
                      </h3>
                      <ul className="mt-2 space-y-2.5 text-xs">
                        {selectedItem.detailedAi.map((ai, i) => (
                          <li key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="grid size-4 place-items-center rounded-full bg-purple-100 text-purple-700">
                                <Sparkles className="size-2.5" />
                              </span>
                              <span className="font-medium text-slate-700">{ai.title}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-normal">{ai.time}</span>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => router.push(`/patients/${selectedItem.slug}`)}
                        className="mt-2 text-xs font-semibold text-[#5046e5] hover:underline"
                      >
                        View all AI activity →
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => router.push(`/patients/${selectedItem.slug}`)}
                        className="flex-1 rounded-xl bg-[#20195e] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#181347] transition text-center active:scale-[0.98]"
                      >
                        Open Patient 360
                      </button>
                      <button
                        type="button"
                        onClick={() => openCreateTask()}
                        className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition text-center active:scale-[0.98]"
                      >
                        Create Task
                      </button>
                    </div>
                  </div>
                )}

                {detailTab === "Journey" && (
                  <div className="mt-4 space-y-3 text-xs">
                    <p className="font-medium text-slate-600">
                      Journey: <strong className="text-slate-900">{selectedItem.journey}</strong>
                    </p>
                    <p className="font-medium text-slate-600">
                      Current Stage: <strong className="text-slate-900">{selectedItem.stage}</strong>
                    </p>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-slate-500">
                        Full clinical stage protocol and milestone breakdown are active. Patient has completed automated checks for this phase.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full text-xs"
                      onClick={() => router.push(`/patients/${selectedItem.slug}`)}
                    >
                      Open Treatment Plan
                    </Button>
                  </div>
                )}

                {detailTab === "Activity" && (
                  <div className="mt-4 space-y-3 text-xs">
                    <div className="divide-y divide-slate-100">
                      {selectedItem.detailedActivity.map((act, i) => (
                        <div key={i} className="py-2.5 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-800">{act.title}</p>
                            <p className="text-[11px] text-slate-400">{act.time}</p>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            {act.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailTab === "AI" && (
                  <div className="mt-4 space-y-3 text-xs">
                    <div className="divide-y divide-slate-100">
                      {selectedItem.detailedAi.map((ai, i) => (
                        <div key={i} className="py-2.5">
                          <p className="font-bold text-slate-800 flex items-center gap-1.5">
                            <Sparkles className="size-3 text-purple-600" />
                            {ai.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{ai.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailTab === "Tasks" && (
                  <div className="mt-4 space-y-3 text-xs">
                    <div className="rounded-xl border border-slate-200/80 p-3 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-800">{selectedItem.nextAction.title}</p>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-1">Due: {selectedItem.nextAction.timing}</p>
                    </div>
                    <Button
                      className="w-full bg-[#5046e5] text-xs text-white"
                      onClick={() => openCreateTask()}
                    >
                      + Add New Task
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
