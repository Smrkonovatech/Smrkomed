"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";

import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { ApiError, apiGet } from "@/lib/api/client";

type Tx = {
  id: string;
  patientId: string | null;
  operation: string;
  status: string;
  referenceId: string | null;
  abhaMasked: string | null;
  errorCode: string | null;
  userMessage: string | null;
  environment: string;
  initiatedByName: string | null;
  createdAt: string;
};

export default function AbdmActivityPage() {
  const [items, setItems] = useState<Tx[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next = await apiGet<{ items: Tx[]; note?: string }>("/api/v1/digital-health/transactions");
        if (!cancelled) {
          setItems(next.items);
          setNote(next.note ?? null);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Unable to load activity.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingRows rows={4} />;
  if (error) return <EmptyState title="Unable to load activity" description={error} icon={ScrollText} />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="ABDM Activity"
        subtitle="Internal transaction log — OTP and secrets are never stored. Technical errors are kept for admins."
      />
      {note && <p className="text-sm text-amber-800">{note}</p>}
      {!items.length ? (
        <EmptyState
          title="No ABDM transactions yet"
          description="Journeys for create/link, consent, and OTP will appear here."
          icon={ScrollText}
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {items.map((tx) => (
            <li key={tx.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {tx.operation.replaceAll("_", " ")} · {tx.status}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(tx.createdAt).toLocaleString("en-IN")}
                  {tx.initiatedByName ? ` · ${tx.initiatedByName}` : ""}
                  {tx.abhaMasked ? ` · ${tx.abhaMasked}` : ""}
                  {` · ${tx.environment}`}
                </p>
                {tx.userMessage && <p className="mt-1 text-xs text-muted-foreground">{tx.userMessage}</p>}
              </div>
              <StatusBadge
                label={tx.errorCode ? "Issue" : tx.status}
                tone={tx.errorCode ? "danger" : "muted"}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
