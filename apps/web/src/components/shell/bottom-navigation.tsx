"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Bell, CalendarDays } from "lucide-react";

import { useSmrkoAiBuddy } from "@/components/ai/smrko-ai-host";
import {
  APP_NAV_CATEGORIES,
  categoryMatchesPath,
  type AppNavCategory,
} from "@/lib/navigation/app-nav";
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date).replace(/\//g, '-');
}

function DockStatus() {
  const { activity, kpis } = useAppState();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  const rawActivity = Array.isArray(activity) ? activity : (activity as any)?.notices ?? [];
  const unread = rawActivity.length;
  const notices = rawActivity.slice(0, 8).map((item: any) => ({
    id: item.id,
    title: item.title || `${item.patient ?? ""} ${item.activity ?? ""}`.trim(),
    time: item.time,
    tone: item.tone,
  }));

  return (
    <div ref={rootRef} className="relative flex items-center gap-2 sm:gap-4">
      <button
        type="button"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((v) => !v);
        }}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 ? (
          <span className="absolute top-2 right-2 size-2 rounded-full bg-[#f5a524]" />
        ) : null}
      </button>

      <div className="flex flex-col items-end justify-center text-white/90 pr-2">
        <time
          dateTime={now.toISOString()}
          className="text-[14px] font-semibold leading-tight tabular-nums tracking-wide"
          aria-label={`Current time ${formatClock(now)}`}
        >
          {formatClock(now)}
        </time>
        <time
          dateTime={now.toISOString()}
          className="text-[12px] text-white/60 tabular-nums leading-tight mt-0.5"
          aria-label={`Current date`}
        >
          {formatDate(now)}
        </time>
      </div>

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
          ).map((notice: any) => (
            <li key={notice.id} className="rounded-xl px-2 py-2 hover:bg-muted/50">
              <p className="text-sm font-medium leading-snug text-foreground">{notice.title}</p>
              <p className="text-[11px] text-muted-foreground">{notice.time}</p>
            </li>
          ))}
        </ul>
      </div>
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
          className="absolute left-4 z-10 flex items-center outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:left-5 lg:left-6"
          aria-label="SmrkoMed home"
        >
          <img src="/images/bottom-logo.svg" alt="SmrkoMed Logo" className="h-8 w-auto object-contain" />
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
