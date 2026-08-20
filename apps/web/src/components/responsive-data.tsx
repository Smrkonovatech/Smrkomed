import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Stacked summary cards — visible below the `md` breakpoint. */
export function MobileCards({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("grid gap-3 p-3 md:hidden", className)}>{children}</div>;
}

/** Table/list that stays hidden on small phones, shown from `md` up. */
export function MdTableWrap({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("hidden overflow-x-auto md:block", className)}>{children}</div>;
}

export function RecordCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("rounded-xl border bg-background p-3.5 shadow-none", className)}>
      {children}
    </article>
  );
}
