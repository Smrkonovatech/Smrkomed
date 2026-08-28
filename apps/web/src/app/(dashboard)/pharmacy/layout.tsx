"use client";

import { PharmacyNav } from "@/components/pharmacy/pharmacy-nav";

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <PharmacyNav />
      {children}
    </div>
  );
}
