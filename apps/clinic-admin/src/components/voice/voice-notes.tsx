"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CONSULTATION_LANGUAGES,
  type ConsultationLanguageCode,
} from "@/lib/voice/languages";

type NoteItem = {
  id: string;
  consultationDate: string;
  summary: string;
  author: string;
  reasonForVisit?: string | null;
  nextSteps?: string | null;
};

type Props = {
  coupleId: string;
  coupleLabel: string;
  onSaved?: () => void;
  /** Parent can open consent (e.g. Prepare Consultation CTA). */
  consentOpen?: boolean;
  onConsentOpenChange?: (open: boolean) => void;
};

type ProcessStage = "idle" | "uploading" | "transcribing" | "summarizing" | "preparing";

const STAGE_LABEL: Record<Exclude<ProcessStage, "idle">, string> = {
  uploading: "Uploading temporarily…",
  transcribing: "Transcribing…",
  summarizing: "Creating summary…",
  preparing: "Preparing notes…",
};

export function VoiceNotesPanel({
  coupleId,
  coupleLabel,
  onSaved,
  consentOpen: consentOpenProp,
  onConsentOpenChange,
}: Props) {
  const [consentOpenInternal, setConsentOpenInternal] = useState(false);
  const consentOpen = consentOpenProp ?? consentOpenInternal;
  const setConsentOpen = onConsentOpenChange ?? setConsentOpenInternal;
  const [consentChecked, setConsentChecked] = useState(false);
  const [language, setLanguage] = useState<ConsultationLanguageCode>("en");
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [stage, setStage] = useState<ProcessStage>("idle");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [reasonForVisit, setReasonForVisit] = useState<string | undefined>();
  const [nextSteps, setNextSteps] = useState<string | undefined>();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const languageRef = useRef(language);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/voice/notes?coupleId=${encodeURIComponent(coupleId)}`);
      const json = (await res.json()) as { success?: boolean; data?: NoteItem[] };
      if (res.ok && json.success && json.data) setNotes(json.data);
    } catch {
      /* ignore */
    }
  }, [coupleId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadNotes();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [loadNotes]);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    setConsentOpen(false);
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        void processRecording();
      };
      recorder.start(1000);
      setRecording(true);
      setPaused(false);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    } catch {
      setMicError(
        "Microphone access was denied or is unavailable. Allow microphone permission in your browser and try again.",
      );
      toast.error("Microphone permission is required for Voice Notes.");
    }
  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.pause();
    setPaused(true);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    recorder.resume();
    setPaused(false);
    timerRef.current = window.setInterval(() => setElapsed((value) => value + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    setPaused(false);
    stopTracks();
  };

  const processRecording = async () => {
    setStage("uploading");
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      const form = new FormData();
      form.append("audio", blob, "consultation.webm");
      form.append("language", languageRef.current);

      setStage("transcribing");
      const transcribeRes = await fetch("/api/voice/transcribe", { method: "POST", body: form });
      const transcribeJson = (await transcribeRes.json()) as {
        success?: boolean;
        data?: { transcript: string };
        error?: { message?: string };
      };
      // Audio blob goes out of scope — never persisted client-side after this request.
      if (!transcribeRes.ok || !transcribeJson.success || !transcribeJson.data?.transcript) {
        throw new Error(transcribeJson.error?.message || "Voice processing failed. Please try again.");
      }

      setStage("summarizing");
      const langLabel =
        CONSULTATION_LANGUAGES.find((item) => item.code === languageRef.current)?.label ?? "English";
      const summarizeRes = await fetch("/api/voice/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcribeJson.data.transcript,
          coupleLabel,
          summaryLanguage: langLabel,
        }),
      });
      const summarizeJson = (await summarizeRes.json()) as {
        success?: boolean;
        data?: { summary: string; reasonForVisit?: string; nextSteps?: string };
        error?: { message?: string };
      };
      if (!summarizeRes.ok || !summarizeJson.success || !summarizeJson.data?.summary) {
        throw new Error(
          summarizeJson.error?.message || "Unable to generate the consultation summary.",
        );
      }

      setStage("preparing");
      setSummary(summarizeJson.data.summary);
      setReasonForVisit(summarizeJson.data.reasonForVisit);
      setNextSteps(summarizeJson.data.nextSteps);
      setSummaryOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Voice processing failed. Please try again.");
    } finally {
      setStage("idle");
    }
  };

  const saveSummary = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/voice/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coupleId,
          summary,
          reasonForVisit,
          nextSteps,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Unable to save consultation summary.");
      }
      toast.success("Consultation summary saved to patient record");
      setSummaryOpen(false);
      setSummary("");
      await loadNotes();
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save consultation summary.");
    } finally {
      setSaving(false);
    }
  };

  const formatElapsed = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const processing = stage !== "idle";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/20 p-4 text-sm">
        <p className="font-semibold">Before you start</p>
        <p className="mt-1 text-muted-foreground">
          This feature converts the consultation into written notes. Audio is not stored after
          transcription — only the reviewed summary is saved when you confirm.
        </p>
      </div>

      {micError && (
        <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {micError}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="consultation-language">Consultation language</Label>
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as ConsultationLanguageCode)}
            disabled={recording || processing}
          >
            <SelectTrigger id="consultation-language" className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONSULTATION_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!recording && !processing && (
          <Button
            type="button"
            className="min-h-11"
            onClick={() => {
              setConsentChecked(false);
              setConsentOpen(true);
            }}
          >
            <Mic className="size-4" /> Start Voice Notes
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => void loadNotes()}>
          Refresh summaries
        </Button>
      </div>

      {recording && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft px-3 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-danger">
            <span className="size-2 animate-pulse rounded-full bg-danger" />
            {paused ? "Paused" : "REC"}
          </span>
          <span className="font-mono text-sm tabular-nums">{formatElapsed}</span>
          {paused ? (
            <Button type="button" size="sm" variant="outline" onClick={resumeRecording}>
              <Play className="size-3.5" /> Resume
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={pauseRecording}>
              <Pause className="size-3.5" /> Pause
            </Button>
          )}
          <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
            <Square className="size-3.5" /> Stop
          </Button>
        </div>
      )}

      {processing && (
        <div className="space-y-2 rounded-xl border p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="size-4 animate-spin" /> Processing consultation…
          </p>
          <ol className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            {(Object.keys(STAGE_LABEL) as Array<keyof typeof STAGE_LABEL>).map((key) => (
              <li key={key} className={stage === key ? "font-semibold text-foreground" : ""}>
                {STAGE_LABEL[key]}
              </li>
            ))}
          </ol>
        </div>
      )}

      {notes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Consultation summaries</h3>
          {notes.map((note) => (
            <article key={note.id} className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">
                {new Date(note.consultationDate).toLocaleString("en-IN")} · {note.author}
              </p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{note.summary}</pre>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={consentOpen}
        onOpenChange={(open) => {
          setConsentOpen(open);
          if (!open) setConsentChecked(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Before you start</DialogTitle>
            <DialogDescription>
              This feature converts the consultation into written notes. Audio is not stored after
              transcription.
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
            <Checkbox
              checked={consentChecked}
              onCheckedChange={(value) => setConsentChecked(value === true)}
              className="mt-0.5"
            />
            <span>
              I have obtained the patient&apos;s consent to record/transcribe this consultation.
            </span>
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConsentOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={!consentChecked} onClick={() => void startRecording()}>
              Start Voice Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Consultation summary</DialogTitle>
            <DialogDescription>
              Review and edit before saving. Nothing is stored until you confirm. Audio was not
              saved.
              <span className="mt-1 block text-xs">
                AI-generated summary. Please review before saving.
              </span>
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className="min-h-64"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSummaryOpen(false)}>
              Discard
            </Button>
            <Button
              type="button"
              disabled={saving || summary.trim().length < 20}
              onClick={() => void saveSummary()}
            >
              {saving ? "Saving…" : "Save to Patient Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
