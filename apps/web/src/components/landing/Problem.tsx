"use client";

import { Eyebrow, Section } from "./primitives";

const labels = [
  { t: "Patient records", pos: "left-[-4%] top-[8%]" },
  { t: "Appointments", pos: "right-[-4%] top-[16%]" },
  { t: "Care plans", pos: "left-[-6%] top-[42%]" },
  { t: "Tasks", pos: "right-[-6%] top-[50%]" },
  { t: "Communication", pos: "left-[-2%] bottom-[10%]" },
  { t: "Follow-ups", pos: "right-[-2%] bottom-[6%]" },
];

export function DisconnectedSystems() {
  return (
    <Section>
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>The problem</Eyebrow>
        <h2 className="mt-6 text-[32px] leading-[1.12] font-light text-foreground md:text-[46px]">
          Healthcare shouldn&apos;t be a collection of <span className="font-semibold">disconnected systems.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-[58ch] text-[17px] leading-relaxed text-muted-foreground">
          Clinic teams often manage patient records, appointments, treatment plans, communication, follow-ups and operational tasks
          across multiple systems. SMRKOMED brings these workflows together in one healthcare management system built around the patient.
        </p>
      </div>

      <div className="relative mx-auto mt-16 max-w-3xl px-4 sm:px-20">
        <div className="glow-orb top-10 left-1/2 h-[360px] w-[420px] -translate-x-1/2 bg-brand-soft" />
        <div className="photo-frame relative">
          <img
            src="/branding/clinic-team.jpg"
            alt="Care team collaborating in a modern clinic using SMRKOMED clinic management software"
            width={1280}
            height={960}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="pointer-events-none absolute inset-0 hidden sm:block">
          {labels.map((l, i) => (
            <span
              key={l.t}
              className={`chip-glass animate-rise-in absolute ${l.pos} px-4 py-2 text-[12.5px] font-medium text-foreground`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {l.t}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-14 flex flex-wrap justify-center gap-2 sm:hidden">
        {labels.map((l) => (
          <span key={l.t} className="rounded-full border border-border bg-card px-4 py-2 text-[13px] text-foreground">
            {l.t}
          </span>
        ))}
      </div>

      <p className="mt-14 text-center text-[20px] font-medium text-foreground">Keep what works. Connect the rest.</p>
    </Section>
  );
}
