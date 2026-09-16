"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Users } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { findCouple, type Couple } from "@/lib/demo-data";
import { EmptyState } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { clinicApi } from "@/lib/clinic-api";
import { conversationFor } from "@/components/whatsapp-thread";

import { PatientHeader } from "./components/patient-header";
import { PatientProfileCards } from "./components/patient-profile-cards";
import { IvfCycleWidget } from "./components/ivf-cycle-widget";
import { FertilityEstimateWidget } from "./components/fertility-estimate-widget";
import { AbdmStatusWidget, UpcomingSessionWidget, UpcomingTasksWidget } from "./components/row2-widgets";
import { LastSessionSummaryWidget, ConsultationHistoryWidget, MedicationsWidget } from "./components/row3-widgets";
import { ViewConversationWidget, RecentActivitiesWidget } from "./components/row4-widgets";
import { CareCalendarWidget } from "./components/care-calendar/care-calendar";
import { PatientDiagnosticsWidget } from "./components/diagnostics-widget";
import { IvfJourneyModal } from "./components/ivf-journey-modal";
import { AddCareTaskModal } from "./components/care-calendar/add-care-task-modal";

export default function PatientProfile() {
    const params = useParams<{ slug: string }>();
    const rawSlug = params ? params["slug"] : undefined;
    const slug = typeof rawSlug === "string" ? rawSlug : Array.isArray(rawSlug) ? (rawSlug[0] ?? "") : "";

    const appState = useAppState() as ReturnType<typeof useAppState> & {
        couples?: Couple[];
    };

    const couples = appState.couples ?? [];
    const matchedCouple = useMemo(() => {
        if (!slug) return null;
        return (
            findCouple(slug, couples) ??
            couples.find(
                (c) =>
                    c.id === slug ||
                    c.slug === slug ||
                    c.primary?.id === slug ||
                    decodeURIComponent(slug) === c.slug
            ) ??
            null
        );
    }, [slug, couples]);

    const [p360, setP360] = useState<any>(null);
    const [loading360, setLoading360] = useState(true);
    const [journeyModalOpen, setJourneyModalOpen] = useState(false);
    const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);

    const targetId = matchedCouple?.id || slug;

    const reload360 = () => {
        if (!targetId) return;
        clinicApi
            .patient360(targetId)
            .then((data) => setP360(data))
            .catch(console.error);
        if (appState.reload) {
            void appState.reload();
        }
    };

    useEffect(() => {
        let isMounted = true;
        if (!targetId) {
            setLoading360(false);
            return;
        }

        setLoading360(true);
        clinicApi
            .patient360(targetId)
            .then((data) => {
                if (isMounted) setP360(data);
            })
            .catch((err) => {
                console.error("Failed to load patient 360 profile:", err);
            })
            .finally(() => {
                if (isMounted) setLoading360(false);
            });

        return () => {
            isMounted = false;
        };
    }, [targetId]);

    const effectiveCouple = useMemo(() => {
        if (matchedCouple) return matchedCouple;
        if (p360?.couple) {
            const cp = p360.couple;
            const primaryPatient = p360.primaryPatient;
            const partnerPatient = p360.partnerPatient;
            return {
                id: cp.id,
                slug: cp.slug || slug,
                primary: {
                    id: primaryPatient?.id || "",
                    name:
                        p360.header?.patientName ||
                        `${primaryPatient?.firstName || ""} ${primaryPatient?.lastName || ""}`.trim() ||
                        "Patient",
                    firstName: primaryPatient?.firstName || "Patient",
                    lastName: primaryPatient?.lastName || "",
                    age: p360.header?.age || 30,
                    phone: p360.header?.contact || primaryPatient?.phone || "",
                    email: primaryPatient?.email || "",
                    status: "Active",
                    abdmConnected: primaryPatient?.abdmConnected ?? false,
                    preferredLanguage: primaryPatient?.preferredLanguage || "English",
                },
                ...(partnerPatient
                    ? {
                          partner: {
                              id: partnerPatient.id,
                              name:
                                  p360.header?.partnerName ||
                                  `${partnerPatient.firstName || ""} ${partnerPatient.lastName || ""}`.trim() ||
                                  "Partner",
                              firstName: partnerPatient.firstName || "Partner",
                              lastName: partnerPatient.lastName || "",
                              age: 32,
                              phone: partnerPatient.phone || "",
                              email: partnerPatient.email || "",
                              status: "Active",
                              abdmConnected: partnerPatient.abdmConnected ?? false,
                              preferredLanguage: partnerPatient.preferredLanguage || "English",
                          },
                      }
                    : {}),
                treatment: p360.header?.currentTreatment?.kind || "IVF",
                cycleLabel: p360.header?.currentTreatment?.label || "Cycle 1",
                stage: p360.header?.currentCarePlan?.stageName || "Consultation",
                stageIndex: 0,
                cycle: "Active",
                doctor: p360.header?.assignedDoctor || "Doctor",
                coordinator: p360.header?.assignedCoordinator || "Coordinator",
                careLoop: (cp.careLoopActive ? "Active" : "Paused") as "Active" | "Paused",
                nextStep: "Follow-up",
                status: "On Track" as const,
                tags: ["IVF"],
                since: "Recently",
            };
        }
        return null;
    }, [matchedCouple, p360, slug]);

    if (appState.loadState === "loading" || (loading360 && !effectiveCouple)) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
                <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-3 text-sm text-muted-foreground">Loading patient profile...</p>
            </div>
        );
    }

    if (appState.loadState === "error" && !effectiveCouple) {
        return (
            <EmptyState
                title="Unable to load patient"
                description={appState.loadError ?? "Try again."}
                icon={Users}
                action={
                    <Button variant="outline" onClick={() => void appState.reload()}>
                        Try again
                    </Button>
                }
            />
        );
    }

    if (!effectiveCouple) {
        return (
            <EmptyState
                title="Patient not found"
                description={`Could not find a patient record matching "${slug}".`}
                icon={Users}
                action={
                    <Link href="/patients">
                        <Button variant="outline">Back to Patients</Button>
                    </Link>
                }
            />
        );
    }

    const messages = effectiveCouple.id ? conversationFor(effectiveCouple.id) : [];

    return (
        <div className="space-y-6 pb-24">
            <PatientHeader
                couple={effectiveCouple}
                p360={p360}
                onTeamUpdated={reload360}
                onOpenTreatmentJourney={() => setJourneyModalOpen(true)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-5 auto-rows-[minmax(250px,auto)]">
                {/* Row 1 */}
                <div className="xl:col-span-4">
                    <PatientProfileCards
                        couple={effectiveCouple}
                        p360={p360}
                        onPatientUpdated={reload360}
                    />
                </div>
                <div className="xl:col-span-5">
                    <IvfCycleWidget couple={effectiveCouple} p360={p360} />
                </div>
                <div className="xl:col-span-3">
                    <FertilityEstimateWidget couple={effectiveCouple} p360={p360} />
                </div>

                {/* Row 1.5 - Care Calendar */}
                <div className="xl:col-span-12">
                    <CareCalendarWidget couple={effectiveCouple} />
                </div>

                {/* Row 2 */}
                <div className="xl:col-span-4">
                    <AbdmStatusWidget
                        couple={effectiveCouple}
                        p360={p360}
                        onRefresh={reload360}
                    />
                </div>
                <div className="xl:col-span-4">
                    <UpcomingSessionWidget
                        p360={p360}
                        couple={effectiveCouple}
                        onSessionUpdated={reload360}
                    />
                </div>
                <div className="xl:col-span-4">
                    <UpcomingTasksWidget
                        p360={p360}
                        couple={effectiveCouple}
                        onAddTask={() => setAddTaskModalOpen(true)}
                    />
                </div>

                {/* Row 3 */}
                <div className="xl:col-span-4">
                    <LastSessionSummaryWidget
                        p360={p360}
                        couple={effectiveCouple}
                        onConsultationSaved={reload360}
                    />
                </div>
                <div className="xl:col-span-4">
                    <ConsultationHistoryWidget
                        p360={p360}
                        couple={effectiveCouple}
                        onConsultationSaved={reload360}
                    />
                </div>
                <div className="xl:col-span-4">
                    <MedicationsWidget
                        coupleId={effectiveCouple.id}
                        p360={p360}
                        onMedicationAdded={reload360}
                    />
                </div>

                {/* Diagnostics Row */}
                <div className="xl:col-span-12">
                    <PatientDiagnosticsWidget
                        patientId={p360?.primaryPatient?.id ?? (effectiveCouple as any).primary?.id}
                        coupleId={effectiveCouple.id}
                    />
                </div>

                {/* Row 4 */}
                <div className="xl:col-span-8 lg:col-span-2">
                    <ViewConversationWidget
                        messages={messages}
                        patientName={p360?.header?.patientName || effectiveCouple?.primary?.name}
                    />
                </div>
                <div className="xl:col-span-4">
                    <RecentActivitiesWidget p360={p360} />
                </div>
            </div>

            <IvfJourneyModal
                isOpen={journeyModalOpen}
                setIsOpen={setJourneyModalOpen}
                currentStage={p360?.header?.currentCarePlan?.stageName || effectiveCouple?.stage}
                couple={effectiveCouple}
                p360={p360}
            />

            <AddCareTaskModal
                isOpen={addTaskModalOpen}
                onClose={() => setAddTaskModalOpen(false)}
                couple={effectiveCouple}
                defaultDate={new Date()}
                onSaved={reload360}
            />
        </div>
    );
}
