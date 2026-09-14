"use client";

import type { ReactNode } from "react";

import { DigitalHealthNav } from "@/components/digital-health/digital-health-nav";

export default function DigitalHealthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <DigitalHealthNav />
      {children}
    </div>
  );
}
