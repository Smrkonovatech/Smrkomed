import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/LandingPage";
import { faqs } from "@/components/landing/faq-data";

export const metadata: Metadata = {
  title: {
    absolute: "SmrkoMed — Healthcare Intelligence Platform",
  },
  description:
    "SmrkoMed connects clinical care, care teams, patient communication, workflows and intelligence in one connected healthcare platform.",
  alternates: {
    canonical: "https://www.smrkomed.com/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "64x64" },
      { url: "/branding/favicon.png", type: "image/png", sizes: "64x64" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "SmrkoMed — Healthcare Intelligence Platform",
    description:
      "SmrkoMed connects clinical care, care teams, patient communication, workflows and intelligence in one connected healthcare platform.",
    url: "https://www.smrkomed.com/",
    siteName: "SmrkoMed",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "https://www.smrkomed.com/branding/smrkomed-logo.png",
        width: 1200,
        height: 630,
        alt: "SmrkoMed — Healthcare Intelligence Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SmrkoMed — Healthcare Intelligence Platform",
    description:
      "SmrkoMed connects clinical care, care teams, patient communication, workflows and intelligence in one connected healthcare platform.",
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
          "Healthcare Intelligence Platform for modern clinics and hospitals in India.",
        sameAs: ["https://smrkonova.com/"],
      },
      {
        "@type": "WebSite",
        "@id": "https://www.smrkomed.com/#website",
        url: "https://www.smrkomed.com/",
        name: "SMRKOMED",
        description: "Healthcare Intelligence Platform for Modern Clinics & Hospitals",
        publisher: {
          "@id": "https://www.smrkomed.com/#organization",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://www.smrkomed.com/#software",
        name: "SMRKOMED",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Healthcare Intelligence Platform",
        operatingSystem: "Web",
        url: "https://www.smrkomed.com/",
        description:
          "SmrkoMed connects clinical care, care teams, patient communication, workflows and intelligence in one connected healthcare platform.",
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
