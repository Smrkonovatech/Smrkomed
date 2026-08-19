"use client";

import { Bell } from "lucide-react";

import { PageHeader, SectionHeading, StatusBadge } from "@/components/ui-kit";
import { useAppState } from "@/lib/app-state";
import { toneDot, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

const tones: Record<string, Tone> = {
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
};

export default function NotificationsPage() {
  const { activity } = useAppState();

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="Clinical escalations first, automation activity second."
      />
      <section className="surface-card p-4">
        <SectionHeading
          title="Recent activity"
          subtitle="Live from Care Loop"
          icon={Bell}
          tone="purple"
          action={<StatusBadge label="Live" tone="success" />}
        />
        {activity.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
        <ul className="divide-y">
          {activity.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-3">
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  toneDot[tones[a.tone] ?? "muted"],
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">{a.patient}</span>{" "}
                  <span className="text-muted-foreground">{a.activity}</span>
                </p>
                <p className="text-xs text-muted-foreground">{a.time}</p>
              </div>
            </li>
          ))}
        </ul>
        )}
      </section>
    </div>
  );
}
