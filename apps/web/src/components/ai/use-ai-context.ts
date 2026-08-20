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
      "Why is this patient marked as needing attention?",
      "Prepare me for this patient's consultation",
      "What happened in the last consultation?",
      "Draft a follow-up message",
    ];
  }
  if (pathname.startsWith("/appointments")) {
    return [
      "Prepare today's appointments",
      "Prepare me for my next consultation",
      "Who has appointments today?",
      "Who needs attention today?",
    ];
  }
  if (pathname.startsWith("/tasks")) {
    return [
      "Which tasks are overdue?",
      "Show the follow-up queue",
      "Prioritize my tasks",
      "Who needs follow-up today?",
    ];
  }
  if (pathname.startsWith("/patients")) {
    return [
      "Who needs follow-up today?",
      "Which patients haven't been contacted recently?",
      "Show inactive patients",
      "Which patients have no coordinator?",
    ];
  }
  return [
    "Who needs attention today?",
    "Prepare my day",
    "Today's appointments",
    "Overdue tasks",
    "Patient follow-ups",
    "Show team workload",
  ];
}
