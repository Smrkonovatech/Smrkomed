"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useSmrkoAiBuddy } from "@/components/ai/smrko-ai-host";
import {
  APP_NAV_CATEGORIES,
  categoryMatchesPath,
  type AppNavCategory,
} from "@/lib/navigation/app-nav";
import { cn } from "@/lib/utils";

const CLOSE_DELAY_MS = 220;

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpen: setAiOpen } = useSmrkoAiBuddy();
  const [openId, setOpenId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const menuId = useId();

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
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenId(null);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  function handleItemActivate(category: AppNavCategory, href: string, openAi?: boolean) {
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
      className="fixed inset-x-0 bottom-0 z-40 h-[var(--app-dock-height)] border-t border-border/70 bg-card/95 shadow-[0_-8px_30px_rgba(28,18,52,0.06)] backdrop-blur-md"
    >
      <div className="relative mx-auto flex h-full max-w-[1600px] items-stretch gap-0.5 px-2 pr-[9.5rem] sm:px-3 sm:pr-[10.5rem] lg:gap-1 lg:pr-[11rem]">
        {APP_NAV_CATEGORIES.map((category) => {
          const active = categoryMatchesPath(category, pathname);
          const expanded = openId === category.id;
          const Icon = category.icon;
          const panelId = `${menuId}-${category.id}`;

          return (
            <div
              key={category.id}
              className="relative flex min-w-0 flex-1 justify-center"
              onMouseEnter={() => openCategory(category.id)}
              onMouseLeave={scheduleClose}
            >
              <button
                type="button"
                aria-label={category.label}
                aria-expanded={expanded}
                aria-haspopup="menu"
                aria-controls={expanded ? panelId : undefined}
                onFocus={() => openCategory(category.id)}
                onClick={() => {
                  if (category.href && category.items.length <= 1) {
                    router.push(category.href);
                    setOpenId(null);
                    return;
                  }
                  openCategory(category.id);
                }}
                className={cn(
                  "group relative flex h-full w-full max-w-[7.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-1.5 transition-all duration-200",
                  "hover:-translate-y-0.5 hover:bg-primary-soft/70 hover:text-primary",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active || expanded
                    ? "bg-primary-soft text-primary shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {(active || expanded) && (
                  <span
                    className="absolute top-1.5 size-1 rounded-full bg-primary"
                    aria-hidden
                  />
                )}
                <Icon
                  className={cn(
                    "size-[1.15rem] transition-colors duration-200 sm:size-5",
                    active || expanded ? "text-primary" : "text-muted-foreground group-hover:text-primary",
                  )}
                  aria-hidden
                />
                <span
                  className={cn(
                    "max-w-full truncate text-[10px] font-semibold tracking-tight sm:text-[11px]",
                    active || expanded ? "text-primary" : "text-muted-foreground group-hover:text-primary",
                  )}
                >
                  {category.label}
                </span>
              </button>

              <div
                id={panelId}
                role="menu"
                aria-label={category.label}
                aria-hidden={!expanded}
                className={cn(
                  "pointer-events-none absolute bottom-[calc(100%+0.65rem)] left-1/2 z-50 w-[min(22rem,calc(100vw-1.5rem))] -translate-x-1/2 origin-bottom scale-95 rounded-[1.15rem] border border-border/70 bg-card p-3.5 opacity-0 shadow-[0_18px_50px_rgba(28,18,52,0.14)] transition-all duration-200",
                  expanded && "pointer-events-auto scale-100 opacity-100",
                )}
                onMouseEnter={() => openCategory(category.id)}
                onMouseLeave={scheduleClose}
              >
                <div className="mb-3 border-b border-border/60 pb-2.5">
                  <p className="text-[11px] font-bold tracking-[0.14em] text-primary uppercase">
                    {category.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{category.description}</p>
                </div>
                <ul
                  className={cn(
                    "grid gap-1",
                    category.columns === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
                  )}
                >
                  {category.items.map((item) => {
                    const ItemIcon = item.icon;
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
                          aria-label={item.label}
                          aria-current={itemActive ? "page" : undefined}
                          onClick={(event) => {
                            event.preventDefault();
                            handleItemActivate(category, item.href, item.openAi);
                          }}
                          onFocus={() => openCategory(category.id)}
                          className={cn(
                            "flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition-colors duration-150",
                            "hover:bg-primary-soft/70 focus-visible:bg-primary-soft/70 focus-visible:outline-none",
                            itemActive && "bg-primary-soft/50",
                          )}
                        >
                          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                            <ItemIcon className="size-3.5" aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-foreground">
                              {item.label}
                            </span>
                            {item.description ? (
                              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                                {item.description}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
