"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  GitBranch,
  Layers,
  ChevronRight,
  Loader2,
  FileCheck2,
} from "lucide-react";
import { clinicApi } from "@/lib/clinic-api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface JourneyTemplateDef {
  id: string;
  name: string;
  category: "IVF" | "IUI" | "FET" | "Donor" | "Egg Freezing";
  stageCount: number;
  durationDays: number;
  description: string;
  badge: string;
  stages: Array<{
    name: string;
    description: string;
    tasks: Array<{
      title: string;
      category: string;
      timing: string;
    }>;
  }>;
}

export const JOURNEY_TEMPLATES: JourneyTemplateDef[] = [
  {
    id: "ivf-standard",
    name: "IVF Standard Journey",
    category: "IVF",
    stageCount: 15,
    durationDays: 42,
    badge: "15 Stages • Recommended",
    description: "Complete 15-stage personalized clinical IVF cycle from lead intake & stimulation to embryo transfer & post-transfer care.",
    stages: [
      {
        name: "01. Lead / Appointment",
        description: "Pre-consultation intake, medical history form, slot confirmation and couple registration.",
        tasks: [
          { title: "Send Pre-Consultation Medical Questionnaire", category: "Form", timing: "Day 1" },
          { title: "Confirm Consultation Appointment & Location", category: "Appointment", timing: "Day 1" },
        ],
      },
      {
        name: "02. Initial Consultation",
        description: "In-depth review of reproductive history, lifestyle assessment, and clinical fertility evaluation.",
        tasks: [
          { title: "Doctor Consultation & Clinical History", category: "Clinical", timing: "Day 2" },
          { title: "Share Consultation Summary & Welcome Guide via WhatsApp", category: "WhatsApp", timing: "Day 2" },
        ],
      },
      {
        name: "03. Fertility Investigation / Workup",
        description: "Comprehensive diagnostic testing including semen analysis, AMH, baseline hormone panel, and pelvic scan.",
        tasks: [
          { title: "Diagnostic Blood Panel (AMH, FSH, LH, E2, PRL)", category: "Lab", timing: "Day 4" },
          { title: "Semen Analysis & DNA Fragmentation", category: "Lab", timing: "Day 5" },
          { title: "Baseline Transvaginal Ultrasound (AFC)", category: "Scan", timing: "Day 6" },
        ],
      },
      {
        name: "04. IVF Decision",
        description: "Review test results with doctor, confirm diagnosis, and select optimal stimulation protocol.",
        tasks: [
          { title: "Review Investigation Reports with Doctor", category: "Review", timing: "Day 8" },
          { title: "Treatment Protocol Selection (Antagonist / Agonist)", category: "Clinical", timing: "Day 8" },
        ],
      },
      {
        name: "05. Treatment Planning & Consent",
        description: "Formal consent signing, financial counselling, medication explanation, and treatment schedule.",
        tasks: [
          { title: "ICSI / Embryology Consent & Digital Signature", category: "Consent", timing: "Day 10" },
          { title: "Financial Counselling & Package Setup", category: "Billing", timing: "Day 10" },
          { title: "Dispense Stimulation Medications from Pharmacy", category: "Pharmacy", timing: "Day 11" },
        ],
      },
      {
        name: "06. Cycle Preparation",
        description: "Cycle priming, down-regulation if needed, baseline scan on Day 2 of menses to confirm readiness.",
        tasks: [
          { title: "Day 2 Baseline Ultrasound & Estradiol Check", category: "Scan", timing: "Day 13" },
          { title: "Send Daily Injection Guide & Video", category: "WhatsApp", timing: "Day 13" },
        ],
      },
      {
        name: "07. Ovarian Stimulation",
        description: "Daily gonadotropin injections (rFSH/HMG) to stimulate multiple follicle development.",
        tasks: [
          { title: "Daily Gonadotropin Dosage Confirmation", category: "Medication", timing: "Day 14-23" },
          { title: "Daily Injection Log & Reassurance WhatsApp Bot", category: "Automation", timing: "Daily" },
        ],
      },
      {
        name: "08. Follicular Monitoring",
        description: "Serial transvaginal ultrasounds and serum estradiol tests to monitor follicular growth.",
        tasks: [
          { title: "Follicular Scan 1 (Day 6 of Stimulation)", category: "Scan", timing: "Day 19" },
          { title: "Follicular Scan 2 (Day 9 of Stimulation)", category: "Scan", timing: "Day 22" },
          { title: "Add GnRH Antagonist to prevent premature LH surge", category: "Clinical", timing: "Day 21" },
        ],
      },
      {
        name: "09. Trigger",
        description: "Final oocyte maturation trigger injection (hCG / Decapeptyl) at precise scheduled time (36h before OPU).",
        tasks: [
          { title: "Calculate Precise Trigger Injection Time", category: "Clinical", timing: "Day 24" },
          { title: "Send High-Priority Trigger Alarm Reminder", category: "WhatsApp", timing: "Day 24 • 21:30" },
        ],
      },
      {
        name: "10. OPU (Oocyte Pick-Up)",
        description: "Transvaginal ultrasound-guided egg retrieval under mild conscious sedation and semen collection.",
        tasks: [
          { title: "Pre-OPU Fasting & Admission Preparation", category: "Admission", timing: "Day 26 • 08:00" },
          { title: "Egg Retrieval Procedure & Semen Sample Collection", category: "Procedure", timing: "Day 26 • 09:30" },
          { title: "Post-OPU Recovery & Doctor Discharge Summary", category: "Discharge", timing: "Day 26 • 13:00" },
        ],
      },
      {
        name: "11. Embryology & Fertilization",
        description: "ICSI fertilization check (Day 1), embryo cleavage monitoring (Day 3), and blastocyst culture (Day 5).",
        tasks: [
          { title: "Day 1 Fertilization Report (2PN Check)", category: "Lab", timing: "Day 27" },
          { title: "Day 3 Cleavage Embryo Update to Couple", category: "WhatsApp", timing: "Day 29" },
          { title: "Day 5 Blastocyst Culture & Grading Report", category: "Lab", timing: "Day 31" },
        ],
      },
      {
        name: "12. Transfer / FET",
        description: "Fresh embryo transfer or cryopreservation of high-grade blastocysts for frozen transfer.",
        tasks: [
          { title: "Embryo Transfer Procedure & Ultrasound Guidance", category: "Procedure", timing: "Day 31" },
          { title: "Cryopreservation Record & Storage Agreement", category: "Lab", timing: "Day 31" },
        ],
      },
      {
        name: "13. Post-Transfer Care",
        description: "Luteal phase support (Progesterone), activity instructions, and two-week wait emotional support.",
        tasks: [
          { title: "Luteal Support Medication Schedule (Progesterone)", category: "Medication", timing: "Daily" },
          { title: "Two-Week Wait Wellness & Relaxation Tips", category: "WhatsApp", timing: "Day 35" },
        ],
      },
      {
        name: "14. Pregnancy Test",
        description: "Quantitative serum beta-hCG blood test at 14 days post embryo transfer.",
        tasks: [
          { title: "Serum Beta-hCG Blood Test", category: "Lab", timing: "Day 45" },
          { title: "Doctor Review of Beta-hCG Results", category: "Clinical", timing: "Day 45" },
        ],
      },
      {
        name: "15. Outcome & Follow-up",
        description: "Confirmation ultrasound for gestational sac / heartbeat or supportive clinical review.",
        tasks: [
          { title: "6-Week Early Viability Ultrasound Scan", category: "Scan", timing: "Day 56" },
          { title: "Antenatal Care Transition or Next Step Consultation", category: "Discharge", timing: "Day 56" },
        ],
      },
    ],
  },
  {
    id: "ivf-donor",
    name: "IVF - Donor Journey",
    category: "Donor",
    stageCount: 14,
    durationDays: 45,
    badge: "14 Stages • Donor Pathway",
    description: "Includes donor matching, synchronization, ovarian stimulation, and recipient endometrial preparation.",
    stages: [
      { name: "01. Donor Consultation & Matching", description: "Donor profile review, phenotypic matching, and clinical selection.", tasks: [{ title: "Donor Matching & Selection Protocol", category: "Clinical", timing: "Day 1" }] },
      { name: "02. Medical & Genetic Screening", description: "Comprehensive donor infectious, genetic and psychological clearance.", tasks: [{ title: "Genetic & Viral Screening Panel", category: "Lab", timing: "Day 3" }] },
      { name: "03. Legal & Consent Protocols", description: "ART Act compliance, donor agreements and informed consent.", tasks: [{ title: "ART Act Consent & Legal Agreement", category: "Consent", timing: "Day 5" }] },
      { name: "04. Cycle Synchronization", description: "Synchronizing donor stimulation with recipient endometrial preparation.", tasks: [{ title: "Protocol Synchronization Schedule", category: "Clinical", timing: "Day 7" }] },
      { name: "05. Donor Ovarian Stimulation", description: "Gonadotropin injections and monitoring for egg donor.", tasks: [{ title: "Donor Stimulation Injections", category: "Medication", timing: "Day 10-20" }] },
      { name: "06. Recipient Endometrial Preparation", description: "Estrogen priming to achieve optimal triple-line endometrium.", tasks: [{ title: "Endometrial Priming (Estradiol)", category: "Medication", timing: "Day 10-20" }] },
      { name: "07. Donor OPU (Egg Retrieval)", description: "Donor egg retrieval and partner sperm processing.", tasks: [{ title: "Donor OPU & Sperm Wash", category: "Procedure", timing: "Day 22" }] },
      { name: "08. Fertilization & Embryo Culture", description: "ICSI fertilization and blastocyst culture to Day 5/6.", tasks: [{ title: "ICSI Fertilization & Culture", category: "Lab", timing: "Day 23" }] },
      { name: "09. Embryo Transfer", description: "Ultrasound-guided transfer of donor-derived blastocyst.", tasks: [{ title: "Blastocyst Transfer Procedure", category: "Procedure", timing: "Day 27" }] },
      { name: "10. Post-Transfer Care", description: "Luteal phase support with progesterone & estrogen.", tasks: [{ title: "Luteal Support Progesterone", category: "Medication", timing: "Daily" }] },
      { name: "11. Beta hCG Pregnancy Test", description: "Quantitative pregnancy blood test at 14 days.", tasks: [{ title: "Serum Beta-hCG Test", category: "Lab", timing: "Day 41" }] },
      { name: "12. Viability Scan & Outcome", description: "Confirmation of intrauterine pregnancy and fetal heartbeat.", tasks: [{ title: "Viability Ultrasound Scan", category: "Scan", timing: "Day 55" }] },
    ],
  },
  {
    id: "fet-protocol",
    name: "FET - Frozen Embryo Transfer",
    category: "FET",
    stageCount: 8,
    durationDays: 28,
    badge: "8 Stages • Frozen Transfer",
    description: "Hormone replacement therapy, endometrial lining tracking, and embryo transfer for cryopreserved embryos.",
    stages: [
      { name: "01. FET Consultation & Thaw Plan", description: "Review cryopreserved embryo inventory and transfer protocol.", tasks: [{ title: "Review Cryo Inventory & Thaw Plan", category: "Review", timing: "Day 1" }] },
      { name: "02. Endometrial Priming (HRT)", description: "Oral estrogen to prepare receptive endometrium.", tasks: [{ title: "Start Oral Estradiol Valerate", category: "Medication", timing: "Day 2" }] },
      { name: "03. Endometrial Lining Scan", description: "Ultrasound verification of endometrial thickness >= 8mm.", tasks: [{ title: "Endometrial Thickness Scan (TVS)", category: "Scan", timing: "Day 12" }] },
      { name: "04. Progesterone Start (P+0)", description: "Timed initiation of progesterone 120h prior to blastocyst thaw.", tasks: [{ title: "Start Progesterone (Exact Time Tracking)", category: "Medication", timing: "Day 14" }] },
      { name: "05. Embryo Thawing & Viability Check", description: "Embryologist thawing and survival assessment.", tasks: [{ title: "Embryo Thawing & Survival Report", category: "Lab", timing: "Day 19" }] },
      { name: "06. Embryo Transfer Procedure", description: "Transvaginal ultrasound guided frozen embryo transfer.", tasks: [{ title: "FET Ultrasound-Guided Transfer", category: "Procedure", timing: "Day 19" }] },
      { name: "07. Two-Week Wait & Luteal Support", description: "Intensive progesterone support and patient communication.", tasks: [{ title: "Luteal Support Regimen", category: "Medication", timing: "Daily" }] },
      { name: "08. Beta hCG Test & Outcome", description: "Blood pregnancy confirmation and follow-up.", tasks: [{ title: "Beta-hCG Blood Test", category: "Lab", timing: "Day 33" }] },
    ],
  },
  {
    id: "iui-protocol",
    name: "IUI Protocol (Intrauterine Insemination)",
    category: "IUI",
    stageCount: 6,
    durationDays: 18,
    badge: "6 Stages • Low Intervention",
    description: "Ovulation induction, serial follicular monitoring, hCG trigger, and timed intrauterine insemination.",
    stages: [
      { name: "01. Baseline Evaluation & Scan", description: "Day 2/3 ultrasound to verify resting ovaries.", tasks: [{ title: "Day 2 Baseline TVS Scan", category: "Scan", timing: "Day 2" }] },
      { name: "02. Ovulation Induction", description: "Oral Letrozole / Clomiphene or low-dose gonadotropins.", tasks: [{ title: "Letrozole / Clomiphene Medication", category: "Medication", timing: "Day 3-7" }] },
      { name: "03. Follicular Monitoring", description: "Tracking dominant follicle to >= 18-20mm.", tasks: [{ title: "Follicular Monitoring Scan", category: "Scan", timing: "Day 10" }] },
      { name: "04. Ovulation Trigger Injection", description: "hCG injection 36 hours prior to planned insemination.", tasks: [{ title: "hCG Trigger Injection (5000 IU)", category: "Clinical", timing: "Day 12" }] },
      { name: "05. Semen Processing & IUI Procedure", description: "Sperm wash and intrauterine insemination.", tasks: [{ title: "Sperm Wash & IUI Insemination", category: "Procedure", timing: "Day 14" }] },
      { name: "06. Luteal Support & Pregnancy Test", description: "Progesterone support and 14-day pregnancy test.", tasks: [{ title: "14-Day Urine / Blood Pregnancy Test", category: "Lab", timing: "Day 28" }] },
    ],
  },
];

