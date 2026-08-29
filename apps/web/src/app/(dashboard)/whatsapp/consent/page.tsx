"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";

type ConsentRow = {
  id: string;
  patientId: string;
  patientName: string;
  phone: string | null;
  status: string;
  source: string | null;
  consentedAt: string | null;
  updatedAt: string;
};

export default function WhatsAppConsentPage() {
  const [rows, setRows] = useState<ConsentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await apiGet<ConsentRow[]>("/api/v1/whatsapp-automation/consent"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load consent.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(status: "GRANTED" | "REVOKED" | "PENDING") {
    if (!patientId.trim()) {
      toast.error("Enter a patient ID");
      return;
    }
    try {
      await apiPost("/api/v1/whatsapp-automation/consent", {
        patientId: patientId.trim(),
        status,
        source: "staff_consent_center",
      });
      toast.success(`Consent ${status}`);
      setPatientId("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Update failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader
        title="Consent"
        subtitle="WhatsApp communication consent for this clinic. Automation respects REVOKED and optional GRANTED-required mode."
      />

      <div className="surface-card space-y-3 p-4">
        <p className="text-sm font-medium">Record consent</p>
        <Input placeholder="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void setStatus("GRANTED")}>
            Grant
          </Button>
          <Button size="sm" variant="outline" onClick={() => void setStatus("PENDING")}>
            Requested / Pending
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void setStatus("REVOKED")}>
            Opt out
          </Button>
        </div>
      </div>

      {loading ? <LoadingRows rows={4} /> : null}
      {error ? <EmptyState title="Unable to load" description={error} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="No consent records" description="Consent is created when patients are enrolled or recorded here." />
      ) : null}

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="surface-card flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <p className="font-medium">{r.patientName}</p>
              <p className="text-xs text-muted-foreground">
                {r.phone ?? "No phone"} · Updated {new Date(r.updatedAt).toLocaleString()}
                {r.source ? ` · ${r.source}` : ""}
              </p>
            </div>
            <StatusBadge
              label={r.status}
              tone={r.status === "GRANTED" ? "success" : r.status === "REVOKED" ? "danger" : "warning"}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
