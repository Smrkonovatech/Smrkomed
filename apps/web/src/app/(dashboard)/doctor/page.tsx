"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck,
  FileText,
  Heart,
  Home,
  MessageCircle,
  Mic,
  MoreHorizontal,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { clinicApi } from "@/lib/clinic-api";

export default function DoctorAppPage() {
  const [activeTab, setActiveTab] = useState<"home" | "schedule" | "patients" | "messages" | "more">("home");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [prepareDayData, setPrepareDayData] = useState<any>(null);
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [scheduleRange, setScheduleRange] = useState<"day" | "week">("day");
  const [patientsSearch, setPatientsSearch] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [reportsQueue, setReportsQueue] = useState<any[]>([]);

  // Consultation Modal State
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [consultationModalOpen, setConsultationModalOpen] = useState(false);
  const [reasonForVisit, setReasonForVisit] = useState("");
  const [impression, setImpression] = useState("");
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [submittingConsult, setSubmittingConsult] = useState(false);

  // Report Review Modal State
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportAction, setReportAction] = useState<"ACKNOWLEDGED" | "APPROVED" | "REPEAT_TEST">("APPROVED");
  const [reportNotes, setReportNotes] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const [pmdRes, schedRes, msgsRes, excRes, repRes] = await Promise.all([
        clinicApi.prepareMyDay().catch(() => null),
        clinicApi.doctorSchedule({ range: scheduleRange }).catch(() => null),
        clinicApi.doctorMessages().catch(() => []),
        clinicApi.doctorCareLoopExceptions().catch(() => []),
        clinicApi.doctorReports("pending_review").catch(() => []),
      ]);

      if (pmdRes) setPrepareDayData(pmdRes);
      if (schedRes) setScheduleData(schedRes);
      if (msgsRes) setMessages(msgsRes);
      if (excRes) setExceptions(excRes);
      if (repRes) setReportsQueue(repRes);
    } catch (e: any) {
      toast.error("Failed to load doctor workspace data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [scheduleRange]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    toast.success("Doctor workspace refreshed");
  }

  function openConsultation(appt: any) {
    setSelectedAppt(appt);
    setReasonForVisit(appt.type || "Clinical Consultation");
    setImpression("");
    setClinicalSummary(appt.notes || "");
    setNextSteps("");
    setConsultationModalOpen(true);
  }

  async function handleCompleteConsultation() {
    if (!selectedAppt) return;
    if (!clinicalSummary.trim()) {
      toast.error("Please enter consultation clinical notes or summary");
      return;
    }

    try {
      setSubmittingConsult(true);
      await clinicApi.completeConsultation(selectedAppt.id, {
        status: "COMPLETED",
        reasonForVisit,
        impression: impression.trim() || undefined,
        summary: clinicalSummary.trim(),
        nextSteps: nextSteps.trim() || undefined,
      });

      toast.success("Consultation completed and clinical notes saved");
      setConsultationModalOpen(false);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to save consultation note");
    } finally {
      setSubmittingConsult(false);
    }
  }

  function openReportReview(report: any) {
    setSelectedReport(report);
    setReportAction("APPROVED");
    setReportNotes("");
    setReportModalOpen(true);
  }

  async function handleSignOffReport() {
    if (!selectedReport) return;
    try {
      setSubmittingReport(true);
      await clinicApi.doctorReviewReport(selectedReport.id, {
        action: reportAction,
        clinicalNotes: reportNotes.trim() || undefined,
      });

      toast.success(`Report ${reportAction.toLowerCase()} and signed off`);
      setReportModalOpen(false);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to sign off report");
    } finally {
      setSubmittingReport(false);
    }
  }

  const filteredPatients = (prepareDayData?.activeTreatments || []).filter((t: any) => {
    const q = patientsSearch.toLowerCase();
    return (
      (t.patientName && t.patientName.toLowerCase().includes(q)) ||
      (t.partnerName && t.partnerName.toLowerCase().includes(q)) ||
      (t.stageName && t.stageName.toLowerCase().includes(q)) ||
      (t.label && t.label.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-7xl mx-auto pb-20 md:pb-6 px-3 sm:px-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between py-4 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-teal-600/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 flex items-center justify-center font-bold">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Doctor Workspace
              <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30">
                Clinical Authority
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">Fast clinical action • Today: {new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Desktop Tabs Header (Hidden on Mobile) */}
      <div className="hidden md:flex mt-3 border-b border-border/50">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="bg-transparent h-10 p-0 space-x-6 border-b-0">
            <TabsTrigger
              value="home"
              className="data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none bg-transparent px-3 pb-2 text-sm font-medium"
            >
              Home (Prepare My Day)
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none bg-transparent px-3 pb-2 text-sm font-medium"
            >
              Schedule ({scheduleData?.count || 0})
            </TabsTrigger>
            <TabsTrigger
              value="patients"
              className="data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none bg-transparent px-3 pb-2 text-sm font-medium"
            >
              Active Patients ({prepareDayData?.activeTreatments?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none bg-transparent px-3 pb-2 text-sm font-medium"
            >
              Messages ({messages.length})
            </TabsTrigger>
            <TabsTrigger
              value="more"
              className="data-[state=active]:border-b-2 data-[state=active]:border-teal-600 rounded-none bg-transparent px-3 pb-2 text-sm font-medium"
            >
              Reports & Exceptions ({reportsQueue.length + exceptions.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content Body */}
      <div className="flex-1 mt-4">
        {/* TAB 1: HOME (Prepare My Day) */}
        {activeTab === "home" && (
          <div className="space-y-5">
            {/* Prepare My Day Briefing Card */}
            <Card className="border-teal-500/20 bg-gradient-to-br from-teal-500/5 via-background to-cyan-500/5 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <CardTitle className="text-base font-semibold">Prepare My Day</CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-teal-500/10 text-teal-700 dark:text-teal-300">
                    Clinical Briefing
                  </Badge>
                </div>
                <CardDescription className="text-sm text-foreground/90 font-medium mt-1">
                  {prepareDayData?.briefing?.summary || "Loading briefing..."}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                  <div className="bg-card border rounded-lg p-3 text-center">
                    <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                      {prepareDayData?.briefing?.metrics?.todayAppointmentsCount ?? 0}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">Appointments</p>
                  </div>
                  <div className="bg-card border rounded-lg p-3 text-center">
                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {prepareDayData?.briefing?.metrics?.pendingReportsCount ?? 0}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">Reports to Review</p>
                  </div>
                  <div className="bg-card border rounded-lg p-3 text-center">
                    <span className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                      {prepareDayData?.briefing?.metrics?.escalationsCount ?? 0}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">Escalations</p>
                  </div>
                  <div className="bg-card border rounded-lg p-3 text-center">
                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {prepareDayData?.briefing?.metrics?.activeTreatmentsCount ?? 0}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">Active Cycles</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Today's Schedule Priority Queue */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> Today&apos;s Appointments ({prepareDayData?.todayAppointments?.length || 0})
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("schedule")} className="text-xs h-7 gap-1">
                  Full Schedule <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              {(!prepareDayData?.todayAppointments || prepareDayData.todayAppointments.length === 0) ? (
                <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground text-sm">
                  No appointments scheduled for today.
                </div>
              ) : (
                <div className="grid gap-3">
                  {prepareDayData.todayAppointments.map((appt: any) => (
                    <Card key={appt.id} className="border shadow-none hover:border-teal-500/40 transition-colors">
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{appt.patientName}</span>
                            {appt.partnerName && (
                              <span className="text-xs text-muted-foreground">({appt.partnerName})</span>
                            )}
                            <Badge variant={appt.status === "COMPLETED" ? "secondary" : "default"} className="text-xs">
                              {appt.status}
                            </Badge>
                            {appt.activeTreatment && (
                              <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                                {appt.activeTreatment.kind}: {appt.activeTreatment.stageName || "Monitoring"}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(appt.startsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span>• {appt.type}</span>
                            {appt.room && <span>• Room: {appt.room}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {appt.coupleId && (
                            <Link href={`/patients/${appt.coupleId}`} className="text-xs underline text-muted-foreground hover:text-foreground">
                              View Patient 360
                            </Link>
                          )}
                          <Button
                            size="sm"
                            onClick={() => openConsultation(appt)}
                            className="h-8 gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                          >
                            <Stethoscope className="h-3.5 w-3.5" />
                            {appt.status === "COMPLETED" ? "Edit Notes" : "Start Consultation"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Clinical Escalations & Needs Attention */}
            {prepareDayData?.clinicalEscalations && prepareDayData.clinicalEscalations.length > 0 && (
              <div className="space-y-3 pt-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Clinical Escalations ({prepareDayData.clinicalEscalations.length})
                </h2>
                <div className="grid gap-2.5">
                  {prepareDayData.clinicalEscalations.map((esc: any) => (
                    <div key={esc.id} className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{esc.patientName}</span>
                          <Badge variant="destructive" className="text-xs">{esc.priority}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{esc.title}</p>
                      </div>
                      {esc.coupleId && (
                        <Link href={`/patients/${esc.coupleId}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-rose-500/30 text-rose-700 dark:text-rose-300">
                            Examine
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SCHEDULE */}
        {activeTab === "schedule" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <h2 className="text-base font-semibold">Doctor Schedule</h2>
                <p className="text-xs text-muted-foreground">Chronological consultation appointments</p>
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={scheduleRange === "day" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setScheduleRange("day")}
                  className="h-7 text-xs"
                >
                  Day
                </Button>
                <Button
                  variant={scheduleRange === "week" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setScheduleRange("week")}
                  className="h-7 text-xs"
                >
                  Week
                </Button>
              </div>
            </div>

            {(!scheduleData?.appointments || scheduleData.appointments.length === 0) ? (
              <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm">
                No scheduled consultations found for this timeframe.
              </div>
            ) : (
              <div className="space-y-3">
                {scheduleData.appointments.map((a: any) => (
                  <Card key={a.id} className="border">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{a.patientName}</span>
                          <Badge variant={a.status === "COMPLETED" ? "secondary" : "outline"} className="text-xs">
                            {a.status}
                          </Badge>
                          {a.treatment && (
                            <Badge variant="outline" className="text-xs text-indigo-600">
                              {a.treatment.label}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {new Date(a.startsAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })} at{" "}
                            {new Date(a.startsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span>• {a.type}</span>
                          {a.room && <span>• {a.room}</span>}
                        </div>
                        {a.notes && <p className="text-xs text-muted-foreground italic mt-1">{a.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => openConsultation(a)}
                          className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                        >
                          <Stethoscope className="h-3.5 w-3.5 mr-1" />
                          Consultation
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PATIENTS (Active Treatments & Search) */}
        {activeTab === "patients" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
              <div>
                <h2 className="text-base font-semibold">Active Treatment Patients</h2>
                <p className="text-xs text-muted-foreground">IVF & fertility cycles under active care</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search patient, partner, stage..."
                  value={patientsSearch}
                  onChange={(e) => setPatientsSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            {filteredPatients.length === 0 ? (
              <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm">
                No active treatment patients matching search.
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredPatients.map((t: any) => (
                  <Card key={t.id} className="border hover:border-teal-500/30 transition-colors">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{t.patientName}</span>
                          {t.partnerName && (
                            <span className="text-xs text-muted-foreground">& {t.partnerName}</span>
                          )}
                          <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30">
                            {t.kind} Cycle #{t.cycleNumber}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded">
                            Stage: {t.stageName || `Stage ${t.stageIndex}`}
                          </span>
                          <span className="text-muted-foreground">• {t.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.coupleId && (
                          <Link href={`/patients/${t.coupleId}`}>
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                              Patient 360 <ChevronRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MESSAGES (Clinical & Escalations) */}
        {activeTab === "messages" && (
          <div className="space-y-4">
            <div className="pb-2 border-b">
              <h2 className="text-base font-semibold">Clinical Messages & Handoffs</h2>
              <p className="text-xs text-muted-foreground">Priority patient questions and staff handoffs (filtered for doctor focus)</p>
            </div>

            {messages.length === 0 ? (
              <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm">
                No active clinical conversations requiring doctor attention.
              </div>
            ) : (
              <div className="grid gap-3">
                {messages.map((m: any) => (
                  <Card key={m.id} className="border">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{m.patientName}</span>
                          <Badge variant={m.priority === "URGENT" || m.priority === "HIGH" ? "destructive" : "secondary"} className="text-xs">
                            {m.priority}
                          </Badge>
                          {m.handoffAt && (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30">
                              Staff Handoff
                            </Badge>
                          )}
                        </div>
                        {m.handoffReason && (
                          <p className="text-xs text-foreground/80 font-medium">Reason: {m.handoffReason}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Phone: {m.contactPhone || "—"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href="/whatsapp/inbox">
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                            <MessageCircle className="h-3.5 w-3.5" />
                            Open Conversation
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MORE (Reports & Care Loop Exceptions) */}
        {activeTab === "more" && (
          <div className="space-y-6">
            {/* Reports to Review */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-teal-600" /> Reports Requiring Doctor Review
                  </h2>
                  <p className="text-xs text-muted-foreground">Clinical sign-off on lab and diagnostic results</p>
                </div>
                <Link href="/clinical-diagnostics">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Full Diagnostics <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>

              {reportsQueue.length === 0 ? (
                <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground text-sm">
                  No diagnostic reports currently pending review.
                </div>
              ) : (
                <div className="grid gap-3">
                  {reportsQueue.map((rep: any) => (
                    <Card key={rep.id} className="border">
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{rep.patientName}</span>
                            <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-700 dark:text-amber-300">
                              {rep.priority}
                            </Badge>
                          </div>
                          <p className="text-xs font-medium text-foreground">{rep.title}</p>
                          {rep.description && <p className="text-xs text-muted-foreground line-clamp-1">{rep.description}</p>}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => openReportReview(rep)}
                          className="h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white"
                        >
                          Review & Sign Off
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Care Loop Exceptions */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" /> Care Loop Exceptions
                  </h2>
                  <p className="text-xs text-muted-foreground">Exceptions requiring doctor intervention (routine reminders excluded)</p>
                </div>
                <Link href="/care-loop">
                  <Button variant="ghost" size="sm" className="text-xs">
                    Care Loop Engine <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>

              {exceptions.length === 0 ? (
                <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground text-sm">
                  No Care Loop exceptions active. All workflows running smoothly.
                </div>
              ) : (
                <div className="grid gap-2.5">
                  {exceptions.map((exc: any) => (
                    <div key={exc.id} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{exc.patientName}</span>
                          <Badge variant="outline" className="text-xs text-rose-600 border-rose-500/30">
                            {exc.status}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">{exc.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{exc.title}</p>
                      </div>
                      {exc.coupleId && (
                        <Link href={`/patients/${exc.coupleId}`}>
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            View
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link href="/discharge" className="block">
                <Button variant="outline" className="w-full justify-start text-xs h-10 gap-2">
                  <FileText className="h-4 w-4 text-teal-600" />
                  Smart Discharge
                </Button>
              </Link>
              <Link href="/clinical-diagnostics" className="block">
                <Button variant="outline" className="w-full justify-start text-xs h-10 gap-2">
                  <Activity className="h-4 w-4 text-teal-600" />
                  Diagnostics Order
                </Button>
              </Link>
              <Link href="/ivf-cycles" className="block">
                <Button variant="outline" className="w-full justify-start text-xs h-10 gap-2">
                  <Sparkles className="h-4 w-4 text-teal-600" />
                  IVF Journey Board
                </Button>
              </Link>
              <Link href="/care-plans" className="block">
                <Button variant="outline" className="w-full justify-start text-xs h-10 gap-2">
                  <Heart className="h-4 w-4 text-teal-600" />
                  Treatment Plans
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM NAVIGATION (Fixed 5-tab bar) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border flex items-center justify-around py-2 px-1 shadow-lg">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
            activeTab === "home" ? "text-teal-600 dark:text-teal-400 font-bold" : "text-muted-foreground"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={() => setActiveTab("schedule")}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
            activeTab === "schedule" ? "text-teal-600 dark:text-teal-400 font-bold" : "text-muted-foreground"
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-[10px]">Schedule</span>
        </button>

        <button
          onClick={() => setActiveTab("patients")}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
            activeTab === "patients" ? "text-teal-600 dark:text-teal-400 font-bold" : "text-muted-foreground"
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[10px]">Patients</span>
        </button>

        <button
          onClick={() => setActiveTab("messages")}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
            activeTab === "messages" ? "text-teal-600 dark:text-teal-400 font-bold" : "text-muted-foreground"
          }`}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-[10px]">Messages</span>
        </button>

        <button
          onClick={() => setActiveTab("more")}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
            activeTab === "more" ? "text-teal-600 dark:text-teal-400 font-bold" : "text-muted-foreground"
          }`}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px]">More</span>
        </button>
      </div>

      {/* CONSULTATION MODAL / DRAWER */}
      <Dialog open={consultationModalOpen} onOpenChange={setConsultationModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-teal-600" />
              Clinical Consultation Note
            </DialogTitle>
            <DialogDescription>
              {selectedAppt?.patientName} • {selectedAppt?.type} (Doctor remains clinical authority)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Reason for Visit / Chief Complaint</Label>
              <Input
                value={reasonForVisit}
                onChange={(e) => setReasonForVisit(e.target.value)}
                placeholder="e.g. IVF Stimulation Day 6 Follicular Scan & Review"
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Clinical Impression / Findings</Label>
              <Input
                value={impression}
                onChange={(e) => setImpression(e.target.value)}
                placeholder="e.g. Bilateral follicular development adequate. Lead follicle 16mm."
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold">Clinical Summary & Assessment *</Label>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Mic className="h-3 w-3 text-teal-600" /> Voice assistance ready
                </span>
              </div>
              <Textarea
                rows={4}
                value={clinicalSummary}
                onChange={(e) => setClinicalSummary(e.target.value)}
                placeholder="Detailed consultation notes, patient exam, clinical discussion..."
                className="text-xs leading-relaxed"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Plan, Prescriptions & Next Steps</Label>
              <Textarea
                rows={2}
                value={nextSteps}
                onChange={(e) => setNextSteps(e.target.value)}
                placeholder="e.g. Continue Menopur 150 IU. Add Cetrotide 0.25mg daily. Review scan in 48h."
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConsultationModalOpen(false)}
              disabled={submittingConsult}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCompleteConsultation}
              disabled={submittingConsult}
              className="text-xs bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {submittingConsult ? "Saving..." : "Sign & Complete Consultation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REPORT REVIEW MODAL */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-teal-600" />
              Doctor Diagnostic Review
            </DialogTitle>
            <DialogDescription>
              {selectedReport?.patientName} • {selectedReport?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">Diagnostic Details:</p>
              <p className="text-muted-foreground">{selectedReport?.description || "Diagnostic result awaiting doctor verification."}</p>
            </div>

            <div>
              <Label className="text-xs font-semibold">Clinical Action</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={reportAction === "APPROVED" ? "default" : "outline"}
                  onClick={() => setReportAction("APPROVED")}
                  className={`text-xs h-8 ${reportAction === "APPROVED" ? "bg-teal-600 text-white" : ""}`}
                >
                  Approve Result
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={reportAction === "ACKNOWLEDGED" ? "default" : "outline"}
                  onClick={() => setReportAction("ACKNOWLEDGED")}
                  className="text-xs h-8"
                >
                  Acknowledge
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={reportAction === "REPEAT_TEST" ? "default" : "outline"}
                  onClick={() => setReportAction("REPEAT_TEST")}
                  className="text-xs h-8"
                >
                  Repeat Test
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Doctor Clinical Note (Optional)</Label>
              <Textarea
                rows={3}
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder="Clinical observations, dosage adjustments, or instructions for care team..."
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReportModalOpen(false)}
              disabled={submittingReport}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSignOffReport}
              disabled={submittingReport}
              className="text-xs bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {submittingReport ? "Signing..." : "Sign Off Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
