"use client";

import { WhatsAppNav } from "@/components/whatsapp/whatsapp-nav";

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <WhatsAppNav />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
