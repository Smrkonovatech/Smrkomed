"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { useSmrkoAiBuddy } from "@/components/ai/smrko-ai-host";
import { useCreateTask } from "@/components/create-task-drawer";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui-kit";
import type { FollowUpBucket, FollowUpQueueItem } from "@/lib/ai/attention";

const BUCKETS: FollowUpBucket[] = ["URGENT", "DUE_SOON", "INACTIVE", "UPCOMING"];

const bucketTone: Record<FollowUpBucket, "warning" | "danger" | "info" | "muted"> = {
  URGENT: "danger",
  DUE_SOON: "warning",
  INACTIVE: "muted",
  UPCOMING: "info",
};

const bucketTitle: Record<FollowUpBucket, string> = {
  URGENT: "Needs action today",
  DUE_SOON: "Needs action in 1–3 days",
  INACTIVE: "No recent interaction",
  UPCOMING: "Appointment / treatment coming soon",
};

export function FollowUpQueuePanel({
  items,
  title = "Follow-up Queue",
}: {
  items: FollowUpQueueItem[];
  title?: string;
}) {
  const { ask } = useSmrkoAiBuddy();
  const { open: openTask } = useCreateTask();
  const [bucket, setBucket] = useState<FollowUpBucket | "ALL">("ALL");

  const filtered = useMemo(
    () => (bucket === "ALL" ? items : items.filter((i) => i.bucket === bucket)),
    [bucket, items],
  );

  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {title}: no patients need follow-up from current clinic records.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
        <div className="flex flex-wrap gap-1">
          <FilterChip active={bucket === "ALL"} onClick={() => setBucket("ALL")} label="All" />
          {BUCKETS.map((b) => (
            <FilterChip
              key={b}
              active={bucket === b}
              onClick={() => setBucket(b)}
              label={b.replaceAll("_", " ")}
            />
          ))}
        </div>
      </div>
      {bucket !== "ALL" && (
        <p className="text-xs text-muted-foreground">{bucketTitle[bucket]}</p>
      )}
      <ul className="space-y-2">
        {filtered.slice(0, 12).map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold">{item.coupleLabel}</p>
                <StatusBadge
                  label={item.bucket.replaceAll("_", " ")}
                  tone={bucketTone[item.bucket]}
                />
                {item.priority ? (
                  <StatusBadge
                    label={item.priority}
                    tone={
                      item.priority === "CRITICAL" || item.priority === "HIGH"
                        ? "danger"
                        : item.priority === "MEDIUM"
                          ? "warning"
                          : "info"
                    }
                  />
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {[item.treatment, item.reason, item.dueLabel, item.assignedStaff, item.suggestedAction]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href={`/patients/${item.coupleSlug}`}>Open</Link>
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => openTask(item.coupleId)}>
                Create task
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => ask(`Prepare me for the consultation with ${item.coupleLabel}`)}
              >
                Prepare
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => ask(`Draft a follow-up WhatsApp for ${item.coupleLabel}`)}
              >
                Draft WhatsApp
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  ask(
                    `Draft a short call script for a coordinator follow-up with ${item.coupleLabel}. Reason: ${item.reason}`,
                  )
                }
              >
                Call script
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground"
          : "rounded-full border px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
      }
    >
      {label}
    </button>
  );
}
