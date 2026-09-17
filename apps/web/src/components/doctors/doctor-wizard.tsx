"use client";

import Link from "next/link";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, Key, MessageSquare, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { clinicApi } from "@/lib/clinic-api";
import { useAppState } from "@/lib/app-state";
import { toast } from "sonner";

import {
  AppointmentSettingsForm,
  AvailabilityWeekEditor,
} from "@/components/doctors/availability-editor";
import { FieldError, PhotoUploader, TagMultiSelect } from "@/components/doctors/form-bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { clinics } from "@/lib/demo-data";
import {
  CONSULTATION_TYPES,
  DEGREE_OPTIONS,
  DEPARTMENTS,
  DOCUMENT_KIND_LABELS,
  EXPERTISE_OPTIONS,
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  PROCEDURE_OPTIONS,
  SERVICE_OPTIONS,
  SPECIALTIES,
  SUB_SPECIALTY_OPTIONS,
  doctorsStore,
  displayNameOf,
  initialsOf,
  newId,
  type DoctorDocumentKind,
  type DoctorExperience,
  type DoctorProfile,
  type DoctorQualification,
  type DoctorStatus,
} from "@/lib/doctors";
import {
  validateAvailability,
  validateBasic,
  validateForActivate,
  validateProfessional,
  type FieldErrors,
} from "@/lib/doctors/validation";
import { cn } from "@/lib/utils";

const STEPS = [
  "Basic Information",
  "Professional Information",
  "Education & Qualifications",
  "Experience",
  "Expertise & Services",
  "Availability",
  "Documents",
  "Review & Activate",
] as const;

