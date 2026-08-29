"use client";

import { WhatsAppNav } from "@/components/whatsapp/whatsapp-nav";

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <WhatsAppNav />
      {children}
    </div>
  );
}
