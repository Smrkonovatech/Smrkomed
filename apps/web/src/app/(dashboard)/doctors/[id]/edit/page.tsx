"use client";

import { useParams } from "next/navigation";

import { DoctorWizard } from "@/components/doctors/doctor-wizard";
import { EmptyState } from "@/components/ui-kit";
import { useDoctor } from "@/lib/doctors";

export default function EditDoctorPage() {
  const params = useParams<{ id: string }>();
  const doctor = useDoctor(params.id);

  if (!doctor) {
    return (
      <EmptyState
        title="Doctor not found"
        description="This doctor profile could not be loaded."
      />
    );
  }

  return <DoctorWizard initial={doctor} mode="edit" />;
}
