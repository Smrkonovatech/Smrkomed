import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <Toaster position="top-right" richColors />
    </>
  );
}
