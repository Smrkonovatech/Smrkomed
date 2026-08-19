# SmrkoMed CRM + Lead Engine

Fertility clinic CRM for the journey from enquiry to active patient. It does **not** replace clinical records, IVF cycle management, embryology, billing, or Care Loop automation.

## Pipeline

Internal stage enum vs UI label:

| Enum | Label |
| --- | --- |
| NEW_LEAD | New Lead |
| CONTACTED | Contacted |
| QUALIFIED | Qualified |
| CONSULTATION_BOOKED | Consultation Booked |
| CONSULTATION_COMPLETED | Consultation Completed |
| INVESTIGATION | Investigation |
| TREATMENT_DISCUSSION | Treatment Discussion |
| TREATMENT_STARTED | Treatment Started |
| ACTIVE_PATIENT | Active Patient |
| LOST | Lost |

Lifecycle `status` is separate: `NEW`, `OPEN`, `CONVERTED`, `LOST`, `ARCHIVED`.

Stages do not auto-advance because a WhatsApp message was sent. Appointment booked may suggest Consultation Booked only when that appointment is a consultation linked to the lead, and staff still confirm the stage unless an explicit mapped rule is used.

Allowed forward transitions are sequential, with admin override audited. Any active stage can move to Lost.

## Sources

Centralized `LeadSource` enum. API aliases: `META` → `META_ADS`, `GOOGLE` → `GOOGLE_ADS`.

Website, WhatsApp, Instagram, Facebook, Google/Meta ads, phone, walk-in, referral, organic, campaign, other.

UTM fields on website ingest are analytics only. They never select a tenant.

## Campaigns

`Campaign` stores name, source, medium, dates, treatment focus, and status (`DRAFT` by default). No ad credentials or Meta/Google tokens. Those belong to Integration.

Metrics: leads, qualified, consultations booked/completed, treatment started, active, lost. No revenue and no ad spend.

## Assignment

Manual assignment and optional round-robin across counsellors / care coordinators in the same clinic. Target user must be an active member of the same organization (and clinic when the lead is clinic-scoped).

Counsellors can update assigned leads. Marketing and clinic admins can assign.

## Follow-up tasks

Reuse `CareTask` with `leadId` (couple is optional). Status `WAITING` is shown as Pending. Overdue follow-ups appear on the CRM dashboard. Overdue staff tasks do **not** message patients.

## Conversion

Lead is never deleted. Status becomes `CONVERTED`, stage `ACTIVE_PATIENT`, with `patientId` / `coupleId` and `convertedAt`. Matching uses phone and email, not name. If a patient already exists, conversion returns `EXISTING_PATIENT`.

## WhatsApp

Unknown inbound WhatsApp contacts create a **CRM lead**, never a Patient. Existing leads get a `WHATSAPP_RECEIVED` activity. Send WhatsApp from CRM goes through `WhatsAppMessagingService` and approved templates only.

## Future ads

`MetaLeadAdapter` and `GoogleLeadAdapter` return `501 NOT_IMPLEMENTED`. No Marketing API or Google Ads API in this phase.

## Scoring (0–100)

Engagement only — not medical.

- +15 recent enquiry (7 days)
- +10 follow-up scheduled
- +10 requested IVF
- +20 WhatsApp response
- +10 call connected
- +20 consultation booked
- +30 consultation completed

Bands: Cold 0–29, Warm 30–59, Hot 60–100.

## Conversion formulas

- Lead-to-qualified: qualified / total × 100
- Qualified-to-consultation: consultation booked / qualified × 100
- Consultation-to-treatment: treatment started / consultation completed × 100
- Lead-to-treatment: treatment started / total × 100

## Permissions

`leads:read|create|update|assign|archive|export`, `campaigns:read|manage`.

Platform admins use `/api/v1/admin/*` only for cross-org operational counts (lead/campaign totals), not patient-level CRM dumps.
