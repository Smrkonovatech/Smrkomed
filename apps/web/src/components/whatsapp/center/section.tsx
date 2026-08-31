import { cn } from "@/lib/utils";

export function WaSection({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border/70 bg-card p-5 shadow-sm", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function WaMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background px-4 py-3.5">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function WaStatusPill({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "primary" | "muted";
}) {
  const tones = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    warning: "bg-orange-50 text-orange-800 border-orange-200/80",
    danger: "bg-rose-50 text-rose-800 border-rose-200/80",
    primary: "bg-primary-soft text-primary border-primary/20",
    muted: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
        tones[tone],
      )}
    >
      {label}
    </span>
  );
}

export function PreviewBanner({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-primary/15 bg-primary-soft/50 px-3 py-2 text-xs text-foreground/80">
      {children ??
        "Product preview using sample clinic data. Live WhatsApp metrics appear when your clinic is connected."}
    </div>
  );
}
