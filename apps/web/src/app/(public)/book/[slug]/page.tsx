"use client";

import { useParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BookPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [treatment, setTreatment] = useState("IVF");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const response = await fetch("/api/leads/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        email,
        treatment,
        clinicSlug: slug,
        utmSource: params?.get("utm_source") || undefined,
        utmMedium: params?.get("utm_medium") || undefined,
        utmCampaign: params?.get("utm_campaign") || undefined,
        utmTerm: params?.get("utm_term") || undefined,
        utmContent: params?.get("utm_content") || undefined,
        landingPage: typeof window !== "undefined" ? window.location.pathname : undefined,
      }),
    });
    setLoading(false);
    if (!response.ok) {
      setError("We could not capture this enquiry. Please call the clinic.");
      return;
    }
    setDone(true);
  }

  return (
    <AuthShell
      title="Book IVF consultation"
      subtitle="This enquiry enters the same SmrkoMed CRM as Google, Meta and WhatsApp leads."
    >
      {done ? (
        <p className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
          Thank you. The clinic team will follow up on WhatsApp shortly.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="treatment">Treatment</Label>
            <select
              id="treatment"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={treatment}
              onChange={(event) => setTreatment(event.target.value)}
            >
              <option>IVF</option>
              <option>IUI</option>
              <option>Fertility Evaluation</option>
            </select>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending…" : "Book consultation"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
