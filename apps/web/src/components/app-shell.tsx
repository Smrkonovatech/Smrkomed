"use client";

import type { ReactNode } from "react";

import { GlobalActionProvider } from "@/components/actions/global-action-provider";
import { SmrkoAiBuddyProvider } from "@/components/ai/smrko-ai-host";
import { CreateTaskProvider } from "@/components/create-task-drawer";
import { AppHeader } from "@/components/shell/app-header";
import { BottomNavigation } from "@/components/shell/bottom-navigation";
import { FullscreenAfterLogin } from "@/components/shell/fullscreen-after-login";
import { AppStateProvider } from "@/lib/app-state";
import { DashboardDateRangeProvider } from "@/lib/dashboard-date-range";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <DashboardDateRangeProvider>
        <CreateTaskProvider>
          <GlobalActionProvider>
            <SmrkoAiBuddyProvider>
              <div className="relative h-[100dvh] w-[100vw] overflow-hidden bg-background">
                <AppHeader />
                <FullscreenAfterLogin />

                <main
                  id="app-main"
                  className="h-full overflow-y-auto overscroll-contain px-5 pt-[calc(var(--app-header-height)+0.85rem)] pb-[calc(var(--app-dock-height)+1.25rem)] sm:px-8 lg:px-[80px]"
                >
                  <div className="mx-auto w-full max-w-[1500px] animate-in fade-in-0 duration-200">
                    {children}
                  </div>
                </main>

                <BottomNavigation />
              </div>
            </SmrkoAiBuddyProvider>
          </GlobalActionProvider>
        </CreateTaskProvider>
      </DashboardDateRangeProvider>
    </AppStateProvider>
  );
}
