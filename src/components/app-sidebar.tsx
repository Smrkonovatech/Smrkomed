"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  Gauge,
  Heart,
  ListChecks,
  PlayCircle,
  RefreshCw,
  Settings,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";

const groups = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: Gauge }],
  },
  {
    label: "Patient Care",
    items: [
      { to: "/patients", label: "Patients", icon: Users },
      { to: "/ivf-cycles", label: "IVF Cycles", icon: Sparkles },
      { to: "/appointments", label: "Appointments", icon: CalendarDays },
      { to: "/care-plans", label: "Care Plans", icon: ClipboardList },
      { to: "/care-loop", label: "Care Loop", icon: RefreshCw, highlight: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/tasks", label: "Tasks", icon: ListChecks },
      { to: "/documents", label: "Documents", icon: FolderOpen },
      { to: "/billing", label: "Billing", icon: Wallet },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/reports", label: "Reports", icon: FileText },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Growth",
    items: [{ to: "/enquiries", label: "Enquiries", icon: Heart }],
  },
  {
    label: "Content",
    items: [{ to: "/care-content", label: "Care Content", icon: PlayCircle }],
  },
  {
    label: "Admin",
    items: [{ to: "/settings", label: "Settings", icon: Settings }],
  },
] as const;

const linkBase =
  "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors";

export function SidebarContentBody({ onNavigate }: { onNavigate?: () => void }) {
  const { kpis } = useAppState();
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-[0.16em] text-primary">SMRKOMED</p>
          <p className="truncate text-[11px] text-muted-foreground">Fertility Care Platform</p>
        </div>
      </div>

      <nav
        className="flex-1 space-y-3 overflow-y-auto px-2.5 py-3"
        aria-label="Main navigation"
      >
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-2.5 pb-1 text-[9px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const highlight = "highlight" in item && item.highlight;
                const active = isActive(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      href={item.to}
                      {...(onNavigate ? { onClick: onNavigate } : {})}
                      className={cn(
                        linkBase,
                        active
                          ? highlight
                            ? "bg-primary-soft text-primary"
                            : "bg-sidebar-accent text-sidebar-accent-foreground"
                          : highlight
                            ? "text-primary hover:bg-primary-soft/70"
                            : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {highlight && (
                        <span
                          className="gradient-loop absolute inset-y-1.5 left-0 w-0.5 rounded-full"
                          aria-hidden
                        />
                      )}
                      <item.icon className="size-4.5 shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {highlight && (
                        <span className="rounded-full bg-rose-soft px-1.5 py-0.5 text-[9px] font-bold text-rose">
                          {kpis.needAttention}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-[232px] shrink-0 border-r border-sidebar-border lg:block">
      <div className="sticky top-0 h-screen">
        <SidebarContentBody />
      </div>
    </aside>
  );
}
