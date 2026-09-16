"use client";

import { AdminLeftSidebar } from "./admin-left-sidebar";
import { AdminMainOverview } from "./admin-main-overview";
import { AdminRightSidebar } from "./admin-right-sidebar";
import { BottomAnalytics } from "./bottom-analytics";

export function ClinicAdminDashboard() {
  return (
    <div className="flex flex-col gap-2 lg:gap-3 2xl:gap-4 pb-24">
      {/* Top Main Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 lg:gap-3 2xl:gap-4 flex-1">
        {/* Left: 4 Boxes */}
        <div className="md:col-span-3 xl:col-span-2 h-full lg:pr-10">
          <AdminLeftSidebar />
        </div>

        {/* Middle: Main Dome Graphic */}
        <div className="md:col-span-5 xl:col-span-7 h-full">
          <AdminMainOverview />
        </div>

        {/* Right: Actions and Live Alerts */}
        <div className="md:col-span-4 xl:col-span-3 h-full lg:pl-10">
          <AdminRightSidebar />
        </div>
      </div>

      {/* Bottom Section: Analytics & Stats */}
      <div className="pt-3 shrink-0">
        <BottomAnalytics />
      </div>
    </div>
  );
}