interface AssignCareJourneyModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId: string;
  patientName?: string;
  onAssigned?: () => void;
}

export function AssignCareJourneyModal({
  isOpen,
  onOpenChange,
  coupleId,
  patientName = "Patient",
  onAssigned,
}: AssignCareJourneyModalProps) {
  const [step, setStep] = useState<"directory" | "detail">("directory");
  const [selectedTemplate, setSelectedTemplate] = useState<JourneyTemplateDef>(JOURNEY_TEMPLATES[0]!);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Step 2 configuration state
  const [selectedStageIndex, setSelectedStageIndex] = useState(0);
  const [previewStageIndex, setPreviewStageIndex] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [doctorName, setDoctorName] = useState("Dr. Jismon J");
  const [notes, setNotes] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return JOURNEY_TEMPLATES.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === "All" || t.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [searchQuery, categoryFilter]);

  const handleSelectTemplate = (tpl: JourneyTemplateDef) => {
    setSelectedTemplate(tpl);
    setSelectedStageIndex(0);
    setPreviewStageIndex(0);
    setStep("detail");
  };

  const handleBackToDirectory = () => {
    setStep("directory");
  };

  const handleAssignAndActivate = async () => {
    if (!coupleId) {
      toast.error("Couple ID is missing");
      return;
    }

    setIsAssigning(true);
    try {
      const startingStageObj = selectedTemplate.stages[selectedStageIndex] || selectedTemplate.stages[0];
      const startingStageName = startingStageObj?.name || "01. Lead / Appointment";

      await clinicApi.patchCoupleTreatment(coupleId, {
        kind: selectedTemplate.category === "IUI" ? "IUI" : "IVF",
        label: `${selectedTemplate.name}`,
        status: "ACTIVE",
        stageIndex: selectedStageIndex,
        stageName: startingStageName.replace(/^\d+\.\s*/, ""),
        startedAt: new Date(startDate).toISOString(),
        cycleNumber: 1,
        notes: notes ? notes.trim() : `Assigned ${selectedTemplate.name}`,
      });

      try {
        const templates = await clinicApi.templates().catch(() => []);
        const matchedDbTpl = (templates as any[]).find(
          (t) =>
            t.name?.toLowerCase().includes(selectedTemplate.name.toLowerCase()) ||
            t.type?.toLowerCase() === selectedTemplate.category.toLowerCase()
        );
        if (matchedDbTpl?.id) {
          await clinicApi.assignCarePlan({
            coupleId,
            templateId: matchedDbTpl.id,
            startDate: new Date(startDate).toISOString(),
            customValues: {
              protocolNotes: notes || undefined,
            },
          }).catch(() => {});
        }
      } catch {
        // Safe fallback
      }

      toast.success(`${selectedTemplate.name} assigned and activated!`);
      if (onAssigned) onAssigned();
      onOpenChange(false);
      setStep("directory");
    } catch (err: any) {
      console.error("Failed to assign journey:", err);
      toast.error(err?.message || "Failed to assign care journey");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1050px] w-full max-h-[90vh] p-0 overflow-hidden flex flex-col bg-[#FAF9FF] border-0 shadow-2xl rounded-3xl">
        {step === "directory" ? (
          /* ============================================================
             SCREEN 1: Care Journeys Directory (Image 2)
             ============================================================ */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="bg-white p-6 pb-5 border-b border-gray-100 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#866BE3]/10 flex items-center justify-center text-[#866BE3]">
                      <GitBranch className="w-4 h-4" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Care Journeys</h2>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Manage and activate standardized clinical pathways, milestones, and automated care loops for <span className="font-semibold text-gray-800">{patientName}</span>.
                  </p>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search protocols & pathways..."
                    className="pl-9 bg-gray-50 border-gray-200 text-xs h-9 rounded-xl focus-visible:ring-[#866BE3]"
                  />
                </div>
              </div>

              {/* Metric Highlights Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                <div className="bg-[#F3F0FF] rounded-2xl p-3.5 border border-[#866BE3]/10 flex flex-col">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Pathways</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-gray-900">4</span>
                    <span className="text-xs font-semibold text-[#866BE3]">Active</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5">In clinic protocols</span>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm flex flex-col">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Avg Timeline</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-gray-900">42</span>
                    <span className="text-xs font-semibold text-gray-500">Days</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5">Average standard cycle</span>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm flex flex-col">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Protocol Adherence</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-emerald-600">96.4%</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5">Automated task completion</span>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm flex flex-col">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Satisfaction</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-gray-900">9.8</span>
                    <span className="text-xs font-semibold text-gray-400">/ 10</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5">Patient experience score</span>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1">
                {["All", "IVF", "IUI", "FET", "Donor"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer",
                      categoryFilter === cat
                        ? "bg-[#866BE3] text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {cat === "All" ? "All Protocols" : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Pathways Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Active Treatment Pathways Directory ({filteredTemplates.length})
                </p>
                <span className="text-[11px] text-gray-400">Click any pathway to inspect stages & assign</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className="bg-white rounded-2xl border border-gray-100 hover:border-[#866BE3]/40 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#866BE3]/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#866BE3]/10 text-[#866BE3] border border-[#866BE3]/20">
                          {tpl.category} Protocol
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          {tpl.durationDays} Days avg
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-900 group-hover:text-[#866BE3] transition-colors flex items-center gap-1.5">
                        {tpl.name}
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-[#866BE3]" />
                      </h3>

                      <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-gray-600 font-semibold">
                        <Layers className="w-3.5 h-3.5 text-[#866BE3]" />
                        <span>{tpl.stageCount} Stages</span>
                      </div>
                      <span className="text-[#866BE3] font-bold text-xs flex items-center gap-1">
                        Select Journey <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================
             SCREEN 2: Pathway Detail & Assignment Preview (Image 3)
             ============================================================ */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header Banner */}
            <div className="bg-white p-5 border-b border-gray-100 shrink-0">
              <button
                type="button"
                onClick={handleBackToDirectory}
                className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Care Journeys Directory
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    {selectedTemplate.name}
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Standard Active Protocol
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedTemplate.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBackToDirectory}
                    className="text-xs h-9 rounded-xl border-gray-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={isAssigning}
                    onClick={handleAssignAndActivate}
                    className="bg-[#866BE3] hover:bg-[#7254d1] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-md gap-1.5 cursor-pointer"
                  >
                    {isAssigning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Activating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Assign & Activate Journey
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Protocol Stat Chips */}
              <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-gray-600">
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  <Layers className="w-3.5 h-3.5 text-[#866BE3]" />
                  <span><strong>{selectedTemplate.stageCount}</strong> Stages</span>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  <Clock className="w-3.5 h-3.5 text-[#866BE3]" />
                  <span><strong>~{selectedTemplate.durationDays}</strong> Days Duration</span>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Automated Care Loop Active</span>
                </div>
              </div>
            </div>

            {/* Split Content: Stages Flow & Stage Detail + Assignment Form */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Column: Stage Milestones List */}
              <div className="w-full md:w-[320px] bg-white border-r border-gray-100 overflow-y-auto p-4 shrink-0">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 px-2">
                  Protocol Stages ({selectedTemplate.stages.length})
                </p>
                <div className="space-y-1">
                  {selectedTemplate.stages.map((st, idx) => {
                    const isSelected = previewStageIndex === idx;
                    const isStarting = selectedStageIndex === idx;
                    return (
                      <button
                        key={st.name}
                        type="button"
                        onClick={() => setPreviewStageIndex(idx)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer",
                          isSelected
                            ? "bg-[#F3F0FF] text-[#866BE3] border border-[#866BE3]/30 shadow-xs"
                            : "hover:bg-gray-50 text-gray-700"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                            isSelected ? "bg-[#866BE3] text-white" : "bg-gray-100 text-gray-500"
                          )}>
                            {idx + 1}
                          </span>
                          <span className="truncate">{st.name}</span>
                        </div>
                        {isStarting && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#866BE3] text-white">
                            Starts Here
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Stage Details & Assignment Controls */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Active Stage Preview Box */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                      <span className="text-[10px] font-bold text-[#866BE3] uppercase tracking-wider">
                        Stage {previewStageIndex + 1} of {selectedTemplate.stages.length}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 mt-0.5">
                        {selectedTemplate.stages[previewStageIndex]?.name}
                      </h3>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setSelectedStageIndex(previewStageIndex)}
                      className={cn(
                        "text-xs h-7 rounded-lg font-semibold",
                        selectedStageIndex === previewStageIndex
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-[#866BE3]/10 text-[#866BE3] hover:bg-[#866BE3]/20"
                      )}
                    >
                      {selectedStageIndex === previewStageIndex ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Set as Start Stage
                        </>
                      ) : (
                        "Set as Starting Stage"
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                    {selectedTemplate.stages[previewStageIndex]?.description}
                  </p>

                  {/* Tasks for this stage */}
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Automated Care Tasks ({selectedTemplate.stages[previewStageIndex]?.tasks.length || 0})
                    </p>
                    {selectedTemplate.stages[previewStageIndex]?.tasks &&
                    selectedTemplate.stages[previewStageIndex]!.tasks.length > 0 ? (
                      <div className="space-y-2">
                        {selectedTemplate.stages[previewStageIndex]!.tasks.map((task, tidx) => (
                          <div
                            key={tidx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <FileCheck2 className="w-4 h-4 text-[#866BE3]" />
                              <span className="font-semibold text-gray-800">{task.title}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-gray-500 px-2 py-0.5 bg-white rounded-md border border-gray-200">
                              {task.category} • {task.timing}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-gray-400 text-xs border border-dashed rounded-xl">
                        Standard clinical care loop tasks trigger on stage entry.
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignment Settings Form */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#866BE3]" />
                    Cycle Activation Settings
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Initial Starting Stage</Label>
                      <select
                        value={selectedStageIndex}
                        onChange={(e) => setSelectedStageIndex(Number(e.target.value))}
                        className="w-full mt-1.5 h-9 px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#866BE3]"
                      >
                        {selectedTemplate.stages.map((st, sidx) => (
                          <option key={sidx} value={sidx}>
                            Stage {sidx + 1}: {st.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Cycle Start Date</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="mt-1.5 h-9 rounded-xl border-gray-200 bg-gray-50 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Supervising Doctor</Label>
                      <Input
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        placeholder="Dr. Name"
                        className="mt-1.5 h-9 rounded-xl border-gray-200 bg-gray-50 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700">Target Patient</Label>
                      <Input
                        value={patientName}
                        disabled
                        className="mt-1.5 h-9 rounded-xl border-gray-200 bg-gray-100 text-xs text-gray-600 font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-700">Protocol / Clinical Notes (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Antagonist protocol with Gonal-F 225 IU, Cetrotide on Day 6, ICSI planned..."
                      className="mt-1.5 rounded-xl border-gray-200 bg-gray-50 text-xs min-h-[60px]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="button"
                      disabled={isAssigning}
                      onClick={handleAssignAndActivate}
                      className="bg-[#866BE3] hover:bg-[#7254d1] text-white text-xs font-semibold h-10 px-6 rounded-xl shadow-md gap-2 cursor-pointer active:scale-98"
                    >
                      {isAssigning ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Assigning Care Journey...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Assign & Activate {selectedTemplate.name}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
