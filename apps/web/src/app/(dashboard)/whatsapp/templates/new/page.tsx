"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { WhatsAppPhonePreview } from "@/components/whatsapp/center/whatsapp-preview";
import { WaStatusPill } from "@/components/whatsapp/center/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TEMPLATE_VARIABLES } from "@/lib/whatsapp/center-demo";
import { cn } from "@/lib/utils";

const STEPS = ["Content", "Buttons", "Preview", "Submit"] as const;

export default function CreateWhatsAppTemplatePage() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Appointment Confirmation");
  const [category, setCategory] = useState("Appointment");
  const [language, setLanguage] = useState("English");
  const [body, setBody] = useState(
    "Hello {{patient_name}}, your {{appointment_type}} is scheduled for {{appointment_date}} at {{appointment_time}}.",
  );
  const [buttons, setButtons] = useState<string[]>(["Confirm Appointment", "Need Help"]);
  const [buttonDraft, setButtonDraft] = useState("");

  const previewBody = useMemo(
    () =>
      body
        .replaceAll("{{patient_name}}", "Priya")
        .replaceAll("{{appointment_type}}", "Monitoring Scan")
        .replaceAll("{{appointment_date}}", "1 Sep")
        .replaceAll("{{appointment_time}}", "9:00 AM")
        .replaceAll("{{clinic_name}}", "ABC Fertility Centre")
        .replaceAll("{{doctor_name}}", "Dr. Ananya Rao")
        .replaceAll("{{care_stage}}", "Monitoring")
        .replaceAll("{{payment_amount}}", "₹5,000"),
    [body],
  );

  function insertVar(v: string) {
    setBody((prev) => `${prev}{{${v}}}`);
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Create WhatsApp Template</h2>
          <p className="text-sm text-muted-foreground">
            Keep it simple — content, buttons, preview, then submit for Meta approval.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/whatsapp/templates">Back to library</Link>
        </Button>
      </div>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(index)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold",
                step === index
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 bg-card text-muted-foreground",
              )}
            >
              <span className="tabular-nums">0{index + 1}</span> {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          {step === 0 ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label>Template name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label>Language</Label>
                  <Input value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Message body</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[140px] rounded-xl"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Variable helper</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVar(v)}
                      className="rounded-lg border border-border/70 bg-background px-2 py-1 font-mono text-[11px] text-primary hover:bg-primary-soft"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <WaStatusPill label="Text" tone="primary" />
                <WaStatusPill label="Image" tone="muted" />
                <WaStatusPill label="Video" tone="muted" />
                <WaStatusPill label="Document" tone="muted" />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Quick reply · Call to action · URL · Appointment / payment actions where supported.
              </p>
              <ul className="space-y-2">
                {buttons.map((b) => (
                  <li
                    key={b}
                    className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-sm"
                  >
                    {b}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setButtons((prev) => prev.filter((x) => x !== b))}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  value={buttonDraft}
                  onChange={(e) => setButtonDraft(e.target.value)}
                  placeholder="Button label"
                  className="rounded-xl"
                />
                <Button
                  type="button"
                  className="rounded-xl"
                  onClick={() => {
                    if (!buttonDraft.trim()) return;
                    setButtons((prev) => [...prev, buttonDraft.trim()]);
                    setButtonDraft("");
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-2 text-sm">
              <p className="font-semibold">{name}</p>
              <p className="text-muted-foreground">
                {category} · {language}
              </p>
              <p className="rounded-xl bg-muted/50 p-3 whitespace-pre-wrap">{previewBody}</p>
              <p className="text-xs text-muted-foreground">Confirm the live preview on the right before submit.</p>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <p className="text-sm">
                Submit for Meta approval. Until approved, this template cannot be used in live automation sends.
              </p>
              <Button
                className="rounded-xl"
                onClick={() => toast.success("Template draft saved for approval (preview).")}
              >
                Submit for approval
              </Button>
            </div>
          ) : null}

          <div className="flex justify-between border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={step === STEPS.length - 1}
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              Continue
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Live WhatsApp preview
          </p>
          <WhatsAppPhonePreview body={previewBody} buttons={buttons} header={name} footer="ABC Fertility Centre" />
        </div>
      </div>
    </div>
  );
}
