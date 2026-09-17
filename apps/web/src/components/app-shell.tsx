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
              <div className="relative h-full w-full overflow-hidden bg-background">
                <AppHeader />
                <FullscreenAfterLogin />

                <main
                  id="app-main"
                  tabIndex={0}
                  className="h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain pt-[calc(var(--app-header-height)+0.85rem)] pb-[calc(var(--app-dock-height)+3.5rem)] focus:outline-none"
                >
                  <div className="relative mx-auto w-full min-h-full max-w-[1920px] px-4 sm:px-5 lg:px-6 animate-in fade-in-0 duration-200 pb-12">
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
