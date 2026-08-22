import { useEffect, useState } from "react";
import heroClinic from "@/assets/hero-clinic.jpg";
import mark from "@/assets/smrkomed-mark.png.asset.json";
import { Btn } from "./primitives";

const cards = [
  { tag: "Care Task", value: "Ultrasound — Tomorrow", pos: "left-[-6%] top-[16%]" },
  { tag: "AI", value: "Follow-up detected", pos: "right-[-6%] top-[38%]" },
  { tag: "Patient", value: "Priya Sharma · On track", pos: "left-[-2%] bottom-[26%]" },
];

export function Hero() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [1, 2, 3].map((s) => setTimeout(() => setStep(s), s * 420));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section id="top" className="relative overflow-hidden px-6 pt-14 pb-24 md:pt-20 md:pb-32">
      <div className="glow-orb -top-32 left-[8%] h-[440px] w-[440px] bg-brand-soft" />
      <div className="glow-orb top-52 right-[4%] h-[360px] w-[360px] bg-peach-soft" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-[1.02fr_1fr]">
        <div>
          <div
            className="mb-8 inline-flex items-center gap-3 rounded-full border border-border bg-card/70 py-2 pr-5 pl-2 backdrop-blur-md"
            style={{ opacity: step >= 1 ? 1 : 0, transition: "opacity .6s ease" }}
          >
            <img src={mark.url} alt="" width={28} height={28} className="h-7 w-7 rounded-full" />
            <span className="text-[13px] text-muted-foreground">
              The connected operating layer for modern healthcare
            </span>
          </div>

          <h1 className="max-w-[15ch] text-[46px] leading-[1.05] font-light tracking-tight text-foreground md:text-[66px]">
            Building the <span className="font-semibold text-gradient-brand">connected</span> future of healthcare.
          </h1>

          <p className="mt-7 max-w-[52ch] text-[17px] leading-relaxed text-muted-foreground md:text-[19px]">
            SMRKOMED connects clinics, care teams, patients and intelligent workflows through one modular healthcare
            platform.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a href="#demo">
              <Btn>See SMRKOMED in Action →</Btn>
            </a>
            <a href="#platform">
              <Btn variant="secondary">Explore the Platform</Btn>
            </a>
          </div>

          <a
            href="#footer"
            className="mt-7 inline-block text-[13px] text-muted-foreground transition-colors hover:text-primary"
          >
            Powered by Smrkonova Softech Solutions →
          </a>
        </div>

        <div className="relative mx-auto w-full max-w-[520px] px-6 sm:px-10 lg:px-8">
          <div className="gradient-brand absolute inset-8 rounded-[48px] opacity-25 blur-3xl" />
          <div
            className="photo-frame relative"
            style={{ opacity: step >= 1 ? 1 : 0, transition: "opacity .9s ease" }}
          >
            <img
              src={heroClinic}
              alt="Doctor working in a modern clinic with the SMRKOMED workspace"
              width={1280}
              height={1280}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/45 to-transparent p-6 pt-16">
              <div className="chip-glass inline-flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-foreground">
                <span className="h-2 w-2 rounded-full bg-primary" />
                SMRKOMED workspace · Live
              </div>
            </div>
          </div>

          {cards.map((c, i) => (
            <div
              key={c.tag}
              className={`absolute z-20 ${c.pos} chip-glass hidden w-[196px] px-4 py-3 sm:block`}
              style={{
                opacity: step >= 2 ? 1 : 0,
                transform: step >= 2 ? "none" : "translateY(14px)",
                transition: `all .7s ease ${i * 0.15}s`,
              }}
            >
              <div className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">{c.tag}</div>
              <div className="mt-1 text-[13px] font-medium text-foreground">{c.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
