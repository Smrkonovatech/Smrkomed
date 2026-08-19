"use client";

import { BookOpen, LifeBuoy, MessageCircle, Sparkles } from "lucide-react";

import { PageHeader, SectionHeading } from "@/components/ui-kit";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  [
    "What exactly is Care Loop?",
    "Care Loop is the coordination layer between your care plan and your patient. When a doctor creates a task, Care Loop reminds the patient, answers routine questions, sends the right education material and escalates anything clinical to your team.",
  ],
  [
    "Does the AI give medical advice?",
    "Never. Care Loop only coordinates. Any clinical question, symptom or concern is summarised and escalated to a clinician for a decision.",
  ],
  [
    "Why are patient records couple-based?",
    "Fertility treatment is shared. One couple record holds a shared journey and shared documents, while tasks and reports stay attached to the right individual.",
  ],
  [
    "What happens if a patient never responds?",
    "Care Loop sends reminders, then attempts an AI voice call, and finally escalates to your coordinator with a summary of everything already tried.",
  ],
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <PageHeader
        title="Help & Onboarding"
        subtitle="SmrkoMed manages the clinic. Care Loop makes sure patients actually follow their doctor's plan."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "Quick start", detail: "Set up your clinic in 10 minutes", icon: Sparkles },
          { title: "Care Loop guide", detail: "How automated follow-up works", icon: BookOpen },
          { title: "Talk to support", detail: "We reply within one hour", icon: LifeBuoy },
        ].map((c) => (
          <div key={c.title} className="surface-card hover-lift p-4">
            <c.icon className="size-5 text-primary" />
            <p className="mt-2 text-sm font-semibold">{c.title}</p>
            <p className="text-xs text-muted-foreground">{c.detail}</p>
          </div>
        ))}
      </div>

      <section className="surface-card p-4">
        <SectionHeading
          title="Frequently asked"
          subtitle="The essentials"
          icon={MessageCircle}
          tone="purple"
        />
        <Accordion type="single" collapsible>
          {faqs.map(([q, a], i) => (
            <AccordionItem key={q} value={`i${i}`}>
              <AccordionTrigger className="text-left text-sm">{q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
