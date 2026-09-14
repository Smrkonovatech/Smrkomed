# Smart Discharge: Future Backend Requirements

This document outlines the future data models, integration points, and API surfaces required to support the Smart Discharge module in production. **No backend implementation exists in the current iteration.**

## 1. Discharge Entity & Schema
A new core entity is required to represent a discharge event, linked to a specific patient, cycle/encounter, and attending physician.

```prisma
model Discharge {
  id                  String   @id @default(cuid())
  patientId           String
  encounterId         String?
  doctorId            String
  
  // Operational Estimates
  estimatedDischarge  DateTime?
  
  // States
  status              DischargeStatus @default(PREPARING)
  readinessScore      Float    @default(0.0) // Operational readiness %
  
  // Clearances
  clinicalClearance   ClearanceStatus @default(PENDING)
  billingClearance    ClearanceStatus @default(PENDING)
  insuranceClearance  ClearanceStatus @default(PENDING)
  pharmacyClearance   ClearanceStatus @default(PENDING)
  
  // Final Review
  doctorApprovedAt    DateTime?
  dischargedAt        DateTime?
  
  // Audit Trail
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

enum DischargeStatus {
  PREPARING
  READY_FOR_REVIEW
  BLOCKED
  DOCTOR_APPROVED
  COMPLETED
}

enum ClearanceStatus {
  NOT_APPLICABLE
  PENDING
  BLOCKED
  CLEARED
}
```

## 2. Blockers & Checklist Requirements
A flexible system is needed to evaluate operational blockers programmatically.
- **Rules Engine**: Rules to evaluate whether a clearance is "blocked" (e.g., `if (billing.outstandingAmount > 0) return BLOCKED`).
- **Blocker Registry**: A log of active blockers linked to a discharge entity, recording the reason, responsible role, and status.

## 3. Discharge Summary & AI Metadata
The AI-generated draft summary must be stored distinctly from the final, doctor-approved document.
- **Draft Versioning**: Store iterations of the AI summary.
- **Source References**: Maintain a relational mapping of which source records (consultation ID, lab result ID) contributed to which section of the summary for traceability.
- **Audit Logging**: Track when the doctor edits the AI draft and explicitly logs the final "Approve & Sign" action.

## 4. Integration Points with Existing Modules
The discharge backend will act as a subscriber/coordinator to existing modules:
- **Billing API**: Poll or receive webhooks on invoice payment to auto-clear the `billingClearance` flag.
- **Insurance API (NHCX)**: Monitor claim pre-authorizations and final settlements.
- **Pharmacy API**: Check if the associated discharge prescription has been dispensed.
- **Appointments API**: Verify if the required post-discharge follow-up appointment has been scheduled.
- **Document Store**: Generate and store the finalized PDF Discharge Summary in the patient's existing PHR/document vault.

## 5. Security & Authentication
- **RBAC Enforcement**: Only users with specific roles (Admin/Billing/Pharmacy) can clear operational blockers.
- **Clinical Authority**: The final `approveAndSign` API endpoint must strictly validate that the caller is the assigned Doctor (or an authorized delegate).
