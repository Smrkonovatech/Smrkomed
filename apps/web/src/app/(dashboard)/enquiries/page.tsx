"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EnquiriesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/crm");
  }, [router]);
  return <p className="p-6 text-sm text-muted-foreground">Redirecting to CRM…</p>;
}
