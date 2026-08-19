import Image from "next/image";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageVisualBanner({
  src,
  alt,
  eyebrow,
  title,
  description,
  action,
  align = "left",
}: {
  src: string;
  alt: string;
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <section className="relative isolate min-h-40 overflow-hidden rounded-xl border bg-cream sm:min-h-44">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 1200px"
        className={cn(
          "object-cover saturate-[0.9]",
          align === "left" ? "object-right" : "object-left",
        )}
        priority={false}
      />
      <div
        className={cn(
          "absolute inset-y-0 w-[78%]",
          align === "left"
            ? "left-0 bg-gradient-to-r from-cream via-cream/95 to-transparent"
            : "right-0 bg-gradient-to-l from-cream via-cream/95 to-transparent",
        )}
      />
      <div
        className={cn(
          "relative z-10 flex min-h-40 max-w-xl flex-col justify-center px-5 py-5 sm:min-h-44 sm:px-7",
          align === "right" && "ml-auto items-start",
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1.5 max-w-md text-sm leading-5 text-muted-foreground">{description}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </section>
  );
}
