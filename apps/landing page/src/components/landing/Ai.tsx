import aiHuman from "@/assets/ai-human.jpg";
import mark from "@/assets/smrkomed-mark.png.asset.json";
import { Btn, Eyebrow, Section } from "./primitives";

/* ---------------- 09 · SMRKOMED AI command center ---------------- */

const metrics = [
  { v: "12", l: "Appointments" },
  { v: "7", l: "Follow-ups" },
  { v: "4", l: "Overdue tasks" },
  { v: "3", l: "Patients need attention" },
];

export function SmrkoAI() {
  return (
    <Section className="gradient-veil border-y border-border">
      <div className="max-w-[46ch]">
        <Eyebrow>SMRKOMED AI</Eyebrow>
        <h2 className="mt-6 text-[32px] leading-[1.12] font-light text-foreground md:text-[46px]">
          Meet <span className="font-semibold">SMRKOMED AI.</span>
        </h2>
        <p className="mt-6 text-[17px] leading-relaxed text-muted-foreground">
          Your clinic's operational intelligence layer.
        </p>
      </div>

      <div className="surface-card mt-12 p-7 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">Good morning</div>
            <h3 className="mt-2 text-[24px] font-medium text-foreground">Today's attention</h3>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-[11px] tracking-wider text-muted-foreground uppercase">
            Demo data
          </span>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.l} className="rounded-[20px] border border-border bg-lavender-soft p-6">
              <div className="text-[34px] leading-none font-semibold text-foreground">{m.v}</div>
              <div className="mt-2 text-[13px] text-muted-foreground">{m.l}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[24px] bg-lavender p-7">
          <div className="flex items-start gap-4">
            <img src={mark.url} alt="" width={40} height={40} className="h-10 w-10 rounded-full" loading="lazy" />
            <div className="flex-1">
              <div className="text-[13px] font-medium text-foreground">SMRKOMED AI</div>
              <p className="mt-2 text-[16px] text-foreground">
                "I found 3 patients who may need follow-up today."
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Btn className="h-11 px-5 text-[14px]">View patients</Btn>
                <Btn variant="secondary" className="h-11 px-5 text-[14px]">
                  Prepare my day
                </Btn>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------------- 10 · AI + human ---------------- */

const aiSide = ["Summarises", "Organises", "Finds", "Reminds", "Drafts", "Prepares"];
const humanSide = ["Decides", "Consults", "Cares", "Communicates", "Treats"];

export function AiHuman() {
  return (
    <Section>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-[32px] leading-[1.12] font-light text-foreground md:text-[48px]">
          AI handles the routine. <span className="font-semibold">People handle what matters.</span>
        </h2>
      </div>

      <div className="mt-16 grid items-center gap-8 lg:grid-cols-[1fr_0.9fr_1fr]">
        <div className="space-y-2.5">
          <div className="text-[12px] tracking-[0.18em] text-primary uppercase">AI</div>
          {aiSide.map((a) => (
            <div key={a} className="rounded-[16px] border border-border bg-card px-5 py-3.5 text-[15px] text-foreground">
              {a}
            </div>
          ))}
        </div>

        <div className="relative order-first lg:order-none">
          <div className="gradient-brand absolute inset-6 rounded-[40px] opacity-25 blur-2xl" />
          <div className="photo-frame relative">
            <img
              src={aiHuman}
              alt="Doctor in a modern clinic"
              width={1024}
              height={1280}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="text-[12px] tracking-[0.18em] text-blue-accent uppercase">Healthcare team</div>
          {humanSide.map((h) => (
            <div key={h} className="rounded-[16px] border border-border bg-card px-5 py-3.5 text-[15px] text-foreground">
              {h}
            </div>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-12 max-w-[60ch] text-center text-[15px] leading-relaxed text-muted-foreground">
        SMRKOMED never makes clinical decisions. It prepares the work so healthcare teams can spend their attention
        where it matters.
      </p>
    </Section>
  );
}
