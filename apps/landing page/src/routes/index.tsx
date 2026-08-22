import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { SpecialtySelector, SpecialtyEcosystem } from "@/components/landing/Specialty";
import { DisconnectedSystems } from "@/components/landing/Problem";
import { ModularPlatform } from "@/components/landing/Platform";
import { CareLoopSection } from "@/components/landing/CareLoop";
import { VoiceSection, ConversationToAction } from "@/components/landing/Voice";
import { PatientJourney } from "@/components/landing/Journey";
import { SmrkoAI, AiHuman } from "@/components/landing/Ai";
import { Trust, HowItWorks, DemoSection } from "@/components/landing/Trust";
import { CtaSection, FinalCta, Footer, CreateClinicDialog } from "@/components/landing/Closing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SMRKOMED — The connected healthcare platform" },
      {
        name: "description",
        content:
          "SMRKOMED connects clinics, care teams, patients and intelligent workflows through one modular healthcare platform. Start with Care Loop.",
      },
      { property: "og:title", content: "SMRKOMED — Building the connected future of healthcare" },
      {
        property: "og:description",
        content: "A modular healthcare platform. Start with Care Loop, expand into the ecosystem you need.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [open, setOpen] = useState(false);
  const openDialog = () => setOpen(true);

  return (
    <main className="min-h-screen bg-background font-sans text-foreground">
      <Nav onCreateClinic={openDialog} />
      <Hero />
      <SpecialtySelector />
      <DisconnectedSystems />
      <ModularPlatform />
      <CareLoopSection />
      <VoiceSection />
      <ConversationToAction />
      <PatientJourney />
      <SmrkoAI />
      <AiHuman />
      <SpecialtyEcosystem />
      <Trust />
      <HowItWorks />
      <DemoSection onCreateClinic={openDialog} />
      <CtaSection onCreateClinic={openDialog} />
      <FinalCta />
      <Footer />
      <CreateClinicDialog open={open} onClose={() => setOpen(false)} />
    </main>
  );
}
