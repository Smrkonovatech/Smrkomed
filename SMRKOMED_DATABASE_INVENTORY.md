# SMRKOMED Database Inventory

**Date:** 2026-08-28  
**Source:** `packages/database/prisma/schema.prisma`  
**Models:** 69 · **Migrations:** additive under `packages/database/prisma/migrations/`  
**Rule:** Do not `migrate reset` / delete production data.

---

## UI → API → Prisma map (major features)

| UI | API | Service / module | Prisma models |
|----|-----|------------------|---------------|
| Login | NextAuth | `lib/auth/auth.ts` | User, ClinicMembership, Role |
| Patients list / Add Couple | `/couples`, `/users/staff` | couples/service | Patient, Couple, Treatment, CarePlan, CareTask, Consent |
| Patient profile | couples + tabs | various | + Document, Appointment, Pharmacy*, Insurance*, Billing* |
| Care plans / Tasks | `/care-plans`, `/care-tasks` | care-loop | CarePlan, CarePlanStep, CareTask, TaskAssignment |
| Care Loop board | mostly local | — | Escalation, AutomationRule, TaskReminder (underused) |
| Appointments | `/appointments` | appointments | Appointment |
| Documents | `/documents` | documents | Document, DocumentCategory |
| Pharmacy | `/pharmacy/*` | pharmacy | Pharmacy* (11), MedicationReminder |
| Billing / Payments | `/payments/*` | payments | BillingInvoice*, BillingPayment, BillingRefund, PaymentGatewayConnection, PaymentWebhookEvent |
| Insurance | `/insurance/*` | insurance | Insurance* (8) |
| CRM | `/leads`, `/campaigns`, `/crm` | crm/leads | Lead, Campaign, LeadActivity |
| WhatsApp | `/integrations/whatsapp` | whatsapp | WhatsAppAccount, WhatsAppTemplate, Conversation, Message, Integration*, Consent |
| Voice / consult | `/api/voice/*` | voice | ConsultationNote, AIInteraction |
| Analytics page | demo-data (UI) | analytics/summary unused by UI | Patient, Appointment, CarePlan, CareTask, Lead counts |
| Audit / activity | `/activity` | activity | AuditLog |
| Notifications | various creates | — | Notification |
| Org modules | partial | — | OrganizationModule, Subscription |
| Branches | admin read | — | ClinicBranch |

---

## Entity audit table

| Entity | Model exists | Relations | Required fields (key) | Used by API | Used by UI | Issues |
|--------|--------------|-----------|----------------------|-------------|------------|--------|
| Organization | ✅ | Clinics, users via membership | name, slug | ✅ | 🟡 | — |
| Clinic | ✅ | Org, all tenant data | organizationId, slug | ✅ | ✅ | Primary tenant key |
| ClinicBranch | ✅ | Clinic | clinicId, name | 🟡 admin | 🔵 | Not used for patient data |
| User | ✅ | Memberships, assignments | email | ✅ | ✅ | — |
| Role / Permission | ✅ | M2M | key | ✅ seed | RBAC | — |
| ClinicMembership | ✅ | User↔Clinic↔Role | clinicId,userId,roleId | ✅ | ✅ | ACTIVE filter |
| Patient | ✅ | Couples, docs, pharmacy, insurance, billing | clinicId, names | ✅ | ✅ | — |
| Couple | ✅ | Patients, plans, tasks | clinicId, primaryPatientId, slug | ✅ | ✅ | Primary clinical unit |
| Treatment / IVFCycle / IUICycle | ✅ | Couple | kind, label | ✅ create | 🟡 | Fertility-first |
| CarePlanTemplate / Step | ✅ | — | — | 🟡 rare | ⚪ string labels in dialog | Underused |
| CarePlan / CarePlanStep | ✅ | Couple, tasks | clinicId, title | ✅ | ✅ | — |
| CareTask | ✅ | Assignments, reminders, pharmacy, insurance | title, status | ✅ | ✅ | — |
| TaskAssignment | ✅ | CareTask, User | — | ✅ | ✅ | — |
| TaskReminder | ✅ | CareTask | — | ⛔ app logic | ⚪ | Seed only |
| Escalation | ✅ | CareTask/Couple | — | ⛔ board API | ⚪ seed UI | P0 gap |
| AutomationRule | ✅ | Clinic | — | ⛔ | ⚪ settings local | P0 gap |
| Appointment | ✅ | Couple, User? | when, status | ✅ | 🟡 | Remind stub |
| ConsultationNote | ✅ | Couple | summary text | ✅ voice | ✅ | No audio blob |
| Document / Category | ✅ | Patient/Couple | name, status | 🟡 metadata | 🟡 | No storageKey write |
| Consent | ✅ | Patient | type, status | ✅ couple create | 🟡 | Consent asymmetry WhatsApp |
| Conversation / Message | ✅ | Patient | channel | ✅ WhatsApp | ✅ | — |
| AIInteraction | ✅ | — | — | 🟡 | AI | — |
| Notification | ✅ | User | title | ✅ | 🟡 | — |
| AuditLog | ✅ | Org/Clinic/Actor | action | ✅ | Activity | — |
| Integration* | ✅ | Clinic | encryptedCredentials | ✅ | WhatsApp | AES-GCM |
| WhatsAppAccount / Template | ✅ | Clinic | — | ✅ | ✅ | Meta |
| Lead / Campaign / LeadActivity | ✅ | Org/Clinic | — | ✅ | ✅ CRM | — |
| StaffInvite | ✅ | — | — | 🟡 | 🔵 | — |
| Subscription / OrganizationModule | ✅ | Org | — | 🟡 | 🔵 | Module nav incomplete |
| Pharmacy* (11) | ✅ | Clinic, Patient, CareTask? | — | ✅ | ✅ | Rx→task link weak |
| MedicationReminder | ✅ | Patient, CareTask? | demoMode | ✅ | ✅ | Always demo |
| Insurance* (8) | ✅ | Clinic, Patient, Document, CareTask | Manual mode | ✅ | ✅ | No NHCX |
| PaymentGatewayConnection | ✅ | Clinic | encryptedCredentials | ✅ | Settings | Per-clinic |
| BillingInvoice / Line | ✅ | Patient, PharmacySale? | invoiceNumber | ✅ | Billing | — |
| BillingPayment / Refund | ✅ | Invoice, Gateway | status enum | ✅ | Payments | — |
| PaymentWebhookEvent | ✅ | Payment? | provider+externalEventId unique | ✅ webhooks | — | Idempotent |

---

## Status enums (payments / claims) — CODE VERIFIED

**BillingPaymentStatus:** PENDING, PROCESSING, SUCCESS, FAILED, CANCELLED, REFUNDED, PARTIALLY_REFUNDED  

**BillingInvoiceStatus:** DRAFT, ISSUED, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED  

**InsuranceClaimStatus:** DRAFT → … → CLOSED (manual workflow)

---

## Migration posture

| Item | Finding |
|------|---------|
| Approach | Additive SQL migrations |
| Recent domains | Pharmacy, medication reminders, insurance, payments |
| Forbidden | `prisma migrate reset`, destructive prod pushes |
| Recommendation | Only migrate when a P0 requires a real schema change (e.g. document storage metadata already exists — may need no migration for S3 key usage) |

---

## Gaps that are **not** schema problems

1. Escalation/TaskReminder models exist — **missing services/UI wiring**.  
2. Document.storageKey exists — **missing upload pipeline**.  
3. CarePlanTemplate exists — **Add Couple uses string labels**.  
4. Analytics needs **no new models** — wire UI to counts.  
5. ABDM — **no models** (correct until real integration).
