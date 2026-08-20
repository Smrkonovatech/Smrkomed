"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Loader2, SendHorizonal, Square, X } from "lucide-react";
import { toast } from "sonner";

import { AiMessage, type ChatBubble } from "@/components/ai/ai-message";
import { useSmrkoAiBuddy } from "@/components/ai/smrko-ai-host";
import { quickActionsForPath, useAiPageContext } from "@/components/ai/use-ai-context";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { AiProposedAction } from "@/lib/ai/types";
import { useAppState } from "@/lib/app-state";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId?: string;
  coupleSlug?: string;
};

let bubbleId = 0;
const nextId = () => `m-${++bubbleId}`;

export function SmrkoAiPanel({ open, onOpenChange, coupleId, coupleSlug }: Props) {
  const pageContext = useAiPageContext({
    ...(coupleId ? { coupleId } : {}),
    ...(coupleSlug ? { coupleSlug } : {}),
  });
  const { consumePendingPrompt, pendingPrompt } = useSmrkoAiBuddy();
  const { reload } = useAppState();
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<(text: string, retryFrom?: ChatBubble[]) => Promise<void>>(async () => undefined);
  const quickActions = useMemo(
    () => quickActionsForPath(pageContext.pathname, Boolean(pageContext.coupleSlug)),
    [pageContext.pathname, pageContext.coupleSlug],
  );

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const send = useCallback(
    async (text: string, retryFrom?: ChatBubble[]) => {
      const content = text.trim();
      if (!content || loading) return;

      const history = retryFrom ?? messages;
      const userMessage: ChatBubble = { id: nextId(), role: "user", content };
      const nextMessages = [...history, userMessage];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
            pageContext,
          }),
        });
        const json = (await response.json()) as {
          success?: boolean;
          data?: {
            reply: string;
            navigation?: { label: string; href: string }[];
            draftMessage?: string;
            proposedAction?: AiProposedAction;
          };
          error?: { message?: string };
        };
        if (!response.ok || !json.success || !json.data) {
          throw new Error(json.error?.message || "Smrko AI is temporarily unavailable. Please try again.");
        }
        setMessages((current) => [
          ...current,
          {
            id: nextId(),
            role: "assistant",
            content: json.data!.reply,
            ...(json.data!.navigation ? { navigation: json.data!.navigation } : {}),
            ...(json.data!.draftMessage ? { draftMessage: json.data!.draftMessage } : {}),
            ...(json.data!.proposedAction ? { proposedAction: json.data!.proposedAction } : {}),
          },
        ]);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setMessages((current) => [
          ...current,
          {
            id: nextId(),
            role: "assistant",
            content:
              error instanceof Error
                ? error.message
                : "Smrko AI is temporarily unavailable. Please try again.",
            error: true,
          },
        ]);
      } finally {
        abortRef.current = null;
        setLoading(false);
      }
    },
    [loading, messages, pageContext],
  );

  sendRef.current = send;

  useEffect(() => {
    if (!open || !pendingPrompt) return;
    const prompt = consumePendingPrompt();
    if (prompt) void sendRef.current(prompt);
  }, [open, pendingPrompt, consumePendingPrompt]);

  const clear = () => {
    stop();
    setMessages([]);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Unable to copy");
    }
  };

  const retryLast = () => {
    const lastUserIndex = [...messages].map((m) => m.role).lastIndexOf("user");
    if (lastUserIndex < 0) return;
    const prior = messages.slice(0, lastUserIndex);
    const lastUser = messages[lastUserIndex]!;
    void send(lastUser.content, prior);
  };

  const confirmAction = async (action: AiProposedAction, messageId: string) => {
    if (action.type !== "createTask") return;
    setActionBusyId(messageId);
    try {
      const res = await fetch("/api/ai/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Unable to create task.");
      }
      setMessages((current) =>
        current.map((m) => {
          if (m.id !== messageId) return m;
          const { proposedAction: _removed, ...rest } = m;
          return {
            ...rest,
            content: `${m.content}\n\n**Task created.**`,
          };
        }),
      );
      toast.success("Task created");
      void reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create task.");
    } finally {
      setActionBusyId(null);
    }
  };

  const cancelAction = (messageId: string) => {
    setMessages((current) =>
      current.map((m) => {
        if (m.id !== messageId) return m;
        const { proposedAction: _removed, ...rest } = m;
        return {
          ...rest,
          content: `${m.content}\n\n_Action cancelled — nothing was changed._`,
        };
      }),
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col gap-0 p-0",
          "inset-y-0 h-dvh max-h-dvh sm:inset-y-auto sm:right-4 sm:bottom-4 sm:top-auto sm:h-[min(700px,calc(100dvh-2rem))] sm:max-h-[min(700px,calc(100dvh-2rem))] sm:w-[min(420px,calc(100vw-2rem))] sm:rounded-2xl sm:border",
          "md:w-[min(420px,calc(100vw-2rem))] lg:w-[min(400px,calc(100vw-2rem))]",
        )}
      >
        <SheetHeader className="space-y-1 border-b px-4 py-4 text-left">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div>
              <SheetTitle className="text-base">Smrko AI</SheetTitle>
              <SheetDescription>Your clinic&apos;s intelligent assistant</SheetDescription>
            </div>
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">
              Ready to help
            </span>
          </div>
        </SheetHeader>

        <div ref={scrollerRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Ask about patients, appointments, tasks, follow-ups, or how to navigate SmrkoMed.
              </p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="min-h-11 rounded-full border px-3 py-2 text-left text-xs font-medium hover:bg-muted sm:min-h-0 sm:py-1.5"
                    onClick={() => void send(action)}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <AiMessage
              key={message.id}
              message={message}
              onCopy={copy}
              onConfirmAction={confirmAction}
              onCancelAction={cancelAction}
              onRegenerateDraft={() => void send("Regenerate that patient message draft with a clearer, warmer tone. Keep only facts from SmrkoMed.")}
              actionBusy={actionBusyId === message.id}
            />
          ))}
          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Smrko is thinking…
            </p>
          )}
        </div>

        <div className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={!messages.length}>
              <Eraser className="size-3.5" /> Clear
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={retryLast}
              disabled={loading || !messages.some((m) => m.role === "user")}
            >
              Retry
            </Button>
            {loading && (
              <Button type="button" size="sm" variant="ghost" onClick={stop}>
                <Square className="size-3.5" /> Stop
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-auto sm:hidden"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-3.5" /> Close
            </Button>
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Smrko AI anything…"
              className="min-h-11 max-h-32 resize-none"
              rows={2}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
            />
            <Button type="submit" size="icon" className="size-11 shrink-0" disabled={loading || !input.trim()} aria-label="Send">
              <SendHorizonal className="size-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
