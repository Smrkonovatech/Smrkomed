import type { Metadata } from "next";
import Link from "next/link";

import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Closing";
import { Eyebrow } from "@/components/landing/primitives";

export const metadata: Metadata = {
  title: {
    absolute: "Data Deletion Request | SMRKOMED",
  },
  description:
    "Learn how to request deletion of personal information processed by SMRKOMED, including information associated with supported healthcare and WhatsApp workflows.",
  alternates: {
    canonical: "https://www.smrkomed.com/data-deletion",
  },
  openGraph: {
    title: "Data Deletion Request | SMRKOMED",
    description:
      "Learn how to request deletion of personal information processed by SMRKOMED, including information associated with supported healthcare and WhatsApp workflows.",
    url: "https://www.smrkomed.com/data-deletion",
    siteName: "SMRKOMED",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Data Deletion Request | SMRKOMED",
    description:
      "Learn how to request deletion of personal information processed by SMRKOMED, including information associated with supported healthcare and WhatsApp workflows.",
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

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Nav />

      <main className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12 text-center md:text-left">
          <Eyebrow>User Data Governance &amp; Rights</Eyebrow>
          <h1 className="mt-4 text-3xl font-light tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Request <span className="font-semibold">Data Deletion</span>
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Learn how to request deletion of personal information processed by SMRKOMED.
          </p>
          <p className="mt-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
            Effective Date: September 2026
          </p>
        </div>

        {/* Top Contact Box */}
        <div className="mb-10 rounded-3xl border border-primary/20 bg-primary/5 p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Request Data Deletion
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Users can submit a deletion request using the following dedicated contact channels:
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/80 p-4">
              <span className="text-xs font-medium text-muted-foreground uppercase">Email Support</span>
              <p className="mt-1 text-base font-medium text-foreground">
                <a
                  href="mailto:support@smrkomed.com"
                  className="text-primary underline underline-offset-4 hover:opacity-80"
                >
                  support@smrkomed.com
                </a>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Suggested subject: <span className="font-medium text-foreground">Data Deletion Request</span>
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/80 p-4">
              <span className="text-xs font-medium text-muted-foreground uppercase">Phone Support</span>
              <p className="mt-1 text-base font-medium text-foreground">
                <a
                  href="tel:+918660717328"
                  className="text-primary underline underline-offset-4 hover:opacity-80"
                >
                  +91 86607 17328
                </a>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Mon–Sat during regular business hours (IST)
              </p>
            </div>
          </div>
        </div>

        {/* Content Box */}
        <div className="space-y-12 rounded-3xl border border-border bg-card/60 p-8 shadow-sm backdrop-blur-sm sm:p-12">
          {/* 1. Overview */}
          <section id="overview" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              1. Overview
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              SMRKOMED respects requests to delete personal information, subject to applicable legal, healthcare-record, contractual and security requirements.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              SMRKOMED is operated by <strong>Smrkonova Softech Solutions LLP</strong>. Where information is maintained by a clinic or healthcare organization using SMRKOMED, the clinic may need to participate in the verification and deletion process because it manages the relevant patient or healthcare record.
            </p>
          </section>

          {/* 2. How to Submit a Request */}
          <section id="how-to-submit" className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              2. How to Submit a Request
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Follow these structured steps to request deletion of personal information:
            </p>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4 rounded-2xl border border-border bg-background/50 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                  1
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Submit a request</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Email{" "}
                    <a
                      href="mailto:support@smrkomed.com"
                      className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
                    >
                      support@smrkomed.com
                    </a>{" "}
                    with the subject &ldquo;Data Deletion Request&rdquo;, or contact the relevant healthcare clinic directly.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 rounded-2xl border border-border bg-background/50 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                  2
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Provide identifying information</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    To help locate the relevant records, the requester may provide:
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    <li>Full name</li>
                    <li>Phone number / WhatsApp number where relevant</li>
                    <li>Email address where applicable</li>
                    <li>Clinic/healthcare organization name</li>
                    <li>Brief description of the information they want deleted</li>
                  </ul>
                  <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-foreground">
                    <strong>Important:</strong> Do not send passwords, payment credentials or unnecessary sensitive medical records in the initial request.
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 rounded-2xl border border-border bg-background/50 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                  3
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Verification</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Identity and authority may need to be verified before deletion is performed to prevent unauthorized deletion or tampering with healthcare accounts and records.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4 rounded-2xl border border-border bg-background/50 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                  4
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Review</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    SMRKOMED and/or the relevant healthcare organization reviews what information is eligible for deletion in accordance with applicable clinical and regulatory standards.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4 rounded-2xl border border-border bg-background/50 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                  5
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Deletion or anonymization</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Where deletion is permitted and the request is verified, SMRKOMED may delete or anonymize applicable personal data.
                  </p>
                </div>
              </div>

              {/* Step 6 */}
              <div className="flex gap-4 rounded-2xl border border-border bg-background/50 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                  6
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Retention requirements</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Certain healthcare, financial, contractual or security records may need to be retained where required by applicable law, regulatory requirements, contractual obligations or legitimate security purposes.
                  </p>
                </div>
              </div>

              {/* Step 7 */}
              <div className="flex gap-4 rounded-2xl border border-border bg-background/50 p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                  7
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">Confirmation</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The requester may be informed of the outcome where appropriate once the review and authorized actions are completed.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. WhatsApp / Meta-Related Data */}
          <section id="whatsapp-meta-data" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              3. WhatsApp / Meta-Related Data
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              If a user interacted with a healthcare provider through a SMRKOMED-connected WhatsApp Business account, the relevant message information and conversation metadata processed by SMRKOMED may be included in a deletion request.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/50 p-5">
                <h3 className="font-semibold text-foreground">SMRKOMED-Controlled Data</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  <li>Conversation records stored by SMRKOMED</li>
                  <li>Contact information stored by the clinic/SMRKOMED</li>
                  <li>Relevant communication metadata processed by SMRKOMED</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-background/50 p-5">
                <h3 className="font-semibold text-foreground">Meta/WhatsApp-Controlled Data</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  <li>Data stored directly by Meta/WhatsApp</li>
                  <li>Data stored on the user&apos;s WhatsApp application/device</li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-foreground">
              SMRKOMED cannot delete information stored directly on Meta&apos;s infrastructure or on a user&apos;s personal device. Requests concerning data held directly by Meta/WhatsApp should be directed to Meta/WhatsApp through its applicable privacy and account controls.
            </div>
          </section>

          {/* 4. Data That May Be Deleted */}
          <section id="data-that-may-be-deleted" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              4. Data That May Be Deleted
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Depending on the circumstances, information that may be eligible for deletion can include:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground sm:text-base">
              <li>Account information</li>
              <li>Contact information</li>
              <li>Certain communication records</li>
              <li>WhatsApp conversation information processed by SMRKOMED</li>
              <li>Non-essential administrative information</li>
              <li>Certain user profile information</li>
            </ul>
          </section>

          {/* 5. Data That May Need to Be Retained */}
          <section id="data-that-may-need-to-be-retained" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              5. Data That May Need to Be Retained
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Certain categories of data may need to be retained and excluded from immediate deletion, including:
            </p>
            <ul className="list-disc space-y-2 pl-6 text-sm text-muted-foreground sm:text-base">
              <li>Healthcare records that must be retained under applicable requirements</li>
              <li>Diagnostic/clinical records where retention is required</li>
              <li>Billing/invoice information where legally required</li>
              <li>Security/audit information where necessary</li>
              <li>Information required to establish, exercise or defend legal claims where applicable</li>
              <li>Other information required to be retained under applicable law or contractual obligations</li>
            </ul>
          </section>

          {/* 6. Clinic / Healthcare Organization Requests */}
          <section id="clinic-healthcare-organization-requests" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              6. Clinic / Healthcare Organization Requests
            </h2>
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm leading-relaxed text-foreground">
              Where a clinic or healthcare organization controls or manages the relevant patient record, SMRKOMED may require confirmation or participation from an authorized representative of that organization before processing certain deletion requests.
            </div>
          </section>

          {/* 7. Verification and Security */}
          <section id="verification-and-security" className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              7. Verification and Security
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Deletion is not performed automatically without verification where verification is necessary. The purpose is to prevent unauthorized deletion or tampering with healthcare information and to safeguard patient confidentiality.
            </p>
          </section>

          {/* 8. Contact Information */}
          <section id="contact-information" className="space-y-4 border-t border-border pt-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              8. Contact Information
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
                <span className="text-muted-foreground">Privacy Policy:</span>{" "}
                <Link
                  href="/privacy-policy"
                  className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
                >
                  View Privacy Policy →
                </Link>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Last updated: September 2026
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
