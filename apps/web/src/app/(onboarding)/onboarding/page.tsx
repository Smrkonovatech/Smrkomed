"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  Heart,
  MapPin,
  Megaphone,
  PhoneCall,
  Plus,
  RefreshCw,
  Sparkles,
  Stethoscope,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { OnboardingBackdrop } from "@/components/onboarding/wizard-backdrop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MODULES, PLANS, STAFF_ROLE_OPTIONS } from "@/lib/saas/catalog";
import { cn } from "@/lib/utils";

const ACCOUNT_KEY = "smrkomed.onboarding.account";
const CITY_PRESETS = ["Bangalore", "Mysore", "Chennai", "Kochi", "Hyderabad"];

const steps = [
  { id: "organization", label: "Organization" },
  { id: "clinic", label: "Clinic" },
  { id: "locations", label: "Locations" },
  { id: "team", label: "Team" },
  { id: "modules", label: "Modules" },
  { id: "plan", label: "Plan" },
] as const;

const moduleIcons = {
  CARE_LOOP: RefreshCw,
  CRM: Heart,
  APPOINTMENTS: CalendarDays,
  ANALYTICS: BarChart3,
  BILLING: Wallet,
  MARKETING: Megaphone,
  VOICE: PhoneCall,
} as const;

const focusOptions = [
  { id: "ivf", title: "Fertility & IVF", copy: "Full Care Loop from consult to beta.", icon: Sparkles },
  { id: "iui", title: "IUI-led clinic", copy: "Faster cycles, lighter monitoring.", icon: Heart },
  { id: "group", title: "Multi-city group", copy: "One org, several branches.", icon: Building2 },
] as const;

