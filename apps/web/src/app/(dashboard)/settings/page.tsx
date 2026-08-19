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
  type LucideIcon,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
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

type SectionId =
  | "clinic"
  | "team"
  | "roles"
  | "care-loop"
  | "whatsapp"
  | "ai"
  | "notifications"
  | "appointments"
  | "billing"
  | "integrations"
  | "audit";

type ToggleMap = Record<string, boolean>;

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

function SaveActions({ saved }: { saved: boolean }) {
  return (
    <div className="flex items-center gap-3 border-t pt-4">
      <Button type="submit" className="rounded-lg">
        Save changes
      </Button>
      {saved && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <Check className="size-3.5" />
          Saved just now
        </span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { role, clinicId } = useAppState();
  const clinic = clinics.find((item) => item.id === clinicId) ?? clinics[0]!;
  const [activeSection, setActiveSection] = useState<SectionId>("clinic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedSection, setSavedSection] = useState<SectionId | null>(null);
  const [profile, setProfile] = useState({
    name: clinic.name,
    city: clinic.city,
    address: clinic.address,
    phone: clinic.phone,
    hours: clinic.hours,
    languages: "English, Hindi, Kannada, Malayalam",
  });
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

  const active = sections.find((section) => section.id === activeSection)!;
  const isOwner = role === "owner";

  function save(
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
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <nav
          className="surface-card sticky top-20 hidden overflow-hidden p-2 lg:block"
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

        <main className="surface-card min-w-0 p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground lg:hidden">
            <active.icon className="size-4" />
            <span>{active.description}</span>
          </div>

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
              <SaveActions saved={savedSection === "clinic"} />
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

          {activeSection === "notifications" && (
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
