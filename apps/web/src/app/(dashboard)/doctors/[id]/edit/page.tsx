"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { DoctorWizard } from "@/components/doctors/doctor-wizard";
import { EmptyState } from "@/components/ui-kit";
import { clinicApi } from "@/lib/clinic-api";
import { doctorsStore, isMockDoctor, useDoctor } from "@/lib/doctors";

export default function EditDoctorPage() {
  const params = useParams<{ id: string }>();
  const doctor = useDoctor(params.id);
  const [loading, setLoading] = useState(!doctor);

  useEffect(() => {
    if (doctor) {
      setLoading(false);
    } else if (params.id) {
      const cleanId = params.id.replace(/^doc_/, "");
      clinicApi
        .getDoctor(cleanId)
        .then((doc) => {
          if (doc && !isMockDoctor(doc)) {
            doctorsStore.upsert(doc);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [doctor, params.id]);

  if (!doctor && loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">
          Loading doctor profile from database...
        </div>
      </div>
    );
  }

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
