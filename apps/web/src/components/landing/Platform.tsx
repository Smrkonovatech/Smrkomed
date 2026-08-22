"use client";

import { Eyebrow, Section, StatusPill } from "./primitives";

const modules = [
  { name: "Care Loop", status: "LIVE", desc: "AI-assisted care task follow-through.", tone: "purple" },
  { name: "Patient Connect", status: "IN DEVELOPMENT", desc: "Patient messaging and updates.", tone: "blue" },
  { name: "Appointments", status: "COMING NEXT", desc: "Scheduling across care teams.", tone: "purple" },
  { name: "Documents", status: "COMING NEXT", desc: "Reports and records in one place.", tone: "blue" },
  { name: "Analytics", status: "ROADMAP", desc: "Operational and journey insights.", tone: "purple" },
  { name: "CRM", status: "ROADMAP", desc: "Enquiry to enrolment tracking.", tone: "blue" },
  { name: "Billing", status: "ROADMAP", desc: "Package and payment workflows.", tone: "purple" },
  { name: "Labs", status: "ROADMAP", desc: "Lab orders and result flow.", tone: "blue" },
  { name: "Telehealth", status: "ROADMAP", desc: "Remote consultations.", tone: "purple" },
] as const;

export function ModularPlatform() {
  return (
    <Section id="platform" className="gradient-veil border-y border-border">
      <div id="features" className="pointer-events-none absolute top-0 h-0 w-0" aria-hidden="true" />
      <div className="max-w-[46ch]">
        <Eyebrow>Platform</Eyebrow>
        <h2 className="mt-6 text-[32px] leading-[1.12] font-light text-foreground md:text-[46px]">
          Everything your clinic needs, <span className="font-semibold">connected around the patient.</span>
        </h2>
        <p className="mt-5 text-[17px] text-muted-foreground">
          Activate the capabilities you need today. Add more as your clinic grows — alongside the systems you already
          use.
        </p>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        <div className="gradient-brand flex flex-col justify-center rounded-[32px] p-8 text-primary-foreground md:row-span-2">
          <div className="text-[12px] tracking-[0.2em] uppercase opacity-80">Core</div>
          <div className="mt-3 text-[30px] leading-tight font-semibold">SMRKOMED CORE</div>
          <p className="mt-4 text-[14px] leading-relaxed opacity-85">
            Identity, patient journeys, tasks and intelligence — the layer every module plugs into.
          </p>
        </div>

        {modules.map((m) => (
          <article key={m.name} className="lift-on-hover group rounded-[22px] border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-3">
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full ${m.tone === "purple" ? "bg-primary" : "bg-blue-accent"}`}
              />
              <StatusPill status={m.status} />
            </div>
            <h3 className="mt-4 text-[17px] font-medium text-foreground">{m.name}</h3>
            <p className="mt-2 max-h-0 overflow-hidden text-[13px] leading-relaxed text-muted-foreground opacity-0 transition-all duration-400 group-hover:max-h-24 group-hover:opacity-100">
              {m.desc}
            </p>
          </article>
        ))}
      </div>

      <p className="mt-10 text-[15px] text-muted-foreground">
        Works alongside your existing HMS, EMR, CRM, billing and lab systems.
      </p>
    </Section>
  );
}
