"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Area, AreaChart } from "recharts";

import { Avatar, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/status";
import { toneDot } from "@/lib/status";

export function DashCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-4 shadow-[0_8px_24px_rgba(28,18,52,0.04)] transition-shadow duration-200 hover:shadow-[0_12px_28px_rgba(28,18,52,0.07)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function DashCardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

const accentBg: Record<string, string> = {
  primary: "bg-primary-soft/70",
  purple: "bg-primary-soft/70",
  rose: "bg-rose-50",
  success: "bg-emerald-50",
  warning: "bg-orange-50",
  danger: "bg-rose-50",
  info: "bg-sky-50",
  teal: "bg-teal-50/80",
  muted: "bg-muted/60",
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  trend,
  spark,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone | "primary";
  trend?: { label: string; direction: "up" | "down" | "flat" };
  spark?: number[];
}) {
  const sparkData = (spark ?? [4, 6, 5, 8, 7, 9, 8]).map((v, i) => ({ i, v }));
  return (
    <DashCard className={cn("relative overflow-hidden", accentBg[tone] ?? accentBg["primary"])}>
      <div className="flex items-start justify-between gap-2">
        <div className="grid size-9 place-items-center rounded-xl bg-white/80 text-primary shadow-sm">
          <Icon className="size-4" />
        </div>
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-lg bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold",
              trend.direction === "up"
                ? "text-emerald-700"
                : trend.direction === "down"
                  ? "text-rose-700"
                  : "text-muted-foreground",
            )}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight className="size-3" />
            ) : trend.direction === "down" ? (
              <ArrowDownRight className="size-3" />
            ) : null}
            {trend.label}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <div className="mt-3 h-8 w-full opacity-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData}>
            <Area
              type="monotone"
              dataKey="v"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.15}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </DashCard>
  );
}

export function CareLoopDonut({
  overdue,
  dueSoon,
  inProgress,
  completed,
  total,
}: {
  overdue: number;
  dueSoon: number;
  inProgress: number;
  completed: number;
  total: number;
}) {
  const data = [
    { name: "Overdue", value: overdue, color: "#e11d48" },
    { name: "Due soon", value: dueSoon, color: "#f59e0b" },
    { name: "In progress", value: inProgress, color: "#7b4fe0" },
    { name: "Completed", value: completed, color: "#10b981" },
  ];
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative size-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={46}
              outerRadius={64}
              paddingAngle={3}
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-xl font-semibold tabular-nums">{total}</p>
            <p className="text-[10px] text-muted-foreground">Active</p>
          </div>
        </div>
      </div>
      <ul className="grid w-full grid-cols-2 gap-2 text-xs sm:flex-1">
        {data.map((item) => (
          <li key={item.name} className="flex items-center gap-2 rounded-xl bg-background/70 px-2.5 py-2">
            <span className="size-2.5 rounded-full" style={{ background: item.color }} />
            <span className="min-w-0 flex-1 text-muted-foreground">{item.name}</span>
            <span className="font-semibold tabular-nums">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MiniMonthCalendar({
  selected,
  onSelect,
  markedDays,
  rangeFrom,
  rangeTo,
  viewMonth,
  onViewMonthChange,
}: {
  selected: Date;
  onSelect: (date: Date) => void;
  markedDays?: number[];
  rangeFrom?: Date | null;
  rangeTo?: Date | null;
  viewMonth?: Date;
  onViewMonthChange?: (date: Date) => void;
}) {
  const cursor = viewMonth ?? selected;
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const marks = new Set(markedDays ?? [12, 18, 21, 24]);

  const fromTs = rangeFrom ? new Date(rangeFrom).setHours(0, 0, 0, 0) : null;
  const toTs = rangeTo ? new Date(rangeTo).setHours(0, 0, 0, 0) : null;

  const cells: Array<number | null> = [
    ...Array.from({ length: startPad }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shiftMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    onViewMonthChange?.(next);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">
          {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </p>
        {onViewMonthChange ? (
          <div className="flex gap-1">
            <button
              type="button"
              className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              ‹
            </button>
            <button
              type="button"
              className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted-foreground">
        {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day == null) return <span key={`e-${idx}`} />;
          const date = new Date(year, month, day);
          const ts = date.setHours(0, 0, 0, 0);
          const isSelected =
            selected.getFullYear() === year &&
            selected.getMonth() === month &&
            selected.getDate() === day;
          const isToday =
            day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const inRange =
            fromTs != null && toTs != null && ts >= fromTs && ts <= toTs;
          const isEdge = ts === fromTs || ts === toTs;
          const marked = marks.has(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(new Date(year, month, day))}
              className={cn(
                "relative grid aspect-square place-items-center rounded-lg text-xs font-medium transition-colors duration-150",
                isEdge || isSelected
                  ? "bg-primary text-primary-foreground"
                  : inRange
                    ? "bg-primary-soft text-primary"
                    : isToday
                      ? "bg-primary-soft/70 text-primary"
                      : "hover:bg-muted text-foreground",
              )}
            >
              {day}
              {marked && !isSelected && !isEdge ? (
                <span className="absolute bottom-1 size-1 rounded-full bg-primary/70" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangeControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const options = ["Today", "Tomorrow", "This Week", "Next 7 Days", "This Month"] as const;
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border/60 bg-white p-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150",
            value === opt
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function ViewLink({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-xs">
      <Link href={href}>
        {label}
        <ArrowRight className="size-3.5" />
      </Link>
    </Button>
  );
}

export function ActivityDot({ tone }: { tone: Tone | string }) {
  return <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", toneDot[(tone as Tone) ?? "muted"] ?? "bg-muted-foreground")} />;
}

export function CoupleAvatar({ label }: { label: string }) {
  const initials = label
    .split(/[+&]/)
    .map((p) => p.trim()[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return <Avatar initials={initials || "SM"} className="size-9 text-xs" />;
}

export { StatusBadge };
