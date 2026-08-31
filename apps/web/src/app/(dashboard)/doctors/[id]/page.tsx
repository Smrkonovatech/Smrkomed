"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarClock,
  MoreHorizontal,
  Pencil,
  UserCheck,
  UserX,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

import { DoctorAvailabilityPanel } from "@/components/doctors/availability-calendar";
import { DoctorPhoto, DoctorStatusBadge } from "@/components/doctors/doctor-card";
import { DeactivateDoctorDialog, LeaveDialog } from "@/components/doctors/leave-dialog";
import { EmptyState, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppState } from "@/lib/app-state";
import { coupleLabel } from "@/lib/demo-data";
import {
  DOCUMENT_KIND_LABELS,
  LEAVE_TYPE_LABELS,
  displayNameOf,
  doctorsStore,
  formatNextAvailable,
  useDoctor,
} from "@/lib/doctors";
import { PERMISSIONS, roleHasPermission, type StaffRole } from "@/lib/permissions/rbac";
import { appointmentTone } from "@/lib/status";

const TABS = [
  "overview",
  "qualifications",
  "experience",
  "expertise",
  "availability",
  "appointments",
  "documents",
  "activity",
] as const;

type TabId = (typeof TABS)[number];

export default function DoctorProfilePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const doctor = useDoctor(params.id);
  const { appointments, couples, cycles } = useAppState();
  const { data: session } = useSession();
  const role = session?.user?.role as StaffRole | undefined;
  const canManage =
    !role || roleHasPermission(role, PERMISSIONS.USERS_MANAGE) || role === "CLINIC_ADMIN";

  const initialTab = (searchParams.get("tab") as TabId) || "overview";
  const [tab, setTab] = useState<TabId>(TABS.includes(initialTab) ? initialTab : "overview");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  useEffect(() => {
    const fromUrl = searchParams.get("tab") as TabId | null;
    if (fromUrl && TABS.includes(fromUrl)) setTab(fromUrl);
  }, [searchParams]);

  const relatedAppointments = useMemo(() => {
    if (!doctor) return [];
    const name = displayNameOf(doctor);
    return appointments.filter(
      (a) => a.doctor === name || a.doctor.includes(doctor.lastName),
    );
  }, [appointments, doctor]);

  const relatedCouples = useMemo(() => {
    if (!doctor) return [];
    const name = displayNameOf(doctor);
    return couples.filter((c) => c.doctor === name || c.doctor.includes(doctor.lastName));
  }, [couples, doctor]);

  const careLoopPatients = useMemo(
    () => relatedCouples.filter((c) => c.careLoop === "Active").length,
    [relatedCouples],
  );

  const relatedCycles = useMemo(() => {
    if (!doctor) return [];
    const name = displayNameOf(doctor);
    return cycles.filter((c) => c.doctor === name || c.doctor.includes(doctor.lastName));
  }, [cycles, doctor]);

  if (!doctor) {
    return (
      <EmptyState
        title="Doctor not found"
        description="This doctor profile does not exist or was removed."
        action={
          <Button asChild variant="outline">
            <Link href="/doctors">Back to Doctors</Link>
          </Button>
        }
      />
    );
  }

  const name = displayNameOf(doctor);

  function onTabChange(value: string) {
    const next = value as TabId;
    setTab(next);
    router.replace(`/doctors/${doctor!.id}?tab=${next}`, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-[#efe8fb] via-white to-[#f7ebe4]">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <DoctorPhoto doctor={doctor} size="xl" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
                <DoctorStatusBadge status={doctor.status} />
                {doctor.isDraft && <StatusBadge label="Draft" tone="info" />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {doctor.designation || doctor.primarySpecialty || "Doctor"}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>
                  <span className="text-muted-foreground">Specialty · </span>
                  {doctor.primarySpecialty || "—"}
                </span>
                <span>
                  <span className="text-muted-foreground">Department · </span>
                  {doctor.department || "—"}
                </span>
                <span>
                  <span className="text-muted-foreground">Experience · </span>
                  {doctor.yearsExperience ? `${doctor.yearsExperience} yrs` : "—"}
                </span>
                <span>
                  <span className="text-muted-foreground">Registration · </span>
                  {doctor.registrationNumber || "—"}
                </span>
                <span>
                  <span className="text-muted-foreground">Languages · </span>
                  {doctor.languages.join(", ") || "—"}
                </span>
                <span>
                  <span className="text-muted-foreground">Next · </span>
                  {doctor.status === "active" ? formatNextAvailable(doctor) : "Unavailable"}
                </span>
              </div>
            </div>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/doctors/${doctor.id}/edit`}>
                  <Pencil className="size-4" /> Edit Profile
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/doctors/${doctor.id}?tab=availability`}>
                  <CalendarClock className="size-4" /> Manage Availability
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLeaveOpen(true)}>Add Leave</DropdownMenuItem>
                  {doctor.status !== "active" && (
                    <DropdownMenuItem
                      onClick={() => {
                        doctorsStore.setStatus(doctor.id, "active");
                        toast.success("Doctor activated.");
                      }}
                    >
                      <UserCheck className="size-4" /> Activate
                    </DropdownMenuItem>
                  )}
                  {doctor.status !== "inactive" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeactivateOpen(true)}
                      >
                        <UserX className="size-4" /> Deactivate
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList className="h-auto w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="expertise">Expertise & Services</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Today's Appointments" value={String(relatedAppointments.length)} />
            <StatCard label="Upcoming Appointments" value={String(relatedAppointments.filter((a) => a.status === "Confirmed" || a.status === "Waiting").length)} />
            <StatCard label="Active Patients" value={String(relatedCouples.length)} />
            <StatCard label="Care Loop Patients" value={String(careLoopPatients)} />
            <StatCard
              label="Next Available Slot"
              value={doctor.status === "active" ? formatNextAvailable(doctor) : "—"}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-xl border p-4 sm:p-5">
              <h2 className="font-semibold">Professional summary</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {doctor.professionalBio || doctor.shortIntro || "No biography added yet."}
              </p>
              {doctor.clinicalInterests && (
                <p className="mt-3 text-sm">
                  <span className="font-medium">Clinical interests: </span>
                  {doctor.clinicalInterests}
                </p>
              )}
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="Specialty" value={doctor.primarySpecialty} />
                <Info label="Sub-specialties" value={doctor.subSpecialties.join(", ")} />
                <Info label="Experience" value={doctor.yearsExperience ? `${doctor.yearsExperience} years` : ""} />
                <Info label="Languages" value={doctor.languages.join(", ")} />
              </dl>
            </section>
            <section className="rounded-xl border p-4 sm:p-5">
              <h2 className="font-semibold">Expertise & services</h2>
              <TagList items={doctor.expertise} empty="No expertise tags" />
              <h3 className="mt-4 text-sm font-medium">Services</h3>
              <TagList items={doctor.services} empty="No services" />
              <h3 className="mt-4 text-sm font-medium">Linked treatments</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {relatedCycles.length} active/recent journey
                {relatedCycles.length === 1 ? "" : "s"} assigned to this doctor.
              </p>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="qualifications" className="pt-4">
          {doctor.qualifications.length === 0 ? (
            <EmptyState
              title="No qualifications added yet."
              description="Add degrees and fellowships from Edit Profile."
              action={
                canManage ? (
                  <Button asChild>
                    <Link href={`/doctors/${doctor.id}/edit`}>+ Add Qualification</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {doctor.qualifications.map((q) => (
                <article key={q.id} className="rounded-xl border p-4">
                  <p className="font-semibold">
                    {q.degree}
                    {q.specialization ? ` – ${q.specialization}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {q.institution}
                    {q.university ? ` · ${q.university}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[q.location, q.startYear && q.endYear ? `${q.startYear}–${q.endYear}` : q.endYear]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {q.description && <p className="mt-2 text-sm">{q.description}</p>}
                </article>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="experience" className="pt-4">
          {doctor.experience.length === 0 ? (
            <EmptyState
              title="No experience added yet."
              description="Add hospital and clinic roles from Edit Profile."
            />
          ) : (
            <div className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-border">
              {doctor.experience.map((exp) => (
                <div key={exp.id} className="relative pl-8">
                  <span className="absolute top-3 left-0 size-6 rounded-full border-4 border-background bg-primary" />
                  <article className="rounded-xl border p-4">
                    <p className="font-semibold">{exp.position}</p>
                    <p className="text-sm text-muted-foreground">
                      {exp.organization}
                      {exp.department ? ` · ${exp.department}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {exp.startDate || "—"} –{" "}
                      {exp.currentlyWorking ? "Present" : exp.endDate || "—"}
                    </p>
                    {exp.description && <p className="mt-2 text-sm">{exp.description}</p>}
                    {exp.responsibilities && (
                      <p className="mt-1 text-sm text-muted-foreground">{exp.responsibilities}</p>
                    )}
                  </article>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expertise" className="space-y-4 pt-4">
          <section className="rounded-xl border p-4">
            <h2 className="font-semibold">Specialties</h2>
            <TagList
              items={[doctor.primarySpecialty, ...doctor.subSpecialties].filter(Boolean)}
              empty="No specialties"
            />
          </section>
          <section className="rounded-xl border p-4">
            <h2 className="font-semibold">Areas of expertise</h2>
            <TagList items={doctor.expertise} empty="No expertise" />
          </section>
          <section className="rounded-xl border p-4">
            <h2 className="font-semibold">Procedures</h2>
            <TagList items={doctor.procedures} empty="No procedures" />
          </section>
          <section className="rounded-xl border p-4">
            <h2 className="font-semibold">Services</h2>
            <TagList items={doctor.services} empty="No services" />
          </section>
          <section className="rounded-xl border p-4">
            <h2 className="font-semibold">Languages</h2>
            <TagList items={doctor.languages} empty="No languages" />
          </section>
          {canManage && (
            <Button asChild variant="outline">
              <Link href={`/doctors/${doctor.id}/edit`}>Edit expertise & services</Link>
            </Button>
          )}
        </TabsContent>

        <TabsContent value="availability" className="pt-4">
          {canManage ? (
            <DoctorAvailabilityPanel doctor={doctor} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Next available: {formatNextAvailable(doctor)}
            </p>
          )}
        </TabsContent>

        <TabsContent value="appointments" className="pt-4">
          {relatedAppointments.length === 0 ? (
            <EmptyState
              title="No appointments linked"
              description="Appointments assigned to this doctor will appear here."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/35 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th className="px-4 py-2.5 font-medium">Time</th>
                    <th className="px-3 py-2.5 font-medium">Patient / Couple</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-3 py-2.5 font-medium">Location</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedAppointments.map((appt) => {
                    const couple = couples.find((c) => c.id === appt.coupleId);
                    return (
                      <tr key={appt.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{appt.time}</td>
                        <td className="px-3 py-3">
                          {couple ? (
                            <Link href={`/patients/${couple.slug}`} className="hover:text-primary">
                              {coupleLabel(couple)}
                            </Link>
                          ) : (
                            appt.coupleId
                          )}
                          {couple && (
                            <p className="text-xs text-muted-foreground">
                              {couple.treatment} · Care Loop {couple.careLoop}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3">{appt.type}</td>
                        <td className="px-3 py-3">{appt.room}</td>
                        <td className="px-3 py-3">
                          <StatusBadge label={appt.status} tone={appointmentTone[appt.status] ?? "muted"} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="pt-4">
          {doctor.documents.length === 0 ? (
            <EmptyState
              title="No documents"
              description="Upload registration and certificates from Edit Profile."
            />
          ) : (
            <ul className="divide-y rounded-xl border">
              {doctor.documents.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOCUMENT_KIND_LABELS[doc.kind]} ·{" "}
                      {new Date(doc.uploadedAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {doc.dataUrl && (
                      <Button asChild size="sm" variant="outline">
                        <a href={doc.dataUrl} download={doc.name}>
                          Download
                        </a>
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (!confirm("Are you sure you want to delete this record?")) return;
                          doctorsStore.removeDocument(doctor.id, doc.id);
                          toast.success("Document removed.");
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="activity" className="pt-4">
          <ul className="space-y-2">
            {doctor.activity.map((item) => (
              <li key={item.id} className="rounded-xl border px-4 py-3 text-sm">
                <p className="font-medium">{item.message}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.at).toLocaleString("en-IN")}
                </p>
              </li>
            ))}
            {doctor.leaves.map((leave) => (
              <li key={`leave-${leave.id}`} className="rounded-xl border px-4 py-3 text-sm">
                <p className="font-medium">
                  {LEAVE_TYPE_LABELS[leave.type]} · {leave.date}
                  {leave.endDate ? ` to ${leave.endDate}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">{leave.reason}</p>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      <LeaveDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        doctor={doctor}
        appointments={appointments}
      />
      <DeactivateDoctorDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        doctor={doctor}
        onConfirm={() => {
          doctorsStore.setStatus(doctor.id, "inactive");
          toast.success(`${name} deactivated.`);
        }}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tracking-tight sm:text-base">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value || "—"}</dd>
    </div>
  );
}

function TagList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="mt-2 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary"
        >
          {item}
        </span>
      ))}
    </div>
  );
}
