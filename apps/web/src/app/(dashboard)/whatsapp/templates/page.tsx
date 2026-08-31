"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { PreviewBanner, WaSection, WaStatusPill } from "@/components/whatsapp/center/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEMO_TEMPLATES } from "@/lib/whatsapp/center-demo";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "All",
  "Appointment",
  "Care Loop",
  "Medication",
  "Documents",
  "Payments",
  "Insurance",
  "Follow-up",
  "General",
  "Consent",
  "Billing",
] as const;

export default function WhatsAppTemplatesLibraryPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");

  const rows = useMemo(() => {
    return DEMO_TEMPLATES.filter((t) => {
      if (category !== "All" && t.category !== category) return false;
      if (q.trim() && !t.name.toLowerCase().includes(q.trim().toLowerCase())) return false;
      return true;
    });
  }, [q, category]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">WhatsApp Templates</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage approved communication templates used across SmrkoMed workflows.
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href="/whatsapp/templates/new">
            <Plus className="size-4" /> Create Template
          </Link>
        </Button>
      </div>

      <PreviewBanner>
        Template library preview. Live Meta-synced templates remain available via Integrations when WhatsApp is
        connected.
      </PreviewBanner>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search templates"
            className="h-10 rounded-xl pl-8"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-semibold",
              category === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <WaSection title="Template library" subtitle="Name · category · approval · usage">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                <th className="pb-2 font-semibold">Name</th>
                <th className="pb-2 font-semibold">Category</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2 font-semibold">Language</th>
                <th className="pb-2 font-semibold">Used in</th>
                <th className="pb-2 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-border/50 last:border-0">
                  <td className="py-3 font-semibold">{t.name}</td>
                  <td className="py-3 text-muted-foreground">{t.category}</td>
                  <td className="py-3">
                    <WaStatusPill
                      label={t.status}
                      tone={t.status === "Approved" ? "success" : "warning"}
                    />
                  </td>
                  <td className="py-3 text-muted-foreground">{t.language}</td>
                  <td className="py-3 text-muted-foreground">{t.usedIn} workflows</td>
                  <td className="py-3 text-muted-foreground">{t.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </WaSection>
    </div>
  );
}
