"use client";

import { useState } from "react";
import { Eyebrow, Section, StatusPill } from "./primitives";

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
          One Healthcare Management Platform. <span className="font-semibold">Multiple Specialties.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-[58ch] text-[17px] leading-relaxed text-muted-foreground">
          SMRKOMED is built for modern healthcare teams that need more than disconnected systems. Manage patients,
          treatment journeys, appointments, care plans, tasks, communication and follow-ups from one connected healthcare
          management platform — supporting fertility clinics, IVF clinics, dental clinics, dermatology clinics, maternity clinics,
          aesthetics and multispecialty healthcare teams.
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
            src="/branding/photo-consult.webp"
            alt="Doctor discussing a treatment plan with a patient using SMRKOMED clinic management software"
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

type RingItem = {
  label: string;
  img: string | null;
  status: "LIVE" | "COMING NEXT" | "ROADMAP";
  alt?: string;
};

const ring: RingItem[] = [
  { label: "Fertility", img: "/branding/spec-fertility.jpg", status: "LIVE", alt: "Fertility and IVF clinic management software workflows" },
  { label: "IVF", img: null, status: "COMING NEXT" },
  { label: "Dental", img: "/branding/spec-dental.jpg", status: "COMING NEXT", alt: "Dental clinic management and treatment tracking" },
  { label: "Dermatology", img: "/branding/spec-derm.jpg", status: "COMING NEXT", alt: "Dermatology clinic management and patient monitoring" },
  { label: "Maternity", img: "/branding/spec-maternity.jpg", status: "COMING NEXT", alt: "Maternity clinic management and care journey tracking" },
  { label: "Aesthetics", img: null, status: "ROADMAP" },
  { label: "Diagnostics", img: null, status: "ROADMAP" },
  { label: "Specialty Clinics", img: null, status: "ROADMAP" },
  { label: "Future Healthcare", img: null, status: "ROADMAP" },
];

export function SpecialtyEcosystem() {
  return (
    <Section className="gradient-veil border-y border-border">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>Ecosystem</Eyebrow>
        <h2 className="mt-6 text-[32px] leading-[1.12] font-light text-foreground md:text-[46px]">
          Healthcare Management Software <span className="font-semibold">for Multiple Specialties</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[58ch] text-[16px] leading-relaxed text-muted-foreground">
          Designed as a modular healthcare management platform that adapts to specialized clinical workflows — from IVF and fertility
          to dental, dermatology, maternity and multispecialty healthcare organisations.
        </p>
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
          const live = r.status === "LIVE";
          return (
            <div
              key={r.label}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${50 + radius * Math.cos(a)}%`, top: `${50 + radius * Math.sin(a)}%` }}
            >
              {r.img ? (
                <div
                  className={`h-[96px] w-[96px] overflow-hidden rounded-full border-2 shadow-[var(--shadow-soft)] ${
                    live ? "border-primary ring-4 ring-primary/20" : "border-card"
                  }`}
                >
                  <img
                    src={r.img}
                    alt={r.alt || `${r.label} clinic workflows`}
                    width={512}
                    height={512}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full border border-border bg-card px-2 text-center text-[12px] leading-tight text-muted-foreground shadow-[var(--shadow-soft)]">
                  {r.label}
                </div>
              )}
              <div className="mt-2 flex flex-col items-center gap-1">
                {(r.img || live) && (
                  <div className="text-center text-[12px] font-medium text-foreground">{r.label}</div>
                )}
                <StatusPill status={r.status} />
              </div>
            </div>
          );
        })}
      </div>

      {/* stacked on small screens */}
      <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:hidden">
        {ring.map((r) => (
          <div
            key={r.label}
            className={`surface-card flex flex-col items-center gap-2 px-4 py-4 text-center text-[14px] text-foreground ${
              r.status === "LIVE" ? "border-primary/40 ring-2 ring-primary/15" : ""
            }`}
          >
            <span>{r.label}</span>
            <StatusPill status={r.status} />
          </div>
        ))}
      </div>
    </Section>
  );
}
