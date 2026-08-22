"use client";

import { Eyebrow, Section } from "./primitives";

const timeline = [
  { d: "14 Aug", t: "Consultation", s: "Care plan created" },
  { d: "18 Aug", t: "Lab Test", s: "Report uploaded" },
  { d: "21 Aug", t: "Follow-up Task", s: "Completed by patient" },
  { d: "26 Aug", t: "Next Appointment", s: "Confirmed" },
];

export function PatientJourney() {
  return (
    <Section>
      <div className="max-w-[50ch]">
        <Eyebrow>Patient journey</Eyebrow>
        <h2 className="mt-6 text-[32px] leading-[1.12] font-light text-foreground md:text-[46px]">
          Know what happened <span className="font-semibold">before the next conversation.</span>
        </h2>
        <p className="mt-6 text-[17px] leading-relaxed text-muted-foreground">
          Give every doctor the context they need before meeting a patient.
        </p>
      </div>

      <div className="mt-14 grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="photo-frame">
          <img
            src="/branding/patient-journey.jpg"
            alt="Patient checking her care plan on a phone at home"
            width={1104}
            height={1280}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="surface-card p-8 md:p-10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] tracking-[0.16em] text-primary uppercase">Patient journey</span>
            <span className="rounded-full bg-secondary px-3 py-1 text-[11px] tracking-wider text-muted-foreground uppercase">
              Demo data
            </span>
          </div>

          <ol className="mt-8 space-y-0">
            {timeline.map((e, i) => (
              <li key={e.d} className="grid grid-cols-[64px_20px_1fr] items-start gap-4">
                <span className="pt-0.5 text-[13px] font-medium text-muted-foreground">{e.d}</span>
                <span className="flex h-full flex-col items-center">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  {i < timeline.length - 1 && <span className="w-px flex-1 bg-primary/25" />}
                </span>
                <span className="pb-8">
                  <span className="block text-[16px] font-medium text-foreground">{e.t}</span>
                  <span className="mt-0.5 block text-[13.5px] text-muted-foreground">{e.s}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
