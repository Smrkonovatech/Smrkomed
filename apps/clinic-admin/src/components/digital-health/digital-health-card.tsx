"use client";

import Link from "next/link";
import { Shield } from "lucide-react";

import { StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  ABHA_STATUS_LABELS,
  abhaStatusTone,
  resolveAbhaUiStatus,
} from "@/lib/abdm/status";

type Props = {
  identity: {
    status: string;
    abhaMasked: string | null;
    abhaAddress?: string | null;
    verificationStatus?: string | null;
    lastVerifiedAt?: string | null;
    sandboxMode?: boolean;
  };
  recordsCount?: number;
  lastActivity?: string | null;
  onSetup?: () => void;
  patientHref?: string;
};

/** Compact Digital Health card for patient profile / overview. */
export function DigitalHealthCard({
  identity,
  recordsCount = 0,
  lastActivity,
  onSetup,
  patientHref,
}: Props) {
  const ui = resolveAbhaUiStatus(identity);
  const linked = ui === "ABHA_LINKED" || ui === "KYC_VERIFIED";

  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary">
            <Shield className="size-4" />
          </span>
          <h3 className="text-sm font-semibold">Digital Health</h3>
        </div>
        <StatusBadge label={ABHA_STATUS_LABELS[ui]} tone={abhaStatusTone(ui)} />
      </div>

      {linked ? (
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">ABHA Number</dt>
            <dd className="font-medium tabular-nums">{identity.abhaMasked ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">ABHA Address</dt>
            <dd className="font-medium">{identity.abhaAddress || "Not set"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">KYC</dt>
            <dd className="font-medium">{ui === "KYC_VERIFIED" ? "Verified" : identity.verificationStatus ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Records</dt>
            <dd className="font-medium">{recordsCount}</dd>
          </div>
          {lastActivity && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Last activity</dt>
              <dd className="text-xs font-medium">{lastActivity}</dd>
            </div>
          )}
          {identity.sandboxMode && (
            <p className="pt-1 text-[10px] font-semibold tracking-wide text-sky-800 uppercase">Sandbox</p>
          )}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">ABHA not linked</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {onSetup && (
          <Button size="sm" onClick={onSetup}>
            {linked ? "Manage" : "+ Create / Link ABHA"}
          </Button>
        )}
        {patientHref && (
          <Button size="sm" variant="outline" asChild>
            <Link href={patientHref}>View</Link>
          </Button>
        )}
      </div>
    </article>
  );
}
