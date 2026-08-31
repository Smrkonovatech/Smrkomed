"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Bell, CalendarDays } from "lucide-react";

import { MiniMonthCalendar } from "@/components/dashboard/widgets";
import { useSmrkoAiBuddy } from "@/components/ai/smrko-ai-host";
import {
  APP_NAV_CATEGORIES,
  categoryMatchesPath,
  type AppNavCategory,
} from "@/lib/navigation/app-nav";
import { useDashboardDateRangeOptional } from "@/lib/dashboard-date-range";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";

const CLOSE_DELAY_MS = 180;
const ACTIVE_AMBER = "#f5a524";

function formatClock(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function DockStatus() {
  const { activity, kpis } = useAppState();
  const dateRange = useDashboardDateRangeOptional();
  const [open, setOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [pickStep, setPickStep] = useState<"from" | "to">("from");
  const [draftFrom, setDraftFrom] = useState<Date | null>(null);
  const [draftTo, setDraftTo] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(() => new Date());
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const calPanelId = useId();

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setCalOpen(false);
      }
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setCalOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  const notices = activity.slice(0, 8).map((item) => ({
    id: item.id,
    title: `${item.patient} ${item.activity}`,
    time: item.time,
    tone: item.tone,
  }));

  const unread = Math.max(kpis.needAttention || notices.length, notices.length ? 1 : 0);
  const mode = dateRange?.mode ?? "today";
  const calActive = mode !== "today" || calOpen;

  function openCalendar() {
    setOpen(false);
    setCalOpen((v) => !v);
    setPickStep("from");
    setDraftFrom(dateRange?.from ?? new Date());
    setDraftTo(dateRange?.to ?? null);
    setViewMonth(dateRange?.from ?? new Date());
  }

  function onCalendarDay(date: Date) {
    if (!dateRange) return;
    if (pickStep === "from" || !draftFrom) {
      setDraftFrom(date);
      setDraftTo(null);
      setPickStep("to");
      return;
    }
    setDraftTo(date);
    dateRange.setRange(draftFrom, date);
    setPickStep("from");
  }

  return (
    <div ref={rootRef} className="relative flex items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setCalOpen(false);
          setOpen((v) => !v);
        }}
        className="relative inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
      >
        <Bell className="size-4" aria-hidden />
        <span className="tabular-nums">{unread > 9 ? "9+" : unread}</span>
        {unread > 0 ? (
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[#f5a524] ring-2 ring-[#1a1a1a]" />
        ) : null}
      </button>

      <time
        dateTime={now.toISOString()}
        className="min-w-[3.25rem] text-right text-xs font-semibold tabular-nums text-white/75"
        aria-label={`Current time ${formatClock(now)}`}
      >
        {formatClock(now)}
      </time>

      {dateRange ? (
        <button
          type="button"
          aria-label={`Dashboard date filter: ${dateRange.label}`}
          aria-expanded={calOpen}
          aria-controls={calPanelId}
          title={dateRange.label}
          onClick={openCalendar}
          className={cn(
            "relative grid size-8 place-items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35",
            calActive ? "bg-white/15 text-[#f5a524]" : "text-white/85 hover:bg-white/10",
          )}
        >
          <CalendarDays className="size-4" aria-hidden />
          {mode !== "today" ? (
            <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-primary ring-2 ring-[#1a1a1a]" />
          ) : null}
        </button>
      ) : null}

      {/* Notifications panel */}
      <div
        id={panelId}
        role="dialog"
        aria-label="Notifications"
        aria-hidden={!open}
        className={cn(
          "absolute right-0 bottom-[calc(100%+0.75rem)] w-[min(22rem,calc(100vw-1.5rem))] origin-bottom-right rounded-2xl border border-border/60 bg-card p-3 shadow-[0_16px_40px_rgba(28,18,52,0.16)] transition-all duration-200",
          open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
      >
        <div className="mb-2 flex items-center justify-between border-b border-border/50 pb-2">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          <Link
            href="/notifications"
            className="text-[11px] font-semibold text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            View all
          </Link>
        </div>
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {(notices.length
            ? notices
            : [{ id: "d1", title: `${kpis.needAttention} Care Loop exceptions`, time: "Just now", tone: "danger" }]
          ).map((notice) => (
            <li key={notice.id} className="rounded-xl px-2 py-2 hover:bg-muted/50">
              <p className="text-sm font-medium leading-snug text-foreground">{notice.title}</p>
              <p className="text-[11px] text-muted-foreground">{notice.time}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Calendar / date filter panel */}
      {dateRange ? (
        <div
          id={calPanelId}
          role="dialog"
          aria-label="Dashboard date filter"
          aria-hidden={!calOpen}
          className={cn(
            "absolute right-0 bottom-[calc(100%+0.75rem)] w-[min(20rem,calc(100vw-1.5rem))] origin-bottom-right rounded-2xl border border-border/60 bg-white p-3 shadow-[0_16px_40px_rgba(28,18,52,0.16)] transition-all duration-200",
            calOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
          )}
        >
          <div className="mb-3">
            <p className="text-sm font-semibold text-foreground">Dashboard period</p>
            <p className="text-[11px] text-muted-foreground">
              Choose which day details to reflect on Home
            </p>
          </div>

          <div className="mb-3 flex gap-1 rounded-xl bg-muted/60 p-1">
            {(
              [
                { id: "all" as const, label: "All", onClick: () => dateRange.setAll() },
                { id: "today" as const, label: "Today", onClick: () => dateRange.setToday() },
                {
                  id: "range" as const,
                  label: "From – To",
                  onClick: () => {
                    const start = dateRange.from ?? new Date();
                    setPickStep("from");
                    setDraftFrom(start);
                    setDraftTo(dateRange.to);
                    setViewMonth(start);
                    // Enter range mode immediately so calendar shows
                    dateRange.setRange(start, dateRange.to ?? start);
                  },
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={opt.onClick}
                className={cn(
                  "flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors",
                  mode === opt.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-white hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {mode === "range" ? (
            <>
              <p className="mb-2 text-[11px] text-muted-foreground">
                {pickStep === "from"
                  ? "Select start date"
                  : draftTo
                    ? `Range: ${dateRange.label}`
                    : "Select end date"}
              </p>
              <MiniMonthCalendar
                selected={draftTo ?? draftFrom ?? new Date()}
                onSelect={onCalendarDay}
                rangeFrom={draftFrom}
                rangeTo={draftTo}
                viewMonth={viewMonth}
                onViewMonthChange={setViewMonth}
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
                  onClick={() => setCalOpen(false)}
                >
                  Close
                </button>
                {draftFrom && draftTo ? (
                  <button
                    type="button"
                    className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"
                    onClick={() => {
                      dateRange.setRange(draftFrom, draftTo);
                      setCalOpen(false);
                    }}
                  >
                    Apply
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="rounded-xl bg-primary-soft/50 px-3 py-2 text-xs text-foreground/80">
              Showing <span className="font-semibold">{dateRange.label}</span> on the dashboard.
              Choose <span className="font-semibold">From – To</span> to pick a custom range.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpen: setAiOpen } = useSmrkoAiBuddy();
  const { kpis } = useAppState();
  const [openId, setOpenId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const menuId = useId();
  const taskBadge = kpis.needAttention > 0 ? kpis.needAttention : 0;

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpenId(null), CLOSE_DELAY_MS);
  }, [clearCloseTimer]);

  const openCategory = useCallback(
    (id: string) => {
      clearCloseTimer();
      setOpenId(id);
    },
    [clearCloseTimer],
  );

  useEffect(() => {
    setOpenId(null);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenId(null);
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpenId(null);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  function handleItemActivate(_category: AppNavCategory, href: string, openAi?: boolean) {
    setOpenId(null);
    if (openAi) {
      setAiOpen(true);
      return;
    }
    router.push(href);
  }

  return (
    <nav
      ref={rootRef}
      aria-label="Primary application navigation"
      className="fixed inset-x-0 bottom-0 z-40 h-[var(--app-dock-height)] bg-[#1a1a1a] shadow-[0_-10px_40px_rgba(0,0,0,0.28)]"
    >
      <div className="relative mx-auto flex h-full w-full max-w-[1600px] items-center px-4 sm:px-5 lg:px-6">
        <Link
          href="/home"
          className="absolute left-4 z-10 flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:left-5 lg:left-6"
          aria-label="SmrkoMed home"
        >
          <span className="grid size-7 place-items-center overflow-hidden rounded-md bg-white/10">
            <img
              src="/branding/smrkomed-mark.png"
              alt=""
              width={28}
              height={28}
              className="size-7 object-cover"
            />
          </span>
          <span className="hidden text-[10px] font-bold tracking-[0.16em] text-white/90 md:inline">
            SMRKOMED
          </span>
        </Link>

        <div className="mx-auto flex h-full items-center justify-center gap-0.5 sm:gap-1">
          {APP_NAV_CATEGORIES.map((category) => {
            const active = categoryMatchesPath(category, pathname);
            const expanded = openId === category.id;
            const Icon = category.icon;
            const panelId = `${menuId}-${category.id}`;
            const lit = active || expanded;
            const hasMenu = category.id !== "dashboard" && category.items.length > 1;

            return (
              <div
                key={category.id}
                className="relative flex justify-center"
                onMouseEnter={() => (hasMenu ? openCategory(category.id) : setOpenId(null))}
                onMouseLeave={scheduleClose}
              >
                <button
                  type="button"
                  aria-label={category.label}
                  title={category.label}
                  aria-expanded={hasMenu ? expanded : undefined}
                  aria-haspopup={hasMenu ? "menu" : undefined}
                  aria-controls={hasMenu && expanded ? panelId : undefined}
                  onFocus={() => (hasMenu ? openCategory(category.id) : undefined)}
                  onClick={() => {
                    if (!hasMenu && category.href) {
                      router.push(category.href);
                      return;
                    }
                    if (hasMenu) openCategory(category.id);
                  }}
                  className={cn(
                    "flex min-w-[3.75rem] flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1 transition-colors duration-150 sm:min-w-[4.5rem] sm:px-2.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35",
                    lit ? "bg-white/10" : "hover:bg-white/8",
                  )}
                >
                  <Icon
                    className="size-[1.15rem] sm:size-5"
                    style={{ color: lit ? ACTIVE_AMBER : "rgba(255,255,255,0.92)" }}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span
                    className="max-w-[4.5rem] truncate text-[9px] font-semibold tracking-tight sm:text-[10px]"
                    style={{ color: lit ? ACTIVE_AMBER : "rgba(255,255,255,0.72)" }}
                  >
                    {category.label}
                  </span>
                </button>

                {hasMenu ? (
                  <div
                    id={panelId}
                    role="menu"
                    aria-label={category.label}
                    aria-hidden={!expanded}
                    className={cn(
                      "pointer-events-none absolute bottom-[calc(100%+14px)] left-1/2 z-50 w-[min(18rem,calc(100vw-1.5rem))] -translate-x-1/2 origin-bottom scale-95 opacity-0 transition-all duration-150",
                      category.columns === 2 && "sm:w-[22rem]",
                      expanded && "pointer-events-auto scale-100 opacity-100",
                    )}
                    onMouseEnter={() => openCategory(category.id)}
                    onMouseLeave={scheduleClose}
                  >
                    <div className="relative rounded-2xl border border-border/50 bg-white px-2 py-2 shadow-[0_14px_36px_rgba(28,18,52,0.16)]">
                      <span
                        aria-hidden
                        className="pointer-events-none absolute top-full left-1/2 -mt-px -translate-x-1/2"
                      >
                        <span className="block size-0 border-x-[7px] border-t-[8px] border-x-transparent border-t-white drop-shadow-[0_2px_2px_rgba(28,18,52,0.08)]" />
                      </span>
                      <p className="mb-1 px-2.5 pt-0.5 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                        {category.label}
                      </p>
                      <ul
                        className={cn(
                          "grid gap-0.5",
                          category.columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
                        )}
                      >
                        {category.items.map((item) => {
                          const ItemIcon = item.icon;
                          const badge = item.label === "Tasks" && taskBadge > 0 ? taskBadge : null;
                          const itemActive =
                            !item.openAi &&
                            (item.href === "/home"
                              ? pathname === "/home"
                              : pathname === item.href || pathname.startsWith(`${item.href}/`));
                          return (
                            <li key={`${category.id}-${item.label}`}>
                              <Link
                                href={item.openAi ? "#" : item.href}
                                role="menuitem"
                                aria-current={itemActive ? "page" : undefined}
                                onClick={(event) => {
                                  event.preventDefault();
                                  handleItemActivate(category, item.href, item.openAi);
                                }}
                                onFocus={() => openCategory(category.id)}
                                className={cn(
                                  "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-[#2c2540] transition-colors duration-150",
                                  "hover:bg-primary-soft/80 focus-visible:bg-primary-soft/80 focus-visible:outline-none",
                                  itemActive && "bg-primary-soft text-primary",
                                )}
                              >
                                <ItemIcon
                                  className="size-4 shrink-0 text-[#3d3558]"
                                  strokeWidth={1.75}
                                  aria-hidden
                                />
                                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                {badge != null ? (
                                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#fde8e8] text-[11px] font-semibold text-[#d14343] tabular-nums">
                                    {badge > 9 ? "9+" : badge}
                                  </span>
                                ) : null}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="absolute right-4 z-10 sm:right-5 lg:right-6">
          <DockStatus />
        </div>
      </div>
    </nav>
  );
}
