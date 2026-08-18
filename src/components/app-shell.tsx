"use client";

import type { ReactNode } from "react";

import { GlobalActionProvider } from "@/components/actions/global-action-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";
import { CreateTaskProvider } from "@/components/create-task-drawer";
import { AppStateProvider } from "@/lib/app-state";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppStateProvider>
      <CreateTaskProvider>
        <GlobalActionProvider>
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main className="min-w-0 flex-1 px-4 py-5 lg:px-6">
                <div className="mx-auto w-full max-w-[1500px]">{children}</div>
              </main>
            </div>
          </div>
        </GlobalActionProvider>
      </CreateTaskProvider>
    </AppStateProvider>
  );
}
