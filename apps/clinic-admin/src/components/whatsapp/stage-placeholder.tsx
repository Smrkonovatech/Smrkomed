"use client";

import Link from "next/link";

import { EmptyState, PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";

export default function WhatsAppStagePlaceholder({
  title,
  stage,
  description,
}: {
  title: string;
  stage: string;
  description: string;
}) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} subtitle={`${stage} — shell only. No fake production stats.`} />
      <EmptyState
        title={`${title} ships in ${stage}`}
        description={description}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link href="/whatsapp">Overview</Link>
            </Button>
            <Button asChild>
              <Link href="/whatsapp/templates">Templates</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
