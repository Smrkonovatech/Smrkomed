"use client";

import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  User,
  Phone,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface RegisteredPatientInfo {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  whatsappNumber?: string;
  email?: string | null;
  clinicId: string;
  clinicName: string;
  clinicCity: string;
  clinicAddress: string;
  purpose?: string;
}

interface QrRegisterTileProps {
  onSuccess: (patient: RegisteredPatientInfo) => void;
  onCancel?: () => void;
}

export function QrRegisterTile({ onSuccess, onCancel }: QrRegisterTileProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"FEMALE" | "MALE" | "OTHER">("FEMALE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (!phone.trim() || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const parts = trimmedName.split(/\s+/);
    const firstName = parts[0] || "Patient";
    const lastName = parts.slice(1).join(" ") || firstName;

    setLoading(true);

    try {
      const response = await fetch("/api/qr/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          firstName,
          lastName,
          phone,
          gender,
          purpose: "Consultation & Check-in",
        }),
      });

      const res = await response.json();

      if (!response.ok || !res.success) {
        throw new Error(res.error || "Registration failed. Please try again.");
      }

      onSuccess({
        id: res.data.patient.id,
        firstName: res.data.patient.firstName,
        lastName: res.data.patient.lastName,
        fullName: res.data.patient.fullName,
        phone: res.data.patient.phone,
        whatsappNumber: res.data.patient.whatsappNumber,
        email: res.data.patient.email,
        clinicId: res.data.clinic.id,
        clinicName: res.data.clinic.name,
        clinicCity: res.data.clinic.city,
        clinicAddress: res.data.clinic.address,
        purpose: "Consultation & Check-in",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-lift)] text-foreground">
      {/* Clinic Identity Banner */}
      <div className="mb-6 rounded-2xl bg-primary-soft/60 p-4 border border-primary/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gradient-brand text-primary-foreground shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                  BANGALORE CENTER
                </span>
              </div>
              <h2 className="mt-0.5 text-base font-bold text-foreground">
                Hospex Clinic · Bangalore
              </h2>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 text-primary" />
                12 Lavelle Road, Bangalore 560001
              </p>
            </div>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1 rounded-xl p-1.5 text-xs text-muted-foreground hover:bg-card hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-card px-3 py-1.5 text-xs text-primary font-medium border border-border">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Verified: Data saves strictly to Bangalore Clinic (NOT Kochi)</span>
        </div>
      </div>

      {/* Form Title */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.16em] uppercase text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Patient Registration</span>
        </div>
        <h3 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
          Register at Reception
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in your details for immediate check-in. You will instantly receive access to Care Voice calling and Care Connect WhatsApp.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-3.5 text-sm text-danger font-medium">
          {error}
        </div>
      )}

      {/* Registration Form - only Full Name, Mobile Number, Gender */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-xs font-semibold text-foreground">
            Full Name *
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="fullName"
              placeholder="e.g. Priya Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-9 text-sm rounded-xl"
              required
            />
          </div>
        </div>

        {/* Mobile Number */}
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs font-semibold text-foreground">
            Mobile Number *
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-9 text-sm font-medium rounded-xl"
              required
            />
          </div>
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <Label htmlFor="gender" className="text-xs font-semibold text-foreground">
            Gender
          </Label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as "FEMALE" | "MALE" | "OTHER")}
            className="flex h-9 w-full rounded-xl border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="pt-3">
          <Button
            type="submit"
            disabled={loading}
            className="w-full font-bold h-11 text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving to Bangalore Clinic DB...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Complete Registration & View Options
              </span>
            )}
          </Button>
        </div>
      </form>

      {/* Footer Info */}
      <div className="mt-4 text-center">
        <p className="text-[11px] text-muted-foreground">
          Hospex Reception Desk · Counter 2 · Lavelle Road, Bangalore
        </p>
      </div>
    </div>
  );
}
