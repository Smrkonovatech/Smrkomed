"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LoadingRows, PageHeader } from "@/components/ui-kit";

/** Automations alias → Flows (single engine). */
export default function WhatsAppAutomationsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/whatsapp/flows");
  }, [router]);

  return (
    <div className="space-y-4">
      <PageHeader title="Automations" subtitle="Redirecting to Flows…" />
      <LoadingRows rows={3} />
    </div>
  );
}
