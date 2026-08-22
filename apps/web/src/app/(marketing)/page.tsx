import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "SMRKOMED — Building the connected future of healthcare",
  description:
    "SMRKOMED is a connected healthcare technology platform that helps clinics manage patients, care teams and clinical journeys from one place.",
  openGraph: {
    title: "SMRKOMED — Building the connected future of healthcare",
    description:
      "Modular healthcare technology connecting clinics, care teams and patients. Start with Care Loop.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MarketingHomePage() {
  return <LandingPage />;
}
