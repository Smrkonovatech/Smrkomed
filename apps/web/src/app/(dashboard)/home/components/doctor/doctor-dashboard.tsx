"use client";

import { DoctorLeftSidebar } from "./doctor-left-sidebar";
import { DoctorMainOverview } from "./doctor-main-overview";
import { DoctorRightSidebar } from "./doctor-right-sidebar";
import { AppointmentsTimeline } from "./doctor-appointments-timeline";

export function DoctorDashboard() {
  return (
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
  );
}
