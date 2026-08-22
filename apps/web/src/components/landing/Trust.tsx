"use client";

import Link from "next/link";
import { Btn, Eyebrow, Section } from "./primitives";

/* ---------------- 12 · Trust ---------------- */

const trust = [
  { t: "Clinic-scoped data", d: "Each clinic sees its own data — nothing more." },
  { t: "Human approval", d: "AI suggestions require confirmation before any action." },
  {
    t: "No autonomous clinical decisions",
    d: "SMRKOMED supports healthcare teams — it doesn't replace them.",
  },
  { t: "Secure access", d: "Role-based access for every member of the care team." },
];

export function Trust() {
  return (
    <Section className="gradient-veil border-y border-border">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>Trust</Eyebrow>
        <h2 className="mt-6 text-[32px] leading-[1.12] font-light text-foreground md:text-[46px]">
          Built around the patient. <span className="font-semibold">Designed with responsibility.</span>
        </h2>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {trust.map((t) => (
          <div key={t.t} className="rounded-[24px] border border-border bg-card p-7">
            <h3 className="text-[16px] font-medium text-foreground">{t.t}</h3>
            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{t.d}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- 13 · How it works ---------------- */

const steps = [
  ["01", "Connect your clinic", "Create your clinic and invite your care team."],
  ["02", "Bring your workflows together", "Patients, appointments, care plans, tasks and communication."],
  ["03", "Let SMRKOMED assist", "AI summarises, prepares, identifies follow-ups and drafts communication."],
  ["04", "Keep care moving", "Your team stays focused on patients."],
];

export function HowItWorks() {
  return (
    <Section>
      <h2 className="text-[32px] leading-[1.12] font-light text-foreground md:text-[46px]">
        How it <span className="font-semibold">works.</span>
      </h2>
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map(([n, t, d]) => (
          <article key={n} className="lift-on-hover rounded-[28px] border border-border bg-card p-8">
            <div className="text-[40px] leading-none font-light text-primary/35">{n}</div>
            <h3 className="mt-6 text-[18px] font-medium text-foreground">{t}</h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">{d}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ---------------- 14 · Product demo ---------------- */

export function DemoSection() {
  return (
    <section id="demo" className="gradient-deep relative overflow-hidden px-6 py-24 md:py-32">
      <div className="glow-orb -top-20 right-[10%] h-[420px] w-[420px] bg-white/25" />
      <div className="relative mx-auto w-full max-w-6xl text-center">
        <span className="text-[12px] tracking-[0.2em] text-white/65 uppercase">See SMRKOMED in action</span>
        <h2 className="mx-auto mt-6 max-w-[20ch] text-[32px] leading-[1.12] font-light text-primary-foreground md:text-[48px]">
          One connected workspace <span className="font-semibold">for modern healthcare teams.</span>
        </h2>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/login">
            <Btn variant="glass">Login</Btn>
          </Link>
          <Link href="/register">
            <Btn variant="glass">Create Clinic →</Btn>
          </Link>
        </div>

        <div className="relative mx-auto mt-16 max-w-4xl rounded-[28px] border border-white/25 bg-white/10 p-4 backdrop-blur-xl">
          <div className="rounded-[20px] bg-card p-6 text-left md:p-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <span className="text-[14px] font-medium text-foreground">Clinic workspace</span>
              <span className="rounded-full bg-secondary px-3 py-1 text-[11px] tracking-wider text-muted-foreground uppercase">
                Demo
              </span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { v: "128", l: "Today's patients" },
                { v: "17", l: "Need attention" },
                { v: "84%", l: "AI resolved" },
              ].map((s) => (
                <div key={s.l} className="rounded-[18px] bg-lavender-soft p-5">
                  <div className="text-[26px] font-semibold text-foreground">{s.v}</div>
                  <div className="mt-1 text-[12.5px] text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 overflow-hidden rounded-[18px] border border-border">
              {[
                ["Priya Sharma", "Missing report", "High"],
                ["Rahul Kumar", "No response", "Medium"],
                ["Ananya Rao", "Follow-up due", "High"],
              ].map(([p, i, pr], idx) => (
                <div
                  key={p}
                  className={`grid grid-cols-3 gap-4 px-5 py-4 text-[14px] ${idx % 2 ? "bg-lavender-soft" : "bg-card"}`}
                >
                  <span className="font-medium text-foreground">{p}</span>
                  <span className="text-muted-foreground">{i}</span>
                  <span className={pr === "High" ? "text-primary" : "text-muted-foreground"}>{pr}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
