"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pill, Search, Check, X, Loader2, ChevronDown, User, Users, FileText, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { clinicApi } from "@/lib/clinic-api";

export interface CouplePatientOption {
  id: string;
  name: string;
  role?: string;
  gender?: string;
  phone?: string;
}

interface AddPrescriptionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  coupleId?: string | undefined;
  couplePatients?: CouplePatientOption[];
  couple?: any;
  p360?: any;
  initialPrescription?: any | null;
  onPrescriptionAdded?: (() => void) | undefined;
  initialTab?: "medications" | "notes";
}

const COMMON_FERTILITY_MEDICATIONS = [
  "Gonal-F (Follitropin alfa) 225 IU",
  "Cetrotide (Cetrorelix) 0.25mg",
  "Menopur (Menotrophin) 150 IU",
  "Susten (Progesterone) 400mg",
  "Ovitrelle (Choriogonadotropin alfa) 250mcg",
  "Progynova (Estradiol Valerate) 2mg",
  "Folic Acid / Folvite 5mg",
  "Cabergoline 0.5mg",
  "Doxycycline 100mg",
  "Letrozole (Femara) 2.5mg",
  "Clomiphene Citrate 50mg",
  "Duphaston (Dydrogesterone) 10mg",
  "Clexane (Enoxaparin) 40mg",
];

const NOTE_CATEGORIES = [
  { value: "CLINICAL", label: "Clinical Note", icon: "🏥" },
  { value: "PROGRESS", label: "Progress Note", icon: "📋" },
  { value: "FOLLOW_UP", label: "Follow-up Note", icon: "🔄" },
  { value: "OBSERVATION", label: "Observation", icon: "👁️" },
  { value: "COUNSELING", label: "Counseling Note", icon: "💬" },
  { value: "PROCEDURE", label: "Procedure Note", icon: "🔬" },
  { value: "GENERAL", label: "General Note", icon: "📝" },
];

