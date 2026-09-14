"use client";

import { AbhaSetupWizard } from "@/components/digital-health/abha-setup-wizard";
import { DigitalHealthCard } from "@/components/digital-health/digital-health-card";
import { AbdmEnvironmentBanner } from "@/components/digital-health/digital-health-nav";
import { EmptyState, LoadingRows, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api/client";
import {
  ABHA_STATUS_LABELS,
  abhaStatusTone,
  resolveAbhaUiStatus,
} from "@/lib/abdm/status";
import { formatDate, formatDateTime } from "@/components/pharmacy/format";
import {
  CheckCircle2,
  FileText,
  Link2,
  Shield,
  Unlink,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Connection = {
  connected: boolean;
  status: string;
  environment: string;
  message: string;
  demoLinkAllowed: boolean;
  authMethods?: Array<{ id: string; label: string; description: string; sandboxOnly?: boolean }>;
};

type Identity = {
  status: string;
  abhaMasked: string | null;
  abhaAddress?: string | null;
  verificationStatus: string | null;
  linkedAt: string | null;
  lastVerifiedAt: string | null;
  source: string | null;
  sandboxMode: boolean;
  errorMessage: string | null;
  consentHint?: string;
};

type Consent = {
  id: string;
  purpose: string;
  requestedByName: string | null;
  requestedAt: string;
  expiresAt: string | null;
  dataCategories: string[];
  status: string;
  sandboxMode: boolean;
  notes: string | null;
};

type Exchange = {
  id: string;
  status: string;
  purpose: string;
  recordTypes: string[];
  failureReason: string | null;
  sandboxMode: boolean;
  preparedAt: string | null;
  sharedAt: string | null;
};

type TimelineItem = {
  id: string;
  date: string;
  type: string;
  title: string;
  doctor: string | null;
  clinic: string;
  href: string | null;
  recordStatus: string | null;
};

type DigitalHealthPayload = {
  connection: Connection;
  identity: Identity;
  consents: Consent[];
  exchanges: Exchange[];
  records: {
    documentStorageNote: string | null;
    categories: Record<string, number | boolean>;
    timeline: TimelineItem[];
  };
};

function toneForConsent(status: string) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  if (status === "REVOKED" || status === "REJECTED" || status === "EXPIRED") return "danger" as const;
  return "muted" as const;
}

export function PatientDigitalHealthTab({ patientId }: { patientId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DigitalHealthPayload | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [abhaInput, setAbhaInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [consentPurpose, setConsentPurpose] = useState("Treatment continuity / record sharing");
  const [prepareOpen, setPrepareOpen] = useState(false);

  const load = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      setError("No patient record is linked for digital health.");
      return;
    }
    setLoading(true);
    try {
      const next = await apiGet<DigitalHealthPayload>(`/api/v1/digital-health/patients/${patientId}`);
      setData(next);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load digital health data.");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function linkAbha() {
    setBusy(true);
    try {
      await apiPost(`/api/v1/digital-health/patients/${patientId}/abha/link`, {
        abhaNumber: abhaInput,
      });
      toast.success("ABHA link intent recorded.");
      setLinkOpen(false);
      setAbhaInput("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to link ABHA.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyAbha() {
    setBusy(true);
    try {
      const res = await apiPost<{ providerMessage?: string }>(
        `/api/v1/digital-health/patients/${patientId}/abha/verify`,
        {},
      );
      toast.message(res.providerMessage ?? "Verification status updated.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to verify ABHA.");
    } finally {
      setBusy(false);
    }
  }

  async function unlinkAbha() {
    setBusy(true);
    try {
      await apiDelete(`/api/v1/digital-health/patients/${patientId}/abha`);
      toast.success("ABHA unlinked.");
      setUnlinkOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to unlink ABHA.");
    } finally {
      setBusy(false);
    }
  }

  async function createConsent() {
    setBusy(true);
    try {
      await apiPost(`/api/v1/digital-health/patients/${patientId}/consents`, {
        purpose: consentPurpose,
        dataCategories: ["Consultation", "Prescription", "CarePlan"],
        createCareTask: true,
      });
      toast.success("Consent request created. Patient action required.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to create consent request.");
    } finally {
      setBusy(false);
    }
  }

  async function prepareRecord() {
    setBusy(true);
    try {
      const active = data?.consents.find((c) => c.status === "ACTIVE");
      await apiPost(`/api/v1/digital-health/patients/${patientId}/health-records/prepare`, {
        purpose: "Clinic-authorized record preparation",
        recordTypes: ["Patient", "Encounter", "MedicationRequest", "CarePlan", "Document"],
        consentId: active?.id ?? null,
        idempotencyKey: `prep_${patientId}_${Date.now()}`,
      });
      toast.success("Record prepared locally (interop DTO).");
      setPrepareOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to prepare record.");
    } finally {
      setBusy(false);
    }
  }

  async function shareExchange(id: string) {
    setBusy(true);
    try {
      const active = data?.consents.find((c) => c.status === "ACTIVE");
      await apiPost(`/api/v1/digital-health/health-record-exchanges/${id}/share`, {
        consentId: active?.id ?? null,
      });
      toast.success("Share confirmed by provider.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Share failed.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function consentAction(id: string, action: "approve" | "reject" | "revoke") {
    setBusy(true);
    try {
      await apiPost(`/api/v1/digital-health/consents/${id}/${action}`, {});
      toast.success(`Consent ${action}d.`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Consent action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingRows rows={4} />;
  if (error || !data) {
    return (
      <EmptyState
        title="Unable to load digital health."
        description={error ?? "Try again."}
        icon={Shield}
        action={<Button onClick={() => void load()}>Retry</Button>}
      />
    );
  }

  const { connection, identity, consents, exchanges, records } = data;
  const uiStatus = resolveAbhaUiStatus(identity);

  return (
    <div className="space-y-5">
      <AbdmEnvironmentBanner environment={connection.environment} connected={connection.connected} />

      {!connection.connected && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">ABDM services may be unavailable or not configured.</p>
          <p className="mt-1 text-xs text-amber-900/80">{connection.message}</p>
          <p className="mt-1 text-xs">You can continue clinic workflows and retry ABHA later.</p>
          <Link href="/digital-health/settings" className="mt-2 inline-block text-xs font-medium text-primary underline">
            Open ABDM settings
          </Link>
        </div>
      )}

      <DigitalHealthCard
        identity={identity}
        recordsCount={records.timeline.length}
        lastActivity={identity.lastVerifiedAt ? formatDateTime(identity.lastVerifiedAt) : null}
        onSetup={() => setSetupOpen(true)}
      />

      <section className="rounded-xl border bg-background p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">ABDM & Digital Health</h3>
            <p className="text-xs text-muted-foreground">{identity.consentHint}</p>
          </div>
          <StatusBadge label={ABHA_STATUS_LABELS[uiStatus]} tone={abhaStatusTone(uiStatus)} />
        </div>

        {identity.status === "NOT_LINKED" ? (
          <EmptyState
            title="ABHA not linked"
            description="Create or link an ABHA through the official ABDM journey. Each individual in a couple needs their own ABHA."
            icon={Link2}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button className="rounded-lg" onClick={() => setSetupOpen(true)}>
                  + Create / Link ABHA
                </Button>
                <Button variant="outline" className="rounded-lg" onClick={() => setSetupOpen(true)}>
                  Already have ABHA?
                </Button>
              </div>
            }
          />
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">ABHA Number</span>{" "}
              <span className="font-medium tabular-nums">{identity.abhaMasked ?? "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">ABHA Address</span>{" "}
              <span className="font-medium">{identity.abhaAddress || "Not set"}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              KYC / verification: {identity.verificationStatus ?? "—"}
              {identity.linkedAt ? ` · Linked ${formatDate(identity.linkedAt)}` : ""}
              {identity.lastVerifiedAt ? ` · Last verified ${formatDate(identity.lastVerifiedAt)}` : ""}
              {identity.source ? ` · Source ${identity.source}` : ""}
              {identity.sandboxMode ? " · SANDBOX" : ""}
            </p>
            {identity.errorMessage && (
              <p className="text-xs text-amber-800">{identity.errorMessage}</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button size="sm" onClick={() => setSetupOpen(true)}>
                View / continue ABHA
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void verifyAbha()}>
                Verify
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void createConsent()}>
                Manage Consent
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setPrepareOpen(true)}>
                Discover / Request Records
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setUnlinkOpen(true)}>
                <Unlink className="size-3.5" /> Unlink
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setLinkOpen(true)}>
                Quick link
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-background p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Consent</h3>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void createConsent()}>
            Request consent
          </Button>
        </div>
        {!consents.length ? (
          <EmptyState title="No active consent requests." description="Consent must be explicit for health-information exchange." icon={Shield} />
        ) : (
          <ul className="divide-y text-sm">
            {consents.map((consent) => (
              <li key={consent.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{consent.purpose}</p>
                  <p className="text-xs text-muted-foreground">
                    {consent.requestedByName ?? "Staff"} · {formatDate(consent.requestedAt)}
                    {consent.expiresAt ? ` · Expires ${formatDate(consent.expiresAt)}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{consent.dataCategories.join(", ")}</p>
                  {consent.status === "PENDING" && (
                    <p className="mt-1 text-xs font-medium text-amber-800">Patient action required.</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={consent.status} tone={toneForConsent(consent.status)} />
                  {consent.status === "PENDING" && (
                    <>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void consentAction(consent.id, "approve")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void consentAction(consent.id, "reject")}>
                        Reject
                      </Button>
                    </>
                  )}
                  {consent.status === "ACTIVE" && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void consentAction(consent.id, "revoke")}>
                      Revoke
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-background p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Digital health records</h3>
          <Button size="sm" className="rounded-lg" onClick={() => setPrepareOpen(true)}>
            Prepare / share
          </Button>
        </div>
        {records.documentStorageNote && (
          <p className="mb-3 text-xs text-muted-foreground">{records.documentStorageNote}</p>
        )}
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          {Object.entries(records.categories).map(([key, value]) => (
            <div key={key} className="rounded-lg border px-3 py-2">
              <p className="text-muted-foreground capitalize">{key}</p>
              <p className="font-semibold">{String(value)}</p>
            </div>
          ))}
        </div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</h4>
        {!records.timeline.length ? (
          <EmptyState title="No digital health records available." description="Records appear from existing SMRKOMED appointments, consultations, prescriptions, and documents." icon={FileText} />
        ) : (
          <ul className="space-y-2">
            {records.timeline.slice(0, 25).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(item.date)} · {item.type}
                    {item.doctor ? ` · ${item.doctor}` : ""} · {item.clinic}
                  </p>
                </div>
                {item.href ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={item.href}>Open</Link>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">{item.recordStatus ?? "Record"}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border bg-background p-4">
        <h3 className="mb-3 text-sm font-semibold">Record exchanges</h3>
        {!exchanges.length ? (
          <p className="text-sm text-muted-foreground">No prepare/share exchanges yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {exchanges.map((ex) => (
              <li key={ex.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">{ex.purpose}</p>
                  <p className="text-xs text-muted-foreground">
                    {ex.recordTypes.join(", ")}
                    {ex.sandboxMode ? " · SANDBOX" : ""}
                    {ex.failureReason ? ` · ${ex.failureReason}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label={ex.status.replaceAll("_", " ")} tone={ex.status === "SHARED" ? "success" : ex.status === "FAILED" ? "danger" : "muted"} />
                  {(ex.status === "PREPARED" || ex.status === "CONSENT_GRANTED" || ex.status === "FAILED") && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void shareExchange(ex.id)}>
                      Share
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link ABHA</DialogTitle>
            <DialogDescription>
              {connection.connected
                ? "ABDM will require patient verification. OTP is never faked."
                : connection.demoLinkAllowed
                  ? "ABDM is not connected. Demo mode can record a SANDBOX link intent only."
                  : "ABDM integration is not connected. Ask an administrator to configure credentials."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="abha">ABHA number</Label>
            <Input
              id="abha"
              value={abhaInput}
              onChange={(e) => setAbhaInput(e.target.value)}
              placeholder="14-digit ABHA"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy || abhaInput.trim().length < 8} onClick={() => void linkAbha()}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink ABHA?</DialogTitle>
            <DialogDescription>
              This removes the digital health identity link for this patient in this clinic. Confirm to continue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void unlinkAbha()}>
              Unlink
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={prepareOpen} onOpenChange={setPrepareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prepare digital record</DialogTitle>
            <DialogDescription>
              Builds an interoperability DTO from SMRKOMED data only. Sharing requires active consent and ABDM confirmation — never marked SHARED without the provider.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="purpose">Consent purpose (for new requests)</Label>
            <Input id="purpose" value={consentPurpose} onChange={(e) => setConsentPurpose(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrepareOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void prepareRecord()}>
              <CheckCircle2 className="size-4" /> Prepare
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AbhaSetupWizard
        open={setupOpen}
        onOpenChange={setSetupOpen}
        patientId={patientId}
        connection={{
          connected: connection.connected,
          environment: connection.environment,
          demoLinkAllowed: connection.demoLinkAllowed,
          message: connection.message,
          authMethods: connection.authMethods ?? [],
        }}
        onCompleted={() => void load()}
      />
    </div>
  );
}
