"use client";

import Link from "next/link";
import { LayoutGrid, List, Plus, Search, Stethoscope } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DoctorCard, DoctorPhoto, DoctorStatusBadge } from "@/components/doctors/doctor-card";
import { DeactivateDoctorDialog, LeaveDialog } from "@/components/doctors/leave-dialog";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/lib/app-state";
import { clinics } from "@/lib/demo-data";
import {
  DEPARTMENTS,
  SPECIALTIES,
  dayHasAvailability,
  displayNameOf,
  doctorsStore,
  filterDoctors,
  formatNextAvailable,
  useDoctors,
  type DoctorProfile,
  type DoctorStatus,
} from "@/lib/doctors";
import { PERMISSIONS, roleHasPermission, type StaffRole } from "@/lib/permissions/rbac";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

export default function DoctorsPage() {
  const doctors = useDoctors();
  const { appointments } = useAppState();
  const { data: session } = useSession();
  const role = session?.user?.role as StaffRole | undefined;
  const canManage =
    !role || roleHasPermission(role, PERMISSIONS.USERS_MANAGE) || role === "CLINIC_ADMIN";

  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [department, setDepartment] = useState("all");
  const [location, setLocation] = useState("all");
  const [status, setStatus] = useState<DoctorStatus | "all">("all");
  const [availability, setAvailability] = useState<"all" | "today" | "unavailable">("all");
  const [view, setView] = useState<"cards" | "list">("cards");

  const [leaveDoctor, setLeaveDoctor] = useState<DoctorProfile | null>(null);
  const [deactivateDoctor, setDeactivateDoctor] = useState<DoctorProfile | null>(null);

  const today = useMemo(() => new Date(), []);

  const rows = useMemo(
    () =>
      filterDoctors(
        doctors,
        { q, specialty, department, location, status, availability },
        (d) => dayHasAvailability(d, today),
      ),
    [doctors, q, specialty, department, location, status, availability, today],
  );

  function appointmentsTodayCount(doctor: DoctorProfile) {
    const name = displayNameOf(doctor);
    return appointments.filter(
      (a) => a.doctor === name || a.doctor.includes(doctor.lastName),
    ).length;
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Doctors"
        subtitle="Manage your clinic's doctors, specialties, expertise and availability."
        actions={
          canManage ? (
            <Button asChild className="rounded-lg">
              <Link href="/doctors/new">
                <Plus className="size-4" /> Add Doctor
              </Link>
            </Button>
          ) : undefined
        }
      />

      <section className="mb-4 rounded-xl border bg-card p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, specialty, department, registration…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterSelect
              value={specialty}
              onChange={setSpecialty}
              options={[["all", "All specialties"], ...SPECIALTIES.map((s) => [s, s] as const)]}
            />
            <FilterSelect
              value={department}
              onChange={setDepartment}
              options={[["all", "All departments"], ...DEPARTMENTS.map((s) => [s, s] as const)]}
            />
            <FilterSelect
              value={location}
              onChange={setLocation}
              options={[
                ["all", "All locations"],
                ...clinics.map((c) => [c.id, c.city] as const),
              ]}
            />
            <FilterSelect
              value={status}
              onChange={(v) => setStatus(v as DoctorStatus | "all")}
              options={[
                ["all", "All statuses"],
                ["active", "Active"],
                ["inactive", "Inactive"],
                ["on_leave", "On Leave"],
              ]}
            />
            <FilterSelect
              value={availability}
              onChange={(v) => setAvailability(v as "all" | "today" | "unavailable")}
              options={[
                ["all", "Any availability"],
                ["today", "Available today"],
                ["unavailable", "Unavailable today"],
              ]}
            />
            <div className="inline-flex rounded-lg border p-0.5">
              <button
                type="button"
                className={cn(
                  "rounded-md p-1.5",
                  view === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
                onClick={() => setView("cards")}
                aria-label="Card view"
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-md p-1.5",
                  view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
                onClick={() => setView("list")}
                aria-label="List view"
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {rows.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title={doctors.length === 0 ? "No doctors yet" : "No doctors match your filters"}
          description={
            doctors.length === 0
              ? "Add your first doctor to start managing specialties, availability and appointments."
              : "Try adjusting search or filters."
          }
          action={
            canManage && doctors.length === 0 ? (
              <Button asChild>
                <Link href="/doctors/new">
                  <Plus className="size-4" /> Add Doctor
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              appointmentsToday={appointmentsTodayCount(doctor)}
              onDeactivate={() => setDeactivateDoctor(doctor)}
              onAddLeave={() => setLeaveDoctor(doctor)}
            />
          ))}
        </div>
      ) : (
        <>
          <MobileCards>
            {rows.map((doctor) => (
              <RecordCard key={doctor.id}>
                <Link href={`/doctors/${doctor.id}`} className="flex items-center gap-3">
                  <DoctorPhoto doctor={doctor} size="sm" />
                  <div className="min-w-0">
                    <p className="font-semibold">{displayNameOf(doctor)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {doctor.primarySpecialty} · {doctor.department}
                    </p>
                  </div>
                </Link>
              </RecordCard>
            ))}
          </MobileCards>
          <MdTableWrap>
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b bg-muted/35 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium">Doctor</th>
                  <th className="px-3 py-2.5 font-medium">Specialty</th>
                  <th className="px-3 py-2.5 font-medium">Department</th>
                  <th className="px-3 py-2.5 font-medium">Experience</th>
                  <th className="px-3 py-2.5 font-medium">Next slot</th>
                  <th className="px-3 py-2.5 font-medium">Today</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((doctor) => (
                  <tr key={doctor.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link href={`/doctors/${doctor.id}`} className="flex items-center gap-3">
                        <DoctorPhoto doctor={doctor} size="sm" />
                        <span>
                          <span className="block font-semibold">{displayNameOf(doctor)}</span>
                          <span className="text-xs text-muted-foreground">{doctor.designation}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">{doctor.primarySpecialty || "—"}</td>
                    <td className="px-3 py-3">{doctor.department || "—"}</td>
                    <td className="px-3 py-3">
                      {doctor.yearsExperience ? `${doctor.yearsExperience} yrs` : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {doctor.status === "active" ? formatNextAvailable(doctor) : "—"}
                    </td>
                    <td className="px-3 py-3">{appointmentsTodayCount(doctor)}</td>
                    <td className="px-3 py-3">
                      <DoctorStatusBadge status={doctor.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </MdTableWrap>
        </>
      )}

      {leaveDoctor && (
        <LeaveDialog
          open={Boolean(leaveDoctor)}
          onOpenChange={(open) => !open && setLeaveDoctor(null)}
          doctor={leaveDoctor}
          appointments={appointments}
        />
      )}
      {deactivateDoctor && (
        <DeactivateDoctorDialog
          open={Boolean(deactivateDoctor)}
          onOpenChange={(open) => !open && setDeactivateDoctor(null)}
          doctor={deactivateDoctor}
          onConfirm={() => {
            doctorsStore.setStatus(deactivateDoctor.id, "inactive");
            toast.success(`${displayNameOf(deactivateDoctor)} deactivated.`);
            setDeactivateDoctor(null);
          }}
        />
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <select
      className="h-9 rounded-md border bg-background px-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}
