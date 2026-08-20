"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ClipboardList, Mic } from "lucide-react";

import { useSmrkoAiBuddy } from "@/components/ai/smrko-ai-host";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui-kit";
import type { Appointment, CareTask, Couple, DocumentItem, LoopActivity } from "@/lib/demo-data";

type NoteItem = {
  id: string;
  consultationDate: string;
  summary: string;
  reasonForVisit?: string | null;
  nextSteps?: string | null;
};

type Props = {
  couple: Couple;
  tasks: CareTask[];
  appointments: Appointment[];
  documents: DocumentItem[];
  activity: LoopActivity[];
  onStartVoice: () => void;
};

export function PrepareConsultation({
  couple,
  tasks,
  appointments,
  documents,
  activity,
  onStartVoice,
}: Props) {
  const { ask } = useSmrkoAiBuddy();
  const [notes, setNotes] = useState<NoteItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/voice/notes?coupleId=${encodeURIComponent(couple.id)}`)
      .then((res) => res.json())
      .then((json: { success?: boolean; data?: NoteItem[] }) => {
        if (!cancelled && json.success && json.data) setNotes(json.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [couple.id]);

  const last = notes[0];
  const openTasks = tasks.filter((t) => t.status !== "completed");
  const upcoming = appointments.filter(
    (a) => a.status === "Confirmed" || a.status === "Waiting",
  );
  const importantDocs = documents.slice(0, 5);

  const discussionPoints = [
    last?.nextSteps ? `Follow up on recorded next steps: ${last.nextSteps}` : null,
    openTasks[0] ? `Review open task: ${openTasks[0].title}` : null,
    upcoming[0] ? `Confirm upcoming ${upcoming[0].type} at ${upcoming[0].time}` : null,
    couple.nextStep ? `Care-plan next step on record: ${couple.nextStep}` : null,
  ].filter(Boolean) as string[];

  return (
    <section className="surface-card space-y-4 p-4">
      <SectionHeading
        title="Prepare Consultation"
        subtitle="Briefing from SmrkoMed records only — not medical advice"
        icon={ClipboardList}
        tone="primary"
      />

      <p className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        AI-generated summary — review before use. Discussion points are operational prompts from
        existing records only.
      </p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <Row label="Patient / couple" value={`${couple.primary.name}${couple.partner ? ` & ${couple.partner.name}` : ""}`} />
        <Row label="Treatment" value={couple.treatment} />
        <Row label="Current stage" value={couple.stage} />
        <Row label="Doctor / coordinator" value={`${couple.doctor} · ${couple.coordinator}`} />
      </dl>

      <SectionBlock title="Last visit">
        {last ? (
          <div className="space-y-1 text-sm">
            <p className="text-xs text-muted-foreground">
              {new Date(last.consultationDate).toLocaleString("en-IN")}
            </p>
            <p>{last.reasonForVisit || "Reason not recorded."}</p>
            <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground">
              {last.summary.slice(0, 600)}
              {last.summary.length > 600 ? "…" : ""}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No saved consultation summary.</p>
        )}
      </SectionBlock>

      <SectionBlock title="Current status">
        <p className="text-sm">
          {couple.treatment} · {couple.stage} · Care Loop {couple.careLoop} · {couple.status}
        </p>
      </SectionBlock>

      <SectionBlock title="Open items">
        {openTasks.length ? (
          <ul className="space-y-1 text-sm">
            {openTasks.slice(0, 6).map((t) => (
              <li key={t.id}>
                · {t.title} ({t.status})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No open tasks.</p>
        )}
      </SectionBlock>

      <SectionBlock title="Upcoming">
        {upcoming.length ? (
          <ul className="space-y-1 text-sm">
            {upcoming.slice(0, 4).map((a) => (
              <li key={a.id}>
                · {a.type} · {a.time} · {a.doctor}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming appointments in records.</p>
        )}
      </SectionBlock>

      <SectionBlock title="Recent notes">
        {activity.length ? (
          <ul className="space-y-1 text-sm">
            {activity.slice(0, 4).map((a) => (
              <li key={a.id}>
                · {a.activity} ({a.time})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No recent timeline events.</p>
        )}
        {importantDocs.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {importantDocs.map((d) => (
              <li key={d.id}>
                · Document: {d.name} ({d.status})
              </li>
            ))}
          </ul>
        )}
      </SectionBlock>

      <SectionBlock title="Questions / follow-ups to consider">
        {discussionPoints.length ? (
          <ul className="space-y-1 text-sm">
            {discussionPoints.map((p) => (
              <li key={p}>· {p}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No discussion points available from existing records. Never invent clinical questions.
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Operational prompts only — not diagnosis, medication, or treatment recommendations.
        </p>
      </SectionBlock>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onStartVoice}>
          <Mic className="size-4" /> Start Consultation Voice Notes
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => ask("Prepare me for this patient's consultation")}
        >
          Ask Smrko AI
        </Button>
      </div>
    </section>
  );
}

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
