"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LoadingRows } from "@/components/ui-kit";

/** Communication hub → WhatsApp Automation Center */
export default function CommunicationRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/whatsapp");
  }, [router]);
  return <LoadingRows rows={3} />;
}
