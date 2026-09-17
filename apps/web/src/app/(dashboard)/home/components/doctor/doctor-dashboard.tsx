"use client";

import { createContext, useContext, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useAppState, type AppAppointment } from "@/lib/app-state";
import { DoctorLeftSidebar } from "./doctor-left-sidebar";
import { DoctorMainOverview } from "./doctor-main-overview";
import { DoctorRightSidebar } from "./doctor-right-sidebar";
import { AppointmentsTimeline } from "./doctor-appointments-timeline";

/** Strip leading "Dr."/"Dr" prefix from a name string (case-insensitive). */
export function stripDrPrefix(name: string): string {
  return name.replace(/^(?:Dr\.?|DR)\s+/i, "").replace(/^(?:Dr\.?|DR)\s+/i, "").trim();
}

/** Fuzzy match: does one cleaned name contain the other? */
function nameMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ca = a.toLowerCase();
  const cb = b.toLowerCase();
  return ca.includes(cb) || cb.includes(ca);
}

const DoctorAppointmentsCtx = createContext<AppAppointment[]>([]);

/** Returns only the appointments that belong to the currently logged-in doctor. */
export function useDoctorAppointments(): AppAppointment[] {
  return useContext(DoctorAppointmentsCtx);
}

function DoctorAppointmentsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { appointments } = useAppState();

  const doctorAppointments = useMemo(() => {
    const rawName = session?.user?.name ?? "";
    if (!rawName) return appointments;
    const cleanDocName = stripDrPrefix(rawName).toLowerCase();
    if (!cleanDocName) return appointments;
    return appointments.filter((a) => {
      if (!a.doctor) return false;
      const cleanApptDoc = stripDrPrefix(a.doctor).toLowerCase();
      return nameMatch(cleanDocName, cleanApptDoc);
    });
  }, [appointments, session?.user?.name]);

  return (
    <DoctorAppointmentsCtx.Provider value={doctorAppointments}>
      {children}
    </DoctorAppointmentsCtx.Provider>
  );
}

export function DoctorDashboard() {
  return (
    <DoctorAppointmentsProvider>
      <div className="flex flex-col gap-2 lg:gap-3 2xl:gap-4 h-full">
        {/* Top Main Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 lg:gap-3 2xl:gap-4 flex-1">
          {/* Left: 3 Boxes */}
          <div className="md:col-span-3 xl:col-span-2 h-full lg:pr-10">
            <DoctorLeftSidebar />
          </div>

          {/* Middle: Main Content (Dr. Greeting, Active Journeys & Appointments Orbit) */}
          <div className="md:col-span-5 xl:col-span-7 h-full">
            <DoctorMainOverview />
          </div>

          {/* Right: Actions, Voice Consultation & AI Prep */}
          <div className="md:col-span-4 xl:col-span-3 h-full lg:pl-10">
            <DoctorRightSidebar />
          </div>
        </div>

        {/* Bottom Section: Appointments Timeline */}
        <div className="pt-2 shrink-0">
          <AppointmentsTimeline />
        </div>
      </div>
    </DoctorAppointmentsProvider>
  );
}
