"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { formatINR, type PageResult } from "@/components/insurance/format";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";

type Policy = {
  id: string;
  patientId: string;
  coupleId: string | null;
  policyName: string;
  policyNumber: string;
  patientName: string | null;
  coupleLabel: string | null;
  providerName: string | null;
  status: string;
};

type CreatedClaim = { id: string; claimNumber: string };

const STEPS = ["Patient & Policy", "Treatment", "Documents", "Review"] as const;

export default function NewInsuranceClaimPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const coupleIdParam = searchParams.get("coupleId") ?? "";

  const [step, setStep] = useState(0);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [policyId, setPolicyId] = useState("");
  const [claimType, setClaimType] = useState<"CASHLESS" | "REIMBURSEMENT" | "PRE_AUTH">("PRE_AUTH");
  const [treatmentLabel, setTreatmentLabel] = useState("");
  const [procedureLabel, setProcedureLabel] = useState("");
  const [diagnosisCategory, setDiagnosisCategory] = useState("");
  const [expectedAdmissionDate, setExpectedAdmissionDate] = useState("");
  const [expectedDischargeDate, setExpectedDischargeDate] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [amountRequested, setAmountRequested] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitPreauth, setSubmitPreauth] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const params = new URLSearchParams({ page: "1", pageSize: "100" });
        if (coupleIdParam) params.set("coupleId", coupleIdParam);
        const next = await apiGet<PageResult<Policy>>(`/api/v1/insurance/policies?${params}`);
        if (!cancelled) {
          setPolicies(next.items);
          if (next.items.length === 1) setPolicyId(next.items[0]!.id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Unable to load policies.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coupleIdParam]);

  const selectedPolicy = useMemo(
    () => policies.find((p) => p.id === policyId) ?? null,
    [policies, policyId],
  );

  function canNext() {
    if (step === 0) return Boolean(policyId && selectedPolicy);
    if (step === 1) return Boolean(treatmentLabel.trim() || amountRequested);
    return true;
  }

  async function submitClaim(event: FormEvent) {
    event.preventDefault();
    if (!selectedPolicy) {
      toast.error("Select a policy.");
      return;
    }
    setSaving(true);
    try {
      const created = await apiPost<CreatedClaim>("/api/v1/insurance/claims", {
        patientId: selectedPolicy.patientId,
        coupleId: selectedPolicy.coupleId ?? (coupleIdParam || null),
        policyId: selectedPolicy.id,
        claimType,
        treatmentLabel: treatmentLabel || null,
        procedureLabel: procedureLabel || null,
        diagnosisCategory: diagnosisCategory || null,
        expectedAdmissionDate: expectedAdmissionDate || null,
        expectedDischargeDate: expectedDischargeDate || null,
        doctorName: doctorName || null,
        amountRequested: Number(amountRequested) || 0,
        priority,
        dueDate: dueDate || null,
        notes: notes || null,
        documentIds: [],
        submitPreauth,
      });
      toast.success(`Claim ${created.claimNumber} created.`);
      router.push(`/insurance/claims/${created.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to create claim.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[900px] space-y-4">
        <PageHeader title="New Claim" subtitle="Create a pre-authorisation or treatment claim." />
        <LoadingRows rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[900px]">
        <PageHeader title="New Claim" subtitle="Create a pre-authorisation or treatment claim." />
        <EmptyState title="Unable to start claim." description={error} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <PageHeader
        title="New Claim"
        subtitle="Multi-step claim creation. Documents can be attached on the claim detail page."
        actions={
          <Button variant="outline" className="rounded-lg" asChild>
            <Link href="/insurance/claims">Cancel</Link>
          </Button>
        }
      />

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              index === step
                ? "bg-primary-soft text-primary"
                : index < step
                  ? "bg-muted text-foreground"
                  : "bg-muted/50 text-muted-foreground"
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <form onSubmit={submitClaim} className="space-y-4 rounded-xl border bg-background p-4">
        {step === 0 && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Policy *</Label>
              {!policies.length ? (
                <EmptyState
                  title="No policies available."
                  description="Add an insurance policy for the patient before creating a claim."
                  action={
                    <Button asChild>
                      <Link
                        href={
                          coupleIdParam
                            ? `/insurance/policies/new?coupleId=${coupleIdParam}`
                            : "/insurance/policies/new"
                        }
                      >
                        Add policy
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <Select value={policyId} onValueChange={setPolicyId}>
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="Select policy" />
                  </SelectTrigger>
                  <SelectContent>
                    {policies.map((policy) => (
                      <SelectItem key={policy.id} value={policy.id}>
                        {policy.policyName} · {policy.patientName ?? "Patient"} · {policy.providerName ?? "Insurer"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {selectedPolicy && (
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <p className="font-medium">{selectedPolicy.patientName ?? "Patient"}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedPolicy.policyNumber} · {selectedPolicy.coupleLabel ?? "Individual"} ·{" "}
                  {selectedPolicy.status}
                </p>
              </div>
            )}
            <div className="space-y-1">
              <Label>Claim type</Label>
              <Select value={claimType} onValueChange={(v) => setClaimType(v as typeof claimType)}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRE_AUTH">Pre-authorisation</SelectItem>
                  <SelectItem value="CASHLESS">Cashless</SelectItem>
                  <SelectItem value="REIMBURSEMENT">Reimbursement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Treatment</Label>
              <Input value={treatmentLabel} onChange={(e) => setTreatmentLabel(e.target.value)} placeholder="IVF Cycle / IUI / FET" />
            </div>
            <div className="space-y-1">
              <Label>Procedure</Label>
              <Input value={procedureLabel} onChange={(e) => setProcedureLabel(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Diagnosis category</Label>
              <Input value={diagnosisCategory} onChange={(e) => setDiagnosisCategory(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Expected admission</Label>
              <Input type="date" value={expectedAdmissionDate} onChange={(e) => setExpectedAdmissionDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Expected discharge</Label>
              <Input type="date" value={expectedDischargeDate} onChange={(e) => setExpectedDischargeDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Doctor</Label>
              <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Amount requested</Label>
              <Input type="number" min="0" step="0.01" value={amountRequested} onChange={(e) => setAmountRequested(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="NORMAL">Normal</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            Document attachment is optional at creation. After the claim is saved, open the claim detail page to
            link policy cards, estimates, and clinical documents from the Documents module.
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border px-3 py-2">
              <p className="font-medium">{selectedPolicy?.policyName}</p>
              <p className="text-xs text-muted-foreground">
                {selectedPolicy?.patientName} · {selectedPolicy?.providerName} · {claimType.replaceAll("_", " ")}
              </p>
            </div>
            <p>
              Treatment: <span className="font-medium">{treatmentLabel || "—"}</span>
            </p>
            <p>
              Amount requested:{" "}
              <span className="font-medium tabular-nums">{formatINR(Number(amountRequested) || 0)}</span>
            </p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={submitPreauth}
                onChange={(e) => setSubmitPreauth(e.target.checked)}
                className="size-4 rounded border"
              />
              Submit pre-authorisation on create (Manual / Demo)
            </label>
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button type="submit" disabled={saving || !selectedPolicy}>
              {saving ? "Creating…" : "Create claim"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
