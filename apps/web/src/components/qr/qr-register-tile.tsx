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
  Mail,
  Stethoscope,
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<"FEMALE" | "MALE" | "OTHER">("FEMALE");
  const [age, setAge] = useState("");
  const [purpose, setPurpose] = useState("IVF Consultation & Evaluation");
  const [doctorPreference, setDoctorPreference] = useState("Dr. Manideep");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your full first and last name.");
      return;
    }

    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/qr/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          email: email || undefined,
          gender,
          age: age ? parseInt(age, 10) : undefined,
          purpose,
          doctorPreference,
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
        purpose,
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
          Fill in your details for immediate check-in. You will instantly receive Reception Calling, WhatsApp Concierge, and Smrko AI guidance.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-3.5 text-sm text-danger font-medium">
          {error}
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-xs font-semibold text-foreground">
              First Name *
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="firstName"
                placeholder="Priya"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="pl-9 text-sm rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-xs font-semibold text-foreground">
              Last Name *
            </Label>
            <Input
              id="lastName"
              placeholder="Sharma"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="text-sm rounded-xl"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-semibold text-foreground">
              WhatsApp / Mobile Phone *
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

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-foreground">
              Email Address (Optional)
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="patient@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 text-sm rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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

          <div className="space-y-1.5">
            <Label htmlFor="age" className="text-xs font-semibold text-foreground">
              Age (Years)
            </Label>
            <Input
              id="age"
              type="number"
              min="18"
              max="99"
              placeholder="e.g. 29"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="text-sm rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="purpose" className="text-xs font-semibold text-foreground">
            Purpose of Visit
          </Label>
          <select
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="flex h-9 w-full rounded-xl border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="IVF Consultation & Evaluation">IVF Consultation & Evaluation</option>
            <option value="Follicular Monitoring Scan">Follicular Monitoring Ultrasound</option>
            <option value="Semen Analysis & Andrology">Semen Analysis & Andrology Lab</option>
            <option value="Doctor Follow-up & Prescription">Doctor Follow-up & Medication Review</option>
            <option value="Second Opinion & Care Plan">Second Opinion on Previous Cycles</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doctorPreference" className="text-xs font-semibold text-foreground">
            Preferred Specialist
          </Label>
          <div className="relative">
            <Stethoscope className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <select
              id="doctorPreference"
              value={doctorPreference}
              onChange={(e) => setDoctorPreference(e.target.value)}
              className="flex h-9 w-full rounded-xl border border-input bg-card pl-9 pr-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="Dr. Manideep">Dr. Manideep (Senior Reproductive Endocrinologist)</option>
              <option value="Dr. Ananya Rao">Dr. Ananya Rao (Chief Fertility Specialist)</option>
              <option value="Dr. Rahul Menon">Dr. Rahul Menon (Reproductive Endocrinologist)</option>
              <option value="Dr. Priya Nair">Dr. Priya Nair (Fertility Specialist)</option>
              <option value="First Available Doctor">First Available Specialist at Counter 2</option>
            </select>
          </div>
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