export function AddPrescriptionModal({
  isOpen,
  onOpenChange,
  patientId,
  coupleId,
  couplePatients,
  couple,
  p360,
  initialPrescription,
  onPrescriptionAdded,
  initialTab,
}: AddPrescriptionModalProps) {
  const patientOptions: CouplePatientOption[] = useMemo(() => {
    const options: CouplePatientOption[] = [];

    if (couplePatients && couplePatients.length > 0) {
      options.push(...couplePatients);
    } else {
      // 1. Primary Partner
      const primaryId =
        p360?.primaryPatient?.id ||
        couple?.primary?.id ||
        p360?.header?.patientId ||
        p360?.couple?.primaryPatientId ||
        patientId ||
        "";

      const primaryName =
        p360?.header?.patientName ||
        couple?.primary?.name ||
        p360?.primaryPatient?.name ||
        (p360?.primaryPatient
          ? `${p360.primaryPatient.firstName || ""} ${p360.primaryPatient.lastName || ""}`.trim()
          : "") ||
        "Primary Partner";

      const primaryGender =
        p360?.header?.gender ||
        p360?.primaryPatient?.gender ||
        couple?.primary?.gender;

      const primaryPhone =
        p360?.header?.contact ||
        p360?.header?.phone ||
        p360?.primaryPatient?.phone ||
        couple?.primary?.phone ||
        "";

      if (primaryId || primaryName) {
        options.push({
          id: primaryId,
          name: primaryName,
          role: "Primary Partner",
          gender: primaryGender,
          phone: primaryPhone,
        });
      }

      // 2. Partner / Spouse
      const partnerId =
        p360?.partnerPatient?.id ||
        couple?.partner?.id ||
        p360?.header?.partnerId ||
        p360?.couple?.partnerPatientId ||
        "";

      const partnerName =
        p360?.header?.partnerName ||
        couple?.partner?.name ||
        p360?.partnerPatient?.name ||
        (p360?.partnerPatient
          ? `${p360.partnerPatient.firstName || ""} ${p360.partnerPatient.lastName || ""}`.trim()
          : "") ||
        "";

      const partnerGender =
        p360?.partnerPatient?.gender ||
        couple?.partner?.gender;

      const partnerPhone =
        p360?.partnerPatient?.phone ||
        couple?.partner?.phone ||
        p360?.header?.partnerPhone ||
        "";

      if (partnerId || partnerName) {
        options.push({
          id: partnerId || (partnerName ? `partner_${partnerName}` : ""),
          name: partnerName || "Partner",
          role: "Partner / Spouse",
          gender: partnerGender,
          phone: partnerPhone,
        });
      }
    }

    // 3. Both Partners option (when both members are available)
    if (options.length >= 2 && !options.some((o) => o.id === "BOTH")) {
      options.push({
        id: "BOTH",
        name: "Both Partners",
        role: "Couple (Both)",
        gender: "Couple",
      });
    }

    return options;
  }, [couplePatients, p360, couple, patientId]);

  // Tab state
  const [activeTab, setActiveTab] = useState<"medications" | "notes">(initialTab || "medications");

  // Patient selection state (shared across tabs)
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  // Medication form state
  const [medicationName, setMedicationName] = useState("");
  const [form, setForm] = useState("Injection");
  const [dosage, setDosage] = useState("225");
  const [unit, setUnit] = useState("IU");
  const [frequency, setFrequency] = useState("Once Daily (OD) - Night (08:00 PM)");
  const [durationValue, setDurationValue] = useState("30");
  const [durationUnit, setDurationUnit] = useState("Days");
  const [quantity, setQuantity] = useState("30");

  // Notes form state
  const [noteCategory, setNoteCategory] = useState("CLINICAL");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      if (initialPrescription?.patientId) {
        setSelectedPatientId(initialPrescription.patientId);
      } else if (patientId) {
        setSelectedPatientId(patientId);
      } else if (patientOptions[0]?.id) {
        setSelectedPatientId(patientOptions[0].id);
      }
    }
  }, [isOpen, initialTab, initialPrescription, patientId, patientOptions]);

  useEffect(() => {
    if (initialPrescription && isOpen) {
      const name = initialPrescription.medicineName || initialPrescription.medication || "";
      setMedicationName(name);
      if (initialPrescription.dosage) {
        const parts = String(initialPrescription.dosage).trim().split(" ");
        if (parts[0]) setDosage(parts[0]);
        if (parts[1]) setUnit(parts[1]);
      }
      if (initialPrescription.form) setForm(initialPrescription.form);
      if (initialPrescription.frequency) setFrequency(initialPrescription.frequency);
      if (initialPrescription.duration) {
        const parts = String(initialPrescription.duration).trim().split(" ");
        if (parts[0]) setDurationValue(parts[0]);
        if (parts[1]) setDurationUnit(parts[1]);
      }
      if (initialPrescription.quantityPrescribed) {
        setQuantity(String(initialPrescription.quantityPrescribed));
      }
      setActiveTab("medications");
    } else if (!initialPrescription && isOpen) {
      setMedicationName("");
      setForm("Injection");
      setDosage("225");
      setUnit("IU");
      setFrequency("Once Daily (OD) - Night (08:00 PM)");
      setDurationValue("30");
      setDurationUnit("Days");
      setQuantity("30");
      setNoteCategory("CLINICAL");
      setNoteTitle("");
      setNoteContent("");
    }
  }, [initialPrescription, isOpen]);

  const handleMedicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicationName.trim()) {
      toast.error("Please enter or select a medication name");
      return;
    }

    try {
      setSubmitting(true);

      const effectivePatientId =
        selectedPatientId ||
        patientId ||
        patientOptions[0]?.id ||
        undefined;

      const fullDosage = `${dosage} ${unit}`.trim();
      const durationText = `${durationValue} ${durationUnit}`;
      const qtyNumber = parseInt(quantity, 10) || parseInt(durationValue, 10) || 30;

      // If editing an existing prescription, remove the old one first
      if (initialPrescription?.prescriptionId || initialPrescription?.id) {
        const oldId = initialPrescription.prescriptionId || initialPrescription.id;
        try {
          await clinicApi.deletePrescription(oldId);
        } catch (delErr) {
          console.warn("Could not delete previous prescription before replacing:", delErr);
        }
      }

      const isBoth = effectivePatientId === "BOTH" || selectedPatientId === "BOTH";

      // 1. Create prescription via clinicApi with the selected patientId
      const primaryId =
        p360?.primaryPatient?.id ||
        p360?.header?.patientId ||
        p360?.couple?.primaryPatientId ||
        patientId ||
        "";

      const prescriptionPatientId = isBoth
        ? (primaryId || (effectivePatientId !== "BOTH" ? effectivePatientId : undefined))
        : (effectivePatientId?.startsWith("partner_")
            ? (couple?.partnerPatientId || p360?.partnerPatient?.id || p360?.couple?.partnerPatientId || undefined)
            : effectivePatientId);

      await clinicApi.createPrescription({
        patientId: prescriptionPatientId && prescriptionPatientId.trim().length > 0 ? prescriptionPatientId.trim() : undefined,
        coupleId: coupleId || undefined,
        notes: isBoth
          ? `Prescribed for Both Partners: ${medicationName} (${fullDosage}, ${form}) - ${frequency} for ${durationText}`
          : `Prescribed: ${medicationName} (${fullDosage}, ${form}) - ${frequency} for ${durationText}`,
        items: [
          {
            productId: "prod_" + Math.random().toString(36).slice(2, 9),
            medicineName: medicationName.trim(),
            dosage: fullDosage,
            frequency,
            timeOfDay: frequency.includes("Night") ? "Night" : "Morning",
            duration: durationText,
            instructions: `${form}. Take as per protocol schedule (${frequency})`,
            quantityPrescribed: qtyNumber,
          },
        ],
      });

      // 2. Create Care Task in Care Loop for automatic reminders for the selected patient / couple
      if (coupleId && effectivePatientId) {
        try {
          const selectedPatient = patientOptions.find((p) => p.id === effectivePatientId);
          const forLabel = isBoth
            ? " (Both Partners)"
            : selectedPatient?.name
              ? ` (${selectedPatient.name})`
              : "";

          const isPartner =
            !isBoth &&
            (selectedPatient?.role === "Partner / Spouse" ||
              (primaryId && effectivePatientId !== primaryId) ||
              effectivePatientId.startsWith("partner_"));
          const targetRole = isBoth ? "COUPLE" : isPartner ? "PARTNER" : "PRIMARY";

          const partnerPhone =
            (isPartner || isBoth ? selectedPatient?.phone : undefined) ||
            p360?.partnerPatient?.phone ||
            couple?.partner?.phone ||
            p360?.header?.partnerPhone ||
            undefined;

          const primaryPhone =
            (!isPartner || isBoth ? selectedPatient?.phone : undefined) ||
            p360?.primaryPatient?.phone ||
            couple?.primary?.phone ||
            p360?.header?.contact ||
            p360?.header?.phone ||
            undefined;

          const realTargetPatientId = isBoth
            ? undefined
            : effectivePatientId.startsWith("partner_")
              ? (couple?.partnerPatientId || p360?.partnerPatient?.id || p360?.couple?.partnerPatientId || undefined)
              : effectivePatientId;

          await clinicApi.createTask({
            coupleId,
            title: `Medication: ${medicationName.trim()} (${fullDosage})${forLabel}`,
            category: "MEDICATION",
            dueDate: new Date(Date.now() + 86400000).toISOString(),
            priority: "HIGH",
            description: `${form} • ${frequency}. Duration: ${durationText}. Quantity: ${qtyNumber}`,
            sendWhatsApp: true,
            targetRole,
            broadcastToBoth: isBoth,
            targetPatientId: realTargetPatientId,
            targetName: isBoth ? "Both Partners" : selectedPatient?.name,
            partnerPhoneNumber: (isBoth || isPartner) ? partnerPhone : undefined,
            phoneNumber: (isBoth || !isPartner) ? primaryPhone : undefined,
          });
        } catch {
          // Non-blocking: medication task creates even if WhatsApp task fails
        }
      }

      toast.success(`Prescription for ${medicationName} saved successfully`);
      onOpenChange(false);
      onPrescriptionAdded?.();

      // Reset form
      setMedicationName("");
    } catch (err: any) {
      console.error("Failed to create prescription:", err);
      toast.error(err?.message || `Failed to create prescription for ${medicationName}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) {
      toast.error("Please enter note content");
      return;
    }

    try {
      setSubmitting(true);

      const effectivePatientId =
        selectedPatientId ||
        patientId ||
        patientOptions[0]?.id ||
        undefined;

      const isBoth = effectivePatientId === "BOTH" || selectedPatientId === "BOTH";
      const selectedPatient = patientOptions.find((p) => p.id === effectivePatientId);
      const forLabel = isBoth
        ? " (Both Partners)"
        : selectedPatient?.name
          ? ` - ${selectedPatient.name}`
          : "";

      const categoryLabel = NOTE_CATEGORIES.find(c => c.value === noteCategory)?.label || "Clinical Note";
      const title = noteTitle.trim() || `${categoryLabel}${forLabel}`;

      const primaryId =
        p360?.primaryPatient?.id ||
        p360?.header?.patientId ||
        p360?.couple?.primaryPatientId ||
        patientId ||
        "";

      const effectiveCoupleId =
        coupleId ||
        couple?.id ||
        p360?.couple?.id ||
        p360?.header?.coupleId;

      const targetId = effectiveCoupleId || primaryId || patientId;

      const fullSummary = [
        `[${categoryLabel}]${forLabel}`,
        noteTitle.trim() ? `Title: ${noteTitle.trim()}` : null,
        noteContent.trim(),
      ]
        .filter(Boolean)
        .join("\n\n");

      let saved = false;

      // 1. Persist directly to ConsultationNote & Appointment via internal Next.js API
      try {
        const res = await fetch("/api/consultations/record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coupleId: effectiveCoupleId || undefined,
            patientName: isBoth
              ? "Both Partners"
              : selectedPatient?.name || p360?.header?.patientName || "Patient",
            doctorName: "Doctor",
            reasonForVisit: title,
            summary: fullSummary,
            clinicalNotes: noteContent.trim(),
            nextSteps: "Follow-up as noted in patient chart",
          }),
        });
        if (res.ok) {
          saved = true;
        }
      } catch (postErr) {
        console.warn("Direct /api/consultations/record call failed:", postErr);
      }

      // 2. Fallback / supplementary record via Doctor Consultation API
      if (targetId) {
        try {
          await clinicApi.recordConsultation(targetId, {
            summary: fullSummary,
            status: "COMPLETED",
            reasonForVisit: title,
            clinicalNotes: noteContent.trim(),
            notes: noteContent.trim(),
          });
          saved = true;
        } catch (apiErr) {
          console.warn("clinicApi.recordConsultation fallback note:", apiErr);
        }
      }

      // 3. If coupleId is known, optionally record in documents with valid schema
      if (effectiveCoupleId) {
        try {
          await clinicApi.createDocument({
            coupleId: effectiveCoupleId,
            name: `${title}.txt`,
            category: "Clinical Notes",
          });
        } catch {
          // Document index is optional, ignore if failed
        }
      }

      if (!saved) {
        throw new Error("Could not save patient note. Please verify connection and try again.");
      }

      toast.success(`${categoryLabel} saved successfully`);
      onOpenChange(false);
      onPrescriptionAdded?.();

      // Reset note form
      setNoteTitle("");
      setNoteContent("");
      setNoteCategory("CLINICAL");
    } catch (err: any) {
      console.error("Failed to save note:", err);
      toast.error(err?.message || "Failed to save patient note");
    } finally {
      setSubmitting(false);
    }
  };

  const activeSelectedId = selectedPatientId || patientOptions[0]?.id;

  // Patient Selection component (shared across both tabs)
  const PatientSelection = () => (
    <>
      {patientOptions.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#866BE3]" />
              <span>Select Patient</span>
            </label>
            <span className="text-[11px] text-[#866BE3] font-medium bg-[#866BE3]/10 px-2 py-0.5 rounded-md">
              Couple Member
            </span>
          </div>

          {patientOptions.length > 1 ? (
            <div className={`grid gap-2 ${patientOptions.length >= 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
              {patientOptions.map((opt) => {
                const isSelected = activeSelectedId === opt.id;
                const isBothOption = opt.id === "BOTH";
                return (
                  <button
                    key={opt.id || opt.name}
                    type="button"
                    onClick={() => setSelectedPatientId(opt.id)}
                    className={`relative flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-[#F8F5FF] border-[#866BE3] ring-1 ring-[#866BE3] shadow-xs"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50/80 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                        isSelected
                          ? "bg-[#866BE3] text-white shadow-xs"
                          : isBothOption
                            ? "bg-purple-100 text-[#866BE3]"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {isBothOption ? (
                        <Users className="w-3.5 h-3.5" />
                      ) : (
                        opt.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-gray-900 truncate leading-tight">
                        {opt.name}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium mt-0.5 truncate">
                        <span className={isSelected ? "text-[#866BE3] font-semibold truncate" : "truncate"}>
                          {opt.role || "Patient"}
                        </span>
                        {opt.gender && opt.gender !== "Couple" && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{opt.gender.toLowerCase()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-3.5 h-3.5 rounded-full bg-[#866BE3] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2 h-2 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : patientOptions[0] ? (
            <div className="flex items-center justify-between p-2.5 px-3.5 bg-[#F8F5FF] border border-[#866BE3]/30 rounded-xl text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#866BE3] text-white flex items-center justify-center text-xs font-bold">
                  {patientOptions[0].name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 leading-tight">
                    {patientOptions[0].name}
                  </div>
                  <div className="text-[10px] text-[#866BE3] font-medium leading-tight mt-0.5">
                    {patientOptions[0].role || "Primary Partner"}
                    {patientOptions[0].gender ? ` • ${patientOptions[0].gender}` : ""}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-semibold bg-[#866BE3]/10 text-[#866BE3] px-2 py-0.5 rounded-md">
                Selected
              </span>
            </div>
          ) : null}
        </div>
      )}
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden bg-white border border-gray-100 shadow-2xl rounded-[28px]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F8F5FF] text-[#866BE3] border border-[#866BE3]/20 flex items-center justify-center shrink-0 shadow-xs">
              {activeTab === "medications" ? (
                <Pill className="w-6 h-6 rotate-45" />
              ) : (
                <StickyNote className="w-6 h-6" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 tracking-tight">
                {initialPrescription ? "Edit Prescription" : "Patient Care"}
              </DialogTitle>
              <p className="text-xs text-gray-500 font-normal mt-0.5">
                {activeTab === "medications"
                  ? "Add medications with dosage, frequency, and instructions."
                  : "Add clinical notes, observations, and follow-up details."}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "medications" | "notes")}
          className="w-full"
        >
          <div className="px-6 pt-3">
            <TabsList className="w-full grid grid-cols-2 h-11 bg-gray-100/80 rounded-xl p-1">
              <TabsTrigger
                value="medications"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#866BE3] data-[state=active]:shadow-sm transition-all flex items-center gap-1.5"
              >
                <Pill className="w-3.5 h-3.5" />
                Medications
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#866BE3] data-[state=active]:shadow-sm transition-all flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Patient Notes
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Medications Tab ── */}
          <TabsContent value="medications" className="mt-0">
            <form onSubmit={handleMedicationSubmit} className="p-6 pt-4 space-y-4 text-xs">
              <PatientSelection />

              {/* Medication Name & Strength */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800 block">
                  Medication Name & Strength
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    list="medication-search-list"
                    placeholder="Choose from list of medicines"
                    value={medicationName}
                    onChange={(e) => setMedicationName(e.target.value)}
                    required
                    className="w-full h-11 pl-10 pr-4 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] placeholder:text-gray-400 transition-all shadow-2xs"
                  />
                  <datalist id="medication-search-list">
                    {COMMON_FERTILITY_MEDICATIONS.map((med) => (
                      <option key={med} value={med} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Form | Dosage & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-800 block">
                    Form
                  </label>
                  <div className="relative">
                    <select
                      value={form}
                      onChange={(e) => setForm(e.target.value)}
                      className="w-full h-11 px-3.5 pr-8 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
                    >
                      <option value="Injection">Injection</option>
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Pessary / Suppository">Pessary / Suppository</option>
                      <option value="Gel / Patch">Gel / Patch</option>
                      <option value="Syrup / Liquid">Syrup / Liquid</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-800 block">
                    Dosage & Unit
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <select
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        className="w-full h-11 px-3 pr-7 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
                      >
                        <option value="225">225</option>
                        <option value="150">150</option>
                        <option value="75">75</option>
                        <option value="0.25">0.25</option>
                        <option value="250">250</option>
                        <option value="400">400</option>
                        <option value="2">2</option>
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="1">1</option>
                        <option value="40">40</option>
                        <option value="500">500</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="w-full h-11 px-3 pr-7 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
                      >
                        <option value="IU">IU</option>
                        <option value="mg">mg</option>
                        <option value="mcg">mcg</option>
                        <option value="ml">ml</option>
                        <option value="tab">tab</option>
                        <option value="vial">vial</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Frequency & Meal Timing */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800 block">
                  Frequency & Meal Timing
                </label>
                <div className="relative">
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full h-11 px-3.5 pr-8 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
                  >
                    <option value="Once Daily (OD) - Night (08:00 PM)">Once Daily (OD) - Night (08:00 PM)</option>
                    <option value="Once Daily (OD) - Morning (09:00 AM)">Once Daily (OD) - Morning (09:00 AM)</option>
                    <option value="Twice Daily (BD) - Morning & Night">Twice Daily (BD) - Morning & Night</option>
                    <option value="Thrice Daily (TDS) - After Meals">Thrice Daily (TDS) - After Meals</option>
                    <option value="Exact Trigger Time (Follicular Protocol)">Exact Trigger Time (Follicular Protocol)</option>
                    <option value="Weekly Once">Weekly Once</option>
                    <option value="As Needed (SOS)">As Needed (SOS)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Duration | Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-800 block">
                    Duration
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={durationValue}
                      onChange={(e) => setDurationValue(e.target.value)}
                      className="w-20 h-11 px-3 text-center text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] shadow-2xs"
                    />
                    <div className="relative flex-1">
                      <select
                        value={durationUnit}
                        onChange={(e) => setDurationUnit(e.target.value)}
                        className="w-full h-11 px-3.5 pr-8 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
                      >
                        <option value="Days">Days</option>
                        <option value="Weeks">Weeks</option>
                        <option value="Months">Months</option>
                        <option value="Cycles">Cycles</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-800 block">
                    Quantity
                  </label>
                  <div className="relative">
                    <select
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full h-11 px-3.5 pr-8 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
                    >
                      <option value="30">30</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="5">5</option>
                      <option value="7">7</option>
                      <option value="10">10</option>
                      <option value="14">14</option>
                      <option value="28">28</option>
                      <option value="60">60</option>
                      <option value="90">90</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="px-6 py-2.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-[#7C5CE5] hover:bg-[#6D4CD4] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Save Prescription
                    </>
                  )}
                </button>
              </div>
            </form>
          </TabsContent>

          {/* ── Patient Notes Tab ── */}
          <TabsContent value="notes" className="mt-0">
            <form onSubmit={handleNotesSubmit} className="p-6 pt-4 space-y-4 text-xs">
              <PatientSelection />

              {/* Note Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800 block">
                  Note Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {NOTE_CATEGORIES.map((cat) => {
                    const isSelected = noteCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setNoteCategory(cat.value)}
                        className={`flex items-center gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer select-none ${
                          isSelected
                            ? "bg-[#F8F5FF] border-[#866BE3] ring-1 ring-[#866BE3] shadow-xs"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50/80 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-sm leading-none">{cat.icon}</span>
                        <span className={`text-[11px] font-semibold truncate ${isSelected ? "text-[#866BE3]" : "text-gray-700"}`}>
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800 block">
                  Title <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  placeholder="e.g. Day 8 Monitoring, Post-Transfer Instructions..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full h-11 px-4 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] placeholder:text-gray-400 transition-all shadow-2xs"
                />
              </div>

              {/* Note Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-800 flex items-center justify-between">
                  <span>Note Content</span>
                  <span className={`text-[10px] font-medium ${noteContent.length > 4500 ? "text-red-500" : "text-gray-400"}`}>
                    {noteContent.length} / 5000
                  </span>
                </label>
                <textarea
                  placeholder="Enter clinical observations, progress updates, follow-up instructions, or any relevant notes for this patient..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  required
                  maxLength={5000}
                  rows={6}
                  className="w-full px-4 py-3 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] placeholder:text-gray-400 transition-all shadow-2xs resize-none leading-relaxed"
                />
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="px-6 py-2.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !noteContent.trim()}
                  className="px-6 py-2.5 rounded-full bg-[#7C5CE5] hover:bg-[#6D4CD4] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      Save Note
                    </>
                  )}
                </button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
