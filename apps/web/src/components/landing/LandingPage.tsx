"use client";

import { useState } from "react";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { Roles } from "./Roles";
import { Platform } from "./Platform";
import { PatientWhatsApp } from "./component/PatientWhatsApp";
import { Multilingual } from "./component/Multilingual";
import { CareLoop } from "./component/CareLoop";
import { SmrkoAI } from "./SmrkoAI";
import { AIHandoff } from "./AIHandoff";
import { Specialties } from "./Specialties";
import { ClinicOperations } from "./ClinicOperations";
import { EcosystemIntegrations } from "./EcosystemIntegrations";
import { ProductShowcase } from "./ProductShowcase";
import { Pricing } from "./component/Pricing";
import { Closing } from "./component/Closing";
import { DemoModal } from "./DemoModal";
import { Header } from "./component/Header";
import { HeroBanner } from "./component/HeroBanner";
import { CareRoles } from "./component/CareRoles";
import { HealthcarePlatform } from "./component/HealthcarePlatform";
import { SmrkoAISection } from "./component/SmrkoAISection";
import { BuiltToGrow } from "./component/BuiltToGrow";
import { BuiltForCare } from "./component/BuiltForCare";

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
    <>
      <div className="min-h-screen bg-white">
        <Header onOpenDemo={() => handleOpenDemo("General Demo")} />
        <div className="bg-gradient-to-b from-[#00AEEF] to-white">
          <HeroBanner onOpenDemo={() => handleOpenDemo("General Demo")} />
          <CareRoles />
        </div>
        <div id="platform">
          <HealthcarePlatform />
        </div>
        <PatientWhatsApp />
        <Multilingual />
        <div id="careloop">
          <CareLoop />
        </div>
        <div id="smrko-ai">
          <SmrkoAISection />
        </div>
        <div id="solutions">
          <BuiltToGrow />
        </div>
        <div id="integrations">
          <BuiltForCare />
        </div>
        <div id="pricing">
          <Pricing onOpenDemo={(tier) => handleOpenDemo(tier ? `${tier} Plan` : undefined)} />
        </div>
        <Closing onOpenDemo={() => handleOpenDemo("General Demo")} />
      </div>

      {/* Book a Demo Modal with FormSubmit to info@smrkomed.com & Thank You State */}
      <DemoModal
        isOpen={demoOpen}
        onClose={handleCloseDemo}
        defaultInterest={demoInterest}
      />
    </>
  );
}
