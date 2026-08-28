"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { type PageResult } from "@/components/insurance/format";
import { LoadingRows, PageHeader } from "@/components/ui-kit";
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

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  primaryCouples?: Array<{ id: string }>;
  partnerCouples?: Array<{ id: string }>;
};

type Provider = { id: string; name: string; isActive: boolean };
type Tpa = { id: string; name: string; isActive: boolean };

export default function NewInsurancePolicyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get("patientId") ?? "";
  const coupleIdParam = searchParams.get("coupleId") ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [tpas, setTpas] = useState<Tpa[]>([]);

  const [form, setForm] = useState({
    patientId: patientIdParam,
    coupleId: coupleIdParam,
    providerId: "",
    tpaId: "",
    policyName: "",
    policyNumber: "",
    memberId: "",
    policyHolderName: "",
    relationshipToHolder: "",
    startDate: "",
    expiryDate: "",
    sumInsured: "",
    availableCoverage: "",
    networkStatus: "",
    cashlessStatus: "",
    status: "PENDING_VERIFICATION",
    eligibilityStatus: "PENDING",
    notes: "",
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [patientRows, providerPage, tpaPage] = await Promise.all([
          apiGet<Patient[]>("/api/v1/patients"),
          apiGet<PageResult<Provider>>("/api/v1/insurance/providers?page=1&pageSize=100"),
          apiGet<PageResult<Tpa>>("/api/v1/insurance/tpas?page=1&pageSize=100"),
        ]);
        if (cancelled) return;
        setPatients(patientRows);
        setProviders(providerPage.items.filter((p) => p.isActive !== false));
        setTpas(tpaPage.items.filter((t) => t.isActive !== false));
        if (patientIdParam) {
          setForm((prev) => ({ ...prev, patientId: patientIdParam, coupleId: coupleIdParam }));
        }
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Unable to load policy form data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientIdParam, coupleIdParam]);

  function onPatientChange(patientId: string) {
    const patient = patients.find((p) => p.id === patientId);
    const coupleId =
      patient?.primaryCouples?.[0]?.id ?? patient?.partnerCouples?.[0]?.id ?? coupleIdParam;
    setForm((prev) => ({
      ...prev,
      patientId,
      coupleId: coupleId || prev.coupleId,
      policyHolderName:
        prev.policyHolderName ||
        (patient ? `${patient.firstName} ${patient.lastName}`.trim() : ""),
    }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.patientId || !form.providerId || !form.policyName.trim() || !form.policyNumber.trim()) {
      toast.error("Patient, provider, policy name, and policy number are required.");
      return;
    }
    const sumInsured = Number(form.sumInsured);
    const availableCoverage = Number(form.availableCoverage || form.sumInsured);
    if (!(sumInsured >= 0) || !(availableCoverage >= 0)) {
      toast.error("Enter valid coverage amounts.");
      return;
    }
    setSaving(true);
    try {
      await apiPost("/api/v1/insurance/policies", {
        patientId: form.patientId,
        coupleId: form.coupleId || null,
        providerId: form.providerId,
        tpaId: form.tpaId || null,
        policyName: form.policyName.trim(),
        policyNumber: form.policyNumber.trim(),
        memberId: form.memberId || null,
        policyHolderName: form.policyHolderName || null,
        relationshipToHolder: form.relationshipToHolder || null,
        startDate: form.startDate || null,
        expiryDate: form.expiryDate || null,
        sumInsured,
        availableCoverage,
        networkStatus: form.networkStatus || null,
        cashlessStatus: form.cashlessStatus || null,
        status: form.status,
        eligibilityStatus: form.eligibilityStatus,
        notes: form.notes || null,
      });
      toast.success("Insurance policy added.");
      router.push("/insurance");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to create policy.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[900px] space-y-4">
        <PageHeader title="Add Insurance Policy" subtitle="Capture policy details for a patient." />
        <LoadingRows rows={4} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <PageHeader
        title="Add Insurance Policy"
        subtitle="Policy details are verified manually. Do not assume treatment coverage."
        actions={
          <Button variant="outline" className="rounded-lg" asChild>
            <Link href="/insurance">Cancel</Link>
          </Button>
        }
      />

      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-background p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>Patient *</Label>
            <Select value={form.patientId} onValueChange={onPatientChange}>
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Provider *</Label>
            <Select
              value={form.providerId}
              onValueChange={(providerId) => setForm({ ...form, providerId })}
            >
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Select insurer" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>TPA</Label>
            <Select
              value={form.tpaId || "__none__"}
              onValueChange={(tpaId) => setForm({ ...form, tpaId: tpaId === "__none__" ? "" : tpaId })}
            >
              <SelectTrigger className="rounded-lg">
                <SelectValue placeholder="Optional TPA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {tpas.map((tpa) => (
                  <SelectItem key={tpa.id} value={tpa.id}>
                    {tpa.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Policy name *</Label>
            <Input
              value={form.policyName}
              onChange={(e) => setForm({ ...form, policyName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Policy number *</Label>
            <Input
              value={form.policyNumber}
              onChange={(e) => setForm({ ...form, policyNumber: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Member ID</Label>
            <Input value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Policy holder</Label>
            <Input
              value={form.policyHolderName}
              onChange={(e) => setForm({ ...form, policyHolderName: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Relationship to holder</Label>
            <Input
              value={form.relationshipToHolder}
              onChange={(e) => setForm({ ...form, relationshipToHolder: e.target.value })}
              placeholder="Self / Spouse / Dependent"
            />
          </div>
          <div className="space-y-1">
            <Label>Start date</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Expiry date</Label>
            <Input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Sum insured *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.sumInsured}
              onChange={(e) => setForm({ ...form, sumInsured: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Available coverage *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.availableCoverage}
              onChange={(e) => setForm({ ...form, availableCoverage: e.target.value })}
              placeholder="Defaults to sum insured"
            />
          </div>
          <div className="space-y-1">
            <Label>Network status</Label>
            <Input
              value={form.networkStatus}
              onChange={(e) => setForm({ ...form, networkStatus: e.target.value })}
              placeholder="Network / Non-network"
            />
          </div>
          <div className="space-y-1">
            <Label>Cashless status</Label>
            <Input
              value={form.cashlessStatus}
              onChange={(e) => setForm({ ...form, cashlessStatus: e.target.value })}
              placeholder="Cashless eligible / Reimbursement only"
            />
          </div>
          <div className="space-y-1">
            <Label>Policy status</Label>
            <Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}>
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING_VERIFICATION">Pending verification</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="EXPIRED">Expired</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Eligibility status</Label>
            <Select
              value={form.eligibilityStatus}
              onValueChange={(eligibilityStatus) => setForm({ ...form, eligibilityStatus })}
            >
              <SelectTrigger className="rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="VERIFIED">Verified</SelectItem>
                <SelectItem value="NOT_VERIFIED">Not verified</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/insurance">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save policy"}
          </Button>
        </div>
      </form>
    </div>
  );
}
