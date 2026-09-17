"use client";

import { useState } from "react";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { Roles } from "./Roles";
import { Platform } from "./Platform";
import { PatientWhatsApp } from "./PatientWhatsApp";
import { Multilingual } from "./Multilingual";
import { CareLoop } from "./CareLoop";
import { SmrkoAI } from "./SmrkoAI";
import { AIHandoff } from "./AIHandoff";
import { Specialties } from "./Specialties";
import { ClinicOperations } from "./ClinicOperations";
import { EcosystemIntegrations } from "./EcosystemIntegrations";
import { ProductShowcase } from "./ProductShowcase";
import { Pricing } from "./Pricing";
import { Closing } from "./Closing";
import { DemoModal } from "./DemoModal";

export function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoInterest, setDemoInterest] = useState("Fertility / IVF");

  const handleOpenDemo = (interest?: string) => {
    if (interest) setDemoInterest(interest);
    setDemoOpen(true);
  };

  const handleCloseDemo = () => {
    setDemoOpen(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-sky-500 selection:text-white antialiased">
      {/* 1. Top Section with Sky Blue to White Gradient matching reference */}
      <div 
        className="relative overflow-hidden" 
        style={{ background: "linear-gradient(180deg, #00AEEF 0%, #FFFFFF 100%)" }}
      >
        {/* Floating Glassmorphic Pill Nav */}
        <Nav onOpenDemo={handleOpenDemo} />

        {/* Hero Section */}
        <Hero onOpenDemo={handleOpenDemo} />

        {/* Roles Section (Built for everyone who delivers care) */}
        <Roles onOpenDemo={handleOpenDemo} />
      </div>

      <main>
        {/* 4. Section 3 — Complete Healthcare Operating Platform */}
        <Platform onOpenDemo={handleOpenDemo} />

        {/* 5. Section 4 — Patient Communication / WhatsApp */}
        <PatientWhatsApp onOpenDemo={handleOpenDemo} />

        {/* 6. Section 5 — Multilingual / Language Intelligence */}
        <Multilingual />

        {/* 7. Section 6 — Care Loop Engine */}
        <CareLoop onOpenDemo={handleOpenDemo} />

        {/* 8. Section 7 — Smrko AI (Care Connect, Care Builder, Care Voice) */}
        <SmrkoAI onOpenDemo={handleOpenDemo} />

        {/* 9. Section 8 — AI + Human Handoff */}
        <AIHandoff />

        {/* 10. Sections 9 & 10 — Starting with Fertility & Across Specialties */}
        <Specialties />

        {/* 11. Section 11 — Connected Clinic Operations */}
        <ClinicOperations />

        {/* 12. Section 12 — ABDM / ABHA / NHCX & Integrations */}
        <EcosystemIntegrations />

        {/* 13. Section 13 — Product Experience Showcase (Real Mobile & Web UIs) */}
        <ProductShowcase onOpenDemo={handleOpenDemo} />

        {/* 14. Section 14 — Pricing */}
        <Pricing onOpenDemo={handleOpenDemo} />

        {/* 15. Section 15 & Footer — Final CTA & SaaS Footer */}
        <Closing onOpenDemo={handleOpenDemo} />
      </main>

      {/* Interactive Demo Request Modal */}
      <DemoModal
        isOpen={demoOpen}
        onClose={handleCloseDemo}
        defaultInterest={demoInterest}
      />
    </div>
  );
}
