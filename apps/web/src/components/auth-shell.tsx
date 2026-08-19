import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_rgb(91_42_104/0.08),_transparent_55%),hsl(var(--background))] px-4 py-10">
      <div
        className={cn(
          "w-full space-y-6 rounded-2xl border bg-card p-8 shadow-[0_20px_50px_-32px_rgb(41_35_45/0.45)]",
          wide ? "max-w-2xl" : "max-w-md",
        )}
      >
        <div className="space-y-1 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary">SMRKOMED</p>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}
