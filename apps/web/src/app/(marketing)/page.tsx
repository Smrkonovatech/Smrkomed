import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/LandingPage";
import { faqs } from "@/components/landing/faq-data";

export const metadata: Metadata = {
  title: {
    absolute: "Healthcare Management Software for Clinics & Hospitals | SMRKOMED",
  },
  description:
    "SMRKOMED is healthcare management software for modern clinics and hospitals. Manage patients, care journeys, appointments, treatment plans, tasks, communication and follow-ups in one connected platform.",
  alternates: {
    canonical: "https://www.smrkomed.com/",
  },
  openGraph: {
    title: "Healthcare Management Software for Clinics & Hospitals | SMRKOMED",
    description:
      "SMRKOMED is healthcare management software for modern clinics and hospitals. Manage patients, care journeys, appointments, treatment plans, tasks, communication and follow-ups in one connected platform.",
    url: "https://www.smrkomed.com/",
    siteName: "SMRKOMED",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "https://www.smrkomed.com/branding/smrkomed-logo.png",
        width: 1200,
        height: 630,
        alt: "SMRKOMED Healthcare Management Software",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Healthcare Management Software for Clinics & Hospitals | SMRKOMED",
    description:
      "SMRKOMED is healthcare management software for modern clinics and hospitals. Manage patients, care journeys, appointments, treatment plans, tasks, communication and follow-ups in one connected platform.",
    images: ["https://www.smrkomed.com/branding/smrkomed-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function MarketingHomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.smrkomed.com/#organization",
        name: "SMRKOMED",
        legalName: "SMRKONOVA SOFTECH SOLUTIONS LLP",
        url: "https://www.smrkomed.com/",
        logo: "https://www.smrkomed.com/branding/smrkomed-logo.png",
        description:
          "Healthcare management software platform for modern clinics and hospitals in India.",
        sameAs: ["https://smrkonova.com/"],
      },
      {
        "@type": "WebSite",
        "@id": "https://www.smrkomed.com/#website",
        url: "https://www.smrkomed.com/",
        name: "SMRKOMED",
        description: "Healthcare Management Software for Modern Clinics & Hospitals",
        publisher: {
          "@id": "https://www.smrkomed.com/#organization",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://www.smrkomed.com/#software",
        name: "SMRKOMED",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Healthcare Management Software",
        operatingSystem: "Web",
        url: "https://www.smrkomed.com/",
        description:
          "SMRKOMED is healthcare management software for modern clinics and hospitals. Manage patients, care journeys, appointments, treatment plans, tasks, communication and follow-ups in one connected platform.",
        publisher: {
          "@id": "https://www.smrkomed.com/#organization",
        },
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.smrkomed.com/#faq",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.a,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  );
}
