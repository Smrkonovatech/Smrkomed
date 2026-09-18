"use client";

import {
  Bell,
  Bot,
  Building2,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileClock,
  Link2,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Users,
  Wallet,
  User,
  Lock,
  Mail,
  Globe,
  HandHeart,
  LogOut,
  FileText,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";

import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { WhatsAppConnectionPanel } from "@/components/whatsapp/connection-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/lib/app-state";
import { clinics, team } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type DoctorSectionId =
  | "profile"
  | "notifications"
  | "security"
  | "communication"
  | "language"
  | "privacy"
  | "help";

type SectionId =
  | DoctorSectionId
  | "clinic"
  | "team"
  | "roles"
  | "care-loop"
  | "whatsapp"
  | "ai"
  | "appointments"
  | "billing"
  | "integrations"
  | "audit";

type ToggleMap = Record<string, boolean>;

const doctorSections: Array<{
  id: DoctorSectionId;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { id: "profile", label: "Profile", description: "Doctor credentials & details", icon: User },
  { id: "notifications", label: "Notifications", description: "Alerts, escalations & sounds", icon: Bell },
  { id: "security", label: "Security", description: "Password, 2FA & sessions", icon: Lock },
  { id: "communication", label: "Communication Preferences", description: "Consultations & WhatsApp messaging", icon: Mail },
  { id: "language", label: "Language", description: "English (US)", icon: Globe },
  { id: "privacy", label: "Terms and Privacy", description: "HIPAA, NABH & clinical privacy", icon: FileText },
  { id: "help", label: "Help & Support", description: "Doctor desk & emergency hotline", icon: HandHeart },
];

const sections: Array<{
  id: SectionId;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "clinic",
    label: "Clinic Profile",
    description: "Identity and contact details",
    icon: Building2,
  },
  { id: "team", label: "Team", description: "People and routing coverage", icon: Users },
  {
    id: "roles",
    label: "Roles & Permissions",
    description: "Access overview",
    icon: ShieldCheck,
  },
  {
    id: "care-loop",
    label: "Care Loop Rules",
    description: "Automation boundaries",
    icon: ClipboardList,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Connection and quality",
    icon: MessageCircle,
  },
  { id: "ai", label: "AI Settings", description: "Provider and guardrails", icon: Bot },
  {
    id: "notifications",
    label: "Notifications",
    description: "Staff alerts and digests",
    icon: Bell,
  },
  {
    id: "appointments",
    label: "Appointment Settings",
    description: "Booking defaults",
    icon: CalendarClock,
  },
  {
    id: "billing",
    label: "Billing Settings",
    description: "Invoices and payments",
    icon: CreditCard,
  },
  { id: "integrations", label: "Integrations", description: "Connected systems", icon: Link2 },
  { id: "audit", label: "Audit Log", description: "Recent settings activity", icon: FileClock },
];

const roleMatrix = [
  ["Patient care", "Full", "Assigned", "Overview"],
  ["Care Loop rules", "Review", "Manage", "Manage"],
  ["Team & roles", "View", "View", "Manage"],
  ["Billing & integrations", "View", "No access", "Manage"],
] as const;

const auditEvents = [
  ["Dr. Ananya Rao", "Updated escalation rule", "Today, 4:42 PM", "Care Loop"],
  ["Arun Kale", "Changed invoice prefix", "Today, 11:18 AM", "Billing"],
  ["Meera Iyer", "Updated reminder window", "16 Aug, 3:06 PM", "Appointments"],
  ["System", "WhatsApp status verified", "16 Aug, 9:30 AM", "Integration"],
  ["Arun Kale", "Updated coordinator access", "15 Aug, 5:14 PM", "Role"],
] as const;

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function Field({
  id,
  label,
  error,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={title}
      />
    </div>
  );
}

function SectionIntro({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {badge}
    </div>
  );
}

