"use client";

import { Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { DoctorDashboard } from "./components/doctor/doctor-dashboard";
import { ClinicAdminDashboard } from "./components/clinic-admin/clinic-admin-dashboard";

function DashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");

  const isDoctor =
    viewParam === "doctor"
      ? true
      : viewParam === "admin"
        ? false
        : session?.user?.role === "DOCTOR";

  if (isDoctor) {
    return <DoctorDashboard />;
  }

  return <ClinicAdminDashboard />;
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}