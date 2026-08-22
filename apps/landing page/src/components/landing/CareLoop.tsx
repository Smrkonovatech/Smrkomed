import { useEffect, useState } from "react";
import careDoctor from "@/assets/careloop-doctor.jpg";
import { Btn, Eyebrow, Section } from "./primitives";

const stages = [
  { t: "Consultation", d: "Doctor defines the care path" },
  { t: "Treatment Plan", d: "Steps, timing and owners" },
  { t: "Task Created", d: "Assigned to patient or team" },
  { t: "Patient Follow-up", d: "Automated check-in" },
  { t: "Appointment", d: "Scheduled and confirmed" },
  { t: "Next Consultation", d: "Doctor has full context" },
];

export function CareLoopSection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % stages.length), 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <Section id="care-loop" className="gradient-veil border-y border-border">
      <div className="glow-orb top-6 right-[8%] h-[380px] w-[380px] bg-brand-soft" />
      <div className="relative max-w-[52ch]">
        <Eyebrow>Care Loop</Eyebrow>
        <h2 className="mt-6 text-[32px] leading-[1.12] font-light text-foreground md:text-[48px]">
          Doctors create the care path.{" "}
          <span className="font-semibold">Care Loop keeps patients moving forward.</span>
        </h2>
      </div>

      <div className="relative mt-14 grid items-start gap-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-5">
          <div className="photo-frame">
            <img
              src={careDoctor}
              alt="Doctor explaining a treatment plan to a patient"
              width={1104}
              height={1280}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>

          <div className="surface-card border-primary/25 p-6">
            <div className="text-[11px] tracking-[0.16em] text-primary uppercase">AI detected a follow-up</div>
            <p className="mt-3 text-[15px] leading-relaxed text-foreground">
              "Patient has not completed the required test."
            </p>
            <div className="mt-5 flex items-center gap-3">
              <Btn className="h-11 px-5 text-[14px]">Create Task →</Btn>
              <span className="text-[13px] text-muted-foreground">Assigned to Care Coordinator</span>
            </div>
          </div>
        </div>

        <ol className="space-y-2">
          {stages.map((s, i) => (
            <li key={s.t}>
              <div
                className={`flex items-center justify-between gap-4 rounded-[22px] border px-6 py-5 transition-all duration-500 ${
                  i === active
                    ? "border-transparent gradient-brand text-primary-foreground shadow-[var(--shadow-soft)]"
                    : "border-border bg-card"
                }`}
              >
                <span className={`text-[17px] font-medium ${i === active ? "" : "text-foreground"}`}>{s.t}</span>
                <span className={`text-[13px] ${i === active ? "opacity-80" : "text-muted-foreground"}`}>{s.d}</span>
              </div>
              {i < stages.length - 1 && <div className="mx-auto h-4 w-px bg-primary/30" />}
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
