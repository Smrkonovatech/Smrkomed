"use client";

import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Send,
  Smile,
  Square,
  Video,
  X,
  Loader2,
  Pause,
  Play,
  FileStack,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiGet, apiPost, apiUpload } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type ApprovedTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  sendable: boolean;
  header?: string | null;
  body?: string | null;
  footer?: string | null;
  parsed?: {
    variables: Array<{ component: string; token: string; key: string }>;
    header: string | null;
    body: string | null;
    footer: string | null;
  };
};

type PatientDoc = { id: string; name: string; sendable: boolean };

type PendingAttachment = {
  file: File;
  kind: "IMAGE" | "VIDEO" | "DOCUMENT" | "AUDIO";
  previewUrl?: string;
  isVoice?: boolean;
  durationSeconds?: number;
};

const QUICK_EMOJI = ["😊", "🙏", "👍", "✅", "📅", "🏥", "❤️", "👋"];

type Props = {
  conversationId: string;
  patientId?: string | null;
  coupleId?: string | null;
  partnerInfo?: {
    name: string;
    phone: string | null;
    conversationId?: string | null;
    primaryName?: string | null;
  } | null;
  onSwitchConversation?: (convId: string) => void;
  disabled?: boolean;
  onTyping?: () => void;
  onSent?: () => void;
  draftText?: string;
};

