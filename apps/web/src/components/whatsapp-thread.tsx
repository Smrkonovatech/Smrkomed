"use client";

import { FileText, ImageIcon, Mic, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChatMedia {
  kind: "video" | "image" | "voice" | "document";
  title: string;
  meta: string;
}

export interface ChatMessage {
  from: "loop" | "patient";
  text?: string;
  time?: string;
  quickReplies?: string[];
  media?: ChatMedia;
}

const threads: Record<string, ChatMessage[]> = {
  c1: [
    {
      from: "loop",
      text: "Hi Priya 👋 Your ultrasound is scheduled for tomorrow. Have you completed it?",
      time: "09:02",
      quickReplies: ["Yes, completed", "Not yet", "I need help"],
    },
    { from: "patient", text: "I couldn't get an appointment.", time: "09:14" },
    {
      from: "loop",
      text: "No problem. Would you like the clinic team to help you with the appointment?",
      time: "09:14",
      quickReplies: ["Yes, please", "I'll arrange it myself"],
    },
    { from: "patient", text: "Yes, please", time: "09:16" },
    {
      from: "loop",
      text: "Done — Meera from ABC Fertility Centre will call you shortly. Meanwhile, here's a short video from your clinic explaining what to expect during the scan.",
      time: "09:17",
      media: { kind: "video", title: "What to expect during your scan", meta: "1:48 · English" },
    },
    {
      from: "loop",
      text: "Here's the preparation checklist from your clinic.",
      time: "09:17",
      media: { kind: "image", title: "Scan day preparation checklist", meta: "JPG · 240 KB" },
    },
    {
      from: "loop",
      time: "09:18",
      media: { kind: "voice", title: "Care Loop Voice Message", meta: "0:32" },
    },
    {
      from: "loop",
      time: "09:18",
      media: { kind: "document", title: "Preparation Guide.pdf", meta: "4 pages" },
    },
  ],
  c2: [
    {
      from: "loop",
      text: "Hi Anjali 👋 Just checking in — were you able to take your Day 6 injection?",
      time: "08:30",
      quickReplies: ["Yes", "Not yet", "I need help"],
    },
    {
      from: "loop",
      text: "Following up gently — your care team would love a quick update.",
      time: "14:10",
    },
  ],
  c3: [
    {
      from: "loop",
      text: "Hi Sneha 👋 Has your AMH and TSH blood test been completed?",
      time: "10:05",
      quickReplies: ["Yes, completed", "Not yet"],
    },
    { from: "patient", text: "Done, the lab will email the report.", time: "10:22" },
    {
      from: "loop",
      text: "Thank you! I'll watch out for it and let the clinic know once it arrives.",
      time: "10:22",
    },
  ],
};

export function conversationFor(coupleId: string): ChatMessage[] {
  return threads[coupleId] ?? threads["c1"]!;
}

function MediaCard({ media }: { media: ChatMedia }) {
  if (media.kind === "voice") {
    return (
      <div className="mt-2 flex items-center gap-3 rounded-xl bg-card/80 p-2.5">
        <Button
          size="icon"
          variant="secondary"
          className="size-8 rounded-full"
          onClick={() => toast.info("Playing Care Loop voice message")}
          aria-label="Play voice message"
        >
          <Play className="size-3.5" />
        </Button>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-xs font-medium">
            <Mic className="size-3.5" /> {media.title}
          </p>
          <div className="mt-1 flex items-end gap-0.5" aria-hidden>
            {[6, 12, 8, 16, 10, 14, 7, 13, 9, 15, 6, 11].map((h, i) => (
              <span
                key={i}
                className="w-0.5 animate-marquee-dot rounded-full bg-primary"
                style={{ height: h, animationDelay: `${i * 90}ms` }}
              />
            ))}
            <span className="ml-2 text-[10px] text-muted-foreground">{media.meta}</span>
          </div>
        </div>
      </div>
    );
  }

  if (media.kind === "document") {
    return (
      <div className="mt-2 flex items-center gap-2.5 rounded-xl bg-card/80 p-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-danger-soft text-danger">
          <FileText className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{media.title}</p>
          <p className="text-[10px] text-muted-foreground">{media.meta}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => toast.info("Opening document")}>
          View
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-2 overflow-hidden rounded-xl bg-card/80">
      <div className="relative grid h-28 place-items-center bg-primary-soft">
        {media.kind === "video" ? (
          <Button
            size="icon"
            className="size-10 rounded-full"
            onClick={() => toast.info("Playing clinic video")}
            aria-label="Play video"
          >
            <Play className="size-4" />
          </Button>
        ) : (
          <ImageIcon className="size-7 text-primary" />
        )}
      </div>
      <div className="p-2.5">
        <p className="truncate text-xs font-medium">{media.title}</p>
        <p className="text-[10px] text-muted-foreground">{media.meta}</p>
      </div>
    </div>
  );
}

export function WhatsAppThread({
  messages,
  patientName,
}: {
  messages: ChatMessage[];
  patientName: string;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border bg-muted/40">
      <div className="flex items-center gap-2.5 border-b bg-card px-4 py-3">
        <span className="grid size-9 place-items-center rounded-full gradient-loop text-primary-foreground">
          <RefreshCw className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Care Loop → {patientName}</p>
          <p className="text-[11px] text-success">WhatsApp · online</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "animate-rise flex",
              m.from === "loop" ? "justify-start" : "justify-end",
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-soft",
                m.from === "loop"
                  ? "rounded-tl-sm bg-card"
                  : "rounded-tr-sm bg-success-soft text-foreground",
              )}
            >
              {m.text && <p>{m.text}</p>}
              {m.media && <MediaCard media={m.media} />}
              {m.quickReplies && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.quickReplies.map((q) => (
                    <button
                      key={q}
                      onClick={() => toast.success(`Patient tapped “${q}”`)}
                      className="rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {m.time && (
                <p className="mt-1 text-right text-[10px] text-muted-foreground">{m.time}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VoiceCallPanel({
  patient = "Priya Sharma",
  duration = "01:42",
  reason = "No WhatsApp response",
  result = "Patient confirmed appointment for tomorrow.",
}: {
  patient?: string;
  duration?: string;
  reason?: string;
  result?: string;
}) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-8 place-items-center rounded-xl bg-teal-soft text-teal">
            <Mic className="size-4" />
          </span>
          AI Voice
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
          <span className="size-1.5 rounded-full bg-success" /> Call completed
        </span>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Patient</dt>
          <dd className="font-medium">{patient}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Duration</dt>
          <dd className="font-medium">{duration}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Reason</dt>
          <dd className="font-medium">{reason}</dd>
        </div>
      </dl>
      <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm">{result}</p>
      <p className="mt-2 text-xs font-medium text-success">Status · Resolved</p>
    </div>
  );
}
