"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Bot,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Globe2,
  Headphones,
  Loader2,
  PhoneCall,
  Sparkles,
  User,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SarvamCallItem } from "@/app/api/ai/call-logs/route";

export interface TranscriptMessage {
  turn_id: number;
  role: "assistant" | "user" | string;
  content: string;
  language_name: string;
}

interface CallTranscriptDialogProps {
  call: SarvamCallItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRedial?: (phone: string, name?: string) => void;
}

export function CallTranscriptDialog({
  call,
  open,
  onOpenChange,
  onRedial,
}: CallTranscriptDialogProps) {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTranscript = useCallback(async () => {
    if (!call?.interaction_id || call.interaction_id === "NO_INTERACTION_ID") {
      setMessages([]);
      setSummary(null);
      setError("No speech transcript was captured for this call attempt (the call was unanswered or busy).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = `/api/ai/call-logs/transcript?interactionId=${encodeURIComponent(
        call.interaction_id,
      )}&summarize=true`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load conversation transcript.");
        setMessages([]);
        setSummary(null);
      } else {
        setMessages(data.messages || []);
        setLanguages(data.languages || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error loading transcript.");
    } finally {
      setLoading(false);
    }
  }, [call?.interaction_id]);

  useEffect(() => {
    if (open && call) {
      void fetchTranscript();
    } else {
      setMessages([]);
      setSummary(null);
      setError(null);
    }
  }, [open, call, fetchTranscript]);

  const handleCopy = () => {
    if (!messages.length) return;
    const text = messages
      .map((m) => `[${m.role.toUpperCase()}] (${m.language_name}): ${m.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Transcript copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const patientName = call?.agent_variables?.user_name || "Patient";
  const phone = call?.user_contact || call?.user_contact_masked || "—";
  const durationFormatted = call?.duration_in_seconds
    ? `${Math.floor(call.duration_in_seconds / 60)}m ${Math.round(call.duration_in_seconds % 60)}s`
    : "0s";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="space-y-2 pb-2 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                <Headphones className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold flex items-center gap-2">
                  Call Transcript & Recording
                  <Badge variant="outline" className="text-[11px] font-normal">
                    {durationFormatted}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>{patientName}</span>
                  <span>·</span>
                  <span className="font-mono">{phone}</span>
                  <span>·</span>
                  <span>{call?.attempted_at ? new Date(call.attempted_at).toLocaleString() : ""}</span>
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {messages.length > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 text-xs gap-1.5"
                  title="Copy Transcript"
                >
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              ) : null}
            </div>
          </div>

          {/* Embedded In-Page Audio Player */}
          {call?.interaction_id && call.interaction_id !== "NO_INTERACTION_ID" ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-teal-200 bg-teal-50/70 p-2.5 dark:border-teal-800 dark:bg-teal-950/40">
              <div className="flex items-center gap-2 text-xs font-medium text-teal-900 dark:text-teal-200 shrink-0">
                <div className="flex size-6 items-center justify-center rounded-full bg-teal-600 text-white">
                  <Volume2 className="size-3.5" />
                </div>
                <span>Call Audio Recording:</span>
              </div>
              <audio
                controls
                className="h-8 w-full sm:max-w-md accent-teal-600"
                preload="metadata"
                src={`/api/ai/call-logs/audio?interactionId=${encodeURIComponent(call.interaction_id)}`}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          ) : null}

          {/* Languages & Metadata pills */}
          {languages.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Globe2 className="size-3" /> Languages:
              </span>
              {languages.map((lang) => (
                <Badge
                  key={lang}
                  variant="secondary"
                  className="text-[10px] py-0 px-2 font-medium bg-muted/80 text-foreground"
                >
                  {lang}
                </Badge>
              ))}
              <span className="text-[11px] text-muted-foreground ml-2">
                {messages.length} speech {messages.length === 1 ? "turn" : "turns"}
              </span>
            </div>
          ) : null}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* AI Clinical Summary Callout */}
          {summary ? (
            <div className="rounded-xl border border-primary/20 bg-primary-soft/30 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-primary text-[11px] uppercase tracking-wider">
                <Sparkles className="size-3.5" />
                AI Clinical Summary & English Takeaways
              </div>
              <p className="text-foreground leading-relaxed font-normal">{summary}</p>
            </div>
          ) : null}

          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs">Fetching transcript from Sarvam AI...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="size-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 mb-2">
                <FileText className="size-5" />
              </div>
              <p className="text-sm font-medium text-foreground">No Transcript Available</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">{error}</p>
              {onRedial && call?.user_contact ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onRedial(call.user_contact, call.agent_variables?.user_name);
                  }}
                  className="mt-4 gap-1.5 text-xs"
                >
                  <PhoneCall className="size-3.5 text-emerald-600" />
                  Redial Patient Now
                </Button>
              ) : null}
            </div>
          ) : messages.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No transcript messages recorded.
            </div>
          ) : (
            /* Turn-by-turn dialogue stream */
            <div className="space-y-3">
              {messages.map((m) => {
                const isAssistant = m.role.toLowerCase() === "assistant" || m.role.toLowerCase() === "agent";
                return (
                  <div
                    key={m.turn_id}
                    className={`flex gap-2.5 ${isAssistant ? "justify-start" : "justify-end"}`}
                  >
                    {isAssistant && (
                      <div className="size-7 rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="size-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                        isAssistant
                          ? "bg-card border text-foreground rounded-tl-xs"
                          : "bg-primary text-primary-foreground rounded-tr-xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1 opacity-75 text-[10px]">
                        <span className="font-semibold">
                          {isAssistant ? "AI Voice Assistant" : patientName}
                        </span>
                        <span>{m.language_name}</span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>

                    {!isAssistant && (
                      <div className="size-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <User className="size-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>Interaction ID: <code className="font-mono text-[10px]">{call?.interaction_id}</code></span>
          {onRedial && call?.user_contact ? (
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onRedial(call.user_contact, call.agent_variables?.user_name);
              }}
              className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <PhoneCall className="size-3.5" />
              Redial Patient
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
