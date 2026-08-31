"use client";

import { useMemo, useSyncExternalStore } from "react";

import { doctorsStore } from "./store";
import type { DoctorProfile, DoctorStatus } from "./types";

export function useDoctors() {
  const doctors = useSyncExternalStore(
    doctorsStore.subscribe,
    doctorsStore.getSnapshot,
    doctorsStore.getServerSnapshot,
  );
  return doctors;
}

export function useDoctor(id: string | undefined) {
  const doctors = useDoctors();
  return useMemo(() => (id ? doctors.find((d) => d.id === id) : undefined), [doctors, id]);
}

export type DoctorFilters = {
  q: string;
  specialty: string;
  department: string;
  location: string;
  status: DoctorStatus | "all";
  availability: "all" | "today" | "unavailable";
};

export function filterDoctors(
  doctors: DoctorProfile[],
  filters: DoctorFilters,
  isAvailableToday: (d: DoctorProfile) => boolean,
): DoctorProfile[] {
  const query = filters.q.trim().toLowerCase();
  return doctors.filter((d) => {
    if (query) {
      const hay = [
        d.displayName,
        d.firstName,
        d.lastName,
        d.primarySpecialty,
        d.department,
        d.registrationNumber,
        d.employeeId,
        d.email,
        d.designation,
        ...d.expertise,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(query)) return false;
    }
    if (filters.specialty !== "all" && d.primarySpecialty !== filters.specialty) return false;
    if (filters.department !== "all" && d.department !== filters.department) return false;
    if (filters.location !== "all" && d.locationId !== filters.location && d.locationName !== filters.location)
      return false;
    if (filters.status !== "all" && d.status !== filters.status) return false;
    if (filters.availability === "today" && !isAvailableToday(d)) return false;
    if (filters.availability === "unavailable" && isAvailableToday(d)) return false;
    return true;
  });
}
