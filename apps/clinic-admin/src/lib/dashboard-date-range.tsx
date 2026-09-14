"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashboardDateMode = "all" | "today" | "range";

export type DashboardDateRange = {
  mode: DashboardDateMode;
  from: Date | null;
  to: Date | null;
};

type DashboardDateRangeApi = DashboardDateRange & {
  label: string;
  setAll: () => void;
  setToday: () => void;
  setRange: (from: Date, to: Date) => void;
};

const DashboardDateRangeContext = createContext<DashboardDateRangeApi | null>(null);

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatShort(date: Date) {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function buildLabel(mode: DashboardDateMode, from: Date | null, to: Date | null) {
  if (mode === "all") return "All dates";
  if (mode === "today") return "Today";
  if (from && to) {
    if (startOfDay(from).getTime() === startOfDay(to).getTime()) {
      return formatShort(from);
    }
    return `${formatShort(from)} – ${formatShort(to)}`;
  }
  return "Custom range";
}

export function DashboardDateRangeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DashboardDateMode>("today");
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);

  const setAll = useCallback(() => {
    setMode("all");
    setFrom(null);
    setTo(null);
  }, []);

  const setToday = useCallback(() => {
    const today = startOfDay(new Date());
    setMode("today");
    setFrom(today);
    setTo(today);
  }, []);

  const setRange = useCallback((nextFrom: Date, nextTo: Date) => {
    const a = startOfDay(nextFrom);
    const b = startOfDay(nextTo);
    setMode("range");
    setFrom(a <= b ? a : b);
    setTo(a <= b ? b : a);
  }, []);

  const value = useMemo<DashboardDateRangeApi>(
    () => ({
      mode,
      from,
      to,
      label: buildLabel(mode, from, to),
      setAll,
      setToday,
      setRange,
    }),
    [mode, from, to, setAll, setToday, setRange],
  );

  return (
    <DashboardDateRangeContext.Provider value={value}>{children}</DashboardDateRangeContext.Provider>
  );
}

export function useDashboardDateRange() {
  const ctx = useContext(DashboardDateRangeContext);
  if (!ctx) {
    throw new Error("useDashboardDateRange must be used within DashboardDateRangeProvider");
  }
  return ctx;
}

/** Safe hook when provider may be absent (non-dashboard pages still render the dock). */
export function useDashboardDateRangeOptional() {
  return useContext(DashboardDateRangeContext);
}

export function daysInRange(from: Date | null, to: Date | null) {
  if (!from || !to) return 1;
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}