function SaveActions({ saved, loading }: { saved: boolean; loading?: boolean }) {
  return (
    <div className="flex items-center gap-3 border-t pt-4">
      <Button type="submit" className="rounded-lg" disabled={loading}>
        {loading ? "Saving..." : "Save changes"}
      </Button>
      {saved && !loading && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <Check className="size-3.5" />
          Saved just now
        </span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { role, clinicId, currentClinic, updateClinic } = useAppState();
  const isDoctor = session?.user?.role === "DOCTOR" || (role as string).toUpperCase() === "DOCTOR";
  const clinic = clinics.find((item) => item.id === clinicId) ?? clinics[0]!;
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedSection, setSavedSection] = useState<SectionId | null>(null);
  const [isSavingClinic, setIsSavingClinic] = useState(false);

  // Doctor Settings State
  const [doctorProfile, setDoctorProfile] = useState({
    name: "Dr. Suresh Sharma",
    license: "KMC-45920",
    specialty: "Reproductive Medicine & Clinical Embryology",
    qualifications: "MBBS, MS (OBG), Fellowship in Reproductive Medicine",
    email: "dr.suresh@smrkomed.clinic",
    phone: "+91 98450 12345",
    consultationHours: "09:00 AM – 04:00 PM (Mon – Sat)",
    bio: "Senior Fertility Specialist with 14+ years of clinical IVF experience specializing in poor ovarian reserve and recurrent implantation failure.",
  });

  const [doctorNotifications, setDoctorNotifications] = useState<ToggleMap>({
    "Critical Care Loop Escalations": true,
    "Patient Consultation Reminders": true,
    "WhatsApp Clinical Inquiries": true,
    "Audio Chime on Critical Alerts": true,
    "Daily Morning Digest": true,
  });

  const [doctorSecurity, setDoctorSecurity] = useState({
    twoFactorEnabled: true,
  });

  const [doctorCommunication, setDoctorCommunication] = useState<ToggleMap>({
    "WhatsApp Direct Clinical Messaging": true,
    "AI Audio Transcription Auto-Start": true,
    "Emergency Care Loop Call Forwarding": true,
    "Automated Out-of-Office Notice": false,
  });

  const [selectedLanguage, setSelectedLanguage] = useState("English (US)");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const tab = new URLSearchParams(window.location.search).get("tab");
      if (
        tab &&
        (doctorSections.some((s) => s.id === tab) || sections.some((s) => s.id === tab))
      ) {
        setActiveSection(tab as SectionId);
      } else if (!isDoctor) {
        setActiveSection("clinic");
      } else {
        setActiveSection("profile");
      }
    }
  }, [isDoctor]);

  const [profile, setProfile] = useState({
    name: currentClinic?.name || clinic.name,
    city: currentClinic?.city || clinic.city,
    address: currentClinic?.address || clinic.address,
    phone: currentClinic?.phone || clinic.phone,
    hours: currentClinic?.hours || currentClinic?.branches?.[0]?.hours || clinic.hours,
    languages: "English, Hindi, Kannada, Malayalam",
  });

  useEffect(() => {
    if (currentClinic) {
      setProfile((prev) => ({
        ...prev,
        name: currentClinic.name || prev.name,
        city: currentClinic.city || prev.city,
        address: currentClinic.address || prev.address,
        phone: currentClinic.phone || prev.phone,
        hours: currentClinic.hours || currentClinic.branches?.[0]?.hours || prev.hours,
      }));
    }
  }, [currentClinic]);

  const [teamSettings, setTeamSettings] = useState({
    escalationContact: "Meera Iyer",
    coverageWindow: "08:00 – 20:00",
  });
  const [careRules, setCareRules] = useState<ToggleMap>({
    "WhatsApp follow-up": true,
    "AI voice fallback": true,
    "Clinical concern escalation": true,
    "Patient education media": true,
    "Payment reminders": false,
  });
  const [ai, setAi] = useState({
    providerLabel: "SmrkoMed Care Assistant",
    responseStyle: "Warm and concise",
    coordinatorDrafts: true,
    conversationSummaries: true,
  });
  const [notifications, setNotifications] = useState<ToggleMap>({
    "Clinical escalation": true,
    "Patient non-response": true,
    "Failed message delivery": true,
    "Daily operations digest": false,
  });
  const [digestTime, setDigestTime] = useState("08:00");
  const [appointments, setAppointments] = useState({
    slotLength: "30",
    buffer: "10",
    cancellationWindow: "12",
    reminder: "24 hours before",
  });
  const [billing, setBilling] = useState({
    currency: "INR",
    taxLabel: "GST",
    invoicePrefix: "ABC",
    paymentDue: "7",
  });
  const [integrations, setIntegrations] = useState<ToggleMap>({
    "Google Calendar": true,
    "Razorpay Payments": true,
    "External Lab Inbox": false,
  });

  const isDoctorSettings = doctorSections.some((s) => s.id === activeSection);
  const active =
    doctorSections.find((s) => s.id === activeSection) ??
    sections.find((s) => s.id === activeSection) ??
    sections[0]!;
  const isOwner = role === "owner";

  async function save(
    event: FormEvent<HTMLFormElement>,
    section: SectionId,
    requiredFields: Array<[string, string]>,
  ) {
    event.preventDefault();
    const nextErrors = Object.fromEntries(
      requiredFields
        .filter(([, value]) => !value.trim())
        .map(([key]) => [key, "This field is required"]),
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setSavedSection(null);
      toast.error("Please complete the required fields");
      return;
    }

    if (section === "clinic") {
      setIsSavingClinic(true);
      try {
        await updateClinic({
          name: profile.name,
          city: profile.city,
          address: profile.address,
          phone: profile.phone,
          hours: profile.hours,
        });
        setSavedSection(section);
        toast.success("Clinic Profile saved");
      } catch (err) {
        console.error("Failed to save clinic profile:", err);
        toast.error("Failed to save clinic profile. Please try again.");
      } finally {
        setIsSavingClinic(false);
      }
      return;
    }

    setSavedSection(section);
    toast.success(`${sections.find((item) => item.id === section)?.label} saved`);
  }

  function updateToggle(
    setter: React.Dispatch<React.SetStateAction<ToggleMap>>,
    key: string,
    checked: boolean,
  ) {
    setter((current) => ({ ...current, [key]: checked }));
  }

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        title="Settings"
        subtitle="Configure clinic operations, communication and access from one workspace."
        actions={
          <StatusBadge
            label={`${role.charAt(0).toUpperCase()}${role.slice(1)} access`}
            tone={isOwner ? "primary" : "muted"}
          />
        }
      />

      <div className="mb-4 lg:hidden">
        <Label htmlFor="settings-section" className="sr-only">
          Settings section
        </Label>
        <select
          id="settings-section"
          className={selectClassName}
          value={activeSection}
          onChange={(event) => {
            setActiveSection(event.target.value as SectionId);
            setErrors({});
          }}
        >
          <optgroup label="Doctor Settings">
            {doctorSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Clinic Administration">
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="sticky top-20 hidden space-y-3 lg:block">
          {isDoctorSettings ? (
            <div className="rounded-2xl border border-gray-200/90 bg-white shadow-sm overflow-hidden">
              <ul className="divide-y divide-gray-100">
                {doctorSections.map((item) => {
                  const ItemIcon = item.icon;
                  const selected = activeSection === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSection(item.id);
                          setErrors({});
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left group",
                          selected ? "bg-purple-50/70" : "hover:bg-gray-50/80"
                        )}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={cn(
                              "size-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                              selected ? "bg-[#7c3aed] text-white" : "bg-[#f3f0ff] text-[#7c3aed]"
                            )}
                          >
                            <ItemIcon className="size-4.5" strokeWidth={1.8} />
                          </div>
                          <span
                            className={cn(
                              "text-[13px] sm:text-sm font-semibold tracking-tight truncate",
                              selected ? "text-[#7c3aed]" : "text-gray-900"
                            )}
                          >
                            {item.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.id === "language" && (
                            <span className="text-xs text-gray-400 font-normal">
                              English (US)
                            </span>
                          )}
                          <ChevronRight
                            className={cn(
                              "size-4 transition-transform group-hover:translate-x-0.5",
                              selected ? "text-[#7c3aed]" : "text-gray-400/80"
                            )}
                            strokeWidth={2}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-rose-50/60 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="size-9 rounded-xl flex items-center justify-center shrink-0 bg-[#fee2e2]/70 text-[#ef4444] transition-transform group-hover:scale-105">
                        <LogOut className="size-4.5" strokeWidth={1.8} />
                      </div>
                      <span className="text-[13px] sm:text-sm font-semibold tracking-tight truncate text-[#ef4444]">
                        Logout
                      </span>
                    </div>
                    <ChevronRight className="size-4 text-rose-400 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                  </button>
                </li>
              </ul>
            </div>
          ) : (
            <nav
              className="surface-card overflow-hidden p-2"
              aria-label="Settings"
            >
              {sections.map((section) => {
                const Icon = section.icon;
                const selected = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(section.id);
                      setErrors({});
                    }}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      selected ? "bg-primary-soft text-primary" : "hover:bg-muted/70",
                    )}
                    aria-current={selected ? "page" : undefined}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{section.label}</span>
                      <span
                        className={cn(
                          "block truncate text-[11px]",
                          selected ? "text-primary/70" : "text-muted-foreground",
                        )}
                      >
                        {section.description}
                      </span>
                    </span>
                    <ChevronRight
                      className={cn("size-3.5 opacity-0", selected && "opacity-100")}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </nav>
          )}

          <div className="px-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              onClick={() => {
                if (isDoctorSettings) {
                  setActiveSection("clinic");
                } else {
                  setActiveSection("profile");
                }
              }}
            >
              {isDoctorSettings ? "Switch to Clinic Administration" : "Switch to Doctor Settings"}
            </Button>
          </div>
        </div>

        <main className="surface-card min-w-0 p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground lg:hidden">
            <active.icon className="size-4" />
            <span>{active.description}</span>
          </div>

          {activeSection === "profile" && (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                setSavedSection("profile");
                toast.success("Doctor profile updated successfully");
              }}
            >
              <SectionIntro
                title="Profile"
                description="Manage your professional credentials, consultation details, and clinical identity."
                badge={<StatusBadge label="Verified Practitioner" tone="success" />}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="doc-name" label="Doctor name" required>
                  <Input
                    id="doc-name"
                    value={doctorProfile.name}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, name: e.target.value })}
                  />
                </Field>
                <Field id="doc-license" label="Medical License / Registration No." required>
                  <Input
                    id="doc-license"
                    value={doctorProfile.license}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, license: e.target.value })}
                  />
                </Field>
                <Field id="doc-specialty" label="Department / Specialty" required>
                  <Input
                    id="doc-specialty"
                    value={doctorProfile.specialty}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, specialty: e.target.value })}
                  />
                </Field>
                <Field id="doc-qual" label="Qualifications" required>
                  <Input
                    id="doc-qual"
                    value={doctorProfile.qualifications}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, qualifications: e.target.value })}
                  />
                </Field>
                <Field id="doc-email" label="Contact Email" required>
                  <Input
                    id="doc-email"
                    type="email"
                    value={doctorProfile.email}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, email: e.target.value })}
                  />
                </Field>
                <Field id="doc-phone" label="Contact Phone" required>
                  <Input
                    id="doc-phone"
                    value={doctorProfile.phone}
                    onChange={(e) => setDoctorProfile({ ...doctorProfile, phone: e.target.value })}
                  />
                </Field>
              </div>
              <Field id="doc-hours" label="OPD Consultation Hours">
                <Input
                  id="doc-hours"
                  value={doctorProfile.consultationHours}
                  onChange={(e) => setDoctorProfile({ ...doctorProfile, consultationHours: e.target.value })}
                />
              </Field>
              <Field id="doc-bio" label="Professional Biography">
                <Textarea
                  id="doc-bio"
                  rows={3}
                  value={doctorProfile.bio}
                  onChange={(e) => setDoctorProfile({ ...doctorProfile, bio: e.target.value })}
                />
              </Field>
              <SaveActions saved={savedSection === "profile"} />
            </form>
          )}

          {activeSection === "notifications" && isDoctorSettings && (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                setSavedSection("notifications");
                toast.success("Notification preferences updated");
              }}
            >
              <SectionIntro
                title="Notifications"
                description="Configure your clinical alerts, patient escalations, and notification sounds."
              />
              <div className="space-y-3">
                {Object.entries(doctorNotifications).map(([label, checked]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border p-3.5 bg-card/60">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {label.includes("Critical") && "Urgent push alerts for Care Loop exceptions and critical patient triggers."}
                        {label.includes("Reminders") && "15-minute advance reminder before scheduled consultations and procedures."}
                        {label.includes("WhatsApp") && "Instant notification when an assigned couple sends clinical questions."}
                        {label.includes("Chime") && "Play distinct audio tone on urgent doctor notifications."}
                        {label.includes("Daily") && "8:00 AM morning summary of appointments, transfers, and reviews."}
                      </p>
                    </div>
                    <Switch
                      checked={checked}
                      onCheckedChange={(val) =>
                        setDoctorNotifications((prev) => ({ ...prev, [label]: val }))
                      }
                    />
                  </div>
                ))}
              </div>
              <SaveActions saved={savedSection === "notifications"} />
            </form>
          )}

          {activeSection === "security" && (
            <div className="space-y-6">
              <SectionIntro
                title="Security"
                description="Manage your account password, authentication methods, and active sessions."
              />
              <div className="rounded-2xl border p-4 space-y-4 bg-card/50">
                <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field id="cur-pass" label="Current Password">
                    <Input id="cur-pass" type="password" placeholder="••••••••" />
                  </Field>
                  <Field id="new-pass" label="New Password">
                    <Input id="new-pass" type="password" placeholder="••••••••" />
                  </Field>
                  <Field id="conf-pass" label="Confirm Password">
                    <Input id="conf-pass" type="password" placeholder="••••••••" />
                  </Field>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => toast.success("Password updated successfully")}
                >
                  Update Password
                </Button>
              </div>
              <div className="rounded-2xl border p-4 flex items-center justify-between bg-card/50">
                <div>
                  <p className="text-sm font-semibold text-foreground">Two-Factor Authentication (2FA)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Require an authentication code when signing into doctor workspace.</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge label={doctorSecurity.twoFactorEnabled ? "Active" : "Disabled"} tone={doctorSecurity.twoFactorEnabled ? "success" : "muted"} />
                  <Switch
                    checked={doctorSecurity.twoFactorEnabled}
                    onCheckedChange={(val) => {
                      setDoctorSecurity({ twoFactorEnabled: val });
                      toast.success(val ? "2FA enabled" : "2FA disabled");
                    }}
                  />
                </div>
              </div>
              <div className="rounded-2xl border p-4 space-y-3 bg-card/50">
                <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <div>
                      <p className="font-medium text-foreground">Chrome on Windows 11 (This Device)</p>
                      <p className="text-muted-foreground">IP: 192.168.1.4 · Active now</p>
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Current</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="font-medium text-foreground">SmrkoMed Doctor Mobile App (iOS 18)</p>
                      <p className="text-muted-foreground">Last active: 2 hours ago</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50" onClick={() => toast.success("Session revoked")}>
                      Revoke
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "communication" && (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                setSavedSection("communication");
                toast.success("Communication preferences saved");
              }}
            >
              <SectionIntro
                title="Communication Preferences"
                description="Manage your patient communication channels, consultation recording, and quiet hours."
              />
              <div className="space-y-3">
                {Object.entries(doctorCommunication).map(([label, checked]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border p-3.5 bg-card/60">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {label.includes("WhatsApp") && "Allow patients in active cycles to message directly through verified clinic channel."}
                        {label.includes("Transcription") && "Auto-start Sarvam AI clinical transcription when opening a patient consultation."}
                        {label.includes("Forwarding") && "Route urgent after-hours voice escalations to on-call duty phone."}
                        {label.includes("Out-of-Office") && "Send automated message with duty doctor contact during leave."}
                      </p>
                    </div>
                    <Switch
                      checked={checked}
                      onCheckedChange={(val) =>
                        setDoctorCommunication((prev) => ({ ...prev, [label]: val }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="rounded-xl border p-4 space-y-3 bg-card/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Quiet Hours Schedule</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Suppress non-urgent notifications outside clinic hours.</p>
                  </div>
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Emergency Bypass Active</span>
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <Field id="quiet-start" label="From">
                    <Input id="quiet-start" defaultValue="21:00" />
                  </Field>
                  <Field id="quiet-end" label="Until">
                    <Input id="quiet-end" defaultValue="07:00" />
                  </Field>
                </div>
              </div>
              <SaveActions saved={savedSection === "communication"} />
            </form>
          )}

          {activeSection === "language" && (
            <div className="space-y-5">
              <SectionIntro
                title="Language"
                description="Choose your preferred language for the doctor workspace, medical terminology, and patient summaries."
              />
              <div className="rounded-xl border p-4 space-y-4 bg-card/50">
                <Field id="lang-select" label="Interface Language">
                  <select
                    id="lang-select"
                    className={selectClassName}
                    value={selectedLanguage}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value);
                      toast.success(`Language set to ${e.target.value}`);
                    }}
                  >
                    <option value="English (US)">English (US) - Primary</option>
                    <option value="English (UK)">English (UK)</option>
                    <option value="Hindi (हिंदी)">Hindi (हिंदी)</option>
                    <option value="Kannada (ಕನ್ನಡ)">Kannada (ಕನ್ನಡ)</option>
                    <option value="Telugu (తెలుగు)">Telugu (తెలుగు)</option>
                    <option value="Tamil (தமிழ்)">Tamil (தமிழ்)</option>
                  </select>
                </Field>
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Medical Terminology Dictionary</p>
                  <p>Standardized to SNOMED-CT and ICD-11 for fertility diagnostics and ART protocols.</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "privacy" && (
            <div className="space-y-5">
              <SectionIntro
                title="Terms and Privacy"
                description="Review clinical compliance agreements, data encryption, and confidentiality standards."
              />
              <div className="space-y-3">
                <div className="rounded-xl border p-4 bg-card/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">Patient Health Information (PHI) & HIPAA Compliance</span>
                    <StatusBadge label="Compliant" tone="success" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All patient IVF records, ultrasound media, and consultation transcripts are stored with AES-256 encryption at rest and TLS 1.3 in transit.
                  </p>
                </div>
                <div className="rounded-xl border p-4 bg-card/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">Telemedicine Practice Guidelines (NMC 2020)</span>
                    <StatusBadge label="Certified" tone="success" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Complies with National Medical Commission statutory guidelines for digital consultations, electronic prescriptions, and verified doctor identity.
                  </p>
                </div>
                <div className="rounded-xl border p-4 bg-card/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">Audio Transcription & Data Retention</span>
                    <StatusBadge label="Audit Active" tone="info" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Consultation audio recordings via Sarvam AI are processed strictly for SOAP clinical note drafting with doctor verification required prior to finalizing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "help" && (
            <div className="space-y-5">
              <SectionIntro
                title="Help & Support"
                description="Access clinical support, emergency hotlines, and practitioner documentation."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border p-4 bg-card/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <HandHeart className="size-4" />
                    </div>
                    <span className="font-semibold text-sm text-foreground">Doctor Emergency Desk</span>
                  </div>
                  <p className="text-xs text-muted-foreground">24/7 priority line for urgent clinical software assistance or escalation issues.</p>
                  <p className="text-sm font-bold text-primary tabular-nums">+91 80 4567 8900</p>
                </div>
                <div className="rounded-xl border p-4 bg-card/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <MessageCircle className="size-4" />
                    </div>
                    <span className="font-semibold text-sm text-foreground">Clinical IT WhatsApp</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Direct chat with tech support for rapid device sync and template configurations.</p>
                  <p className="text-sm font-bold text-emerald-600 tabular-nums">+91 99000 11223</p>
                </div>
              </div>
              <div className="rounded-xl border p-4 bg-card/50 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Report an Issue or Feedback</h3>
                <Textarea placeholder="Describe the issue you encountered or suggest a feature improvement..." rows={3} />
                <Button size="sm" className="rounded-lg" onClick={() => toast.success("Feedback submitted to clinical IT team")}>
                  Submit Feedback
                </Button>
              </div>
            </div>
          )}

          {activeSection === "clinic" && (
            <form
              className="space-y-5"
              onSubmit={(event) =>
                save(event, "clinic", [
                  ["clinic-name", profile.name],
                  ["clinic-city", profile.city],
                  ["clinic-phone", profile.phone],
                ])
              }
            >
              <SectionIntro
                title="Clinic Profile"
                description="Patient-facing clinic identity and the details staff use for day-to-day coordination."
                badge={<StatusBadge label={clinic.city} tone="info" />}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="clinic-name" label="Clinic name" required error={errors["clinic-name"]}>
                  <Input
                    id="clinic-name"
                    value={profile.name}
                    onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                  />
                </Field>
                <Field id="clinic-city" label="City" required error={errors["clinic-city"]}>
                  <Input
                    id="clinic-city"
                    value={profile.city}
                    onChange={(event) => setProfile({ ...profile, city: event.target.value })}
                  />
                </Field>
                <Field
                  id="clinic-phone"
                  label="Clinic phone"
                  required
                  error={errors["clinic-phone"]}
                >
                  <Input
                    id="clinic-phone"
                    value={profile.phone}
                    onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                  />
                </Field>
                <Field id="clinic-hours" label="Working hours">
                  <Input
                    id="clinic-hours"
                    value={profile.hours}
                    onChange={(event) => setProfile({ ...profile, hours: event.target.value })}
                  />
                </Field>
                <Field id="clinic-address" label="Address">
                  <Textarea
                    id="clinic-address"
                    value={profile.address}
                    onChange={(event) => setProfile({ ...profile, address: event.target.value })}
                  />
                </Field>
                <Field
                  id="clinic-languages"
                  label="Patient languages"
                  hint="Separate languages with commas."
                >
                  <Textarea
                    id="clinic-languages"
                    value={profile.languages}
                    onChange={(event) => setProfile({ ...profile, languages: event.target.value })}
                  />
                </Field>
              </div>
              <SaveActions saved={savedSection === "clinic"} loading={isSavingClinic} />
            </form>
          )}

          {activeSection === "team" && (
            <div className="space-y-5">
              <SectionIntro
                title="Team"
                description="Active staff and the default coverage route for patient follow-up."
                badge={<StatusBadge label={`${team.length} active`} tone="success" />}
              />
              <div className="divide-y rounded-lg border">
                {team.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold">
                      {member.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.role}</p>
                    </div>
                    <StatusBadge label="Active" tone="success" />
                  </div>
                ))}
              </div>
              <form
                className="space-y-4"
                onSubmit={(event) =>
                  save(event, "team", [
                    ["escalation-contact", teamSettings.escalationContact],
                    ["coverage-window", teamSettings.coverageWindow],
                  ])
                }
              >
                <h3 className="text-sm font-semibold">Coverage routing</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="escalation-contact"
                    label="Primary escalation contact"
                    required
                    error={errors["escalation-contact"]}
                  >
                    <Input
                      id="escalation-contact"
                      value={teamSettings.escalationContact}
                      onChange={(event) =>
                        setTeamSettings({ ...teamSettings, escalationContact: event.target.value })
                      }
                    />
                  </Field>
                  <Field
                    id="coverage-window"
                    label="Coordinator coverage"
                    required
                    error={errors["coverage-window"]}
                  >
                    <Input
                      id="coverage-window"
                      value={teamSettings.coverageWindow}
                      onChange={(event) =>
                        setTeamSettings({ ...teamSettings, coverageWindow: event.target.value })
                      }
                    />
                  </Field>
                </div>
                <SaveActions saved={savedSection === "team"} />
              </form>
            </div>
          )}

          {activeSection === "roles" && (
            <div className="space-y-5">
              <SectionIntro
                title="Roles & Permissions"
                description="A read-only summary of access boundaries. Role assignment is available only to verified owners."
                badge={
                  <StatusBadge
                    label={isOwner ? "Owner verified" : "View only"}
                    tone={isOwner ? "success" : "muted"}
                  />
                }
              />
              <div className="flex items-start gap-3 rounded-lg bg-muted/60 p-3">
                <LockKeyhole className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-5 text-muted-foreground">
                  You are viewing this workspace with{" "}
                  <strong className="text-foreground">{role}</strong> access. This demo does not
                  expose impersonation or permission-editing controls.
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="bg-muted/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Area</th>
                      <th className="px-3 py-2 font-medium">Doctor</th>
                      <th className="px-3 py-2 font-medium">Coordinator</th>
                      <th className="px-3 py-2 font-medium">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {roleMatrix.map((row) => (
                      <tr key={row[0]}>
                        {row.map((cell, index) => (
                          <td
                            key={cell}
                            className={cn(
                              "px-3 py-2.5",
                              index === 0 ? "font-medium" : "text-muted-foreground",
                            )}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === "care-loop" && (
            <form className="space-y-5" onSubmit={(event) => save(event, "care-loop", [])}>
              <SectionIntro
                title="Care Loop Rules"
                description="Control which operational follow-ups can run automatically. Clinical concerns always leave automation."
                badge={<StatusBadge label="5 rules" tone="purple" />}
              />
              <div>
                {(
                  [
                    ["WhatsApp follow-up", "Send task reminders and confirmations over WhatsApp."],
                    ["AI voice fallback", "Attempt one voice call after unanswered messages."],
                    [
                      "Clinical concern escalation",
                      "Route symptoms, medication questions and treatment concerns to a doctor.",
                    ],
                    [
                      "Patient education media",
                      "Attach approved clinic education to relevant tasks.",
                    ],
                    ["Payment reminders", "Send neutral reminders for pending instalments."],
                  ] as const
                ).map(([title, description]) => (
                  <SettingRow
                    key={title}
                    title={title}
                    description={description}
                    checked={careRules[title] ?? false}
                    onCheckedChange={(checked) => updateToggle(setCareRules, title, checked)}
                    disabled={title === "Clinical concern escalation"}
                  />
                ))}
              </div>
              <SaveActions saved={savedSection === "care-loop"} />
            </form>
          )}

          {activeSection === "whatsapp" && <WhatsAppConnectionPanel compact />}

          {activeSection === "ai" && (
            <form
              className="space-y-5"
              onSubmit={(event) => save(event, "ai", [["ai-provider-label", ai.providerLabel]])}
            >
              <SectionIntro
                title="AI Settings"
                description="Configure a care coordinator assistant—not a doctor, diagnostician or treatment decision-maker."
                badge={<StatusBadge label="Guardrails enforced" tone="success" />}
              />
              <div className="rounded-lg border border-success/25 bg-success-soft/50 p-4">
                <p className="text-sm font-semibold">Coordinator, never doctor</p>
                <ul className="mt-2 grid gap-1.5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
                  <li>• Never diagnoses or recommends treatment</li>
                  <li>• Never changes medication instructions</li>
                  <li>• Escalates symptoms and clinical questions</li>
                  <li>• Uses only clinic-approved care content</li>
                </ul>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="ai-provider-label"
                  label="Assistant label"
                  required
                  error={errors["ai-provider-label"]}
                  hint="Shown to staff and in approved patient disclosures."
                >
                  <Input
                    id="ai-provider-label"
                    value={ai.providerLabel}
                    onChange={(event) => setAi({ ...ai, providerLabel: event.target.value })}
                  />
                </Field>
                <Field id="ai-response-style" label="Response style">
                  <select
                    id="ai-response-style"
                    className={selectClassName}
                    value={ai.responseStyle}
                    onChange={(event) => setAi({ ...ai, responseStyle: event.target.value })}
                  >
                    <option>Warm and concise</option>
                    <option>Direct and concise</option>
                    <option>Warm and detailed</option>
                  </select>
                </Field>
              </div>
              <div>
                <SettingRow
                  title="Coordinator drafts"
                  description="Prepare operational replies for staff review."
                  checked={ai.coordinatorDrafts}
                  onCheckedChange={(checked) => setAi({ ...ai, coordinatorDrafts: checked })}
                />
                <SettingRow
                  title="Conversation summaries"
                  description="Create concise operational summaries without adding medical conclusions."
                  checked={ai.conversationSummaries}
                  onCheckedChange={(checked) => setAi({ ...ai, conversationSummaries: checked })}
                />
                <SettingRow
                  title="Clinical escalation"
                  description="Always hand clinical intent to an authorised doctor."
                  checked
                  onCheckedChange={() => undefined}
                  disabled
                />
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <LockKeyhole className="size-3.5" />
                Model credentials are configured and stored server-side. No secret-key UI is
                exposed.
              </p>
              <SaveActions saved={savedSection === "ai"} />
            </form>
          )}

          {activeSection === "notifications" && !isDoctorSettings && (
            <form className="space-y-5" onSubmit={(event) => save(event, "notifications", [])}>
              <SectionIntro
                title="Notifications"
                description="Choose which operational events should reach staff and when to send the daily digest."
              />
              <div>
                {(
                  [
                    ["Clinical escalation", "Notify the assigned doctor immediately."],
                    [
                      "Patient non-response",
                      "Notify the coordinator after the final automated attempt.",
                    ],
                    [
                      "Failed message delivery",
                      "Alert staff when a patient channel cannot be reached.",
                    ],
                    ["Daily operations digest", "Send a compact summary to clinic leadership."],
                  ] as const
                ).map(([title, description]) => (
                  <SettingRow
                    key={title}
                    title={title}
                    description={description}
                    checked={notifications[title] ?? false}
                    onCheckedChange={(checked) => updateToggle(setNotifications, title, checked)}
                  />
                ))}
              </div>
              <div className="max-w-xs">
                <Field id="digest-time" label="Digest time">
                  <Input
                    id="digest-time"
                    type="time"
                    value={digestTime}
                    disabled={!notifications["Daily operations digest"]}
                    onChange={(event) => setDigestTime(event.target.value)}
                  />
                </Field>
              </div>
              <SaveActions saved={savedSection === "notifications"} />
            </form>
          )}

          {activeSection === "appointments" && (
            <form
              className="space-y-5"
              onSubmit={(event) =>
                save(event, "appointments", [
                  ["slot-length", appointments.slotLength],
                  ["cancellation-window", appointments.cancellationWindow],
                ])
              }
            >
              <SectionIntro
                title="Appointment Settings"
                description="Set clinic-wide defaults. Individual appointment types can still override these values."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="slot-length"
                  label="Default slot length (minutes)"
                  required
                  error={errors["slot-length"]}
                >
                  <Input
                    id="slot-length"
                    type="number"
                    min="5"
                    value={appointments.slotLength}
                    onChange={(event) =>
                      setAppointments({ ...appointments, slotLength: event.target.value })
                    }
                  />
                </Field>
                <Field id="slot-buffer" label="Buffer between slots (minutes)">
                  <Input
                    id="slot-buffer"
                    type="number"
                    min="0"
                    value={appointments.buffer}
                    onChange={(event) =>
                      setAppointments({ ...appointments, buffer: event.target.value })
                    }
                  />
                </Field>
                <Field
                  id="cancellation-window"
                  label="Cancellation window (hours)"
                  required
                  error={errors["cancellation-window"]}
                >
                  <Input
                    id="cancellation-window"
                    type="number"
                    min="0"
                    value={appointments.cancellationWindow}
                    onChange={(event) =>
                      setAppointments({
                        ...appointments,
                        cancellationWindow: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field id="appointment-reminder" label="Default reminder">
                  <select
                    id="appointment-reminder"
                    className={selectClassName}
                    value={appointments.reminder}
                    onChange={(event) =>
                      setAppointments({ ...appointments, reminder: event.target.value })
                    }
                  >
                    <option>24 hours before</option>
                    <option>12 hours before</option>
                    <option>2 hours before</option>
                  </select>
                </Field>
              </div>
              <SaveActions saved={savedSection === "appointments"} />
            </form>
          )}

          {activeSection === "billing" && (
            <form
              className="space-y-5"
              onSubmit={(event) =>
                save(event, "billing", [
                  ["invoice-prefix", billing.invoicePrefix],
                  ["tax-label", billing.taxLabel],
                ])
              }
            >
              <SectionIntro
                title="Billing Settings"
                description="Invoice defaults for this clinic. Financial configuration is restricted to owners."
                badge={
                  <StatusBadge
                    label={isOwner ? "Editable" : "Owner access required"}
                    tone={isOwner ? "success" : "warning"}
                  />
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="billing-currency" label="Currency">
                  <select
                    id="billing-currency"
                    className={selectClassName}
                    value={billing.currency}
                    disabled={!isOwner}
                    onChange={(event) => setBilling({ ...billing, currency: event.target.value })}
                  >
                    <option value="INR">INR — Indian Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                  </select>
                </Field>
                <Field id="tax-label" label="Tax label" required error={errors["tax-label"]}>
                  <Input
                    id="tax-label"
                    value={billing.taxLabel}
                    disabled={!isOwner}
                    onChange={(event) => setBilling({ ...billing, taxLabel: event.target.value })}
                  />
                </Field>
                <Field
                  id="invoice-prefix"
                  label="Invoice prefix"
                  required
                  error={errors["invoice-prefix"]}
                >
                  <Input
                    id="invoice-prefix"
                    value={billing.invoicePrefix}
                    disabled={!isOwner}
                    onChange={(event) =>
                      setBilling({ ...billing, invoicePrefix: event.target.value })
                    }
                  />
                </Field>
                <Field id="payment-due" label="Default payment due (days)">
                  <Input
                    id="payment-due"
                    type="number"
                    min="0"
                    value={billing.paymentDue}
                    disabled={!isOwner}
                    onChange={(event) => setBilling({ ...billing, paymentDue: event.target.value })}
                  />
                </Field>
              </div>
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Wallet className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Payment Gateways</p>
                      <p className="text-xs text-muted-foreground">
                        Connect Razorpay, Cashfree, or PayU to collect patient payments securely.
                      </p>
                    </div>
                  </div>
                  <Button size="sm" className="rounded-lg" asChild>
                    <Link href="/settings/payments">Manage gateways</Link>
                  </Button>
                </div>
              </div>
              {isOwner ? (
                <SaveActions saved={savedSection === "billing"} />
              ) : (
                <p className="flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
                  <LockKeyhole className="size-3.5" />
                  Billing changes are unavailable for your current role.
                </p>
              )}
            </form>
          )}

          {activeSection === "integrations" && (
            <form className="space-y-5" onSubmit={(event) => save(event, "integrations", [])}>
              <SectionIntro
                title="Integrations"
                description="Connection summaries for clinic services. Provider secrets are managed outside this browser."
                badge={
                  <StatusBadge
                    label={isOwner ? "Owner controls" : "View only"}
                    tone={isOwner ? "primary" : "muted"}
                  />
                }
              />
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                      <CreditCard className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">Payment Gateways</p>
                      <p className="text-xs text-muted-foreground">
                        Razorpay, Cashfree, and PayU credentials — encrypted server-side.
                      </p>
                    </div>
                  </div>
                  <Button size="sm" className="rounded-lg" asChild>
                    <Link href="/settings/payments">Open gateways</Link>
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                      <ShieldCheck className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">ABDM / Digital Health</p>
                      <p className="text-xs text-muted-foreground">
                        ABHA linking, consent, and record exchange foundation. Secrets stay in server env — never shown here.
                      </p>
                    </div>
                  </div>
                  <Button size="sm" className="rounded-lg" asChild>
                    <Link href="/digital-health">Open Digital Health</Link>
                  </Button>
                </div>
              </div>
              <div>
                {(
                  [
                    ["Google Calendar", "Two-way appointment availability sync."],
                    ["Razorpay Payments", "Record payment status against clinic invoices."],
                    ["External Lab Inbox", "Receive reports into a restricted review queue."],
                  ] as const
                ).map(([title, description]) => (
                  <SettingRow
                    key={title}
                    title={title}
                    description={description}
                    checked={integrations[title] ?? false}
                    onCheckedChange={(checked) => updateToggle(setIntegrations, title, checked)}
                    disabled={!isOwner}
                  />
                ))}
              </div>
              {isOwner ? (
                <SaveActions saved={savedSection === "integrations"} />
              ) : (
                <p className="flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
                  <LockKeyhole className="size-3.5" />
                  Connection changes are unavailable for your current role.
                </p>
              )}
            </form>
          )}

          {activeSection === "audit" && (
            <div className="space-y-5">
              <SectionIntro
                title="Audit Log"
                description="Recent configuration activity. Entries are intentionally limited to operational metadata and contain no unnecessary patient information."
                badge={<StatusBadge label="Settings only" tone="info" />}
              />
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-muted/60 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Who</th>
                      <th className="px-3 py-2 font-medium">What</th>
                      <th className="px-3 py-2 font-medium">When</th>
                      <th className="px-3 py-2 font-medium">Entity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {auditEvents.map(([who, what, when, entity]) => (
                      <tr key={`${who}-${when}`} className="hover:bg-muted/30">
                        <td className="px-3 py-2.5 font-medium">{who}</td>
                        <td className="px-3 py-2.5">{what}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                          {when}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge label={entity} tone="muted" dot={false} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <CircleDollarSign className="size-3.5" />
                Billing events show configuration changes only, never payment or patient details.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
