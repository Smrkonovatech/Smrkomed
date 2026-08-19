"use client";

import { useState } from "react";

import { ApiError, apiPost } from "@/lib/api/client";
import { SOURCE_OPTIONS, TREATMENT_OPTIONS } from "@/lib/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddLeadForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<(typeof SOURCE_OPTIONS)[number]>("WALK_IN");
  const [treatmentInterest, setTreatmentInterest] = useState("IVF");
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(createAnyway = false) {
    setBusy(true);
    setError(null);
    try {
      const lead = await apiPost<{ id: string }>("/api/v1/leads", {
        name,
        phone: phone || undefined,
        email: email || undefined,
        source,
        treatmentInterest,
        createAnyway,
      });
      onCreated(lead.id);
      setOpen(false);
      setDuplicate(false);
      setName("");
      setPhone("");
      setEmail("");
    } catch (err) {
      if (err instanceof ApiError && err.code === "DUPLICATE_LEAD") {
        setDuplicate(true);
        setError("Possible existing lead found. Open the existing lead from search, or create anyway if this is a legitimate new enquiry.");
      } else {
        setDuplicate(false);
        setError(err instanceof Error ? err.message : "Lead could not be created.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button className="rounded-lg" onClick={() => setOpen(true)}>
        Add Lead
      </Button>
    );
  }

  return (
    <div className="rounded-xl border bg-background p-4 shadow-sm">
      <p className="text-sm font-semibold">New fertility lead</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="lead-name">Name</Label>
          <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lead-phone">Phone</Label>
          <Input id="lead-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lead-email">Email</Label>
          <Input id="lead-email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lead-source">Source</Label>
          <select
            id="lead-source"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={source}
            onChange={(e) => setSource(e.target.value as (typeof SOURCE_OPTIONS)[number])}
          >
            {SOURCE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="lead-interest">Treatment interest</Label>
          <select
            id="lead-interest"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={treatmentInterest}
            onChange={(e) => setTreatmentInterest(e.target.value)}
          >
            {TREATMENT_OPTIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={busy || !name} onClick={() => void submit(false)}>
          {busy ? "Saving…" : "Create lead"}
        </Button>
        {duplicate && (
          <Button variant="outline" disabled={busy} onClick={() => void submit(true)}>
            Create anyway
          </Button>
        )}
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
