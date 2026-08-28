"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  FolderOpen,
  Gauge,
  Heart,
  Link2,
  ListChecks,
  Pill,
  PlayCircle,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppState } from "@/lib/app-state";
import { PERMISSIONS, roleHasPermission } from "@/lib/permissions/rbac";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Gauge;
  highlight?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const baseGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ to: "/home", label: "Dashboard", icon: Gauge }],
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
    items: [{ to: "/crm", label: "CRM", icon: Heart }],
  },
  {
    label: "Content",
    items: [{ to: "/care-content", label: "Care Content", icon: PlayCircle }],
  },
  {
    label: "Admin",
    items: [
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/integrations", label: "Integrations", icon: Link2 },
    ],
  },
];

const pharmacyGroup: NavGroup = {
  label: "Pharmacy",
  items: [
    { to: "/pharmacy", label: "Pharmacy Dashboard", icon: Pill },
    { to: "/pharmacy/inventory", label: "Inventory", icon: ClipboardList },
    { to: "/pharmacy/products", label: "Products", icon: Pill },
    { to: "/pharmacy/sales", label: "Sales / Billing", icon: Wallet },
    { to: "/pharmacy/prescriptions", label: "Prescriptions", icon: FileText },
    { to: "/pharmacy/suppliers", label: "Suppliers", icon: Users },
    { to: "/pharmacy/purchase-orders", label: "Purchase Orders", icon: FolderOpen },
    { to: "/pharmacy/adjustments", label: "Stock Adjustments", icon: ListChecks },
    { to: "/pharmacy/alerts", label: "Expiry / Alerts", icon: BarChart3 },
    { to: "/pharmacy/reports", label: "Pharmacy Reports", icon: FileText },
  ],
};

const linkBase =
  "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors";

export function SidebarContentBody({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const { kpis } = useAppState();
  const { data: session } = useSession();
  const pathname = usePathname();
  const groups = useMemo(() => {
    const role = session?.user?.role;
    let next = [...baseGroups];
    const showInsurance = role && roleHasPermission(role, PERMISSIONS.INSURANCE_VIEW);
    if (showInsurance) {
      next = next.map((group) => {
        if (group.label !== "Operations") return group;
        const items = [...group.items];
        const billingIndex = items.findIndex((item) => item.to === "/billing");
        const insertAt = billingIndex >= 0 ? billingIndex + 1 : items.length;
        items.splice(insertAt, 0, {
          to: "/insurance",
          label: "Insurance & Claims",
          icon: Shield,
        });
        return { ...group, items };
      });
    }
    const showPayments = role && roleHasPermission(role, PERMISSIONS.PAYMENTS_VIEW);
    if (showPayments) {
      next = next.map((group) => {
        if (group.label !== "Operations") return group;
        const items = [...group.items];
        const insuranceIndex = items.findIndex((item) => item.to === "/insurance");
        const billingIndex = items.findIndex((item) => item.to === "/billing");
        const insertAt =
          insuranceIndex >= 0
            ? insuranceIndex + 1
            : billingIndex >= 0
              ? billingIndex + 1
              : items.length;
        if (!items.some((item) => item.to === "/payments")) {
          items.splice(insertAt, 0, {
            to: "/payments",
            label: "Payments",
            icon: CreditCard,
          });
        }
        return { ...group, items };
      });
    }
    const showPharmacy = role && roleHasPermission(role, PERMISSIONS.PHARMACY_VIEW);
    if (showPharmacy) {
      const operationsIndex = next.findIndex((group) => group.label === "Operations");
      next.splice(operationsIndex + 1, 0, pharmacyGroup);
    }
    return next;
  }, [session?.user?.role]);
  const isActive = (href: string) =>
    href === "/home" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border",
          compact ? "justify-center px-2" : "gap-2.5 px-4",
        )}
      >
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-primary/10">
          <img src="/branding/smrkomed-mark.png" alt="" width={32} height={32} className="size-8 object-cover" />
        </span>
        {!compact && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-[0.16em] text-primary">SMRKOMED</p>
            <p className="truncate text-[11px] text-muted-foreground">Powered by Smrkonova</p>
          </div>
        )}
      </div>

      <nav
        className={cn("flex-1 space-y-3 overflow-y-auto py-3", compact ? "px-1.5" : "px-2.5")}
        aria-label="Main navigation"
      >
        {groups.map((group) => (
          <div key={group.label}>
            {!compact && (
              <p className="px-2.5 pb-1 text-[9px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const highlight = "highlight" in item && item.highlight;
                const active = isActive(item.to);
                const link = (
                  <Link
                    href={item.to}
                    {...(onNavigate ? { onClick: onNavigate } : {})}
                    aria-label={compact ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      linkBase,
                      compact && "min-h-11 justify-center px-0",
                      active
                        ? highlight
                          ? "bg-primary-soft text-primary"
                          : "bg-sidebar-accent text-sidebar-accent-foreground"
                        : highlight
                          ? "text-primary hover:bg-primary-soft/70"
                          : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {highlight && !compact && (
                      <span
                        className="gradient-loop absolute inset-y-1.5 left-0 w-0.5 rounded-full"
                        aria-hidden
                      />
                    )}
                    <item.icon className="size-4.5 shrink-0" aria-hidden />
                    {!compact && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
                    {!compact && highlight && (
                      <span className="rounded-full bg-rose-soft px-1.5 py-0.5 text-[9px] font-bold text-rose">
                        {kpis.needAttention}
                      </span>
                    )}
                  </Link>
                );
                return (
                  <li key={item.to}>
                    {compact ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
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
    <>
      <aside className="hidden w-[4.5rem] shrink-0 border-r border-sidebar-border md:block lg:hidden">
        <div className="sticky top-0 h-screen">
          <TooltipProvider delayDuration={0}>
            <SidebarContentBody compact />
          </TooltipProvider>
        </div>
      </aside>
      <aside className="hidden w-[232px] shrink-0 border-r border-sidebar-border lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContentBody />
        </div>
      </aside>
    </>
  );
}
