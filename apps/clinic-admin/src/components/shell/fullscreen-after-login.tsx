"use client";

import { useEffect, useState } from "react";
import { Maximize2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  consumeFullscreenAfterLoginFlag,
  enterAppFullscreen,
  isDocumentFullscreen,
} from "@/lib/browser/fullscreen";

/** After login, enter full screen; if the browser blocks it, offer a one-tap prompt. */
export function FullscreenAfterLogin() {
  const [prompt, setPrompt] = useState(false);

  useEffect(() => {
    if (!consumeFullscreenAfterLoginFlag()) return;
    if (isDocumentFullscreen()) return;

    let cancelled = false;
    void enterAppFullscreen().then((ok) => {
      if (!cancelled && !ok) setPrompt(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onChange() {
      if (isDocumentFullscreen()) setPrompt(false);
    }
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as EventListener);
    };
  }, []);

  if (!prompt) return null;

  return (
    <div className="fixed top-[calc(var(--app-header-height)+0.75rem)] right-[80px] z-50 flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2 shadow-[0_12px_32px_rgba(28,18,52,0.14)]">
      <p className="text-xs text-muted-foreground">Use the clinic workspace in full screen</p>
      <Button
        type="button"
        size="sm"
        className="h-8 rounded-lg gap-1.5"
        onClick={() => {
          void enterAppFullscreen().then((ok) => {
            if (ok) setPrompt(false);
          });
        }}
      >
        <Maximize2 className="size-3.5" />
        Full screen
      </Button>
      <button
        type="button"
        aria-label="Dismiss"
        className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
        onClick={() => setPrompt(false)}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
