"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";

type NoticeTone = "urgent" | "attention" | "info";

type Notice = {
  id: string;
  title: string;
  time: string;
  tone: NoticeTone;
};

function formatClock(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function toneMeta(tone: NoticeTone) {
  if (tone === "urgent") {
    return { label: "Urgent", dot: "bg-danger", chip: "text-danger" };
  }
  if (tone === "attention") {
    return { label: "Attention", dot: "bg-warning", chip: "text-warning-foreground" };
  }
  return { label: "Information", dot: "bg-info", chip: "text-info" };
}

export function NotificationCenter() {
  const { activity, kpis } = useAppState();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  const notices = useMemo<Notice[]>(() => {
    const fromActivity: Notice[] = activity.slice(0, 8).map((item) => {
      const tone: NoticeTone =
        item.tone === "danger" ? "urgent" : item.tone === "warning" ? "attention" : "info";
      return {
        id: item.id,
        title: `${item.patient} ${item.activity}`,
        time: item.time,
        tone,
      };
    });

    if (fromActivity.length) return fromActivity;

    return [
      {
        id: "demo-1",
        title: `${kpis.needAttention || 2} Care Loop exceptions`,
        time: "5 min ago",
        tone: "urgent",
      },
      {
        id: "demo-2",
        title: "3 medications low in stock",
        time: "18 min ago",
        tone: "attention",
      },
      {
        id: "demo-3",
        title: "New patient appointment",
        time: "32 min ago",
        tone: "info",
      },
    ];
  }, [activity, kpis.needAttention]);

  const unread = Math.max(notices.filter((n) => n.tone !== "info").length, notices.length ? 1 : 0);

  return (
    <div
      ref={rootRef}
      className="fixed bottom-0 right-3 z-50 flex h-[var(--app-dock-height)] items-center gap-2 sm:right-4"
    >
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="relative h-10 gap-1.5 rounded-xl px-2.5 text-muted-foreground hover:bg-primary-soft/70 hover:text-primary"
        >
          <Bell className="size-4.5" aria-hidden />
          {unread > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground tabular-nums">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>

        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          aria-hidden={!open}
          className={cn(
            "absolute right-0 bottom-[calc(100%+0.75rem)] w-[min(22rem,calc(100vw-1.5rem))] origin-bottom-right rounded-[1.15rem] border border-border/70 bg-card p-3.5 shadow-[0_18px_50px_rgba(28,18,52,0.14)] transition-all duration-200",
            open
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-95 opacity-0",
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-[11px] text-muted-foreground">Urgent · Attention · Information</p>
            </div>
            <Link
              href="/notifications"
              className="text-[11px] font-semibold text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>
          <ul className="max-h-[min(22rem,50vh)] space-y-1 overflow-y-auto">
            {notices.map((notice) => {
              const meta = toneMeta(notice.tone);
              return (
                <li key={notice.id}>
                  <div className="flex gap-2.5 rounded-xl px-2 py-2 hover:bg-muted/50">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", meta.dot)} aria-hidden />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold tracking-wide uppercase opacity-70">
                        {meta.label}
                      </p>
                      <p className="text-sm font-medium leading-snug text-foreground">{notice.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{notice.time}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <time
        dateTime={now.toISOString()}
        className="min-w-[4.75rem] text-right text-xs font-medium tabular-nums text-muted-foreground"
        aria-label={`Current time ${formatClock(now)}`}
      >
        {formatClock(now)}
      </time>
    </div>
  );
}