export function DoctorWizard({
  initial,
  mode,
}: {
  initial: DoctorProfile;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const { clinicName } = useAppState();
  const [step, setStep] = useState(0);
  const [doctor, setDoctor] = useState<DoctorProfile>(initial);
  const [password, setPassword] = useState("Doctor@12345");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    id: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const namePreview = useMemo(() => {
    if (doctor.displayName.trim()) return doctor.displayName.trim();
    if (doctor.firstName || doctor.lastName) {
      return `Dr. ${doctor.firstName} ${doctor.lastName}`.trim();
    }
    return "New doctor";
  }, [doctor.displayName, doctor.firstName, doctor.lastName]);

  function patch(partial: Partial<DoctorProfile>) {
    setDoctor((prev) => ({ ...prev, ...partial }));
  }

  function validateCurrent(): boolean {
    let next: FieldErrors = {};
    if (step === 0) next = validateBasic(doctor);
    if (step === 1) next = validateProfessional(doctor);
    if (step === 5) next = validateAvailability(doctor);
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function continueNext() {
    if (!validateCurrent()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function saveDraft() {
    const withName = {
      ...doctor,
      displayName: doctor.displayName.trim() || namePreview,
      isDraft: true,
    };
    setSaving(true);
    try {
      if (mode === "create") {
        const res = await clinicApi.createDoctor({
          ...withName,
          password: password || "Doctor@12345",
          isDraft: true,
          status: "inactive",
        });
        doctorsStore.upsert({ ...withName, id: res.id, staffUserId: res.staffUserId || res.id, isDraft: true, status: "inactive" });
        toast.success("Doctor draft saved in database.");
        router.push(`/doctors/${res.id}`);
      } else {
        const cleanId = (doctor.staffUserId || doctor.id || "").replace(/^doc_/, "");
        const res = await clinicApi.updateDoctor(cleanId, { ...withName, isDraft: true });
        doctorsStore.upsert({ ...withName, id: res.id || doctor.id, isDraft: true });
        toast.success("Draft updated.");
        router.push(`/doctors/${doctor.id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  }

  async function saveAndActivate() {
    const withName = {
      ...doctor,
      displayName: doctor.displayName.trim() || namePreview,
    };
    const allErrors = validateForActivate(withName);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      toast.error("Complete required fields before activating.");
      if (allErrors["firstName"] || allErrors["email"] || allErrors["phone"]) setStep(0);
      else if (allErrors["designation"] || allErrors["primarySpecialty"]) setStep(1);
      else if (Object.keys(allErrors).some((k) => k.startsWith("schedule") || k.includes("Minutes")))
        setStep(5);
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") {
        const res = await clinicApi.createDoctor({
          ...withName,
          password: password || "Doctor@12345",
          isDraft: false,
          status: "active",
        });
        const finalDoc = {
          ...withName,
          id: res.id,
          staffUserId: res.staffUserId || res.id,
          isDraft: false,
          status: "active" as DoctorStatus,
        };
        doctorsStore.upsert(finalDoc);
        setCreatedCredentials({
          name: withName.displayName,
          email: withName.email,
          password: password || "Doctor@12345",
          id: res.id,
        });
        toast.success(`${withName.displayName} created and activated!`);
      } else {
        const cleanId = (doctor.staffUserId || doctor.id || "").replace(/^doc_/, "");
        const res = await clinicApi.updateDoctor(cleanId, {
          ...withName,
          isDraft: false,
          status: "active",
        });
        const finalDoc = {
          ...withName,
          id: res.id || doctor.id,
          isDraft: false,
          status: "active" as DoctorStatus,
        };
        doctorsStore.upsert(finalDoc);
        toast.success(`${displayNameOf(finalDoc)} updated and active.`);
        router.push(`/doctors/${doctor.id}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to activate doctor.");
    } finally {
      setSaving(false);
    }
  }

  if (createdCredentials) {
    const message = `Hello ${createdCredentials.name},
Your doctor clinical workspace account at ${clinicName || "Hospex"} is active.

Login URL: ${typeof window !== "undefined" ? window.location.origin : ""}/login
Username: ${createdCredentials.email}
Password: ${createdCredentials.password}

You can log in to view your schedule, consultations, and assigned patients.

Regards,
Clinic Administrator`;

    const handleCopy = () => {
      navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Doctor credentials copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    };

    const handleWhatsApp = () => {
      const text = encodeURIComponent(message);
      const phone = doctor.phone?.replace(/\D/g, "");
      const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
      window.open(url, "_blank");
    };

    return (
      <div className="mx-auto max-w-xl py-8 px-4">
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold">{createdCredentials.name} Profile & Account Created!</h2>
            <p className="text-sm text-muted-foreground">
              Doctor profile is active in the clinic directory and saved to the database. Share login details below:
            </p>
          </div>

          <div className="rounded-xl border bg-muted/40 p-4 space-y-3 text-sm font-mono">
            <div className="flex justify-between items-center gap-2 flex-wrap font-sans">
              <span className="text-xs text-muted-foreground">Login Portal</span>
              <span className="text-xs font-semibold text-primary">{typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}</span>
            </div>
            <div className="border-t" />
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-sans text-muted-foreground">Doctor Email</span>
              <span className="font-medium text-foreground">{createdCredentials.email}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-sans text-muted-foreground">Password</span>
              <span className="font-bold text-foreground tracking-widest">{createdCredentials.password}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-sans text-muted-foreground">Role</span>
              <span className="font-sans text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                Doctor (Clinical Authority)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="gap-2" onClick={handleCopy}>
              {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
              {copied ? "Copied!" : "Copy Credentials"}
            </Button>
            <Button variant="outline" className="gap-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950" onClick={handleWhatsApp}>
              <MessageSquare className="size-4" />
              WhatsApp
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
            <Button asChild className="flex-1">
              <Link href={`/doctors/${createdCredentials.id}`}>
                View Doctor Profile →
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/doctors">
                Back to Doctor Directory
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            {mode === "create" ? "Add Doctor" : "Edit Doctor"}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{namePreview}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={saveDraft}>
            <Save className="size-4" /> Save Draft
          </Button>
        </div>
      </div>

      <ol className="flex gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(index)}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                index === step
                  ? "bg-primary text-primary-foreground"
                  : index < step
                    ? "bg-primary-soft text-primary"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        {step === 0 && (
          <BasicStep
            doctor={doctor}
            patch={patch}
            errors={errors}
            mode={mode}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
        )}
        {step === 1 && (
          <ProfessionalStep doctor={doctor} patch={patch} errors={errors} />
        )}
        {step === 2 && (
          <QualificationsStep doctor={doctor} patch={patch} />
        )}
        {step === 3 && <ExperienceStep doctor={doctor} patch={patch} />}
        {step === 4 && <ExpertiseStep doctor={doctor} patch={patch} />}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-semibold">Weekly schedule</h2>
              <p className="text-sm text-muted-foreground">
                Configure regular clinic hours. Multiple slots per day are supported.
              </p>
            </div>
            <AvailabilityWeekEditor
              schedule={doctor.weeklySchedule}
              onChange={(weeklySchedule) => patch({ weeklySchedule })}
              errors={errors}
            />
            <div>
              <h2 className="text-base font-semibold">Appointment settings</h2>
              <p className="mb-3 text-sm text-muted-foreground">
                Used when generating available appointment slots.
              </p>
              <AppointmentSettingsForm
                settings={doctor.appointmentSettings}
                onChange={(appointmentSettings) => patch({ appointmentSettings })}
                errors={errors}
              />
            </div>
          </div>
        )}
        {step === 6 && <DocumentsStep doctor={doctor} patch={patch} />}
        {step === 7 && <ReviewStep doctor={doctor} />}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ChevronLeft className="size-4" /> Back
        </Button>
        <div className="flex flex-wrap gap-2">
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={continueNext}>
              Continue <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button type="button" disabled={saving} onClick={saveAndActivate}>
              {saving ? "Saving to Database..." : "Save & Activate"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function BasicStep({
  doctor,
  patch,
  errors,
  mode,
  password,
  setPassword,
  showPassword,
  setShowPassword,
}: {
  doctor: DoctorProfile;
  patch: (p: Partial<DoctorProfile>) => void;
  errors: FieldErrors;
  mode?: "create" | "edit";
  password?: string;
  setPassword?: (p: string) => void;
  showPassword?: boolean;
  setShowPassword?: (s: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <PhotoUploader
        value={doctor.photoDataUrl}
        onChange={(photoDataUrl) => {
          if (photoDataUrl) patch({ photoDataUrl });
          else patch({ photoDataUrl: "" });
        }}
        initials={initialsOf(doctor) || "DR"}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="First name *" error={errors["firstName"]}>
          <Input value={doctor.firstName} onChange={(e) => patch({ firstName: e.target.value })} />
        </Field>
        <Field label="Last name *" error={errors["lastName"]}>
          <Input value={doctor.lastName} onChange={(e) => patch({ lastName: e.target.value })} />
        </Field>
        <Field label="Preferred display name" className="sm:col-span-2">
          <Input
            placeholder="Dr. First Last"
            value={doctor.displayName}
            onChange={(e) => patch({ displayName: e.target.value })}
          />
        </Field>
        <Field label="Gender">
          <select
            className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={doctor.gender}
            onChange={(e) => patch({ gender: e.target.value })}
          >
            <option value="">Select</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date of birth">
          <Input
            type="date"
            value={doctor.dateOfBirth}
            onChange={(e) => patch({ dateOfBirth: e.target.value })}
          />
        </Field>
        <Field label="Phone *" error={errors["phone"]}>
          <Input value={doctor.phone} onChange={(e) => patch({ phone: e.target.value })} />
        </Field>
        <Field label="Email *" error={errors["email"]}>
          <Input type="email" value={doctor.email} onChange={(e) => patch({ email: e.target.value })} />
        </Field>
        <Field label="Alternate phone">
          <Input
            value={doctor.alternatePhone}
            onChange={(e) => patch({ alternatePhone: e.target.value })}
          />
        </Field>
        <Field label="Doctor / Employee ID">
          <Input value={doctor.employeeId} onChange={(e) => patch({ employeeId: e.target.value })} />
        </Field>
        <Field label="Medical registration number *" error={errors["registrationNumber"]}>
          <Input
            value={doctor.registrationNumber}
            onChange={(e) => patch({ registrationNumber: e.target.value })}
          />
        </Field>
        <Field label="Registration authority">
          <Input
            value={doctor.registrationAuthority}
            onChange={(e) => patch({ registrationAuthority: e.target.value })}
          />
        </Field>
        <Field label="Country">
          <Input value={doctor.country} onChange={(e) => patch({ country: e.target.value })} />
        </Field>
        <Field label="State">
          <Input value={doctor.state} onChange={(e) => patch({ state: e.target.value })} />
        </Field>
        <Field label="City">
          <Input value={doctor.city} onChange={(e) => patch({ city: e.target.value })} />
        </Field>

        {mode === "create" && setPassword && (
          <div className="sm:col-span-2 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 mt-2">
            <div className="flex items-center gap-2">
              <Key className="size-4 text-primary" />
              <h4 className="text-sm font-semibold">Doctor Workspace Login Credentials</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              A clinical workspace account will be created automatically in PostgreSQL with this doctor's email. You can specify a custom initial password or use the default below.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Login Username / Email</label>
                <Input value={doctor.email || "Enter email in the form above"} disabled className="bg-muted/50 cursor-not-allowed text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Initial Password *</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password || ""}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Doctor@12345"
                    className="pr-10 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword?.(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfessionalStep({
  doctor,
  patch,
  errors,
}: {
  doctor: DoctorProfile;
  patch: (p: Partial<DoctorProfile>) => void;
  errors: FieldErrors;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Designation *" error={errors["designation"]}>
          <Input value={doctor.designation} onChange={(e) => patch({ designation: e.target.value })} />
        </Field>
        <Field label="Department *" error={errors["department"]}>
          <select
            className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={doctor.department}
            onChange={(e) => patch({ department: e.target.value })}
          >
            <option value="">Select department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Primary specialty *" error={errors["primarySpecialty"]}>
          <select
            className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={doctor.primarySpecialty}
            onChange={(e) => patch({ primarySpecialty: e.target.value })}
          >
            <option value="">Select specialty</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Clinic location">
          <select
            className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={doctor.locationId}
            onChange={(e) => {
              const clinic = clinics.find((c) => c.id === e.target.value);
              patch({
                locationId: e.target.value,
                locationName: clinic?.city ?? "",
              });
            }}
          >
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.city} — {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Years of experience" error={errors["yearsExperience"]}>
          <Input
            type="number"
            min={0}
            value={doctor.yearsExperience}
            onChange={(e) => patch({ yearsExperience: Number(e.target.value) || 0 })}
          />
        </Field>
        <Field label="Years in current specialty">
          <Input
            type="number"
            min={0}
            value={doctor.yearsInSpecialty}
            onChange={(e) => patch({ yearsInSpecialty: Number(e.target.value) || 0 })}
          />
        </Field>
      </div>

      <TagMultiSelect
        label="Sub-specialties"
        options={SUB_SPECIALTY_OPTIONS}
        value={doctor.subSpecialties}
        onChange={(subSpecialties) => patch({ subSpecialties })}
      />
      <TagMultiSelect
        label="Consultation type"
        options={CONSULTATION_TYPES}
        value={doctor.consultationTypes}
        onChange={(consultationTypes) => patch({ consultationTypes })}
      />
      <TagMultiSelect
        label="Languages spoken"
        options={LANGUAGE_OPTIONS}
        value={doctor.languages}
        onChange={(languages) => patch({ languages })}
      />

      <Field label="Short introduction">
        <Textarea
          rows={2}
          value={doctor.shortIntro}
          onChange={(e) => patch({ shortIntro: e.target.value })}
        />
      </Field>
      <Field label="Professional bio">
        <Textarea
          rows={4}
          value={doctor.professionalBio}
          onChange={(e) => patch({ professionalBio: e.target.value })}
        />
      </Field>
      <Field label="Clinical interests">
        <Textarea
          rows={2}
          value={doctor.clinicalInterests}
          onChange={(e) => patch({ clinicalInterests: e.target.value })}
        />
      </Field>
    </div>
  );
}

function QualificationsStep({
  doctor,
  patch,
}: {
  doctor: DoctorProfile;
  patch: (p: Partial<DoctorProfile>) => void;
}) {
  function update(id: string, partial: Partial<DoctorQualification>) {
    patch({
      qualifications: doctor.qualifications.map((q) => (q.id === id ? { ...q, ...partial } : q)),
    });
  }

  function add() {
    const entry: DoctorQualification = {
      id: newId("qual"),
      degree: "MBBS",
      specialization: "",
      institution: "",
      university: "",
      location: "",
      startYear: "",
      endYear: "",
      description: "",
    };
    patch({ qualifications: [...doctor.qualifications, entry] });
  }

  function remove(id: string) {
    if (!confirm("Are you sure you want to delete this record?")) return;
    patch({ qualifications: doctor.qualifications.filter((q) => q.id !== id) });
  }

  function move(id: string, dir: -1 | 1) {
    const idx = doctor.qualifications.findIndex((q) => q.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= doctor.qualifications.length) return;
    const next = [...doctor.qualifications];
    const tmp = next[idx]!;
    next[idx] = next[target]!;
    next[target] = tmp;
    patch({ qualifications: next });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Education & qualifications</h2>
          <p className="text-sm text-muted-foreground">Add multiple degrees and fellowships.</p>
        </div>
        <Button type="button" variant="outline" onClick={add}>
          + Add Qualification
        </Button>
      </div>
      {doctor.qualifications.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No qualifications added yet.
        </p>
      ) : (
        doctor.qualifications.map((q, index) => (
          <div key={q.id} className="rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Qualification {index + 1}</p>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => move(q.id, -1)}>
                  ↑
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => move(q.id, 1)}>
                  ↓
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => remove(q.id)}>
                  Delete
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Degree">
                <select
                  className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={q.degree}
                  onChange={(e) => update(q.id, { degree: e.target.value })}
                >
                  {DEGREE_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Specialization">
                <Input
                  value={q.specialization}
                  onChange={(e) => update(q.id, { specialization: e.target.value })}
                />
              </Field>
              <Field label="Institution / College">
                <Input
                  value={q.institution}
                  onChange={(e) => update(q.id, { institution: e.target.value })}
                />
              </Field>
              <Field label="University">
                <Input
                  value={q.university}
                  onChange={(e) => update(q.id, { university: e.target.value })}
                />
              </Field>
              <Field label="Location">
                <Input value={q.location} onChange={(e) => update(q.id, { location: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Start year">
                  <Input
                    value={q.startYear}
                    onChange={(e) => update(q.id, { startYear: e.target.value })}
                  />
                </Field>
                <Field label="Completion year">
                  <Input value={q.endYear} onChange={(e) => update(q.id, { endYear: e.target.value })} />
                </Field>
              </div>
              <Field label="Description" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={q.description}
                  onChange={(e) => update(q.id, { description: e.target.value })}
                />
              </Field>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ExperienceStep({
  doctor,
  patch,
}: {
  doctor: DoctorProfile;
  patch: (p: Partial<DoctorProfile>) => void;
}) {
  function update(id: string, partial: Partial<DoctorExperience>) {
    patch({
      experience: doctor.experience.map((e) => (e.id === id ? { ...e, ...partial } : e)),
    });
  }

  function add() {
    const entry: DoctorExperience = {
      id: newId("exp"),
      organization: "",
      position: "",
      department: "",
      startDate: "",
      endDate: "",
      currentlyWorking: false,
      description: "",
      responsibilities: "",
    };
    patch({ experience: [...doctor.experience, entry] });
  }

  function remove(id: string) {
    if (!confirm("Are you sure you want to delete this record?")) return;
    patch({ experience: doctor.experience.filter((e) => e.id !== id) });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Professional experience</h2>
          <p className="text-sm text-muted-foreground">Build a chronological career timeline.</p>
        </div>
        <Button type="button" variant="outline" onClick={add}>
          + Add Experience
        </Button>
      </div>
      {doctor.experience.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No experience added yet.
        </p>
      ) : (
        <div className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-border">
          {doctor.experience.map((exp) => (
            <div key={exp.id} className="relative pl-8">
              <span className="absolute top-3 left-0 size-6 rounded-full border-4 border-background bg-primary" />
              <div className="rounded-xl border p-4">
                <div className="mb-3 flex justify-end">
                  <Button type="button" size="sm" variant="ghost" onClick={() => remove(exp.id)}>
                    Delete
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Organization / Hospital / Clinic">
                    <Input
                      value={exp.organization}
                      onChange={(e) => update(exp.id, { organization: e.target.value })}
                    />
                  </Field>
                  <Field label="Position">
                    <Input
                      value={exp.position}
                      onChange={(e) => update(exp.id, { position: e.target.value })}
                    />
                  </Field>
                  <Field label="Department">
                    <Input
                      value={exp.department}
                      onChange={(e) => update(exp.id, { department: e.target.value })}
                    />
                  </Field>
                  <label className="flex items-end gap-2 pb-2 text-sm">
                    <Checkbox
                      checked={exp.currentlyWorking}
                      onCheckedChange={(v) =>
                        update(exp.id, {
                          currentlyWorking: Boolean(v),
                          endDate: v ? "" : exp.endDate,
                        })
                      }
                    />
                    Currently working
                  </label>
                  <Field label="Start (YYYY-MM)">
                    <Input
                      placeholder="2020-01"
                      value={exp.startDate}
                      onChange={(e) => update(exp.id, { startDate: e.target.value })}
                    />
                  </Field>
                  <Field label="End (YYYY-MM)">
                    <Input
                      placeholder="Present"
                      disabled={exp.currentlyWorking}
                      value={exp.endDate}
                      onChange={(e) => update(exp.id, { endDate: e.target.value })}
                    />
                  </Field>
                  <Field label="Description" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      value={exp.description}
                      onChange={(e) => update(exp.id, { description: e.target.value })}
                    />
                  </Field>
                  <Field label="Responsibilities" className="sm:col-span-2">
                    <Textarea
                      rows={2}
                      value={exp.responsibilities}
                      onChange={(e) => update(exp.id, { responsibilities: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExpertiseStep({
  doctor,
  patch,
}: {
  doctor: DoctorProfile;
  patch: (p: Partial<DoctorProfile>) => void;
}) {
  return (
    <div className="space-y-6">
      <TagMultiSelect
        label="Areas of expertise"
        options={EXPERTISE_OPTIONS}
        value={doctor.expertise}
        onChange={(expertise) => patch({ expertise })}
      />
      <TagMultiSelect
        label="Services"
        options={SERVICE_OPTIONS}
        value={doctor.services}
        onChange={(services) => patch({ services })}
      />
      <TagMultiSelect
        label="Procedures"
        options={PROCEDURE_OPTIONS}
        value={doctor.procedures}
        onChange={(procedures) => patch({ procedures })}
      />
    </div>
  );
}

function DocumentsStep({
  doctor,
  patch,
}: {
  doctor: DoctorProfile;
  patch: (p: Partial<DoctorProfile>) => void;
}) {
  function onFile(kind: DoctorDocumentKind, file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : undefined;
      const doc = {
        id: newId("ddoc"),
        kind,
        name: file.name,
        uploadedAt: new Date().toISOString(),
        mimeType: file.type,
        ...(dataUrl ? { dataUrl } : {}),
      };
      patch({
        documents: [doc, ...doctor.documents],
      });
    };
    reader.readAsDataURL(file);
  }

  function remove(id: string) {
    if (!confirm("Are you sure you want to delete this record?")) return;
    patch({ documents: doctor.documents.filter((d) => d.id !== id) });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Documents</h2>
        <p className="text-sm text-muted-foreground">
          Upload registration, degrees, and certifications. Files are stored locally until a
          document API is connected.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(DOCUMENT_KIND_LABELS) as DoctorDocumentKind[]).map((kind) => (
          <label
            key={kind}
            className="flex cursor-pointer flex-col gap-1 rounded-xl border border-dashed p-4 text-sm hover:border-primary/40"
          >
            <span className="font-medium">{DOCUMENT_KIND_LABELS[kind]}</span>
            <span className="text-xs text-muted-foreground">Click to upload</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => onFile(kind, e.target.files?.[0])}
            />
          </label>
        ))}
      </div>
      {doctor.documents.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {doctor.documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{DOCUMENT_KIND_LABELS[doc.kind]}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(doc.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewStep({ doctor }: { doctor: DoctorProfile }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Review & activate</h2>
      <p className="text-sm text-muted-foreground">
        Confirm the profile details before activating this doctor for appointments.
      </p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <ReviewItem label="Name" value={displayNameOf(doctor)} />
        <ReviewItem label="Designation" value={doctor.designation || "—"} />
        <ReviewItem label="Specialty" value={doctor.primarySpecialty || "—"} />
        <ReviewItem label="Department" value={doctor.department || "—"} />
        <ReviewItem label="Registration" value={doctor.registrationNumber || "—"} />
        <ReviewItem label="Location" value={doctor.locationName || "—"} />
        <ReviewItem label="Qualifications" value={String(doctor.qualifications.length)} />
        <ReviewItem label="Experience entries" value={String(doctor.experience.length)} />
        <ReviewItem label="Expertise tags" value={String(doctor.expertise.length)} />
        <ReviewItem label="Documents" value={String(doctor.documents.length)} />
      </dl>
      {(doctor.shortIntro || doctor.professionalBio) && (
        <div className="rounded-xl bg-muted/30 p-4 text-sm">
          <p className="font-medium">Biography preview</p>
          <p className="mt-1 text-muted-foreground">{doctor.shortIntro || doctor.professionalBio}</p>
        </div>
      )}
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function Field({
  label,
  children,
  error,
  className,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
      <FieldError message={error} />
    </div>
  );
}
