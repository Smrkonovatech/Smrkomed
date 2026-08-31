import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  Building2,
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
    description: "Your clinic operating overview",
    icon: LayoutDashboard,
    href: "/home",
    columns: 1,
    items: [
      {
        href: "/home",
        label: "My Dashboard",
        description: "KPIs, attention queue, and Care Loop pulse",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: "patient-care",
    label: "Patient Care",
    description: "Manage patients, journeys and care coordination",
    icon: UsersRound,
    columns: 2,
    items: [
      {
        href: "/patients",
        label: "Patients",
        description: "Patient records and profiles",
        icon: Users,
      },
      {
        href: "/patients",
        label: "Couples",
        description: "Couple-based care and journeys",
        icon: Heart,
      },
      {
        href: "/ivf-cycles",
        label: "IVF Journeys",
        description: "Treatment journeys and stages",
        icon: Sparkles,
      },
      {
        href: "/appointments",
        label: "Appointments",
        description: "Schedule and appointments",
        icon: ClipboardList,
      },
      {
        href: "/care-loop",
        label: "Care Loop",
        description: "Care plans, actions and follow-ups",
        icon: RefreshCw,
      },
      {
        href: "/tasks",
        label: "Tasks",
        description: "Tasks and exceptions",
        icon: ListChecks,
      },
    ],
  },
  {
    id: "clinical",
    label: "Clinical",
    description: "Manage treatment and clinical workflows",
    icon: Stethoscope,
    columns: 2,
    items: [
      {
        href: "/doctors",
        label: "Doctors",
        description: "Profiles, specialties, and availability",
        icon: Stethoscope,
      },
      {
        href: "/doctors/new",
        label: "Add Doctor",
        description: "Onboard a new clinic doctor",
        icon: Users,
      },
      {
        href: "/care-plans",
        label: "Treatments",
        description: "Doctor-approved care plans",
        icon: Activity,
      },
      {
        href: "/appointments",
        label: "Consultations",
        description: "Consult visits and scheduling",
        icon: Stethoscope,
      },
      {
        href: "/pharmacy/prescriptions",
        label: "Prescriptions",
        description: "Medication orders",
        icon: FileText,
      },
      {
        href: "/pharmacy",
        label: "Pharmacy",
        description: "Pharmacy operations",
        icon: Pill,
      },
      {
        href: "/pharmacy/inventory",
        label: "Inventory",
        description: "Stock and batch tracking",
        icon: Package,
      },
      {
        href: "/documents",
        label: "Clinical Notes",
        description: "Clinical documents and notes",
        icon: ScrollText,
      },
      {
        href: "/reports",
        label: "Reports",
        description: "Clinical and operational reports",
        icon: FileText,
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    description: "Manage clinic administration and finances",
    icon: BriefcaseBusiness,
    columns: 2,
    items: [
      {
        href: "/billing",
        label: "Billing",
        description: "Invoices and charges",
        icon: Wallet,
      },
      {
        href: "/payments",
        label: "Payments",
        description: "Collections and gateways",
        icon: CreditCard,
      },
      {
        href: "/insurance",
        label: "Insurance & Claims",
        description: "Policies and claim workflows",
        icon: Shield,
      },
      {
        href: "/documents",
        label: "Documents",
        description: "Clinic document library",
        icon: FolderOpen,
      },
      {
        href: "/digital-health",
        label: "ABDM & Digital Health",
        description: "ABHA, consent, and health records",
        icon: ShieldCheck,
      },
      {
        href: "/digital-health/tasks",
        label: "ABDM Tasks",
        description: "Pending ABHA and consent work",
        icon: ListChecks,
      },
      {
        href: "/digital-health/settings",
        label: "ABDM Settings",
        description: "Sandbox / production configuration",
        icon: Settings,
      },
      {
        href: "/pharmacy/suppliers",
        label: "Suppliers",
        description: "Pharmacy suppliers",
        icon: Truck,
      },
      {
        href: "/pharmacy/purchase-orders",
        label: "Purchase Orders",
        description: "Stock procurement",
        icon: ClipboardList,
      },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    description: "Connect with patients across every care stage",
    icon: MessageCircle,
    columns: 2,
    items: [
      {
        href: "/whatsapp",
        label: "WhatsApp",
        description: "Automation Center overview",
        icon: MessageCircle,
      },
      {
        href: "/whatsapp/inbox",
        label: "Conversations",
        description: "Patient message workspace",
        icon: MessageCircle,
      },
      {
        href: "/whatsapp/templates",
        label: "Templates",
        description: "Approved message templates",
        icon: FileText,
      },
      {
        href: "/whatsapp/flows",
        label: "Automation",
        description: "Care workflows and flows",
        icon: Workflow,
      },
      {
        href: "/whatsapp/broadcasts",
        label: "Broadcasts",
        description: "Controlled clinic campaigns",
        icon: Radio,
      },
      {
        href: "/whatsapp/knowledge-base",
        label: "Knowledge Base",
        description: "Clinic-approved AI knowledge",
        icon: BookOpen,
      },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    description: "Understand clinic performance and care insights",
    icon: Brain,
    columns: 2,
    items: [
      {
        href: "/home",
        label: "Smrko AI",
        description: "Ask Smrko AI about clinic operations",
        icon: Sparkles,
        openAi: true,
      },
      {
        href: "/reports",
        label: "Reports",
        description: "Exportable clinic reports",
        icon: FileText,
      },
      {
        href: "/analytics",
        label: "Analytics",
        description: "Trends and performance",
        icon: BarChart3,
      },
      {
        href: "/crm",
        label: "Clinic Growth",
        description: "CRM, leads and growth",
        icon: Heart,
      },
      {
        href: "/analytics",
        label: "Insights",
        description: "Care and operations insights",
        icon: Brain,
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Configure your SmrkoMed workspace",
    icon: Settings,
    columns: 2,
    items: [
      {
        href: "/integrations",
        label: "Integrations",
        description: "Connected systems and APIs",
        icon: Link2,
      },
      {
        href: "/settings",
        label: "Users & Roles",
        description: "Team access and roles",
        icon: Users,
      },
      {
        href: "/settings",
        label: "Clinic Settings",
        description: "Clinic profile and preferences",
        icon: Building2,
      },
      {
        href: "/settings",
        label: "Permissions",
        description: "Role permissions matrix",
        icon: ShieldCheck,
      },
      {
        href: "/notifications",
        label: "Notifications",
        description: "Alerts and notification preferences",
        icon: Bell,
      },
      {
        href: "/settings",
        label: "Audit Logs",
        description: "Recent settings activity",
        icon: ScrollText,
      },
    ],
  },
];

export function categoryMatchesPath(category: AppNavCategory, pathname: string): boolean {
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
