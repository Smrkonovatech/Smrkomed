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
  return name.replace(/^(?:Dr\.?|DR)\s*/i, "").replace(/^(?:Dr\.?|DR)\s*/i, "").trim();
}

/** Fuzzy match: does one cleaned name contain the other, or share the same primary name token? */
function nameMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ca = a.toLowerCase().trim();
  const cb = b.toLowerCase().trim();
  if (ca.includes(cb) || cb.includes(ca)) return true;
  const firstA = ca.split(/\s+/)[0];
  const firstB = cb.split(/\s+/)[0];
  if (firstA && firstB && firstA.length >= 3 && firstA === firstB) return true;
  return false;
}

function isDoctorMatch(doctorName: string, appointmentDoctor?: string, coupleDoctor?: string): boolean {
  if (!doctorName) return true;
  const cleanDoc = stripDrPrefix(doctorName).toLowerCase();
  if (!cleanDoc) return true;

  if (appointmentDoctor) {
    const cleanApptDoc = stripDrPrefix(appointmentDoctor).toLowerCase();
    if (nameMatch(cleanDoc, cleanApptDoc)) return true;
    // Generic labels in clinic belong to current attending doctor or assigned doctor
    if (cleanApptDoc === "doctor" || cleanApptDoc === "doctor / care team" || cleanApptDoc === "unassigned") {
      if (!coupleDoctor || nameMatch(cleanDoc, stripDrPrefix(coupleDoctor).toLowerCase())) {
        return true;
      }
    }
  } else if (coupleDoctor) {
    return nameMatch(cleanDoc, stripDrPrefix(coupleDoctor).toLowerCase());
  } else {
    return true;
  }
  return false;
}

const DoctorAppointmentsCtx = createContext<AppAppointment[]>([]);

/** Returns only the appointments that belong to the currently logged-in doctor. */
export function useDoctorAppointments(): AppAppointment[] {
  return useContext(DoctorAppointmentsCtx);
}

function DoctorAppointmentsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { appointments, couples } = useAppState();

  const doctorAppointments = useMemo(() => {
    const rawName = session?.user?.name ?? "";
    const coupleById = new Map((couples ?? []).map((c) => [c.id, c]));

    // 1. Filter by doctor / assigned couple
    const docFiltered = appointments.filter((a) => {
      const couple = a.coupleId ? coupleById.get(a.coupleId) : undefined;
      return isDoctorMatch(rawName, a.doctor, couple?.doctor);
    });

    // 2. Deduplicate: A couple appointment counts as 1 (never counted twice for both partners)
    const seen = new Set<string>();
    const deduplicated = docFiltered.filter((a) => {
      const normTime = (a.time || "").replace(/\s+/g, "").toLowerCase();
      const normDate = a.date || (a.startsAt ? a.startsAt.slice(0, 10) : "");
      const key = a.coupleId ? `c_${a.coupleId}_${normDate}_${normTime}` : a.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 3. Filter strictly for TODAY'S appointments (in Indian Standard Time)
    const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const todayList = deduplicated.filter((a) => {
      const apptDate = a.date || (a.startsAt ? a.startsAt.slice(0, 10) : "");
      return apptDate === todayStr;
    });

    return todayList;
  }, [appointments, couples, session?.user?.name]);

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
