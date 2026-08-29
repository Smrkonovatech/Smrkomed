/**
 * SMRKOMED → interoperability DTO mapping layer.
 * This is NOT labelled as official ABDM-compliant FHIR.
 * It prepares structured clinic data for a future ABDM adapter.
 */

export type InteropResourceType =
  | "Patient"
  | "Encounter"
  | "Observation"
  | "Condition"
  | "Procedure"
  | "MedicationRequest"
  | "Medication"
  | "CarePlan"
  | "DocumentReference";

export type InteropBundle = {
  format: "SMRKOMED_INTEROP_V1";
  disclaimer:
    "Structured export from SMRKOMED operational data. Not claimed as ABDM-certified FHIR.";
  generatedAt: string;
  clinicId: string;
  patientId: string;
  resources: Array<{
    resourceType: InteropResourceType;
    id: string;
    display: string;
    sourceEntityType: string;
    sourceEntityId: string;
    occurredAt: string | null;
    data: Record<string, unknown>;
  }>;
};

export function buildInteropBundle(input: {
  clinicId: string;
  clinicName: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
    gender: string;
    phone: string | null;
  };
  appointments: Array<{
    id: string;
    type: string;
    startsAt: Date;
    status: string;
    doctorName: string | null;
  }>;
  consultations: Array<{
    id: string;
    createdAt: Date;
    reason: string | null;
    summary: string | null;
    nextSteps: string | null;
    authorName: string | null;
  }>;
  treatments: Array<{ id: string; label: string; kind: string; updatedAt: Date }>;
  carePlans: Array<{ id: string; type: string; status: string; updatedAt: Date }>;
  prescriptions: Array<{
    id: string;
    prescriptionDate: Date;
    status: string;
    doctorName: string | null;
    items: Array<{ medicineName: string; dosage: string | null; instructions: string | null }>;
  }>;
  documents: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: Date;
    storageKey: string | null;
  }>;
  recordTypes: string[];
  dateFrom?: Date | null;
  dateTo?: Date | null;
}): InteropBundle {
  const types = new Set(input.recordTypes.map((t) => t.toLowerCase()));
  const inRange = (d: Date) => {
    if (input.dateFrom && d < input.dateFrom) return false;
    if (input.dateTo && d > input.dateTo) return false;
    return true;
  };

  const resources: InteropBundle["resources"] = [];

  if (types.has("patient") || types.has("demographics") || types.size === 0) {
    resources.push({
      resourceType: "Patient",
      id: `patient-${input.patient.id}`,
      display: `${input.patient.firstName} ${input.patient.lastName}`.trim(),
      sourceEntityType: "Patient",
      sourceEntityId: input.patient.id,
      occurredAt: null,
      data: {
        name: `${input.patient.firstName} ${input.patient.lastName}`.trim(),
        gender: input.patient.gender,
        birthDate: input.patient.dateOfBirth?.toISOString().slice(0, 10) ?? null,
        phone: input.patient.phone,
        clinicName: input.clinicName,
      },
    });
  }

  if (types.has("encounter") || types.has("appointments") || types.has("consultation") || types.size === 0) {
    for (const a of input.appointments.filter((x) => inRange(x.startsAt))) {
      resources.push({
        resourceType: "Encounter",
        id: `encounter-${a.id}`,
        display: a.type,
        sourceEntityType: "Appointment",
        sourceEntityId: a.id,
        occurredAt: a.startsAt.toISOString(),
        data: {
          type: a.type,
          status: a.status,
          doctorName: a.doctorName,
        },
      });
    }
    for (const c of input.consultations.filter((x) => inRange(x.createdAt))) {
      resources.push({
        resourceType: "Encounter",
        id: `consult-${c.id}`,
        display: c.reason || "Consultation",
        sourceEntityType: "ConsultationNote",
        sourceEntityId: c.id,
        occurredAt: c.createdAt.toISOString(),
        data: {
          reason: c.reason,
          summary: c.summary,
          nextSteps: c.nextSteps,
          authorName: c.authorName,
        },
      });
    }
  }

  if (types.has("procedure") || types.has("treatment") || types.size === 0) {
    for (const t of input.treatments.filter((x) => inRange(x.updatedAt))) {
      resources.push({
        resourceType: "Procedure",
        id: `treatment-${t.id}`,
        display: t.label,
        sourceEntityType: "Treatment",
        sourceEntityId: t.id,
        occurredAt: t.updatedAt.toISOString(),
        data: { label: t.label, kind: t.kind },
      });
    }
  }

  if (types.has("careplan") || types.has("care_plan") || types.size === 0) {
    for (const p of input.carePlans.filter((x) => inRange(x.updatedAt))) {
      resources.push({
        resourceType: "CarePlan",
        id: `careplan-${p.id}`,
        display: p.type,
        sourceEntityType: "CarePlan",
        sourceEntityId: p.id,
        occurredAt: p.updatedAt.toISOString(),
        data: { type: p.type, status: p.status },
      });
    }
  }

  if (types.has("medicationrequest") || types.has("prescription") || types.has("medication") || types.size === 0) {
    for (const rx of input.prescriptions.filter((x) => inRange(x.prescriptionDate))) {
      resources.push({
        resourceType: "MedicationRequest",
        id: `rx-${rx.id}`,
        display: rx.items.map((i) => i.medicineName).join(", ") || "Prescription",
        sourceEntityType: "PharmacyPrescription",
        sourceEntityId: rx.id,
        occurredAt: rx.prescriptionDate.toISOString(),
        data: {
          status: rx.status,
          doctorName: rx.doctorName,
          items: rx.items,
        },
      });
      for (const item of rx.items) {
        resources.push({
          resourceType: "Medication",
          id: `med-${rx.id}-${item.medicineName}`,
          display: item.medicineName,
          sourceEntityType: "PharmacyPrescriptionItem",
          sourceEntityId: rx.id,
          occurredAt: rx.prescriptionDate.toISOString(),
          data: {
            medicineName: item.medicineName,
            dosage: item.dosage,
            instructions: item.instructions,
          },
        });
      }
    }
  }

  if (types.has("documentreference") || types.has("document") || types.size === 0) {
    for (const d of input.documents.filter((x) => inRange(x.createdAt))) {
      resources.push({
        resourceType: "DocumentReference",
        id: `doc-${d.id}`,
        display: d.name,
        sourceEntityType: "Document",
        sourceEntityId: d.id,
        occurredAt: d.createdAt.toISOString(),
        data: {
          name: d.name,
          status: d.status,
          storageConfigured: Boolean(d.storageKey),
          note: d.storageKey
            ? "Document metadata present."
            : "Document storage is not configured — metadata only.",
        },
      });
    }
  }

  return {
    format: "SMRKOMED_INTEROP_V1",
    disclaimer:
      "Structured export from SMRKOMED operational data. Not claimed as ABDM-certified FHIR.",
    generatedAt: new Date().toISOString(),
    clinicId: input.clinicId,
    patientId: input.patient.id,
    resources,
  };
}
