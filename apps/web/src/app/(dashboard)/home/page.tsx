import { LeftSidebar } from "./components/left-sidebar";
import { MainOverview } from "./components/main-overview";
import { RightSidebar } from "./components/right-sidebar";
import { AppointmentsTimeline } from "./components/appointments-timeline";

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-3 lg:gap-4 2xl:gap-6 p-3 lg:p-4 2xl:p-6 min-h-screen bg-gray-50/50">

      {/* Top Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 2xl:gap-6">

        {/* Left: 3 Boxes (3 cols out of 12 on lg, 2 on xl) */}
        <div className="lg:col-span-3 xl:col-span-2">
          <LeftSidebar />
        </div>

        {/* Middle: Main Content (5 cols out of 12 on lg, 7 on xl) */}
        <div className="lg:col-span-5 xl:col-span-7">
          <MainOverview />
        </div>

        {/* Right: Actions and Alerts (4 cols out of 12 on lg, 3 on xl) */}
        <div className="lg:col-span-4 xl:col-span-3">
          <RightSidebar />
        </div>
      </div>

      {/* Bottom Section: Appointments Timeline */}
      <AppointmentsTimeline />

    </div>
  );
}   