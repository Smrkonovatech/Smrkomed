import { useState } from "react";
import consult from "@/assets/photo-consult.png.asset.json";
import specFertility from "@/assets/spec-fertility.jpg";
import specDental from "@/assets/spec-dental.jpg";
import specDerm from "@/assets/spec-derm.jpg";
import specMaternity from "@/assets/spec-maternity.jpg";
import { Eyebrow, Section } from "./primitives";

/* ---------------- 02 · Specialty selector ---------------- */

type Spec = { name: string; cards: { tag: string; value: string }[] };

const specs: Spec[] = [
  {
    name: "Fertility",
    cards: [
      { tag: "Care plan", value: "IUI cycle · Day 9 scan" },
      { tag: "Task", value: "Hormone panel due" },
      { tag: "Follow-up", value: "Review in 3 days" },
    ],
  },
  {
    name: "IVF",
    cards: [
      { tag: "Care plan", value: "Stimulation protocol" },
      { tag: "Task", value: "Embryo transfer prep" },
      { tag: "Follow-up", value: "Beta hCG on day 14" },
    ],
  },
  {
    name: "Dental",
    cards: [
      { tag: "Care plan", value: "Implant · Stage 2" },
      { tag: "Task", value: "Upload OPG scan" },
      { tag: "Follow-up", value: "Crown fitting review" },
    ],
  },
  {
    name: "Dermatology",
    cards: [
      { tag: "Care plan", value: "Melanoma surveillance" },
      { tag: "Task", value: "Photo check-in" },
      { tag: "Follow-up", value: "Biopsy result review" },
    ],
  },
  {
    name: "Maternity",
    cards: [
      { tag: "Care plan", value: "Trimester 2 schedule" },
      { tag: "Task", value: "Anomaly scan booking" },
      { tag: "Follow-up", value: "Weekly wellbeing check" },
    ],
  },
  {
    name: "Aesthetics",
    cards: [
      { tag: "Care plan", value: "Treatment course · 3 of 6" },
      { tag: "Task", value: "Post-care instructions" },
      { tag: "Follow-up", value: "Review after 2 weeks" },
    ],
  },
  {
    name: "More",
    cards: [
      { tag: "Care plan", value: "Build your own journey" },
      { tag: "Task", value: "Configure care tasks" },
      { tag: "Follow-up", value: "Set escalation rules" },
    ],
  },
];

export function SpecialtySelector() {
  const [active, setActive] = useState(0);
  const spec = specs[active] ?? specs[0]!;

  return (
    <Section id="specialties" className="gradient-veil border-y border-border">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-[32px] leading-[1.12] font-light text-foreground md:text-[46px]">
          One platform. <span className="font-semibold">Multiple healthcare journeys.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-[58ch] text-[17px] leading-relaxed text-muted-foreground">
          Built to adapt to the way modern healthcare teams work — from fertility and IVF to dental, dermatology,
          maternity, aesthetics and beyond.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-2.5">
        {specs.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setActive(i)}
            className={`rounded-full border px-5 py-2.5 text-[14px] transition-all duration-300 ${
              i === active
                ? "border-primary/40 bg-lavender font-medium text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/30"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <div className="relative mx-auto mt-14 max-w-4xl px-4 sm:px-16">
        <div className="photo-frame">
          <img
            src={consult.url}
            alt="Doctor discussing a treatment plan with a patient"
            width={1920}
            height={1280}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="pointer-events-none absolute inset-0 hidden sm:block">
          {spec.cards.map((c, i) => (
            <div
              key={c.tag}
              className="chip-glass animate-rise-in absolute w-[210px] px-4 py-3"
              style={{
                top: [`12%`, `44%`, `74%`][i],
                left: i === 1 ? "auto" : "-2%",
                right: i === 1 ? "-2%" : "auto",
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <div className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">{c.tag}</div>
              <div className="mt-1 text-[13px] font-medium text-foreground">{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-10 text-center text-[13px] tracking-[0.14em] text-primary uppercase">
        SMRKOMED is a healthcare platform — not a single-specialty product.
      </p>
    </Section>
  );
}

/* ---------------- 11 · Specialty ecosystem ---------------- */

const ring = [
  { label: "Fertility", img: specFertility },
  { label: "IVF", img: null },
  { label: "Dental", img: specDental },
  { label: "Dermatology", img: specDerm },
  { label: "Maternity", img: specMaternity },
  { label: "Aesthetics", img: null },
  { label: "Diagnostics", img: null },
  { label: "Specialty Clinics", img: null },
  { label: "Future Healthcare", img: null },
];

export function SpecialtyEcosystem() {
  return (
    <Section className="gradient-veil border-y border-border">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>Ecosystem</Eyebrow>
        <h2 className="mt-6 text-[32px] leading-[1.12] font-light text-foreground md:text-[46px]">
          One platform. <span className="font-semibold">Many healthcare specialties.</span>
        </h2>
      </div>

      {/* radial composition on large screens */}
      <div className="relative mx-auto mt-16 hidden aspect-square w-full max-w-[640px] lg:block">
        <div className="absolute inset-[18%] rounded-full border border-dashed border-primary/25" />
        <div className="absolute inset-[4%] rounded-full border border-dashed border-primary/15" />
        <div className="gradient-brand absolute top-1/2 left-1/2 flex h-40 w-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[14px] font-semibold tracking-[0.16em] text-primary-foreground shadow-[var(--shadow-lift)]">
          SMRKOMED
        </div>

        {ring.map((r, i) => {
          const a = (i / ring.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 44;
          return (
            <div
              key={r.label}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${50 + radius * Math.cos(a)}%`, top: `${50 + radius * Math.sin(a)}%` }}
            >
              {r.img ? (
                <div className="h-[96px] w-[96px] overflow-hidden rounded-full border-2 border-card shadow-[var(--shadow-soft)]">
                  <img src={r.img} alt={r.label} width={512} height={512} loading="lazy" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full border border-border bg-card px-2 text-center text-[12px] leading-tight text-muted-foreground shadow-[var(--shadow-soft)]">
                  {r.label}
                </div>
              )}
              {r.img && (
                <div className="mt-2 text-center text-[12px] font-medium text-foreground">{r.label}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* stacked on small screens */}
      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden">
        {ring.map((r) => (
          <div key={r.label} className="surface-card px-4 py-4 text-center text-[14px] text-foreground">
            {r.label}
          </div>
        ))}
      </div>
    </Section>
  );
}
