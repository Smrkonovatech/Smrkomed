"use client";

import WhatsAppStagePlaceholder from "@/components/whatsapp/stage-placeholder";

export default function Page() {
  return (
    <WhatsAppStagePlaceholder
      title="Contacts"
      stage="Stage 4"
      description="Patient/contact directory filtered by WhatsApp opt-in. Reuses Patient + Consent — no duplicate CRM store."
    />
  );
}
