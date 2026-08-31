"use client";

import type { ReactNode } from "react";

import { GlobalActionProvider } from "@/components/actions/global-action-provider";
import { SmrkoAiBuddyProvider } from "@/components/ai/smrko-ai-host";
import { CreateTaskProvider } from "@/components/create-task-drawer";
import { AppHeader } from "@/components/shell/app-header";
import { BottomNavigation } from "@/components/shell/bottom-navigation";
import { NotificationCenter } from "@/components/shell/notification-center";
import { AppStateProvider } from "@/lib/app-state";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <CreateTaskProvider>
        <GlobalActionProvider>
          <SmrkoAiBuddyProvider>
            <div className="relative h-[100dvh] w-[100vw] overflow-hidden bg-background">
              <AppHeader />

              <main
                id="app-main"
                className="h-full overflow-y-auto overscroll-contain px-4 pt-[calc(var(--app-header-height)+0.85rem)] pb-[calc(var(--app-dock-height)+1rem)] sm:px-5 lg:px-6"
              >
                <div className="animate-in fade-in-0 duration-200">{children}</div>
              </main>

              <BottomNavigation />
              <NotificationCenter />
            </div>
          </SmrkoAiBuddyProvider>
        </GlobalActionProvider>
      </CreateTaskProvider>
    </AppStateProvider>
  );
}