export function ChatComposer({
  conversationId,
  patientId,
  coupleId,
  partnerInfo,
  onSwitchConversation,
  disabled,
  onTyping,
  onSent,
  draftText,
}: Props) {
  const [text, setText] = useState("");
  const [sendToCouple, setSendToCouple] = useState(false);

  useEffect(() => {
    if (draftText !== undefined && draftText !== "") {
      setText(draftText);
    }
  }, [draftText]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pending, setPending] = useState<PendingAttachment | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [docsOpen, setDocsOpen] = useState(false);
  const [docs, setDocs] = useState<PatientDoc[]>([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [docCaption, setDocCaption] = useState("");

  const [tplOpen, setTplOpen] = useState(false);
  const [templates, setTemplates] = useState<ApprovedTemplate[]>([]);
  const [selectedTpl, setSelectedTpl] = useState<ApprovedTemplate | null>(null);
  const [tplOverrides, setTplOverrides] = useState<Record<string, string>>({});

  const [recording, setRecording] = useState(false);
  const [recPaused, setRecPaused] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileImageRef = useRef<HTMLInputElement>(null);
  const fileVideoRef = useRef<HTMLInputElement>(null);
  const fileDocRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
      stopRecorderCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopRecorderCleanup() {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    recTimerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }

  const clearPending = () => {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
    setProgress(null);
    setSendError(null);
  };

  const pickFile = (file: File, kind: PendingAttachment["kind"], isVoice = false, durationSeconds?: number) => {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    const next: PendingAttachment = { file, kind };
    if (kind === "IMAGE" || kind === "VIDEO" || kind === "AUDIO") {
      next.previewUrl = URL.createObjectURL(file);
    }
    if (isVoice) next.isVoice = true;
    if (durationSeconds != null) next.durationSeconds = durationSeconds;
    setPending(next);
    setAttachOpen(false);
    setSendError(null);
  };

  const onFileInput =
    (kind: PendingAttachment["kind"]) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) pickFile(file, kind);
    };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        pickFile(file, "AUDIO", true, recSeconds);
        stopRecorderCleanup();
        setRecording(false);
        setRecPaused(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
      setRecPaused(false);
      setRecSeconds(0);
      setAttachOpen(false);
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("Microphone permission is required for voice notes.");
    }
  };

  const pauseRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== "recording") return;
    rec.pause();
    setRecPaused(true);
    if (recTimerRef.current) clearInterval(recTimerRef.current);
  };

  const resumeRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state !== "paused") return;
    rec.resume();
    setRecPaused(false);
    recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
  };

  const cancelRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      rec.stop();
    }
    stopRecorderCleanup();
    setRecording(false);
    setRecPaused(false);
    setRecSeconds(0);
  };

  const finishRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    if (recTimerRef.current) clearInterval(recTimerRef.current);
  };

  const loadDocs = async () => {
    try {
      const res = await apiGet<{ items: PatientDoc[] }>(
        `/api/v1/whatsapp-automation/inbox/${conversationId}/patient-documents`,
      );
      setDocs(res.items);
      setDocsOpen(true);
      setAttachOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load patient documents.");
    }
  };

  const loadTemplates = async () => {
    try {
      const rows = await apiGet<ApprovedTemplate[]>("/api/v1/integrations/whatsapp/templates/approved");
      setTemplates(rows.filter((t) => t.sendable));
      setTplOpen(true);
      setSelectedTpl(null);
      setTplOverrides({});
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not load approved templates.");
    }
  };

  const sendText = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError(null);
    try {
      if (sendToCouple && coupleId) {
        await apiPost(`/api/v1/whatsapp-automation/couples/${coupleId}/reply`, { body });
        toast.success("Broadcast sent to both primary patient and partner!");
      } else {
        await apiPost(`/api/v1/whatsapp-automation/inbox/${conversationId}/reply`, { body });
      }
      setText("");
      onSent?.();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Send failed. Session window may be closed — use an approved template.";
      setSendError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const sendPendingMedia = async () => {
    if (!pending || sending) return;
    setSending(true);
    setSendError(null);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.set("file", pending.file);
      fd.set("kind", pending.kind);
      if (text.trim()) fd.set("caption", text.trim());
      if (pending.isVoice) fd.set("isVoice", "true");
      if (pending.durationSeconds != null) fd.set("durationSeconds", String(pending.durationSeconds));
      await apiUpload(`/api/v1/whatsapp-automation/inbox/${conversationId}/media`, fd, {
        onProgress: setProgress,
      });
      setText("");
      clearPending();
      onSent?.();
      toast.success("Media sent.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Media send failed.";
      setSendError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
      setProgress(null);
    }
  };

  const sendDocument = async () => {
    if (!selectedDocId || sending) return;
    setSending(true);
    try {
      await apiPost(`/api/v1/whatsapp-automation/inbox/${conversationId}/send-document`, {
        documentId: selectedDocId,
        ...(docCaption.trim() ? { caption: docCaption.trim() } : {}),
      });
      setDocsOpen(false);
      setSelectedDocId("");
      setDocCaption("");
      onSent?.();
      toast.success("Document sent.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send document.");
    } finally {
      setSending(false);
    }
  };

  const sendTemplate = async () => {
    if (!selectedTpl || sending) return;
    setSending(true);
    try {
      await apiPost(`/api/v1/whatsapp-automation/inbox/${conversationId}/send-template`, {
        templateId: selectedTpl.id,
        overrides: tplOverrides,
        confirm: true,
      });
      setTplOpen(false);
      setSelectedTpl(null);
      onSent?.();
      toast.success("Template sent.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Template send failed.");
    } finally {
      setSending(false);
    }
  };

  const primarySend = () => {
    if (pending) void sendPendingMedia();
    else void sendText();
  };

  const formatRec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <footer className="space-y-2 border-t bg-card/60 p-3">
      <p className="text-[10px] text-muted-foreground">
        Clinic staff composer · Patient messages open Meta&apos;s 24h session window for free-form
        replies. If a send fails outside that window, use an approved template.
        {patientId ? null : " Unlinked contact — templates & patient documents may be limited."}
      </p>

      {recording ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          <span className="inline-flex size-2 animate-pulse rounded-full bg-rose-600" />
          <span className="font-medium">{recPaused ? "Paused" : "Recording"} {formatRec(recSeconds)}</span>
          {typeof MediaRecorder !== "undefined" && "pause" in MediaRecorder.prototype ? (
            recPaused ? (
              <Button size="sm" variant="outline" onClick={resumeRecording}>
                <Play className="size-3.5" /> Resume
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={pauseRecording}>
                <Pause className="size-3.5" /> Pause
              </Button>
            )
          ) : null}
          <Button size="sm" variant="outline" onClick={cancelRecording}>
            Cancel
          </Button>
          <Button size="sm" onClick={finishRecording}>
            <Square className="size-3.5" /> Use recording
          </Button>
        </div>
      ) : null}

      {pending ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Attachment preview · {pending.kind}
                {pending.isVoice ? " (voice)" : ""}
              </p>
              <p className="truncate text-xs">{pending.file.name}</p>
              {pending.kind === "IMAGE" && pending.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pending.previewUrl} alt="" className="mt-1 max-h-32 rounded-md object-contain" />
              ) : null}
              {pending.kind === "VIDEO" && pending.previewUrl ? (
                <video src={pending.previewUrl} controls className="mt-1 max-h-32 rounded-md" preload="metadata" />
              ) : null}
              {pending.kind === "AUDIO" && pending.previewUrl ? (
                <audio src={pending.previewUrl} controls className="mt-1 w-full" preload="metadata" />
              ) : null}
              {progress != null ? (
                <div className="mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">Uploading {progress}%</p>
                </div>
              ) : null}
              {sending && progress == null ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Sending to WhatsApp…
                </p>
              ) : null}
            </div>
            <Button size="sm" variant="ghost" disabled={sending} onClick={clearPending}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {sendError ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
          <span className="flex-1">{sendError}</span>
          <Button size="sm" variant="outline" disabled={sending} onClick={() => void primarySend()}>
            Retry
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSendError(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}

      {docsOpen ? (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Patient document</p>
            <Button size="sm" variant="ghost" onClick={() => setDocsOpen(false)}>
              Close
            </Button>
          </div>
          <select
            className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
          >
            <option value="">Select document…</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id} disabled={!d.sendable}>
                {d.name}
                {d.sendable ? "" : " (not stored)"}
              </option>
            ))}
          </select>
          <Input
            placeholder='Optional message, e.g. "Hi, please find your latest report."'
            value={docCaption}
            onChange={(e) => setDocCaption(e.target.value)}
          />
          <Button size="sm" disabled={!selectedDocId || sending} onClick={() => void sendDocument()}>
            Send document
          </Button>
        </div>
      ) : null}

      {tplOpen ? (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Approved Meta template</p>
            <Button size="sm" variant="ghost" onClick={() => setTplOpen(false)}>
              Close
            </Button>
          </div>
          <select
            className="flex h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={selectedTpl?.id ?? ""}
            onChange={(e) => {
              const next = templates.find((t) => t.id === e.target.value) ?? null;
              setSelectedTpl(next);
              setTplOverrides({});
            }}
          >
            <option value="">Select approved template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.language})
              </option>
            ))}
          </select>
          {selectedTpl ? (
            <>
              <div className="rounded-md bg-muted/40 p-2 text-xs whitespace-pre-wrap">
                {selectedTpl.parsed?.header || selectedTpl.header ? (
                  <p className="font-semibold">{selectedTpl.parsed?.header || selectedTpl.header}</p>
                ) : null}
                <p>{selectedTpl.parsed?.body || selectedTpl.body}</p>
                {selectedTpl.parsed?.footer || selectedTpl.footer ? (
                  <p className="text-muted-foreground">{selectedTpl.parsed?.footer || selectedTpl.footer}</p>
                ) : null}
              </div>
              {(selectedTpl.parsed?.variables ?? []).map((slot) => (
                <div key={`${slot.key}-${slot.token}`} className="space-y-1">
                  <Label className="text-xs">
                    {slot.component} {`{{${slot.token}}}`}
                  </Label>
                  <Input
                    value={tplOverrides[slot.key] ?? ""}
                    onChange={(e) =>
                      setTplOverrides((prev) => ({
                        ...prev,
                        [slot.key]: e.target.value,
                        [slot.token]: e.target.value,
                      }))
                    }
                    placeholder={slot.key}
                  />
                </div>
              ))}
              <Button size="sm" disabled={sending} onClick={() => void sendTemplate()}>
                Confirm & send template
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-xs focus-within:border-[#7C3AED] focus-within:ring-2 focus-within:ring-[#7C3AED]/10 transition-all">
        {coupleId && (
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-gray-100 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Users className="size-3 text-emerald-600 shrink-0" />
              <span className="font-semibold text-gray-700">Couple:</span>
              <span className="text-gray-600 truncate">
                {partnerInfo?.primaryName || "Primary"} & {partnerInfo?.name || "Partner"}
              </span>
            </div>
            <div className="inline-flex rounded-full bg-gray-100 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setSendToCouple(false)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full font-medium transition-colors",
                  !sendToCouple ? "bg-white text-gray-800 shadow-xs font-semibold" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Patient only
              </button>
              <button
                type="button"
                onClick={() => setSendToCouple(true)}
                className={cn(
                  "px-2.5 py-0.5 rounded-full font-medium transition-colors flex items-center gap-1",
                  sendToCouple ? "bg-emerald-600 text-white shadow-xs font-semibold" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Users className="size-3" /> Both
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          <Textarea
            rows={2}
            placeholder={pending ? "Optional caption…" : sendToCouple ? "Write a message to broadcast to BOTH partners…" : "Send a message"}
            value={text}
            disabled={disabled || sending || recording}
            onChange={(e) => {
              setText(e.target.value);
              onTyping?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                primarySend();
              }
            }}
            className="w-full resize-none border-0 p-0 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0 shadow-none bg-transparent min-h-[44px]"
          />
          {emojiOpen ? (
            <div className="absolute bottom-full left-0 z-20 mb-2 flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg animate-in fade-in">
              {QUICK_EMOJI.map((em) => (
                <button
                  key={em}
                  type="button"
                  className="rounded-lg p-1.5 text-lg hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    setText((t) => t + em);
                    setEmojiOpen(false);
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-50">
          <div className="flex items-center gap-1 relative">
            <button
              type="button"
              disabled={disabled || sending}
              onClick={() => setEmojiOpen((o) => !o)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Add emoji"
            >
              <Smile className="size-5" />
            </button>
            <button
              type="button"
              disabled={disabled || sending || recording}
              onClick={() => setAttachOpen((o) => !o)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Attach media or file"
            >
              <Paperclip className="size-5" />
            </button>

            {attachOpen ? (
              <div className="absolute bottom-full left-0 z-20 mb-2 min-w-[200px] rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl animate-in fade-in">
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => void loadDocs()}
                >
                  <FileStack className="size-4 text-purple-600" /> Patient Document
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => fileDocRef.current?.click()}
                >
                  <FileText className="size-4 text-blue-600" /> Upload Document
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => fileImageRef.current?.click()}
                >
                  <ImageIcon className="size-4 text-emerald-600" /> Image
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => fileVideoRef.current?.click()}
                >
                  <Video className="size-4 text-amber-600" /> Video
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => void startRecording()}
                >
                  <Mic className="size-4 text-rose-600" /> Voice Note
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled || sending}
              onClick={() => void loadTemplates()}
              className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              Templates
            </button>
            <button
              type="button"
              disabled={disabled || sending || recording || (!text.trim() && !pending)}
              onClick={() => void primarySend()}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs",
                (!text.trim() && !pending) || disabled || sending
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : sendToCouple
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-[#7C3AED] hover:bg-[#6D28D9] text-white"
              )}
            >
              {sending && <Loader2 className="size-3.5 animate-spin" />}
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>

      <input ref={fileImageRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileInput("IMAGE")} />
      <input ref={fileVideoRef} type="file" accept="video/mp4,video/3gpp" className="hidden" onChange={onFileInput("VIDEO")} />
      <input
        ref={fileDocRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,application/pdf"
        className="hidden"
        onChange={onFileInput("DOCUMENT")}
      />
    </footer>
  );
}
