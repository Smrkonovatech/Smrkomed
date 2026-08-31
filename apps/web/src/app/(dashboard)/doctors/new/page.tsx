"use client";

import { DoctorWizard } from "@/components/doctors/doctor-wizard";
import { emptyDoctorDraft } from "@/lib/doctors";

export default function NewDoctorPage() {
  return <DoctorWizard initial={emptyDoctorDraft()} mode="create" />;
}
