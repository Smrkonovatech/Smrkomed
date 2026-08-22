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
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_rgb(123_79_224/0.12),_transparent_55%),var(--background)] px-4 py-10">
      <div
        className={cn(
          "w-full space-y-6 rounded-[28px] border border-border bg-card p-5 shadow-[var(--shadow-lift)] sm:p-8",
          wide ? "max-w-2xl" : "max-w-md",
        )}
      >
        <div className="space-y-3 text-center">
          <img
            src="/branding/smrkomed-logo.png"
            alt="SMRKOMED"
            width={40}
            height={40}
            className="mx-auto h-10 w-auto"
          />
          <p className="text-xs font-semibold tracking-[0.18em] text-primary">SMRKOMED</p>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
}
