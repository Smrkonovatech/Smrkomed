"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  CLAIM_STATUS_OPTIONS,
  claimStatusLabel,
  claimStatusTone,
  formatDate,
  formatDateTime,
  formatINR,
  priorityTone,
} from "@/components/insurance/format";
import { EmptyState, LoadingRows, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api/client";

type ClaimDetail = {
  id: string;
  claimNumber: string;
  patientName: string | null;
  coupleLabel: string | null;
  coupleId: string | null;
  providerName: string | null;
  tpaName: string | null;
  policyName: string | null;
  policyNumber: string | null;
  claimType: string;
  status: string;
  treatmentLabel: string | null;
  procedureLabel: string | null;
  diagnosisCategory: string | null;
  expectedAdmissionDate: string | null;
  expectedDischargeDate: string | null;
  doctorName: string | null;
  coordinatorName: string | null;
  amountRequested: number;
  amountApproved: number;
  amountRejected: number;
  amountPaid: number;
  patientResponsibility: number;
  priority: string;
  dueDate: string | null;
  notes: string | null;
  preauthSubmittedAt: string | null;
  documents?: Array<{
    id: string;
    documentId: string;
    documentType: string | null;
    fileName: string | null;
    createdAt: string;
  }>;
  queries?: Array<{
    id: string;
    message: string;
    status: string;
    dueDate: string | null;
    responseMessage: string | null;
    assignedToName: string | null;
    receivedAt: string;
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string | null;
    reference: string | null;
  }>;
  events?: Array<{
    id: string;
    action: string;
    status: string | null;
    note: string | null;
    actorName: string | null;
    createdAt: string;
  }>;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-background p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? "—"}</p>
    </div>
  );
}

