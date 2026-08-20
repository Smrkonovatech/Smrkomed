"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { SmrkoAiPanel } from "@/components/ai/smrko-ai-buddy";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";

type AiBuddyApi = {
  open: boolean;
  setOpen: (open: boolean) => void;
  ask: (prompt: string) => void;
  pendingPrompt: string | null;
  consumePendingPrompt: () => string | null;
};

const AiBuddyContext = createContext<AiBuddyApi | null>(null);

export function useSmrkoAiBuddy() {
  const ctx = useContext(AiBuddyContext);
  if (!ctx) {
    return {
      open: false,
      setOpen: () => undefined,
      ask: () => undefined,
      pendingPrompt: null,
      consumePendingPrompt: () => null,
    } satisfies AiBuddyApi;
  }
  return ctx;
}

/** Wraps dashboard shell so Brief / patient pages can open Smrko AI with a prompt. */
export function SmrkoAiBuddyProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const ask = useCallback((prompt: string) => {
    setPendingPrompt(prompt);
    setOpen(true);
  }, []);

  const consumePendingPrompt = useCallback(() => {
    const value = pendingPrompt;
    setPendingPrompt(null);
    return value;
  }, [pendingPrompt]);

  const value = useMemo(
    () => ({ open, setOpen, ask, pendingPrompt, consumePendingPrompt }),
    [open, ask, pendingPrompt, consumePendingPrompt],
  );

  return (
    <AiBuddyContext.Provider value={value}>
      {children}
      <Button
        type="button"
        size="lg"
        className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 h-12 rounded-full px-4 shadow-lift"
        onClick={() => setOpen(true)}
        aria-label="Open Smrko AI Buddy"
      >
        <Bot className="size-5" />
        <span className="hidden sm:inline">Smrko AI</span>
      </Button>
      <SmrkoAiPanel open={open} onOpenChange={setOpen} />
    </AiBuddyContext.Provider>
  );
}

/** @deprecated Prefer SmrkoAiBuddyProvider in AppShell */
export function SmrkoAiBuddyHost() {
  return <SmrkoAiBuddyProvider>{null}</SmrkoAiBuddyProvider>;
}
