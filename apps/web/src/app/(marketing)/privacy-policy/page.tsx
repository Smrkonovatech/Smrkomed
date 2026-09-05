import type { Metadata } from "next";
import Link from "next/link";

import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Closing";
import { Eyebrow } from "@/components/landing/primitives";

export const metadata: Metadata = {
  title: {
    absolute: "Privacy Policy | SMRKOMED",
  },
  description:
    "Read the SMRKOMED Privacy Policy covering healthcare data, communications, security, privacy requests and information handling.",
  alternates: {
    canonical: "https://www.smrkomed.com/privacy-policy",
  },
  openGraph: {
    title: "Privacy Policy | SMRKOMED",
    description:
      "Read the SMRKOMED Privacy Policy covering healthcare data, communications, security, privacy requests and information handling.",
    url: "https://www.smrkomed.com/privacy-policy",
    siteName: "SMRKOMED",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | SMRKOMED",
    description:
      "Read the SMRKOMED Privacy Policy covering healthcare data, communications, security, privacy requests and information handling.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Nav />

      <main className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12 text-center md:text-left">
          <Eyebrow>Legal Information &amp; Data Governance</Eyebrow>
          <h1 className="mt-4 text-3xl font-light tracking-tight text-foreground sm:text-4xl md:text-5xl">
            SMRKOMED <span className="font-semibold">Privacy Policy</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            How information is processed, protected, and managed across the SMRKOMED healthcare technology platform.
          </p>
          <p className="mt-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Effective Date: September 2026
          </p>
        </div>

        {/* Policy Body */}
        <div className="space-y-12 rounded-3xl border border-border bg-card/60 p-8 shadow-sm backdrop-blur-sm sm:p-12">
          {/* 1. Introduction */}
          <section id="introduction" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              1. Introduction
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              <strong>SMRKOMED</strong> is a modular healthcare technology platform developed and operated by{" "}
              <strong>Smrkonova Softech Solutions LLP</strong> (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;). The platform supports healthcare organizations with patient management, appointments, care coordination, workflows, communication, documentation and related healthcare operations.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              This Privacy Policy explains how information may be collected, processed, stored, protected, used and deleted when users interact with SMRKOMED or when healthcare organizations use the platform.
            </p>
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-foreground">
              <strong className="font-semibold">Healthcare Organization Responsibilities:</strong> Healthcare organizations using SMRKOMED are responsible for the patient and clinical information they enter or manage through the platform and may have independent obligations regarding that information under applicable law.
            </div>
          </section>

          {/* 2. Information We May Process */}
          <section id="information-we-may-process" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              2. Information We May Process
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              SMRKOMED does not collect every category of information from every user. Depending on the modules, configuration and integrations used, SMRKOMED may process:
            </p>
            <ul className="list-disc space-y-2.5 pl-6 text-sm text-muted-foreground sm:text-base">
              <li>
                <strong className="text-foreground">Account and Identity Information:</strong> Login credentials, staff usernames, roles, and administrative contact details.
              </li>
              <li>
                <strong className="text-foreground">Staff/User Information:</strong> Professional designations, staff profiles, and authorization roles.
              </li>
              <li>
                <strong className="text-foreground">Organization and Clinic Information:</strong> Healthcare facility profiles, branch locations, operating schedules, and organizational settings.
              </li>
              <li>
                <strong className="text-foreground">Patient and Couple Demographics:</strong> Patient names, dates of birth, genders, partner linkages (where relevant to fertility or couple care pathways), and emergency contacts as entered by the clinic.
              </li>
              <li>
                <strong className="text-foreground">Contact Information:</strong> Phone numbers, email addresses, and communication addresses.
              </li>
              <li>
                <strong className="text-foreground">Appointment and Scheduling Information:</strong> Scheduled visit dates, consultation types, assigned doctors or specialists, and attendance status.
              </li>
              <li>
                <strong className="text-foreground">Care Plans, Treatment Journeys and Tasks:</strong> Care protocols, journey milestones, task tracking, follow-up reminders, and care coordination steps.
              </li>
              <li>
                <strong className="text-foreground">Clinical Documents and Reports:</strong> Diagnostic reports, imaging attachments, test findings, and clinical documentation uploaded by clinic personnel.
              </li>
              <li>
                <strong className="text-foreground">Medications and Prescription-Related Information:</strong> Prescribed medications, dosage instructions, frequency, and prescription schedules.
              </li>
              <li>
                <strong className="text-foreground">Communication Records:</strong> Operational message logs, patient reminders, and authorized correspondence.
              </li>
              <li>
                <strong className="text-foreground">WhatsApp Business Messages and Related Metadata:</strong> Inbound and outbound message text, delivery statuses, timestamps, and WhatsApp phone identifiers when WhatsApp integration is enabled.
              </li>
              <li>
                <strong className="text-foreground">Voice/Audio Information:</strong> Audio recordings or dictated speech notes where voice consultation or transcription features are enabled.
              </li>
              <li>
                <strong className="text-foreground">Billing/Invoicing Information:</strong> Fee amounts, invoice references, payment status records, and transaction receipts (payment card numbers or banking credentials are not stored by SMRKOMED).
              </li>
              <li>
                <strong className="text-foreground">Technical and Browser Information:</strong> IP addresses, browser types, device identifiers, and session tokens necessary to operate the platform securely.
              </li>
              <li>
                <strong className="text-foreground">Security and Audit Information:</strong> Activity logs, authentication timestamps, security events, and administrative access records.
              </li>
              <li>
                <strong className="text-foreground">Consent and Communication Preferences:</strong> Patient communication choices, consent statuses, and notification opt-ins.
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Note: SMRKOMED does not claim or require that all of these categories are collected or processed for every user or healthcare organization.
            </p>
          </section>

          {/* 3. How Information Is Used */}
          <section id="how-information-is-used" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              3. How Information Is Used
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Information processed through SMRKOMED may be used to:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground sm:text-base">
              <li>Provide and operate the SMRKOMED platform</li>
              <li>Manage patients and healthcare workflows</li>
              <li>Manage appointments</li>
              <li>Support care journeys and treatment plans</li>
              <li>Facilitate authorized communication</li>
              <li>Provide WhatsApp messaging functionality where enabled</li>
              <li>Support reminders and follow-ups</li>
              <li>Maintain documents and reports</li>
              <li>Provide operational dashboards and analytics</li>
              <li>Maintain security</li>
              <li>Detect unauthorized activity</li>
              <li>Troubleshoot technical problems</li>
              <li>Improve reliability and performance</li>
              <li>Maintain audit records</li>
              <li>Manage consent and privacy requests</li>
              <li>Comply with applicable legal, regulatory and contractual obligations</li>
            </ul>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm font-medium text-foreground">
              SMRKOMED does not sell personal information or healthcare data to data brokers or advertisers.
            </div>
          </section>

          {/* 4. Healthcare and Patient Data */}
          <section id="healthcare-and-patient-data" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              4. Healthcare and Patient Data
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              SMRKOMED is designed for healthcare environments where privacy and confidentiality are important:
            </p>
            <ul className="list-disc space-y-2.5 pl-6 text-sm text-muted-foreground sm:text-base">
              <li>
                <strong>Platform Role:</strong> SMRKOMED is a technology platform and not a medical practitioner. It does not replace doctors or other healthcare professionals.
              </li>
              <li>
                <strong>Clinical Responsibility:</strong> SMRKOMED does not independently determine diagnosis or treatment. Healthcare professionals remain responsible for clinical decisions.
              </li>
              <li>
                <strong>Access Controls:</strong> Access is controlled through authentication, role-based permissions and organization/clinic boundaries.
              </li>
              <li>
                <strong>Data Minimization:</strong> SMRKOMED is designed to minimize access to information according to the user&apos;s role and required workflow.
              </li>
            </ul>
          </section>

          {/* 5. WhatsApp Business Integration */}
          <section id="whatsapp-business-integration" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              5. WhatsApp Business Integration
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              SMRKOMED may integrate with Meta&apos;s WhatsApp Business Platform / WhatsApp Cloud API when a healthcare organization enables the integration.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              When this integration is active:
            </p>
            <ul className="list-disc space-y-2.5 pl-6 text-sm text-muted-foreground sm:text-base">
              <li>Incoming and outgoing WhatsApp messages may be processed by SMRKOMED.</li>
              <li>Message content, timestamps, phone identifiers and relevant delivery metadata may be processed.</li>
              <li>Messages may be associated with a patient, couple or contact within the relevant clinic where configured.</li>
              <li>WhatsApp data is processed to provide communication, inbox, reminders, follow-ups and related workflow functionality.</li>
              <li>The healthcare organization is responsible for using WhatsApp communication appropriately and obtaining any required consent or authorization.</li>
              <li>SMRKOMED does not use WhatsApp information for cross-clinic advertising or unrelated profiling.</li>
              <li>Meta/WhatsApp operates its own infrastructure and policies. Data processed directly by Meta is subject to Meta&apos;s own terms and privacy practices.</li>
              <li>SMRKOMED cannot control or delete data stored directly on Meta&apos;s infrastructure.</li>
            </ul>
          </section>

          {/* 6. AI and Automated Processing */}
          <section id="ai-and-automated-processing" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              6. AI and Automated Processing
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              SMRKOMED may provide optional AI-assisted features. Examples may include:
            </p>
            <ul className="list-disc space-y-1.5 pl-6 text-sm text-muted-foreground sm:text-base">
              <li>Summarization of consultation or visit notes</li>
              <li>Workflow assistance and administrative coordination</li>
              <li>Task extraction and milestone suggestions</li>
              <li>Administrative queries against clinic workflow materials</li>
              <li>Drafting follow-up content and patient reminders</li>
              <li>Processing relevant consultation information where enabled</li>
            </ul>
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-foreground">
              SMRKOMED is designed to limit AI processing to information relevant to the requested workflow or task.
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Please note the following operational parameters regarding AI functionality:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground sm:text-base">
              <li>AI is assistive.</li>
              <li>AI is not intended to independently diagnose medical conditions.</li>
              <li>AI is not intended to independently prescribe medication.</li>
              <li>AI does not replace professional clinical judgment.</li>
              <li>Human review may be required before AI-generated content is finalized or communicated.</li>
            </ul>
          </section>

          {/* 7. Voice and Audio */}
          <section id="voice-and-audio" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              7. Voice and Audio
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Where voice or consultation features are enabled, audio may be temporarily processed to generate transcription, summaries or workflow information. Retention and storage of audio may depend on the specific feature and configuration.
            </p>
          </section>

          {/* 8. Data Sharing and Disclosure */}
          <section id="data-sharing-and-disclosure" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              8. Data Sharing and Disclosure
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Information may be shared with:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground sm:text-base">
              <li>Authorized users within the healthcare organization</li>
              <li>Service providers required to operate the platform</li>
              <li>Cloud/database/infrastructure providers</li>
              <li>Integration providers when integrations are enabled</li>
              <li>Payment providers where applicable</li>
              <li>Healthcare/digital health integration providers where applicable</li>
              <li>Government authorities where legally required</li>
              <li>Other parties where appropriately authorized</li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Access is limited to information necessary for the relevant service or purpose where appropriate.
            </p>
          </section>

          {/* 9. Data Security */}
          <section id="data-security" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              9. Data Security
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              SMRKOMED implements technical and organizational safeguards designed to protect information against unauthorized access, alteration, disclosure or destruction.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Implemented security controls include:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground sm:text-base">
              <li>HTTPS/TLS encryption in transit</li>
              <li>Role-based access control</li>
              <li>Authentication/session controls</li>
              <li>Tenant and clinic-level data isolation</li>
              <li>Secure handling of integration credentials</li>
              <li>Encryption/security controls for sensitive integration secrets</li>
              <li>HMAC/signature validation for supported webhooks</li>
              <li>Audit logging</li>
              <li>Secure document handling</li>
              <li>Access controls</li>
              <li>Secrets management</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              No internet-based system or electronic storage mechanism can be guaranteed to be completely secure.
            </p>
          </section>

          {/* 10. Data Retention */}
          <section id="data-retention" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              10. Data Retention
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              The duration for which information is retained depends on:
            </p>
            <ul className="list-disc space-y-1.5 pl-6 text-sm text-muted-foreground sm:text-base">
              <li>Nature and sensitivity of information</li>
              <li>Healthcare organization&apos;s requirements</li>
              <li>Applicable legal/regulatory requirements</li>
              <li>Contractual obligations</li>
              <li>Accounting/tax requirements</li>
              <li>Security and audit requirements</li>
              <li>Product configuration</li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Certain healthcare, financial, contractual or security records may need to be retained where required by applicable law, regulatory requirements, contractual obligations or legitimate security purposes.
            </p>
          </section>

          {/* 11. Data Deletion */}
          <section id="data-deletion" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              11. Data Deletion
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Users may request deletion of applicable personal information processed by SMRKOMED. Deletion is subject to applicable legal requirements, healthcare record retention requirements, contractual requirements, accounting requirements, and security/audit requirements.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              For complete instructions on submitting a deletion request, please see our dedicated page:{" "}
              <Link
                href="/data-deletion"
                className="font-semibold text-primary underline underline-offset-4 hover:opacity-80"
              >
                Request Data Deletion
              </Link>.
            </p>
          </section>

          {/* 12. Data Access, Correction and Export */}
          <section id="data-access-correction-export" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              12. Data Access, Correction and Export
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Appropriate users and authorized clinic administrators may be able to access, correct or export information depending on their role and platform configuration.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Patients requesting access or correction to healthcare records may need to contact the healthcare organization that maintains their records, as the healthcare provider retains primary medical custody over the clinical record.
            </p>
          </section>

          {/* 13. Cookies and Technical Information */}
          <section id="cookies-and-technical-information" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              13. Cookies and Technical Information
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              SMRKOMED utilizes essential cookies and session mechanisms along with technical logs required to operate, authenticate, and secure the platform. We do not use third-party advertising cookies or cross-site behavioral tracking pixels.
            </p>
          </section>

          {/* 14. Third-Party Services and Integrations */}
          <section id="third-party-services-and-integrations" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              14. Third-Party Services and Integrations
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              SMRKOMED may integrate with external services, including:
            </p>
            <ul className="list-disc space-y-1.5 pl-6 text-sm text-muted-foreground sm:text-base">
              <li>Meta WhatsApp Business Platform</li>
              <li>Payment services</li>
              <li>ABDM/ABHA-related services</li>
              <li>Other healthcare integrations</li>
            </ul>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              When a third-party integration is enabled, the third party may process information under its own terms and privacy policies. SMRKOMED does not control third-party infrastructure or data retention practices.
            </p>
          </section>

          {/* 15. Children and Minors */}
          <section id="children-and-minors" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              15. Children and Minors
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Healthcare organizations using SMRKOMED may process information relating to minors where relevant to their healthcare services. Such organizations are responsible for handling information relating to minors in accordance with applicable law and their professional obligations.
            </p>
          </section>

          {/* 16. Privacy Requests and Grievances */}
          <section id="privacy-requests-and-grievances" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              16. Privacy Requests and Grievances
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Users may contact SMRKOMED regarding applicable:
            </p>
            <ul className="list-disc space-y-1 pl-6 text-sm text-muted-foreground sm:text-base">
              <li>Privacy questions</li>
              <li>Access requests</li>
              <li>Correction requests</li>
              <li>Deletion requests</li>
              <li>Data-related concerns</li>
              <li>Grievances</li>
            </ul>
            <div className="rounded-2xl border border-border bg-secondary/20 p-5 text-sm leading-relaxed text-foreground">
              <p>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:support@smrkomed.com"
                  className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
                >
                  support@smrkomed.com
                </a>
              </p>
              <p className="mt-2">
                <strong>Phone:</strong>{" "}
                <a
                  href="tel:+918660717328"
                  className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
                >
                  +91 86607 17328
                </a>
              </p>
            </div>
          </section>

          {/* 17. Updates to This Policy */}
          <section id="updates-to-this-policy" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              17. Updates to This Policy
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              This Privacy Policy may be updated when the platform, integrations, legal requirements or data practices change.
            </p>
            <p className="text-xs font-medium text-muted-foreground">
              Last updated: September 2026
            </p>
          </section>

          {/* 18. Contact Information */}
          <section id="contact-information" className="space-y-4 border-t border-border pt-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              18. Contact Information
            </h2>
            <div className="space-y-2 rounded-2xl border border-border bg-secondary/20 p-6 text-sm leading-relaxed text-foreground">
              <p className="font-semibold text-foreground">SMRKONOVA SOFTECH SOLUTIONS LLP</p>
              <p><span className="text-muted-foreground">Platform:</span> SMRKOMED</p>
              <p><span className="text-muted-foreground">GSTIN:</span> 29AFDFS3527C1Z3</p>
              <p><span className="text-muted-foreground">CIN / LLP Identification:</span> ACD-6170</p>
              <p><span className="text-muted-foreground">PAN:</span> AFDFS3527C</p>
              <p>
                <span className="text-muted-foreground">Registered Address:</span>{" "}
                #5, Shibiram, Lohit Nagar, V.V Pura Layout, Nelamangala, Bangalore Rural, Nelamangala, Karnataka, India, 562123
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                <a
                  href="mailto:support@smrkomed.com"
                  className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
                >
                  support@smrkomed.com
                </a>
              </p>
              <p>
                <span className="text-muted-foreground">Phone:</span>{" "}
                <a
                  href="tel:+918660717328"
                  className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
                >
                  +91 86607 17328
                </a>
              </p>
              <p>
                <span className="text-muted-foreground">Website:</span>{" "}
                <a
                  href="https://www.smrkonova.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
                >
                  https://www.smrkonova.com/ ↗
                </a>
              </p>
              <p className="pt-2">
                <span className="text-muted-foreground">Data Deletion:</span>{" "}
                <Link
                  href="/data-deletion"
                  className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
                >
                  Request Data Deletion →
                </Link>
              </p>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
