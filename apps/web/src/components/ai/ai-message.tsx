"use client";

import Link from "next/link";
import { Bot, ClipboardCopy, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import type { AiProposedAction } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

export type ChatBubble = {
  id: string;
  role: "user" | "assistant";
  content: string;
  draftMessage?: string;
  navigation?: { label: string; href: string }[];
  proposedAction?: AiProposedAction;
  error?: boolean;
};

export function AiMessage({
  message,
  onCopy,
  onConfirmAction,
  onCancelAction,
  actionBusy,
}: {
  message: ChatBubble;
  onCopy?: (text: string) => void;
  onConfirmAction?: (action: AiProposedAction, messageId: string) => void;
  onCancelAction?: (messageId: string) => void;
  actionBusy?: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Bot className="size-4" />
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : message.error
              ? "border border-danger/30 bg-danger-soft text-danger"
              : "border bg-card",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="space-y-2 text-sm [&_p]:my-2 [&_ul]:my-2 [&_li]:my-0.5 [&_strong]:font-semibold">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {!isUser && message.draftMessage && (
          <div className="mt-3 rounded-xl border bg-muted/40 p-3">
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              AI Draft
            </p>
            <p className="whitespace-pre-wrap text-sm">{message.draftMessage}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onCopy?.(message.draftMessage!)}
              >
                <ClipboardCopy className="size-3.5" /> Copy
              </Button>
              <Button type="button" size="sm" variant="secondary" disabled>
                Send manually
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Not sent. Review, edit if needed, then send from your messaging workflow.
            </p>
          </div>
        )}
        {!isUser && message.proposedAction?.type === "createTask" && (
          <div className="mt-3 rounded-xl border border-primary/20 bg-primary-soft/40 p-3">
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-primary uppercase">
              Confirm action
            </p>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Patient</dt>
                <dd className="font-medium text-right">{message.proposedAction.preview.coupleLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Task</dt>
                <dd className="font-medium text-right">{message.proposedAction.preview.title}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Due</dt>
                <dd className="font-medium text-right">{message.proposedAction.preview.dueLabel}</dd>
              </div>
              {message.proposedAction.preview.assignedHint ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Assigned</dt>
                  <dd className="font-medium text-right">
                    {message.proposedAction.preview.assignedHint}
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={actionBusy}
                onClick={() => onCancelAction?.(message.id)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={actionBusy}
                onClick={() => onConfirmAction?.(message.proposedAction!, message.id)}
              >
                {actionBusy ? "Creating…" : "Create task"}
              </Button>
            </div>
          </div>
        )}
        {!isUser && message.navigation?.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.navigation.map((item) => (
              <Button key={item.href} asChild size="sm" variant="secondary">
                <Link href={item.href}>{item.label || "Open"}</Link>
              </Button>
            ))}
          </div>
        ) : null}
        {!isUser && !message.error && (
          <button
            type="button"
            className="mt-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => onCopy?.(message.content)}
          >
            Copy response
          </button>
        )}
      </div>
      {isUser && (
        <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <Sparkles className="size-4" />
        </span>
      )}
    </div>
  );
}
