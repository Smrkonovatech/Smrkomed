"use client";

import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { SpecialtySelector, SpecialtyEcosystem } from "./Specialty";
import { DisconnectedSystems } from "./Problem";
import { ModularPlatform } from "./Platform";
import { CareLoopSection, CareLoopIntelligence } from "./CareLoop";
import { VoiceSection, ConversationToAction } from "./Voice";
import { PatientJourney } from "./Journey";
import { SmrkoAI, AiHuman } from "./Ai";
import { Trust, HowItWorks, DemoSection } from "./Trust";
import { FaqSection } from "./Faq";
import { CtaSection, FinalCta, Footer } from "./Closing";

export function LandingPage() {
  return (
    <main className="min-h-screen bg-background font-sans text-foreground">
      <Nav />
      <Hero />
      <SpecialtySelector />
      <DisconnectedSystems />
      <ModularPlatform />
      <CareLoopSection />
      <CareLoopIntelligence />
      <VoiceSection />
      <ConversationToAction />
      <PatientJourney />
      <SmrkoAI />
      <AiHuman />
      <SpecialtyEcosystem />
      <Trust />
      <HowItWorks />
      <FaqSection />
      <DemoSection />
      <CtaSection />
      <FinalCta />
      <Footer />
    </main>
  );
}
