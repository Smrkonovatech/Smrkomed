"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, Calendar, Globe, Copy, Check, Pencil, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { clinicApi } from "@/lib/clinic-api";

interface PatientDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patient: any;
  p360?: any;
  isPartner?: boolean;
  onPatientUpdated?: (() => void) | undefined;
}

export function PatientDetailsModal({
  isOpen,
  onOpenChange,
  patient,
  p360,
  isPartner = false,
  onPatientUpdated,
}: PatientDetailsModalProps) {
  const patientData = isPartner
    ? p360?.partnerPatient || patient
    : p360?.primaryPatient || patient;

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    gender: "Female",
    dateOfBirth: "",
    preferredLanguage: "English",
  });

  useEffect(() => {
    if (patientData) {
      const parts = (patientData.name || `${patientData.firstName || ""} ${patientData.lastName || ""}`).trim().split(" ");
      const firstName = patientData.firstName || parts[0] || (isPartner ? "Partner" : "Patient");
      const lastName = patientData.lastName || parts.slice(1).join(" ") || "";
      
      let dobString = "";
      if (patientData.dateOfBirth) {
        try {
          dobString = new Date(patientData.dateOfBirth).toISOString().split("T")[0] || "";
        } catch {
          dobString = "";
        }
      }

      setFormData({
        firstName,
        lastName,
        phone: patientData.phone || p360?.header?.contact || "",
        email: patientData.email || "",
        gender: patientData.gender || (isPartner ? "Male" : "Female"),
        dateOfBirth: dobString,
        preferredLanguage: patientData.preferredLanguage || "English",
      });
    }
  }, [patientData, isPartner, p360]);

  const patientId = patientData?.id || (isPartner ? p360?.header?.partnerId : p360?.header?.patientId) || "";

  const handleCopyId = () => {
    if (patientId) {
      navigator.clipboard.writeText(patientId);
      setCopiedId(true);
      toast.success("Patient ID copied to clipboard");
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      toast.error("Cannot update patient: Missing Patient ID");
      return;
    }

    try {
      setSaving(true);
      await clinicApi.patchPatient(patientId, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        gender: formData.gender,
        preferredLanguage: formData.preferredLanguage,
        ...(formData.dateOfBirth ? { dateOfBirth: formData.dateOfBirth } : {}),
      });

      toast.success("Patient details updated successfully");
      setIsEditing(false);
      onPatientUpdated?.();
    } catch (err: any) {
      console.error("Failed to update patient:", err);
      toast.error(err?.message || "Failed to update patient details");
    } finally {
      setSaving(false);
    }
  };

  const displayName = `${formData.firstName} ${formData.lastName}`.trim() || (isPartner ? "Partner" : "Patient");
  const abhaStatus = isPartner ? p360?.partnerPatient?.abdmConnected : p360?.header?.abhaStatus || p360?.primaryPatient?.abdmConnected;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden bg-white border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#866BE3] text-white flex items-center justify-center font-bold text-base shadow-sm">
              {displayName[0] || "P"}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {displayName}
                {isPartner && <Badge variant="secondary" className="text-[10px] font-normal">Partner</Badge>}
                {!isPartner && <Badge className="bg-[#866BE3]/10 text-[#866BE3] hover:bg-[#866BE3]/20 border-none text-[10px] font-semibold">Primary</Badge>}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">ID: {patientId || "Not assigned"}</span>
                {patientId && (
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy Patient ID"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant={isEditing ? "ghost" : "outline"}
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs h-8 gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            {isEditing ? "Cancel" : "Edit Details"}
          </Button>
        </DialogHeader>

        {isEditing ? (
          <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-semibold text-gray-700">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-semibold text-gray-700">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-gray-700">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-gray-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gender" className="text-xs font-semibold text-gray-700">Gender</Label>
                <select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full h-8 px-2.5 border rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#866BE3]"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dob" className="text-xs font-semibold text-gray-700">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="language" className="text-xs font-semibold text-gray-700">Preferred Language</Label>
                <select
                  id="language"
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                  className="w-full h-8 px-2.5 border rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#866BE3]"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Tamil">Tamil</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-[#866BE3] hover:bg-[#7254d1] text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-3">
                <Phone className="w-4 h-4 text-[#866BE3] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-gray-500 font-medium">Contact Phone</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{formData.phone || "No phone provided"}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-3">
                <Mail className="w-4 h-4 text-[#866BE3] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-gray-500 font-medium">Email Address</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5 truncate">{formData.email || "No email provided"}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[11px] text-gray-500 font-medium">Gender</p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">{formData.gender}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[11px] text-gray-500 font-medium">Age</p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">{patientData?.age || p360?.header?.age || "-"} years</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[11px] text-gray-500 font-medium">Language</p>
                <p className="text-xs font-semibold text-gray-800 mt-0.5">{formData.preferredLanguage}</p>
              </div>
            </div>

            {/* Digital Health / ABHA */}
            <div className="p-4 rounded-xl bg-[#F8F5FF] border border-[#866BE3]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-[#866BE3]" />
                <div>
                  <p className="text-xs font-bold text-gray-800">ABDM Digital Health</p>
                  <p className="text-[11px] text-gray-500">
                    {p360?.header?.abhaMasked ? `ABHA: ${p360.header.abhaMasked}` : "Ayushman Bharat Digital Mission"}
                  </p>
                </div>
              </div>
              <Badge className={abhaStatus !== false ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none" : "bg-amber-100 text-amber-800 hover:bg-amber-100 border-none"}>
                {abhaStatus !== false ? "Connected" : "Pending ABHA"}
              </Badge>
            </div>

            <DialogFooter className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="w-full text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
