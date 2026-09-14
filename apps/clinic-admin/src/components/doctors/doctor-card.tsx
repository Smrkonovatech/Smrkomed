"use client";

import Link from "next/link";
import {
  CalendarClock,
  MoreHorizontal,
  Pencil,
  CalendarOff,
  Eye,
  UserX,
  CalendarDays,
} from "lucide-react";

import { Avatar, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  displayNameOf,
  formatNextAvailable,
  initialsOf,
  type DoctorProfile,
  DOCTOR_STATUS_LABELS,
} from "@/lib/doctors";
import type { Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

function statusTone(status: DoctorProfile["status"]): Tone {
  if (status === "active") return "success";
  if (status === "on_leave") return "warning";
  return "muted";
}

export function DoctorStatusBadge({ status }: { status: DoctorProfile["status"] }) {
  return <StatusBadge label={DOCTOR_STATUS_LABELS[status]} tone={statusTone(status)} />;
}

export function DoctorPhoto({
  doctor,
  className,
  size = "md",
}: {
  doctor: DoctorProfile;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClass =
    size === "sm"
      ? "size-10 text-xs"
      : size === "lg"
        ? "size-16 text-lg"
        : size === "xl"
          ? "size-24 text-2xl"
          : "size-12 text-sm";

  if (doctor.photoDataUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={doctor.photoDataUrl}
        alt={displayNameOf(doctor)}
        className={cn("shrink-0 rounded-full object-cover", sizeClass, className)}
      />
    );
  }

  return (
    <Avatar
      initials={initialsOf(doctor)}
      tone="primary"
      className={cn(sizeClass, "rounded-full", className)}
    />
  );
}

export function DoctorCard({
  doctor,
  appointmentsToday,
  onDeactivate,
  onAddLeave,
}: {
  doctor: DoctorProfile;
  appointmentsToday: number;
  onDeactivate: () => void;
  onAddLeave: () => void;
}) {
  const name = displayNameOf(doctor);
  return (
    <article className="surface-card hover-lift flex flex-col gap-4 p-4">
      <div className="flex items-start gap-3">
        <DoctorPhoto doctor={doctor} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/doctors/${doctor.id}`} className="truncate font-semibold hover:text-primary">
                {name}
              </Link>
              <p className="truncate text-sm text-muted-foreground">{doctor.designation}</p>
            </div>
            <DoctorActions
              doctor={doctor}
              onDeactivate={onDeactivate}
              onAddLeave={onAddLeave}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <DoctorStatusBadge status={doctor.status} />
            {doctor.isDraft && <StatusBadge label="Draft" tone="info" />}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Specialty</dt>
          <dd className="font-medium">{doctor.primarySpecialty || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Department</dt>
          <dd className="font-medium">{doctor.department || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Experience</dt>
          <dd className="font-medium">{doctor.yearsExperience ? `${doctor.yearsExperience} yrs` : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Today</dt>
          <dd className="font-medium">{appointmentsToday} appt{appointmentsToday === 1 ? "" : "s"}</dd>
        </div>
      </dl>

      {doctor.expertise.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {doctor.expertise.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"
            >
              {tag}
            </span>
          ))}
          {doctor.expertise.length > 4 && (
            <span className="text-[11px] text-muted-foreground">+{doctor.expertise.length - 4}</span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-3.5" />
          {doctor.status === "active" ? formatNextAvailable(doctor) : "Unavailable"}
        </span>
        <span>{doctor.locationName}</span>
      </div>
    </article>
  );
}

export function DoctorActions({
  doctor,
  onDeactivate,
  onAddLeave,
}: {
  doctor: DoctorProfile;
  onDeactivate: () => void;
  onAddLeave: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Doctor actions">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/doctors/${doctor.id}`}>
            <Eye className="size-4" /> View Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/doctors/${doctor.id}/edit`}>
            <Pencil className="size-4" /> Edit Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/doctors/${doctor.id}?tab=availability`}>
            <CalendarDays className="size-4" /> Manage Availability
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/doctors/${doctor.id}?tab=appointments`}>
            <CalendarClock className="size-4" /> View Appointments
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddLeave}>
          <CalendarOff className="size-4" /> Add Leave
        </DropdownMenuItem>
        {doctor.status !== "inactive" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDeactivate}
            >
              <UserX className="size-4" /> Deactivate
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
