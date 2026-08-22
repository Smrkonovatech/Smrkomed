import { useEffect, useState } from "react";
import voicePhoto from "@/assets/photo-voice.png.asset.json";
import recordingPhoto from "@/assets/photo-recording.png.asset.json";
import { Eyebrow, Section } from "./primitives";

/* ---------------- 06 · Voice ---------------- */

const transcript = [
  "Patient reports improved symptoms since the last visit.",
  "Continue current medication for two more weeks.",
  "Blood test before the next consultation.",
  "Follow up after 2 weeks.",
];

const tasks = [
  { t: "Schedule follow-up", done: true },
  { t: "Review blood report", done: true },
  { t: "Contact patient", done: false },
  { t: "Prepare next consultation", done: false },
];

export function VoiceSection() {
  const [lines, setLines] = useState(1);

  useEffect(() => {
    const id = setInterval(() => setLines((l) => (l >= transcript.length ? 1 : l + 1)), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <Section id="ai">
      <div className="max-w-[50ch]">
        <Eyebrow>Voice</Eyebrow>
        <h2 className="mt-6 text-[32px] leading-[1.12] font-light text-foreground md:text-[46px]">
          From conversation to <span className="font-semibold">structured care.</span>
        </h2>
        <p className="mt-6 text-[17px] leading-relaxed text-muted-foreground">
          Record a consultation with consent. SMRKOMED converts what was said into a structured summary and the next
          steps your team can act on.
        </p>
      </div>

      <div className="mt-14 grid items-start gap-8 lg:grid-cols-2">
        <div className="photo-frame">
          <img
            src={voicePhoto.url}
            alt="Doctor in consultation with a patient while the visit is captured"
            width={1920}
            height={1102}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="space-y-4">
          <div className="surface-card p-7">
            <div className="flex items-center gap-3">
              <span className="flex items-end gap-[3px]">
                {[10, 18, 26, 16, 22, 12].map((h, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-primary/70"
                    style={{ height: h, animation: `pulse-ring 1.6s ease-in-out ${i * 0.12}s infinite` }}
                  />
                ))}
              </span>
              <span className="text-[12px] tracking-[0.16em] text-primary uppercase">Doctor speaks</span>
            </div>
            <div className="mt-5 space-y-2">
              {transcript.slice(0, lines).map((l) => (
                <p key={l} className="animate-rise-in text-[15px] leading-relaxed text-muted-foreground">
                  {l}
                </p>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 text-[12px] tracking-[0.16em] text-primary uppercase">
            <span className="h-px w-10 bg-primary/30" /> SMRKOMED AI <span className="h-px w-10 bg-primary/30" />
          </div>

          <div className="surface-card p-7">
            <div className="text-[11px] tracking-[0.16em] text-primary uppercase">Consultation summary</div>
            <dl className="mt-5 space-y-4 text-[15px]">
              <div>
                <dt className="text-[13px] text-muted-foreground">Reason</dt>
                <dd className="text-foreground">Follow-up consultation</dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted-foreground">Observations</dt>
                <dd className="text-foreground">Symptoms improving, medication tolerated well.</dd>
              </div>
              <div>
                <dt className="text-[13px] text-muted-foreground">Next steps</dt>
                <dd className="mt-2 space-y-2">
                  {["Blood test", "Review after 2 weeks", "Schedule follow-up"].map((n) => (
                    <span
                      key={n}
                      className="mr-2 inline-flex rounded-xl bg-lavender px-3.5 py-2 text-[13.5px] text-foreground"
                    >
                      {n}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </div>

          <div className="surface-card p-7">
            <div className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Next steps · tasks</div>
            <ul className="mt-4 space-y-2.5">
              {tasks.map((t) => (
                <li key={t.t} className="flex items-center gap-3 text-[14.5px] text-foreground">
                  <span className={t.done ? "text-primary" : "text-muted-foreground"}>{t.done ? "✓" : "○"}</span>
                  {t.t}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Audio is processed temporarily and is not stored as a permanent recording. Only approved consultation
            information is retained.
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ---------------- 07 · Conversation → action ---------------- */

const chain = [
  { t: "Doctor speaks", d: "A real consultation" },
  { t: "SMRKOMED understands", d: "Language becomes meaning" },
  { t: "Structured notes", d: "Summary, observations, next steps" },
  { t: "Tasks", d: "Owners and due dates" },
  { t: "Care Loop", d: "Followed through to completion" },
];

export function ConversationToAction() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % chain.length), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <Section className="gradient-veil border-y border-border">
      <div className="max-w-[50ch]">
        <Eyebrow>Conversation → action</Eyebrow>
        <h2 className="mt-6 text-[32px] leading-[1.12] font-light text-foreground md:text-[46px]">
          A conversation shouldn't disappear <span className="font-semibold">when the consultation ends.</span>
        </h2>
        <p className="mt-6 text-[17px] leading-relaxed text-muted-foreground">
          SMRKOMED turns conversations into structured information, tasks and follow-ups.
        </p>
      </div>

      <div className="mt-14 grid items-center gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="photo-frame">
          <img
            src={recordingPhoto.url}
            alt="Consultation being captured on a phone beside the doctor and patient"
            width={1024}
            height={1024}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
          {chain.map((c, i) => (
            <div key={c.t} className="flex flex-1 items-center gap-3 md:flex-col">
              <div
                className={`w-full flex-1 rounded-[22px] border p-5 transition-all duration-500 ${
                  i <= active
                    ? "border-primary/30 bg-card shadow-[var(--shadow-soft)]"
                    : "border-border bg-card/50 opacity-55"
                }`}
              >
                <div className="text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="mt-3 text-[15px] font-medium text-foreground">{c.t}</div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{c.d}</p>
              </div>
              {i < chain.length - 1 && <span className="text-primary/45 md:rotate-90">→</span>}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
