"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Phone,
  Calendar,
  Activity,
  Users,
  Tag,
  Plus,
  ExternalLink,
  X,
  CreditCard,
  FileText,
  Pill,
  FlaskConical,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Eye,
  Download,
  Search,
  ChevronDown,
  Info,
  Stethoscope,
  Scissors,
  Building2,
  AlertTriangle,
  Compass,
  FileSignature,
  FileCheck2,
  Smartphone,
  RefreshCw,
  Copy,
  Lock,
} from "lucide-react";
import { AbhaSetupWizard } from "@/components/digital-health/abha-setup-wizard";

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
  const [activeTab, setActiveTab] = useState<
    "overview" | "abha" | "medical" | "investigations" | "medications" | "documents"
  >("overview");

  // ABHA Wizard & Interactive State
  const [abhaWizardOpen, setAbhaWizardOpen] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  const [tags, setTags] = useState<string[]>([
    "IVF Patient",
    "PCOS",
    "Hypothyroidism",
    "High Priority",
  ]);

  const [medicalCategory, setMedicalCategory] = useState("All Records");
  const [investigationCategory, setInvestigationCategory] = useState("All");
  const [investigationSearch, setInvestigationSearch] = useState("");
  const [medicationFilter, setMedicationFilter] = useState("All");
  const [medicationSearch, setMedicationSearch] = useState("");
  const [documentCategory, setDocumentCategory] = useState("All");
  const [documentSearch, setDocumentSearch] = useState("");

  const patientData = isPartner
    ? p360?.partnerPatient || patient
    : p360?.primaryPatient || patient;

  const partnerData = isPartner
    ? p360?.primaryPatient
    : p360?.partnerPatient;

  const isAbdmConnected =
    patientData?.abdmConnected !== undefined
      ? Boolean(patientData.abdmConnected)
      : p360?.digitalHealth?.identity?.status === "LINKED"
      ? true
      : Boolean(patient?.abdmConnected);

  const defaultAbdmConnection = {
    connected: true,
    environment: "sandbox",
    demoLinkAllowed: true,
    message: "Connected to ABDM Sandbox",
    authMethods: [
      { id: "AADHAAR_OTP", label: "Aadhaar OTP", description: "Authenticate with Aadhaar registered mobile OTP" },
      { id: "MOBILE_OTP", label: "Mobile OTP", description: "Authenticate with ABHA registered mobile number" },
    ],
  };

  const patientIdForWizard =
    patientData?.id || patient?.id || p360?.primaryPatient?.id || "patient";

  const patientName =
    patientData?.name ||
    p360?.header?.patientName ||
    `${patientData?.firstName || (isPartner ? "Maddy" : "Manideep")} ${patientData?.lastName || (isPartner ? "" : "K")}`.trim();

  const partnerName =
    partnerData?.name ||
    p360?.header?.partnerName ||
    (isPartner ? "Manideep K" : "Maddy");

  const patientAge = patientData?.age || p360?.header?.age || 21;
  const patientGender = patientData?.gender || (isPartner ? "Male" : "Female");
  const patientPhone = patientData?.phone || p360?.header?.contact || "+91 77955 59724";
  const patientId = patientData?.id || p360?.header?.patientId || "PAT-00234";

  const partnerAge = partnerData?.age || 21;
  const partnerGender = isPartner ? "Female" : "Male";
  const partnerPhone = partnerData?.phone || "+91 78922 65880";

  const doctorName = p360?.header?.assignedDoctor || "Dr. Ananya Rao";
  const coordinatorName = p360?.header?.assignedCoordinator || "Meera Iyer";

  const getTagStyle = (tag: string) => {
    switch (tag.toLowerCase()) {
      case "ivf patient":
        return "bg-pink-50 text-pink-700 border-pink-200";
      case "pcos":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "hypothyroidism":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "high priority":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-purple-50 text-purple-700 border-purple-200";
    }
  };

  const medicalRecords = [
    {
      date: "12 Sep 2026",
      type: "Diagnosis",
      title: "Polycystic Ovary Syndrome (PCOS)",
      provider: "ABC Fertility Centre • Dr. Ananya Rao",
      category: "Conditions / Diagnoses",
      icon: Activity,
      iconBg: "bg-rose-50 text-rose-500",
      bulletColor: "bg-sky-500",
    },
    {
      date: "10 Aug 2025",
      type: "Hospital Visit",
      title: "Consultation for Infertility",
      provider: "Apollo Hospital, Bengaluru",
      category: "Hospital Visits",
      icon: Building2,
      iconBg: "bg-emerald-50 text-emerald-600",
      bulletColor: "bg-emerald-500",
    },
    {
      date: "15 Jun 2024",
      type: "Procedure",
      title: "Laparoscopy",
      provider: "Cloudnine Hospital, Bengaluru",
      category: "Procedures / Surgeries",
      icon: Scissors,
      iconBg: "bg-purple-50 text-purple-600",
      bulletColor: "bg-purple-500",
    },
    {
      date: "20 Mar 2024",
      type: "Diagnosis",
      title: "Hypothyroidism",
      provider: "Apollo Hospital, Bengaluru",
      category: "Conditions / Diagnoses",
      icon: Stethoscope,
      iconBg: "bg-blue-50 text-blue-600",
      bulletColor: "bg-amber-400",
    },
    {
      date: "05 Jan 2024",
      type: "Treatment",
      title: "IUI Cycle 1",
      provider: "ABC Fertility Centre",
      category: "Procedures / Surgeries",
      icon: Pill,
      iconBg: "bg-indigo-50 text-indigo-600",
      bulletColor: "bg-blue-500",
    },
    {
      date: "10 Nov 2023",
      type: "Allergy",
      title: "Penicillin (Rash)",
      provider: "Apollo Hospital, Bengaluru",
      category: "Allergies",
      icon: AlertTriangle,
      iconBg: "bg-rose-50 text-rose-600",
      bulletColor: "bg-amber-400",
    },
  ];

  const filteredMedicalRecords = medicalCategory === "All Records"
    ? medicalRecords
    : medicalRecords.filter((r) => r.category === medicalCategory);

  const investigationsList = [
    {
      date: "12 Sep 2026",
      title: "AMH, TSH, CBC",
      facility: "ABC Diagnostics",
      location: "Bengaluru",
      type: "Laboratory Report",
      category: "Laboratory",
      icon: FlaskConical,
      iconBg: "bg-purple-50 text-purple-600",
    },
    {
      date: "08 Sep 2026",
      title: "Pelvic Ultrasound",
      facility: "ABC Fertility Centre",
      location: "Bengaluru",
      type: "Imaging Report",
      category: "Imaging",
      icon: FileText,
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
      date: "05 Aug 2025",
      title: "FSH, LH, Prolactin",
      facility: "Apollo Hospital",
      location: "Bengaluru",
      type: "Laboratory Report",
      category: "Laboratory",
      icon: FlaskConical,
      iconBg: "bg-purple-50 text-purple-600",
    },
    {
      date: "12 Jun 2025",
      title: "Vitamin D, CBC",
      facility: "ABC Diagnostics",
      location: "Bengaluru",
      type: "Laboratory Report",
      category: "Laboratory",
      icon: FlaskConical,
      iconBg: "bg-purple-50 text-purple-600",
    },
    {
      date: "20 Mar 2025",
      title: "Transvaginal Ultrasound",
      facility: "Cloudnine Hospital",
      location: "Bengaluru",
      type: "Imaging Report",
      category: "Imaging",
      icon: FileText,
      iconBg: "bg-emerald-50 text-emerald-600",
    },
  ];

  const filteredInvestigations = investigationsList.filter((item) => {
    const matchCat = investigationCategory === "All" || item.category === investigationCategory;
    const matchSearch = !investigationSearch || item.title.toLowerCase().includes(investigationSearch.toLowerCase()) || item.facility.toLowerCase().includes(investigationSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const medicationsList = [
    {
      date: "12 Sep 2026",
      status: "Current",
      name: "Folic Acid",
      dosage: "5 mg tablet - Once daily",
      doctor: "Dr. Ananya Rao",
      facility: "ABC Fertility Centre, Bengaluru",
      category: "Vitamins & Supplements",
      iconBg: "bg-purple-50 text-purple-600",
    },
    {
      date: "05 Sep 2026",
      status: "Current",
      name: "Levothyroxine",
      dosage: "50 mcg tablet - Once daily (morning)",
      doctor: "Dr. Ramesh Kumar",
      facility: "Apollo Hospital, Bengaluru",
      category: "Thyroid Medications",
      iconBg: "bg-purple-50 text-purple-600",
    },
    {
      date: "20 Mar 2026",
      status: "Past",
      name: "Letrozole",
      dosage: "2.5 mg tablet - Once daily (Day 3 to 7)",
      doctor: "Dr. Ananya Rao",
      facility: "ABC Fertility Centre, Bengaluru",
      category: "Fertility Medications",
      iconBg: "bg-blue-50 text-blue-600",
    },
    {
      date: "15 Jan 2026",
      status: "Past",
      name: "Progesterone",
      dosage: "200 mg - Twice daily (vaginal)",
      doctor: "Dr. Ananya Rao",
      facility: "ABC Fertility Centre, Bengaluru",
      category: "Hormones",
      iconBg: "bg-orange-50 text-orange-600",
    },
    {
      date: "10 Nov 2025",
      status: "Past",
      name: "Metformin",
      dosage: "500 mg tablet - Twice daily",
      doctor: "Dr. Suresh Nair",
      facility: "Apollo Hospital, Bengaluru",
      category: "Fertility Medications",
      iconBg: "bg-purple-50 text-purple-600",
    },
    {
      date: "12 Aug 2025",
      status: "Past",
      name: "Vitamin D3",
      dosage: "60,000 IU - Once weekly",
      doctor: "Dr. Ramesh Kumar",
      facility: "Apollo Hospital, Bengaluru",
      category: "Vitamins & Supplements",
      iconBg: "bg-rose-50 text-rose-600",
    },
  ];

  const filteredMedications = medicationsList.filter((med) => {
    const matchStatus = medicationFilter === "All" || (medicationFilter === "Current" && med.status === "Current") || (medicationFilter === "Past" && med.status === "Past");
    const matchSearch = !medicationSearch || med.name.toLowerCase().includes(medicationSearch.toLowerCase()) || med.doctor.toLowerCase().includes(medicationSearch.toLowerCase());
    return matchStatus && matchSearch;
  });

  const documentsList = [
    {
      name: "Pelvic Ultrasound Report",
      date: "12 Sep 2026",
      facility: "ABC Fertility Centre, Bengaluru",
      type: "Imaging Report",
      category: "Imaging (2)",
      iconBg: "bg-rose-50 text-rose-500",
    },
    {
      name: "AMH, TSH, CBC Report",
      date: "10 Sep 2026",
      facility: "ABC Diagnostics, Bengaluru",
      type: "Laboratory Report",
      category: "Lab Reports (4)",
      iconBg: "bg-sky-50 text-sky-600",
    },
    {
      name: "Prescription - Folic Acid",
      date: "05 Sep 2026",
      facility: "Dr. Ananya Rao",
      type: "Prescription",
      category: "Prescriptions (4)",
      iconBg: "bg-purple-50 text-purple-600",
    },
    {
      name: "Discharge Summary",
      date: "22 Mar 2025",
      facility: "Apollo Hospital, Bengaluru",
      type: "Discharge Summary",
      category: "Discharge Summaries (1)",
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    {
      name: "Consultation Note",
      date: "15 Jan 2025",
      facility: "Dr. Ramesh Kumar",
      type: "Consultation Note",
      category: "Others (3)",
      iconBg: "bg-amber-50 text-amber-600",
    },
    {
      name: "Prescription - Letrozole",
      date: "10 Nov 2024",
      facility: "Dr. Ananya Rao",
      type: "Prescription",
      category: "Prescriptions (4)",
      iconBg: "bg-pink-50 text-pink-600",
    },
  ];

  const filteredDocuments = documentsList.filter((doc) => {
    const matchCat = documentCategory === "All" || doc.category.startsWith(documentCategory.split(" ")[0] || "");
    const matchSearch = !documentSearch || doc.name.toLowerCase().includes(documentSearch.toLowerCase()) || doc.facility.toLowerCase().includes(documentSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[880px] md:max-w-[980px] max-h-[88vh] overflow-y-auto p-0 bg-white border-0 shadow-2xl rounded-3xl animate-in fade-in zoom-in-95 duration-200 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&>button.absolute]:hidden">
        
        {/* TOP HEADER */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-full bg-[#866BE3] text-white flex items-center justify-center font-bold text-xl shadow-sm shrink-0">
              {patientName?.[0] || "M"}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <DialogTitle className="text-xl font-bold text-gray-900 leading-tight">
                  {patientName}
                </DialogTitle>
                <span className="bg-[#F8F5FF] text-[#866BE3] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#866BE3]/20">
                  {isPartner ? "Male Partner" : "Primary Patient"}
                </span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1.5">
                <span>ID: {patientId}</span>
                <span>•</span>
                <span>{patientAge} years</span>
                <span>•</span>
                <span>{patientGender}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-gray-600 font-medium">
                  <Phone className="w-3 h-3 text-[#866BE3]" />
                  {patientPhone}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#866BE3] text-[#866BE3] text-xs font-semibold hover:bg-[#866BE3]/5 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Full Profile</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* HORIZONTAL TAB NAVIGATION */}
        <div className="px-6 border-b border-gray-100 flex items-center gap-8 overflow-x-auto text-xs font-semibold [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            { key: "overview", label: "Overview", icon: User },
            { key: "abha", label: "ABHA", icon: CreditCard },
            { key: "medical", label: "Medical History", icon: Activity },
            { key: "investigations", label: "Investigations", icon: FlaskConical },
            { key: "medications", label: "Medications", icon: Pill },
            { key: "documents", label: "Documents", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3.5 flex items-center gap-2 transition-colors relative cursor-pointer shrink-0 ${
                  isActive
                    ? "text-[#866BE3] font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#866BE3]"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#866BE3]" : "text-gray-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS */}
        <div className="p-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Basic Information */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-[#866BE3]" />
                  <h3 className="text-sm font-bold text-gray-900">Basic Information</h3>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date of Birth</span>
                    <span className="font-semibold text-gray-800">12 Aug 2003 ({patientAge} years)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gender</span>
                    <span className="font-semibold text-gray-800">{patientGender}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Blood Group</span>
                    <span className="font-bold text-rose-600">B +ve</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Marital Status</span>
                    <span className="font-semibold text-gray-800">Married</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Language</span>
                    <span className="font-semibold text-gray-800">English</span>
                  </div>
                </div>
              </div>

              {/* Key Clinical Information */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-[#866BE3]" />
                  <h3 className="text-sm font-bold text-gray-900">Key Clinical Information</h3>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Known Conditions</span>
                    <span className="font-semibold text-gray-800 text-right">PCOS, Hypothyroidism</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Allergies</span>
                    <span className="font-bold text-rose-600 text-right">Penicillin (Rash)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Medications</span>
                    <span className="font-semibold text-gray-800 text-right">Folic Acid, Levothyroxine</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lifestyle Notes</span>
                    <span className="font-semibold text-gray-800 text-right">Non-smoker</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Important Notes</span>
                    <span className="font-semibold text-gray-800 text-right">Irregular cycles, 1 failed IUI</span>
                  </div>
                </div>
              </div>

              {/* Linked Partner (Couple) */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#866BE3]" />
                    <h3 className="text-sm font-bold text-gray-900">Linked Partner (Couple)</h3>
                  </div>
                  <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                    {isPartner ? "Female Partner" : "Male Partner"}
                  </span>
                </div>

                <div className="flex items-center gap-3.5 pt-1">
                  <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-base">
                    {partnerName?.[0] || "M"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{partnerName}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span>{partnerGender} • {partnerAge} years</span>
                      <span className="flex items-center gap-1 text-gray-600 font-medium">
                        <Phone className="w-3 h-3 text-[#866BE3]" />
                        {partnerPhone}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Care Team */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-[#866BE3]" />
                  <h3 className="text-sm font-bold text-gray-900">Care Team</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      DR
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{doctorName}</p>
                      <p className="text-[11px] text-gray-400 font-medium">Primary Clinician</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs">
                      MI
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{coordinatorName}</p>
                      <p className="text-[11px] text-gray-400 font-medium">Care Coordinator</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Tags */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#866BE3]" />
                    <h3 className="text-sm font-bold text-gray-900">Quick Tags</h3>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-xs font-semibold px-3 py-1 rounded-full border ${getTagStyle(tag)}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Next Appointment */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-[#866BE3]" />
                    <h3 className="text-sm font-bold text-gray-900">Next Appointment</h3>
                  </div>
                  <p className="text-xs font-semibold text-gray-800">16 Sep 2026, 10:30 AM</p>
                  <p className="text-xs text-gray-500 mt-0.5">Follow-up Consultation</p>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#866BE3] text-[#866BE3] text-xs font-semibold hover:bg-[#866BE3]/5 transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>View in Calendar</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: ABHA */}
          {activeTab === "abha" && (
            <div className="space-y-5">
              {/* Status Header Banner */}
              <div className="p-5 rounded-2xl bg-slate-50/80 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${isAbdmConnected ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-[#866BE3]/10 text-[#866BE3] border border-[#866BE3]/20"}`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-gray-900">ABDM & ABHA Digital Profile</h4>
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-md">
                        Sandbox
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">Ayushman Bharat Digital Mission • National Health Authority</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAbdmConnected ? (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Connected
                    </span>
                  ) : (
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Not Connected
                    </span>
                  )}
                </div>
              </div>

              {isAbdmConnected ? (
                /* CONNECTED VIEW */
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs relative group hover:border-[#866BE3]/30 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">ABHA Number</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(p360?.digitalHealth?.identity?.abhaMasked || patientData?.abhaNumber || patient?.abhaNumber || "91-4829-1029-4920", "ABHA Number")}
                          className="text-gray-400 hover:text-[#866BE3] transition-colors p-1 rounded-md cursor-pointer"
                          title="Copy ABHA Number"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="font-bold text-gray-900 text-base mt-1.5 tracking-wide">
                        {p360?.digitalHealth?.identity?.abhaMasked || patientData?.abhaNumber || patient?.abhaNumber || "91-4829-1029-4920"}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium mt-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified 14-digit National Health ID</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs relative group hover:border-[#866BE3]/30 transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">ABHA Address (PHR)</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(p360?.digitalHealth?.identity?.abhaAddress || patientData?.abhaAddress || patient?.abhaAddress || `${patientName?.toLowerCase().replace(/\s+/g, "")}@sbx`, "ABHA Address")}
                          className="text-gray-400 hover:text-[#866BE3] transition-colors p-1 rounded-md cursor-pointer"
                          title="Copy ABHA Address"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="font-bold text-gray-900 text-base mt-1.5">
                        {p360?.digitalHealth?.identity?.abhaAddress || patientData?.abhaAddress || patient?.abhaAddress || `${patientName?.toLowerCase().replace(/\s+/g, "")}@sbx`}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-purple-600 font-medium mt-2">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Interoperable Health Data Address</span>
                      </div>
                    </div>
                  </div>

                  {/* Sync / Records Information Box */}
                  <div className="bg-gradient-to-br from-purple-50/50 to-indigo-50/30 p-4.5 rounded-2xl border border-purple-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                        <span>Automatic Consent & Record Synchronization</span>
                        <span className="bg-purple-100/80 text-[#866BE3] text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span>
                      </h5>
                      <p className="text-[11px] text-gray-500">
                        Health records, prescriptions, and lab tests from connected ABDM networks are automatically discoverable.
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          toast.success("Synchronizing ABDM records with health locker...");
                          onPatientUpdated?.();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                        <span>Sync Records</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbhaWizardOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#866BE3] hover:bg-[#7254d1] text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer active:scale-95"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Re-verify / Update</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* NOT CONNECTED VIEW */
                <div className="bg-white p-6 rounded-2xl border border-dashed border-gray-200 shadow-2xs space-y-6">
                  <div className="max-w-xl">
                    <h5 className="text-sm font-bold text-gray-900 mb-1">Link Patient to Ayushman Bharat Digital Mission</h5>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Connect the patient&apos;s mobile number or Aadhaar to authenticate their ABHA ID. This will automatically pull verified past medical records, lab investigations, and diagnostic history into SmrkoMed.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-100">
                      <div className="w-7 h-7 rounded-lg bg-purple-100/80 text-[#866BE3] flex items-center justify-center mb-2">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <p className="font-bold text-gray-900">Mobile OTP Verification</p>
                      <p className="text-[11px] text-gray-500 mt-1">Instant authentication with ABHA-registered mobile number</p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-100">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <p className="font-bold text-gray-900">Aadhaar OTP Auth</p>
                      <p className="text-[11px] text-gray-500 mt-1">Create or link official 14-digit ABHA ID using Aadhaar OTP</p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-100">
                      <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mb-2">
                        <FileText className="w-4 h-4" />
                      </div>
                      <p className="font-bold text-gray-900">Direct Health Record Sync</p>
                      <p className="text-[11px] text-gray-500 mt-1">Seamlessly discover lab reports and hospital summaries</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setAbhaWizardOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#866BE3] hover:bg-[#7254d1] text-white text-xs font-semibold transition-all shadow-sm active:scale-98 cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Connect via Mobile / Aadhaar OTP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbhaWizardOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#866BE3] text-[#866BE3] hover:bg-[#866BE3]/5 text-xs font-semibold transition-all active:scale-98 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New ABHA</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Live Setup Wizard Modal */}
              <AbhaSetupWizard
                open={abhaWizardOpen}
                onOpenChange={setAbhaWizardOpen}
                patientId={patientIdForWizard}
                connection={defaultAbdmConnection}
                onCompleted={() => {
                  setAbhaWizardOpen(false);
                  toast.success("ABDM Profile verified and connected successfully!");
                  onPatientUpdated?.();
                }}
              />
            </div>
          )}

          {/* TAB 3: MEDICAL HISTORY */}
          {activeTab === "medical" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 bg-slate-50/70 p-4 rounded-2xl border border-gray-100 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Medical History</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Information from ABDM health records</p>
                </div>

                <div className="space-y-1 text-xs">
                  {[
                    { label: "All Records", count: 12, icon: FileText },
                    { label: "Conditions / Diagnoses", count: 3, icon: Stethoscope },
                    { label: "Procedures / Surgeries", count: 2, icon: Scissors },
                    { label: "Hospital Visits", count: 4, icon: Building2 },
                    { label: "Allergies", count: 1, icon: AlertTriangle },
                    { label: "Family History", count: 1, icon: Users },
                    { label: "Lifestyle History", count: 1, icon: Compass },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const isSel = medicalCategory === cat.label;
                    return (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setMedicalCategory(cat.label)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all font-medium text-left cursor-pointer ${
                          isSel
                            ? "bg-[#866BE3]/10 text-[#866BE3] font-bold"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-3.5 h-3.5 ${isSel ? "text-[#866BE3]" : "text-gray-400"}`} />
                          <span>{cat.label}</span>
                        </div>
                        <span className={`text-xs ${isSel ? "text-[#866BE3] font-bold" : "text-gray-400"}`}>{cat.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{medicalCategory}</h4>
                    <p className="text-[11px] text-gray-500">{filteredMedicalRecords.length} records from 3 healthcare providers</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredMedicalRecords.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-24 text-right text-[11px] text-gray-500 font-medium shrink-0 flex items-center justify-end gap-2">
                          <span className={`w-2 h-2 rounded-full ${item.bulletColor}`} />
                          <span>{item.date}</span>
                        </div>
                        <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase font-semibold">{item.type}</span>
                              <h5 className="text-xs font-bold text-gray-900">{item.title}</h5>
                              <p className="text-[11px] text-gray-500 mt-0.5">{item.provider}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200/60 font-semibold px-2 py-0.5 rounded-md">
                              ABDM Record
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INVESTIGATIONS */}
          {activeTab === "investigations" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 bg-slate-50/70 p-4 rounded-2xl border border-gray-100 space-y-4">
                <div className="p-3 bg-white rounded-xl border border-purple-100/60 shadow-sm flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#866BE3] shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">ABDM-linked Investigations</h5>
                    <p className="text-[10px] text-gray-500 mt-0.5">Reports available through ABDM with your consent.</p>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  {[
                    { label: "All", text: "All Investigations", count: 8, icon: FlaskConical },
                    { label: "Laboratory", text: "Laboratory Reports", count: 5, icon: FlaskConical },
                    { label: "Imaging", text: "Imaging / Diagnostics", count: 3, icon: FileText },
                  ].map((c) => {
                    const Icon = c.icon;
                    const isSel = investigationCategory === c.label;
                    return (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => setInvestigationCategory(c.label)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all font-medium text-left cursor-pointer ${
                          isSel
                            ? "bg-[#866BE3]/10 text-[#866BE3] font-bold"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${isSel ? "text-[#866BE3]" : "text-gray-400"}`} />
                          <span>{c.text}</span>
                        </div>
                        <span className={`text-xs ${isSel ? "text-[#866BE3] font-bold" : "text-gray-400"}`}>{c.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <div className="space-y-3">
                  {filteredInvestigations.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 font-medium">{item.date}</span>
                            <h5 className="text-xs font-bold text-gray-900">{item.title}</h5>
                            <p className="text-[11px] text-gray-500 mt-0.5">{item.facility} • {item.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-purple-50 text-[#866BE3] border border-purple-200/60 font-semibold px-2 py-0.5 rounded-md">
                            {item.type}
                          </span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold px-2 py-0.5 rounded-md">
                            ABDM Record
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MEDICATIONS */}
          {activeTab === "medications" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 bg-slate-50/70 p-4 rounded-2xl border border-gray-100 space-y-4">
                <div className="p-3 bg-white rounded-xl border border-purple-100/60 shadow-sm flex items-start gap-2.5">
                  <Pill className="w-5 h-5 text-[#866BE3] shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-gray-900">Medications from ABDM</h5>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  {[
                    { label: "All", text: "All Medications", count: 6 },
                    { label: "Current", text: "Current Medications", count: 2 },
                    { label: "Past", text: "Past Medications", count: 4 },
                  ].map((f) => {
                    const isSel = medicationFilter === f.label;
                    return (
                      <button
                        key={f.label}
                        type="button"
                        onClick={() => setMedicationFilter(f.label)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all font-medium text-left cursor-pointer ${
                          isSel
                            ? "bg-[#866BE3]/10 text-[#866BE3] font-bold"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <span>{f.text}</span>
                        <span className={`text-xs ${isSel ? "text-[#866BE3] font-bold" : "text-gray-400"}`}>{f.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <div className="space-y-3">
                  {filteredMedications.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-24 text-right text-[11px] text-gray-500 font-medium shrink-0 flex items-center justify-end gap-2">
                        <span className={`w-2 h-2 rounded-full ${item.status === "Current" ? "bg-emerald-500" : "bg-gray-400"}`} />
                        <div>
                          <div>{item.date}</div>
                          <span className={`text-[10px] font-bold ${item.status === "Current" ? "text-emerald-600" : "text-gray-400"}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-gray-900">{item.name}</h5>
                            <p className="text-[11px] text-gray-600 font-medium">{item.dosage}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Dr. {item.doctor} • {item.facility}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-purple-50 text-[#866BE3] border border-purple-200/60 font-semibold px-2 py-0.5 rounded-md">
                            Prescription
                          </span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold px-2 py-0.5 rounded-md">
                            ABDM Record
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-4 bg-slate-50/70 p-4 rounded-2xl border border-gray-100 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Patient Documents</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Health records from ABDM and shared providers</p>
                </div>

                <div className="space-y-1 text-xs">
                  {[
                    { label: "All", text: "All Documents", count: 14, icon: FileText },
                    { label: "Prescriptions", text: "Prescriptions", count: 4, icon: Pill },
                    { label: "Lab Reports", text: "Laboratory Reports", count: 4, icon: FlaskConical },
                    { label: "Imaging", text: "Imaging / Diagnostic Reports", count: 2, icon: FileText },
                    { label: "Discharge", text: "Discharge Summaries", count: 1, icon: FileCheck2 },
                    { label: "Consultation", text: "Consultation Notes", count: 1, icon: FileSignature },
                    { label: "Certificates", text: "Medical Certificates", count: 1, icon: ShieldCheck },
                    { label: "Others", text: "Others", count: 1, icon: Compass },
                  ].map((docCat) => {
                    const Icon = docCat.icon;
                    const isSel = documentCategory === docCat.label;
                    return (
                      <button
                        key={docCat.label}
                        type="button"
                        onClick={() => setDocumentCategory(docCat.label)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all font-medium text-left cursor-pointer ${
                          isSel
                            ? "bg-[#866BE3]/10 text-[#866BE3] font-bold"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${isSel ? "text-[#866BE3]" : "text-gray-400"}`} />
                          <span>{docCat.text}</span>
                        </div>
                        <span className={`text-xs ${isSel ? "text-[#866BE3] font-bold" : "text-gray-400"}`}>{docCat.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <div className="space-y-3">
                  {filteredDocuments.map((doc, idx) => (
                    <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${doc.iconBg} flex items-center justify-center shrink-0`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-gray-900">{doc.name}</h5>
                          <p className="text-[11px] text-gray-500 mt-0.5">{doc.date} • {doc.facility}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-purple-50 text-[#866BE3] border border-purple-200/60 font-semibold px-2 py-0.5 rounded-md hidden sm:inline">
                          {doc.type}
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold px-2 py-0.5 rounded-md hidden sm:inline">
                          ABDM Record
                        </span>
                        <button
                          type="button"
                          onClick={() => toast.info(`Viewing ${doc.name}`)}
                          className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-gray-500" />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toast.success(`Downloading ${doc.name}`)}
                          className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3 text-gray-500" />
                          <span>Download</span>
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 px-6 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="py-2 px-6 rounded-full border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
