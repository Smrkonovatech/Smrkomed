"use client";

import { InsuranceNav } from "@/components/insurance/insurance-nav";

export default function InsuranceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <InsuranceNav />
      {children}
    </div>
  );
}