export default function InsuranceClaimDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusDraft, setStatusDraft] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [respondOpen, setRespondOpen] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [markResolved, setMarkResolved] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: "",
    paymentMethod: "",
    reference: "",
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiGet<ClaimDetail>(`/api/v1/insurance/claims/${id}`);
      setClaim(next);
      setStatusDraft(next.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load claim.");
      setClaim(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  async function submitPreauth() {
    setBusy(true);
    try {
      const next = await apiPost<ClaimDetail>(`/api/v1/insurance/claims/${id}/preauth`, {});
      setClaim(next);
      setStatusDraft(next.status);
      toast.success("Pre-authorisation submitted (Manual / Demo).");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to submit pre-authorisation.");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus() {
    if (!statusDraft || statusDraft === claim?.status) return;
    setBusy(true);
    try {
      const next = await apiPatch<ClaimDetail>(`/api/v1/insurance/claims/${id}`, { status: statusDraft });
      setClaim(next);
      toast.success("Claim status updated.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to update status.");
    } finally {
      setBusy(false);
    }
  }

  async function recordPayment(event: FormEvent) {
    event.preventDefault();
    const amount = Number(paymentForm.amount);
    if (!(amount > 0)) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    setBusy(true);
    try {
      const result = await apiPost<{ claim: ClaimDetail }>(`/api/v1/insurance/claims/${id}/payments`, {
        amount,
        paymentDate: paymentForm.paymentDate || null,
        paymentMethod: paymentForm.paymentMethod || null,
        reference: paymentForm.reference || null,
        notes: paymentForm.notes || null,
      });
      setClaim(result.claim);
      setStatusDraft(result.claim.status);
      setPaymentOpen(false);
      setPaymentForm({ amount: "", paymentDate: "", paymentMethod: "", reference: "", notes: "" });
      toast.success("Payment recorded.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to record payment.");
    } finally {
      setBusy(false);
    }
  }

  async function respondToQuery(event: FormEvent) {
    event.preventDefault();
    if (!respondOpen || !responseMessage.trim()) {
      toast.error("Enter a response message.");
      return;
    }
    setBusy(true);
    try {
      await apiPost(`/api/v1/insurance/queries/${respondOpen}/respond`, {
        responseMessage: responseMessage.trim(),
        markResolved,
      });
      toast.success(markResolved ? "Query resolved." : "Response saved.");
      setRespondOpen(null);
      setResponseMessage("");
      setMarkResolved(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to respond to query.");
    } finally {
      setBusy(false);
    }
  }

  async function resolveQuery(queryId: string) {
    setBusy(true);
    try {
      await apiPost(`/api/v1/insurance/queries/${queryId}/resolve`, {});
      toast.success("Query marked resolved.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Unable to resolve query.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-4">
        <LoadingRows rows={5} />
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="mx-auto max-w-[1500px]">
        <EmptyState
          title="Unable to load claim."
          description={error ?? "Claim not found."}
          action={
            <Button variant="outline" asChild>
              <Link href="/insurance/claims">Back to claims</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title={claim.claimNumber}
        subtitle={`${claim.coupleLabel ?? claim.patientName ?? "Patient"} · ${claim.providerName ?? "Insurer"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-lg" asChild>
              <Link href="/insurance/claims">
                <ArrowLeft className="size-4" /> Claims
              </Link>
            </Button>
            {!claim.preauthSubmittedAt && (
              <Button className="rounded-lg" disabled={busy} onClick={() => void submitPreauth()}>
                Submit Pre-authorisation
              </Button>
            )}
            <Button variant="outline" className="rounded-lg" onClick={() => setPaymentOpen(true)}>
              Record payment
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-background px-4 py-3">
        <StatusBadge label={claimStatusLabel(claim.status)} tone={claimStatusTone(claim.status)} />
        <StatusBadge label={claim.priority} tone={priorityTone(claim.priority)} />
        <span className="text-sm text-muted-foreground">
          Requested {formatINR(claim.amountRequested)} · Approved {formatINR(claim.amountApproved)} · Paid{" "}
          {formatINR(claim.amountPaid)}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={statusDraft} onValueChange={setStatusDraft}>
            <SelectTrigger className="h-9 w-[200px] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLAIM_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {claimStatusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={busy || statusDraft === claim.status} onClick={() => void updateStatus()}>
            Update status
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Patient">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Patient" value={claim.patientName} />
            <Field label="Couple" value={claim.coupleLabel} />
            <Field label="Doctor" value={claim.doctorName} />
            <Field label="Coordinator" value={claim.coordinatorName} />
          </div>
        </Section>

        <Section title="Insurance">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Provider" value={claim.providerName} />
            <Field label="TPA" value={claim.tpaName} />
            <Field label="Policy" value={claim.policyName} />
            <Field label="Policy number" value={claim.policyNumber} />
            <Field label="Claim type" value={claim.claimType.replaceAll("_", " ")} />
            <Field label="Due date" value={formatDate(claim.dueDate)} />
          </div>
        </Section>

        <Section title="Treatment">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Treatment" value={claim.treatmentLabel} />
            <Field label="Procedure" value={claim.procedureLabel} />
            <Field label="Diagnosis category" value={claim.diagnosisCategory} />
            <Field label="Admission" value={formatDate(claim.expectedAdmissionDate)} />
            <Field label="Discharge" value={formatDate(claim.expectedDischargeDate)} />
            <Field label="Notes" value={claim.notes} />
          </div>
        </Section>

        <Section title="Pre-authorisation">
          {claim.preauthSubmittedAt ? (
            <p className="text-sm">
              Submitted {formatDateTime(claim.preauthSubmittedAt)} (Manual / Demo — not sent to an insurer network).
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pre-authorisation has not been submitted yet. Submission records locally in Manual / Demo mode.
              </p>
              <Button disabled={busy} onClick={() => void submitPreauth()}>
                Submit Pre-authorisation
              </Button>
            </div>
          )}
        </Section>
      </div>

      <Section title="Documents">
        {!claim.documents?.length ? (
          <EmptyState
            title="No documents attached."
            description="Attach estimate, policy card, and clinical documents from the Documents module, then link them on this claim."
          />
        ) : (
          <ul className="space-y-2 text-sm">
            {claim.documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <p className="font-medium">{doc.fileName ?? doc.documentId}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.documentType ?? "Document"} · {formatDate(doc.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Queries">
        {!claim.queries?.length ? (
          <EmptyState title="No insurer queries." description="Open queries from the insurer will appear here." />
        ) : (
          <ul className="space-y-3 text-sm">
            {claim.queries.map((query) => (
              <li key={query.id} className="rounded-lg border px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{query.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(query.receivedAt)}
                      {query.dueDate ? ` · Due ${formatDate(query.dueDate)}` : ""}
                      {query.assignedToName ? ` · ${query.assignedToName}` : ""}
                    </p>
                    {query.responseMessage && (
                      <p className="mt-2 text-muted-foreground">Response: {query.responseMessage}</p>
                    )}
                  </div>
                  <StatusBadge label={query.status} tone={claimStatusTone(query.status === "RESOLVED" ? "APPROVED" : "QUERY")} />
                </div>
                {query.status !== "RESOLVED" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRespondOpen(query.id);
                        setResponseMessage("");
                        setMarkResolved(false);
                      }}
                    >
                      Respond
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void resolveQuery(query.id)}>
                      Resolve
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Financial summary">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Requested" value={formatINR(claim.amountRequested)} />
            <Field label="Approved" value={formatINR(claim.amountApproved)} />
            <Field label="Rejected" value={formatINR(claim.amountRejected)} />
            <Field label="Paid" value={formatINR(claim.amountPaid)} />
            <Field label="Patient responsibility" value={formatINR(claim.patientResponsibility)} />
          </div>
          {!!claim.payments?.length && (
            <ul className="mt-4 space-y-2 border-t pt-3 text-sm">
              {claim.payments.map((payment) => (
                <li key={payment.id} className="flex justify-between gap-2">
                  <span>
                    {formatDate(payment.paymentDate)}
                    {payment.paymentMethod ? ` · ${payment.paymentMethod}` : ""}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                  </span>
                  <span className="font-semibold tabular-nums">{formatINR(payment.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Timeline">
          {!claim.events?.length ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {claim.events.map((event) => (
                <li key={event.id} className="rounded-lg border px-3 py-2">
                  <p className="font-medium">{event.action.replaceAll("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(event.createdAt)}
                    {event.actorName ? ` · ${event.actorName}` : ""}
                    {event.status ? ` · ${claimStatusLabel(event.status)}` : ""}
                  </p>
                  {event.note && <p className="mt-1 text-muted-foreground">{event.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <section className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        Related care tasks created for insurer queries appear in the Care Loop / Tasks workspace. Resolving a query
        here updates the linked task when present.
      </section>

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={recordPayment}>
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>Log insurer payment received against this claim.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 grid gap-3">
              <div className="space-y-1">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Payment date</Label>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Method</Label>
                <Input
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  placeholder="NEFT / UTR / Cheque"
                />
              </div>
              <div className="space-y-1">
                <Label>Reference</Label>
                <Input
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Input
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Record payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(respondOpen)} onOpenChange={(open) => !open && setRespondOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={respondToQuery}>
            <DialogHeader>
              <DialogTitle>Respond to query</DialogTitle>
              <DialogDescription>Send a clinic response to the insurer query.</DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <Label>Response *</Label>
                <Input
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  placeholder="Clinic response"
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={markResolved}
                  onChange={(e) => setMarkResolved(e.target.checked)}
                  className="size-4 rounded border"
                />
                Mark as resolved
              </label>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setRespondOpen(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Send response"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