type Invite = { name: string; role: (typeof STAFF_ROLE_OPTIONS)[number]["value"] };
type Location = { name: string; city: string };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState<(typeof focusOptions)[number]["id"]>("ivf");
  const [account, setAccount] = useState({ name: "", email: "", phone: "", password: "" });
  const [organizationName, setOrganizationName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicEmail, setClinicEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [modules, setModules] = useState<string[]>(
    MODULES.filter((item) => item.recommended).map((item) => item.key),
  );
  const [plan, setPlan] = useState<"STARTER" | "GROWTH" | "PRO" | "ENTERPRISE">("GROWTH");
  const [showAllModules, setShowAllModules] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(ACCOUNT_KEY);
    if (!raw) {
      router.replace("/register");
      return;
    }
    const parsed = JSON.parse(raw) as typeof account;
    // Restore wizard fields from the register step (sessionStorage is client-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from sessionStorage after mount
    setAccount(parsed);
    setClinicEmail(parsed.email);
    setClinicPhone(parsed.phone);
  }, [router]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") router.push("/register");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const visibleModules = showAllModules ? MODULES : MODULES.filter((item) => item.recommended || modules.includes(item.key));
  const headlines = [
    { title: "What kind of clinic is this?", copy: "Pick a starting shape. You can change modules later." },
    { title: "Tell us about the clinic", copy: "This becomes the workspace patients and staff will see." },
    { title: "Where do you operate?", copy: "Tap cities to add branches. Add a custom location anytime." },
    { title: "Who should be on the floor?", copy: "Select roles, then add names. Invites can wait." },
    { title: "Which modules should go live?", copy: "Recommended fertility setup is already on. Tap to tune it." },
    { title: "Choose a trial plan", copy: "14 days free. Connect WhatsApp and ads before you pay." },
  ];

  const activity = useMemo(
    () =>
      [
        organizationName && `${organizationName} created`,
        clinicName && `${clinicName} · ${city || "city pending"}`,
        locations.length ? `${locations.length} location${locations.length === 1 ? "" : "s"}` : null,
        invites.filter((item) => item.name).length
          ? `${invites.filter((item) => item.name).length} teammates`
          : null,
        `${modules.length} modules`,
        PLANS.find((item) => item.key === plan)?.name,
      ].filter(Boolean) as string[],
    [organizationName, clinicName, city, locations, invites, modules, plan],
  );

  function toggleModule(key: string) {
    setModules((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  function toggleCity(preset: string) {
    setLocations((current) => {
      const exists = current.some((item) => item.city === preset);
      if (exists) return current.filter((item) => item.city !== preset);
      return [...current, { name: clinicName ? `${clinicName} ${preset}` : preset, city: preset }];
    });
  }

  function toggleRole(role: Invite["role"]) {
    setInvites((current) => {
      const exists = current.some((item) => item.role === role && !item.name);
      if (exists && current.filter((item) => item.role === role).length === 1) {
        return current.filter((item) => item.role !== role);
      }
      return [...current, { name: "", role }];
    });
  }

  async function finish(selectedPlan: typeof plan = plan) {
    setLoading(true);
    setError(null);
    const websiteValue = website.trim();
    const resolvedLocations = locations.filter((item) => item.name && item.city);
    const payload = {
      ...account,
      organizationName,
      clinicName,
      address,
      city,
      clinicPhone,
      clinicEmail: clinicEmail.trim() || account.email,
      ...(websiteValue && websiteValue !== "https://" ? { website: websiteValue } : {}),
      locations:
        resolvedLocations.length > 0
          ? resolvedLocations
          : clinicName.trim() && city.trim()
            ? [{ name: clinicName.trim(), city: city.trim() }]
            : [],
      invites: invites.filter((item) => item.name.trim().length > 1),
      modules,
      plan: selectedPlan,
    };
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as
        | { success: boolean; error?: { message: string } }
        | null;
      if (!response.ok || !body?.success) {
        setError(body?.error?.message ?? "Could not create the workspace. Check clinic details and try again.");
        return;
      }
      sessionStorage.removeItem(ACCOUNT_KEY);
      const result = await signIn("credentials", {
        email: account.email,
        password: account.password,
        redirect: false,
      });
      if (result?.error) {
        router.push("/login");
        return;
      }
      router.push("/setup");
      router.refresh();
    } catch {
      setError("Could not create the workspace. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function next() {
    setError(null);
    if (step === 0 && organizationName.trim().length < 2) {
      setError("Name the organization to continue.");
      return;
    }
    if (step === 1 && (clinicName.trim().length < 2 || city.trim().length < 2 || address.trim().length < 3)) {
      setError("Clinic name, city and address are required.");
      return;
    }
    if (step === 1 && locations.length === 0) {
      setLocations([{ name: clinicName, city }]);
    }
    if (step === 2 && locations.every((item) => !item.name || !item.city)) {
      setError("Add at least one location.");
      return;
    }
    if (step === 4 && modules.length === 0) {
      setError("Choose at least one module.");
      return;
    }
    if (step === steps.length - 1) {
      void finish();
      return;
    }
    setStep((current) => current + 1);
  }

  const headline = headlines[step] ?? headlines[0]!;

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-6">
      <OnboardingBackdrop />

      <div className="pointer-events-none absolute top-8 left-8 hidden flex-col gap-2 lg:flex">
        {["Care Loop watching", "WhatsApp follow-up", "IVF workflow ready"].map((item) => (
          <span
            key={item}
            className="w-fit rounded-full border bg-card/80 px-3 py-1 text-[11px] font-medium text-primary shadow-soft backdrop-blur"
          >
            {item}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute right-8 bottom-10 hidden max-w-[200px] flex-col gap-2 lg:flex">
        {activity.slice(-3).map((item) => (
          <span
            key={item}
            className="rounded-full border bg-card/80 px-3 py-1 text-[11px] font-medium text-foreground shadow-soft backdrop-blur"
          >
            {item}
          </span>
        ))}
      </div>

      <section className="relative z-10 flex w-full max-w-5xl min-h-[640px] flex-col rounded-2xl border bg-card shadow-[0_24px_60px_-36px_rgb(91_42_104/0.45)]">
        <header className="flex items-center justify-between gap-3 border-b px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <p className="text-xs font-bold tracking-[0.16em] text-primary">SMRKOMED</p>
          </div>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Setup progress">
            {steps.map((item, index) => {
              const done = index < step;
              const current = index === step;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={index > step}
                  onClick={() => index <= step && setStep(index)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    current && "bg-primary text-primary-foreground",
                    done && "bg-success-soft text-success",
                    !done && !current && "text-muted-foreground",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
          <Link
            href="/register"
            className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close setup"
          >
            <span className="flex flex-col items-center">
              <X className="size-4" />
              <span className="text-[9px] font-semibold">ESC</span>
            </span>
          </Link>
        </header>

        <div className="flex items-center gap-2 px-5 pt-4 md:hidden">
          {steps.map((item, index) => (
            <span
              key={item.id}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                index < step ? "bg-success" : index === step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="flex flex-1 flex-col px-5 py-6 sm:px-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
              Step {step + 1} of {steps.length}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{headline.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{headline.copy}</p>
            {step === 5 && (
              <p className="mt-2 text-sm font-medium text-primary">
                Tap a plan to start the 14-day trial, or use Start free trial below.
              </p>
            )}
          </div>

          <div className="mx-auto mt-8 w-full max-w-3xl flex-1">
            {step === 0 && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {focusOptions.map((option) => (
                    <ChoiceCard
                      key={option.id}
                      selected={focus === option.id}
                      badge={option.id === "ivf" ? "IVF" : undefined}
                      icon={option.icon}
                      title={option.title}
                      copy={option.copy}
                      onClick={() => setFocus(option.id)}
                    />
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org">Organization name</Label>
                  <Input
                    id="org"
                    placeholder="ABC Fertility & IVF"
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                  />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Clinic name" id="clinic">
                  <Input
                    id="clinic"
                    placeholder="ABC Fertility Centre"
                    value={clinicName}
                    onChange={(event) => setClinicName(event.target.value)}
                  />
                </Field>
                <Field label="City" id="city">
                  <Input id="city" placeholder="Bangalore" value={city} onChange={(event) => setCity(event.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Address" id="address">
                    <Input id="address" value={address} onChange={(event) => setAddress(event.target.value)} />
                  </Field>
                </div>
                <Field label="Phone" id="clinic-phone">
                  <Input id="clinic-phone" value={clinicPhone} onChange={(event) => setClinicPhone(event.target.value)} />
                </Field>
                <Field label="Email" id="clinic-email">
                  <Input
                    id="clinic-email"
                    type="email"
                    value={clinicEmail}
                    onChange={(event) => setClinicEmail(event.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Website" id="website">
                    <Input id="website" placeholder="https://" value={website} onChange={(event) => setWebsite(event.target.value)} />
                  </Field>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-3 sm:grid-cols-3">
                {CITY_PRESETS.map((preset) => {
                  const selected = locations.some((item) => item.city === preset);
                  return (
                    <ChoiceCard
                      key={preset}
                      selected={selected}
                      icon={MapPin}
                      title={preset}
                      copy={clinicName ? `${clinicName}` : "Branch city"}
                      onClick={() => toggleCity(preset)}
                    />
                  );
                })}
                <button
                  type="button"
                  onClick={() => setLocations((current) => [...current, { name: "", city: "" }])}
                  className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <span className="grid size-10 place-items-center rounded-full border">
                    <Plus className="size-4" />
                  </span>
                  <span className="text-sm font-medium">Add a custom city</span>
                </button>
                {locations.map((location, index) =>
                  CITY_PRESETS.includes(location.city) ? null : (
                    <div key={`custom-${index}`} className="rounded-2xl border p-3">
                      <Input
                        className="mb-2"
                        placeholder="Branch name"
                        value={location.name}
                        onChange={(event) =>
                          setLocations((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, name: event.target.value } : item,
                            ),
                          )
                        }
                      />
                      <Input
                        placeholder="City"
                        value={location.city}
                        onChange={(event) =>
                          setLocations((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, city: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </div>
                  ),
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  {STAFF_ROLE_OPTIONS.map((option) => {
                    const selected = invites.some((item) => item.role === option.value);
                    return (
                      <ChoiceCard
                        key={option.value}
                        selected={selected}
                        icon={option.value === "DOCTOR" ? Stethoscope : Users}
                        title={option.label}
                        copy="Tap to add to the floor"
                        onClick={() => toggleRole(option.value)}
                      />
                    );
                  })}
                </div>
                {invites.length > 0 && (
                  <div className="space-y-2">
                    {invites.map((invite, index) => (
                      <div key={`${invite.role}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_160px]">
                        <Input
                          placeholder={`${STAFF_ROLE_OPTIONS.find((item) => item.value === invite.role)?.label} name`}
                          value={invite.name}
                          onChange={(event) =>
                            setInvites((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, name: event.target.value } : item,
                              ),
                            )
                          }
                        />
                        <div className="flex h-9 items-center rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground">
                          {STAFF_ROLE_OPTIONS.find((item) => item.value === invite.role)?.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {visibleModules.map((item) => {
                    const Icon = moduleIcons[item.key];
                    return (
                      <ChoiceCard
                        key={item.key}
                        selected={modules.includes(item.key)}
                        badge={item.recommended ? "Rec" : undefined}
                        icon={Icon}
                        title={item.name}
                        copy={item.description}
                        onClick={() => toggleModule(item.key)}
                      />
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="mx-auto mt-5 flex items-center gap-1.5 text-sm font-medium text-primary"
                  onClick={() => setShowAllModules((current) => !current)}
                >
                  <Plus className="size-3.5" />
                  {showAllModules ? "Show recommended only" : "View every module"}
                </button>
              </div>
            )}

            {step === 5 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {PLANS.map((item) => (
                  <ChoiceCard
                    key={item.key}
                    selected={plan === item.key}
                    badge={item.highlight ? "Best" : undefined}
                    icon={Sparkles}
                    title={`${item.name} · ${item.price}`}
                    copy={item.description}
                    onClick={() => {
                      if (loading) return;
                      setPlan(item.key);
                      void finish(item.key);
                    }}
                  />
                ))}
              </div>
            )}
            {error && <p className="mt-4 text-center text-sm text-danger">{error}</p>}
          </div>
        </div>

        <footer className="flex items-center justify-between border-t px-5 py-4 sm:px-7">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || loading}
            onClick={() => setStep((current) => current - 1)}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <Button type="button" onClick={next} disabled={loading}>
            {loading ? "Creating workspace…" : step === steps.length - 1 ? "Start free trial" : "Next"}
            {!loading && <ArrowRight className="size-4" />}
          </Button>
        </footer>
      </section>
    </div>
  );
}

function ChoiceCard({
  selected,
  badge,
  icon: Icon,
  title,
  copy,
  onClick,
}: {
  selected: boolean;
  badge?: string | undefined;
  icon: typeof Sparkles;
  title: string;
  copy: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative min-h-[140px] rounded-2xl border bg-card p-4 text-left transition-all hover:shadow-lift",
        selected ? "border-primary shadow-lift" : "border-border",
      )}
    >
      {selected && (
        <span className="absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" />
        </span>
      )}
      {badge && (
        <span className="mb-3 inline-flex rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
          {badge}
        </span>
      )}
      <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-5" />
      </span>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy}</p>
    </button>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5 text-left">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
