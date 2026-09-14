"use client";

import { Bot } from "lucide-react";

import { useSmrkoAiBuddy } from "@/components/ai/smrko-ai-host";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AiInsightCard({
  message,
  askPrompt,
  className,
}: {
  message: string;
  askPrompt?: string;
  className?: string;
}) {
  const { ask } = useSmrkoAiBuddy();
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-primary-soft/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="flex items-start gap-2 text-sm">
        <Bot className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>{message}</span>
      </p>
      {askPrompt ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="shrink-0"
          onClick={() => ask(askPrompt)}
        >
          Ask Smrko
        </Button>
      ) : null}
    </div>
  );
}
