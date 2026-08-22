import { useState } from "react";
import logo from "@/assets/smrkomed-logo.png.asset.json";
import { Btn, Section } from "./primitives";

/* ---------------- 15 · CTA ---------------- */

export function CtaSection({ onCreateClinic }: { onCreateClinic: () => void }) {
  return (
    <Section>
      <div className="gradient-deep relative overflow-hidden rounded-[36px] p-10 text-center md:p-16">
        <div className="glow-orb -top-16 right-10 h-[320px] w-[320px] bg-white/25" />
        <div className="relative mx-auto max-w-[48ch]">
          <h2 className="text-[32px] leading-[1.12] font-light text-primary-foreground md:text-[46px]">
            Ready to <span className="font-semibold">connect your clinic?</span>
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-white/75">
            See how SMRKOMED can fit into the way your healthcare team already works.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href="#demo">
              <Btn variant="glass">See Demo</Btn>
            </a>
            <Btn variant="glass" onClick={onCreateClinic}>
              Create Your Clinic →
            </Btn>
          </div>
          <p className="mt-6 text-[13px] text-white/70">
            Already have an account?{" "}
            <a href="#top" className="underline underline-offset-4">
              Log in
            </a>
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ---------------- 16 · Final word ---------------- */

export function FinalCta() {
  return (
    <Section className="relative overflow-hidden text-center">
      <div className="glow-orb top-0 left-1/2 h-[420px] w-[520px] -translate-x-1/2 bg-brand-soft" />
      <div className="relative">
        <h2 className="mx-auto max-w-[16ch] text-[36px] leading-[1.08] font-light text-foreground md:text-[56px]">
          Healthcare is a journey. <span className="font-semibold">Let's make it connected.</span>
        </h2>
        <div className="mt-12 flex flex-col items-center gap-3">
          <img src={logo.url} alt="SMRKOMED" width={44} height={44} className="h-10 w-auto" loading="lazy" />
          <span className="text-[17px] font-semibold tracking-[0.2em] text-foreground">SMRKOMED</span>
          <span className="text-[13px] text-muted-foreground">Powered by Smrkonova Softech Solutions LLP</span>
        </div>
      </div>
    </Section>
  );
}

const footerCols = [
  { t: "Platform", items: ["SmrkoMed", "Care Loop", "SMRKOMED AI", "Integrations", "Roadmap"] },
  { t: "Solutions", items: ["Fertility", "IVF", "Dental", "Dermatology", "Maternity", "Aesthetics"] },
  { t: "Company", items: ["About Smrkonova", "Contact", "Careers"] },
  { t: "Resources", items: ["Documentation", "Demo", "Blog", "Privacy", "Terms"] },
];

export function Footer() {
  return (
    <footer id="footer" className="border-t border-border bg-lavender-soft px-6 py-16">
      <div className="mx-auto grid w-full max-w-6xl gap-12 md:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div>
          <div className="flex items-center gap-3">
            <img src={logo.url} alt="SMRKOMED" width={36} height={36} className="h-8 w-auto" loading="lazy" />
            <span className="text-[16px] font-semibold tracking-[0.14em] text-foreground">SMRKOMED</span>
          </div>
          <p className="mt-4 max-w-[28ch] text-[14px] text-muted-foreground">Connected healthcare technology.</p>
        </div>
        {footerCols.map((c) => (
          <div key={c.t}>
            <h3 className="text-[13px] font-semibold tracking-[0.14em] text-foreground uppercase">{c.t}</h3>
            <ul className="mt-4 space-y-2.5">
              {c.items.map((i) => (
                <li key={i}>
                  <a href="#top" className="text-[14px] text-muted-foreground transition-colors hover:text-primary">
                    {i}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-14 w-full max-w-6xl border-t border-border pt-6 text-[13px] text-muted-foreground">
        © 2026 Smrkonova Softech Solutions LLP. All rights reserved. Photography is illustrative stock imagery and does
        not depict SMRKOMED patients.
      </div>
    </footer>
  );
}

/* ---------------- Create clinic dialog ---------------- */

const specialties = ["Fertility", "IVF", "Dental", "Dermatology", "Maternity", "Aesthetics", "Other"];

export function CreateClinicDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [done, setDone] = useState(false);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-rise-in max-h-full w-full max-w-lg overflow-y-auto rounded-[28px] bg-card p-8 shadow-[var(--shadow-lift)]"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="py-10 text-center">
            <div className="gradient-brand mx-auto flex h-14 w-14 items-center justify-center rounded-full text-primary-foreground">
              ✓
            </div>
            <h2 className="mt-6 text-[24px] font-medium text-foreground">Your healthcare workspace is ready.</h2>
            <Btn className="mt-8" onClick={onClose}>
              Continue
            </Btn>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            <h2 className="text-[24px] font-medium text-foreground">Create your SMRKOMED clinic</h2>
            <div className="mt-7 space-y-4">
              <Field label="Clinic name" name="clinic" />
              <label className="block">
                <span className="text-[13px] text-muted-foreground">Healthcare specialty</span>
                <select
                  required
                  className="mt-1.5 h-12 w-full rounded-2xl border border-border bg-background px-4 text-[15px] text-foreground outline-none focus:border-primary/50"
                >
                  {specialties.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <Field label="Your name" name="name" />
              <Field label="Work email" name="email" type="email" />
              <Field label="Phone" name="phone" type="tel" />
            </div>
            <Btn className="mt-8 w-full" type="submit">
              Create Clinic
            </Btn>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <input
        required
        name={name}
        type={type}
        className="mt-1.5 h-12 w-full rounded-2xl border border-border bg-background px-4 text-[15px] text-foreground outline-none focus:border-primary/50"
      />
    </label>
  );
}
