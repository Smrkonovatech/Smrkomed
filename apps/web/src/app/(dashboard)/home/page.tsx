import { LeftSidebar } from "./components/left-sidebar";
import { MainOverview } from "./components/main-overview";
import { RightSidebar } from "./components/right-sidebar";
import { AppointmentsTimeline } from "./components/appointments-timeline";

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-2 lg:gap-3 2xl:gap-4 h-full">

      {/* Top Main Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 lg:gap-3 2xl:gap-4 flex-1">

        {/* Left: 3 Boxes (3 cols out of 12 on md, 2 on xl) */}
        <div className="md:col-span-3 xl:col-span-2 h-full lg:pr-10">
          <LeftSidebar />
        </div>

        {/* Middle: Main Content (5 cols out of 12 on md, 7 on xl) */}
        <div className="md:col-span-5 xl:col-span-7 h-full">
          <MainOverview />
        </div>

        {/* Right: Actions and Alerts (4 cols out of 12 on md, 3 on xl) */}
        <div className="md:col-span-4 xl:col-span-3 h-full lg:pl-10">
          <RightSidebar />
        </div>
      </div>

      {/* Bottom Section: Appointments Timeline */}
      <div className="pt-2 shrink-0">
        <AppointmentsTimeline />
      </div>

    </div>
  );
}   