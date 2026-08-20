"use client";

import { usePathname } from "next/navigation";

import type { AiPageContext } from "@/lib/ai/types";

export function useAiPageContext(extra?: Partial<AiPageContext>): AiPageContext {
  const pathname = usePathname() || "/";
  const match = pathname.match(/^\/patients\/([^/?#]+)/);
  const coupleSlug = match?.[1] ? decodeURIComponent(match[1]) : extra?.coupleSlug;
  return {
    pathname,
    ...(coupleSlug ? { coupleSlug } : {}),
    ...(extra?.coupleId ? { coupleId: extra.coupleId } : {}),
    ...(extra?.search ? { search: extra.search } : {}),
  };
}

export function quickActionsForPath(pathname: string, hasCouple: boolean) {
  if (hasCouple || pathname.startsWith("/patients/")) {
    return [
      "Summarize this patient",
      "What needs to happen next?",
      "What was discussed in the last consultation?",
      "Are there overdue tasks?",
      "Draft a follow-up message",
    ];
  }
  if (pathname.startsWith("/appointments")) {
    return [
      "Who has appointments today?",
      "Show upcoming appointments",
      "Are there missed appointments?",
      "Give me today's clinic priorities.",
    ];
  }
  if (pathname.startsWith("/tasks")) {
    return [
      "Which tasks are overdue?",
      "Tasks due today",
      "Create a follow-up task for tomorrow",
      "Who needs follow-up?",
    ];
  }
  if (pathname.startsWith("/patients")) {
    return [
      "Show patients who need follow-up",
      "Search patients",
      "Recently added patients",
      "Give me today's clinic priorities.",
    ];
  }
  if (pathname.includes("care") || pathname.includes("journey")) {
    return [
      "Which patients are falling behind their care plan?",
      "Show overdue tasks",
      "Give me today's clinic priorities.",
    ];
  }
  // Dashboard / default
  return [
    "Give me today's clinic priorities.",
    "Who has appointments today?",
    "Which tasks are overdue?",
    "Give me today's clinic summary",
  ];
}
