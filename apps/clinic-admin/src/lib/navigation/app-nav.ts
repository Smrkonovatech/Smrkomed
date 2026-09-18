import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  FolderOpen,
  Heart,
  LayoutDashboard,
  Link2,
  ListChecks,
  MessageCircle,
  Package,
  Pill,
  Radio,
  RefreshCw,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Workflow,
  Bell,
  Mail,
} from "lucide-react";

export type AppNavLink = {
  href: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  /** Opens Smrko AI panel instead of navigating */
  openAi?: boolean;
};

export type AppNavCategory = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  columns?: 1 | 2;
  items: AppNavLink[];
};

/** Primary application navigation for the desktop AppShell dock. */
export const APP_NAV_CATEGORIES: AppNavCategory[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Overview",
    icon: LayoutDashboard,
    href: "/home",
    columns: 1,
    items: [
      { href: "/doctor", label: "Doctor App", icon: Stethoscope },
      { href: "/home", label: "My Dashboard", icon: LayoutDashboard },
      { href: "/tasks", label: "Tasks", icon: ListChecks },
      { href: "/home", label: "Smrko AI", icon: Sparkles, openAi: true },
    ],
  },
  {
    id: "patients",
    label: "Patients",
    description: "Patients",
    icon: Users,
    href: "/patients",
    columns: 1,
    items: [
      { href: "/patients", label: "Patients", icon: Users },
      { href: "/patients", label: "Couples", icon: Heart },
      { href: "/ivf-cycles", label: "IVF Journeys", icon: Sparkles },
      { href: "/care-plans", label: "Treatments", icon: Activity },
    ],
  },
  {
    id: "appointments",
    label: "Appointments",
    description: "Appointments",
    icon: CalendarDays,
    href: "/appointments",
    columns: 1,
    items: [
      { href: "/appointments", label: "Appointments", icon: CalendarDays },
      { href: "/appointments", label: "Consultations", icon: Stethoscope },
    ],
  },
  {
    id: "care-loop",
    label: "Care Loop",
    description: "Care Loop",
    icon: RefreshCw,
    href: "/care-loop",
    columns: 1,
    items: [
      { href: "/care-loop", label: "Care Loop", icon: RefreshCw },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    description: "Communication",
    icon: MessageCircle,
    href: "/whatsapp",
    columns: 1,
    items: [
      { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
      { href: "/whatsapp/inbox", label: "Conversations", icon: MessageCircle },
      { href: "/whatsapp/templates", label: "Templates", icon: FileText },
      { href: "/whatsapp/flows", label: "Automation", icon: Workflow },
      { href: "/whatsapp/broadcasts", label: "Broadcasts", icon: Radio },
      { href: "/whatsapp/knowledge-base", label: "Knowledge Base", icon: BookOpen },
    ],
  },
  {
    id: "insurance",
    label: "Insurance",
    description: "Insurance",
    icon: Shield,
    href: "/insurance",
    columns: 1,
    items: [
      { href: "/insurance", label: "Insurance", icon: Shield },
      { href: "/billing", label: "Billing", icon: Wallet },
      { href: "/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    description: "Pharmacy",
    icon: Pill,
    href: "/pharmacy",
    columns: 1,
    items: [
      { href: "/pharmacy", label: "Pharmacy", icon: Pill },
      { href: "/pharmacy/prescriptions", label: "Prescriptions", icon: FileText },
      { href: "/pharmacy/inventory", label: "Inventory", icon: Package },
      { href: "/pharmacy/suppliers", label: "Suppliers", icon: Truck },
      { href: "/pharmacy/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    description: "Reports",
    icon: FileText,
    href: "/reports",
    columns: 1,
    items: [
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/analytics", label: "Insights", icon: Brain },
      { href: "/crm", label: "Clinic Growth", icon: Heart },
      { href: "/documents", label: "Clinical Notes", icon: ScrollText },
      { href: "/documents", label: "Documents", icon: FolderOpen },
    ],
  },
  {
    id: "staff",
    label: "Staff",
    description: "Staff",
    icon: UsersRound,
    href: "/staff",
    columns: 1,
    items: [
      { href: "/staff", label: "Team", icon: Users },
      { href: "/doctors", label: "Doctors", icon: Stethoscope },
      { href: "/staff/roles", label: "Roles & Access", icon: ShieldCheck },
      { href: "/staff/invitations", label: "Invitations", icon: Mail },
      { href: "/staff/activity", label: "Activity", icon: Activity },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "Integrations",
    icon: Link2,
    href: "/integrations",
    columns: 1,
    items: [
      { href: "/integrations", label: "Integrations", icon: Link2 },
      { href: "/digital-health", label: "ABDM & Digital Health", icon: ShieldCheck },
      { href: "/digital-health/tasks", label: "ABDM Tasks", icon: ListChecks },
      { href: "/digital-health/settings", label: "ABDM Settings", icon: Settings },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Settings",
    icon: Settings,
    href: "/settings",
    columns: 1,
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/settings", label: "Users & Roles", icon: Users },
      { href: "/settings", label: "Clinic Settings", icon: Building2 },
      { href: "/settings", label: "Permissions", icon: ShieldCheck },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/settings", label: "Audit Logs", icon: ScrollText },
    ],
  },
  {
    id: "diagnostics",
    label: "Diagnostics",
    description: "Diagnostics",
    icon: Activity,
    href: "/clinical-diagnostics",
    columns: 2,
    items: [
      { href: "/clinical-diagnostics", label: "Command Center", icon: Activity },
      { href: "/clinical-diagnostics/vitals", label: "Vitals", icon: Activity },
      { href: "/clinical-diagnostics/lab", label: "Laboratory", icon: Activity },
      { href: "/clinical-diagnostics/fertility", label: "Fertility Diagnostics", icon: Activity },
      { href: "/clinical-diagnostics/semen-analysis", label: "Semen Analysis", icon: Activity },
      { href: "/clinical-diagnostics/diagnostics", label: "Imaging & Ultrasound", icon: Activity },
      { href: "/clinical-diagnostics/ivf-lab", label: "IVF / Embryology", icon: Activity },
      { href: "/clinical-diagnostics/review", label: "Clinical Review", icon: Activity },
      { href: "/clinical-diagnostics/devices", label: "Devices", icon: Activity },
    ],
  },
  {
    id: "discharge",
    label: "Discharge",
    description: "Discharge",
    icon: ClipboardList,
    href: "/discharge",
    columns: 1,
    items: [
      { href: "/discharge", label: "Discharge", icon: ClipboardList },
    ],
  },
];

export function categoryMatchesPath(category: AppNavCategory, pathname: string): boolean {
  if (category.id === "dashboard" || category.id === "doctor_home") {
    if (pathname === "/home" || pathname === "/doctor") return true;
  }
  if (category.href) {
    if (category.href === "/home") {
      if (pathname === "/home" || pathname === "/doctor") return true;
    } else if (pathname === category.href || pathname.startsWith(`${category.href}/`)) {
      return true;
    }
  }
  for (const item of category.items) {
    if (item.openAi) continue;
    if (item.href === "/home") {
      if (pathname === "/home" || pathname === "/doctor") return true;
    } else if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      return true;
    }
  }
  return activeCategoryId(pathname) === category.id;
}

/** Prefer the most specific matching nav item so overlapping routes don't light multiple docks. */
export function activeCategoryId(pathname: string): string | null {
  let best: { id: string; len: number } | null = null;
  for (const category of APP_NAV_CATEGORIES) {
    for (const item of category.items) {
      if (item.openAi) continue;
      const matches =
        item.href === "/home"
          ? pathname === "/home"
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (!matches) continue;
      const len = item.href.length;
      if (!best || len > best.len) {
        best = { id: category.id, len };
      }
    }
  }
  return best?.id ?? null;
}
