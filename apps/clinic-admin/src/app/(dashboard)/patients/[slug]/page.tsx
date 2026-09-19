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
import { LastSessionSummaryWidget, MedicationsWidget } from "./components/row3-widgets";
import { ViewConversationWidget, RecentActivitiesWidget } from "./components/row4-widgets";
import { CareCalendarWidget } from "./components/care-calendar/care-calendar";

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

    const targetId = matchedCouple?.id || slug;

    const reload360 = () => {
        if (!targetId) return;
        clinicApi
            .patient360(targetId)
            .then(setP360)
            .catch((err) => console.error("Failed to reload patient 360 profile:", err));
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
        const isPrimaryConnected =
            p360?.primaryPatient?.abdmConnected === true ||
            p360?.header?.abhaStatus === "LINKED" ||
            p360?.header?.abhaStatus === "VERIFIED" ||
            matchedCouple?.primary?.abdmConnected === true;

        const isPartnerConnected =
            p360?.partnerPatient?.abdmConnected === true ||
            p360?.header?.partnerAbhaStatus === "LINKED" ||
            p360?.header?.partnerAbhaStatus === "VERIFIED" ||
            matchedCouple?.partner?.abdmConnected === true;

        if (matchedCouple) {
            return {
                ...matchedCouple,
                primary: {
                    ...matchedCouple.primary,
                    abdmConnected: isPrimaryConnected,
                    abhaNumber:
                        p360?.primaryPatient?.abhaNumber ||
                        p360?.digitalHealth?.identity?.abhaMasked ||
                        p360?.header?.abhaMasked ||
                        matchedCouple.primary?.abhaNumber,
                    abhaAddress:
                        p360?.primaryPatient?.abhaAddress ||
                        p360?.digitalHealth?.identity?.abhaAddress ||
                        matchedCouple.primary?.abhaAddress,
                },
                partner: matchedCouple.partner
                    ? {
                          ...matchedCouple.partner,
                          abdmConnected: isPartnerConnected,
                          abhaNumber:
                              p360?.partnerPatient?.abhaNumber ||
                              matchedCouple.partner?.abhaNumber,
                          abhaAddress:
                              p360?.partnerPatient?.abhaAddress ||
                              matchedCouple.partner?.abhaAddress,
                      }
                    : undefined,
            };
        }
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
                    abdmConnected: isPrimaryConnected,
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
                              abdmConnected: isPartnerConnected,
                              preferredLanguage: partnerPatient.preferredLanguage || "English",
                          },
                      }
                    : {}),
                treatment: p360.header?.currentTreatment?.kind || "IVF",
                cycleLabel: p360.header?.currentTreatment?.label || "IVF / ICSI Treatment",
                stage: p360.header?.currentCarePlan?.stageName || p360.header?.currentTreatment?.stageName || "07. Ovarian Stimulation",
                stageIndex: p360.header?.currentCarePlan?.stageIndex ?? p360.header?.currentTreatment?.stageIndex ?? 7,
                cycle: "Active",
                doctor: p360.header?.assignedDoctor || "Doctor",
                coordinator: p360.header?.assignedCoordinator || "Coordinator",
                careLoop: (cp.careLoopActive ? "Active" : "Paused") as "Active" | "Paused",
                nextStep: "07. Ovarian Stimulation",
                status: "On Track" as const,
                tags: ["IVF"],
                since: p360.header?.currentCarePlan?.startDate ? "1 Sept 2026" : "Recently",
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
            <PatientHeader couple={effectiveCouple} p360={p360} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Row 1 */}
                <div className="lg:col-span-4">
                    <PatientProfileCards
                        couple={effectiveCouple}
                        p360={p360}
                        onPatientUpdated={reload360}
                    />
                </div>
                <div className="lg:col-span-5">
                    <IvfCycleWidget couple={effectiveCouple} p360={p360} />
                </div>
                <div className="lg:col-span-3">
                    <FertilityEstimateWidget />
                </div>

                {/* Row 2 - Care Calendar */}
                <div className="lg:col-span-12">
                    <CareCalendarWidget couple={effectiveCouple} p360={p360} />
                </div>

                {/* Row 3 */}
                <div className="lg:col-span-7 xl:col-span-8">
                    <MedicationsWidget
                        coupleId={effectiveCouple.id}
                        couple={effectiveCouple}
                        p360={p360}
                        onMedicationAdded={reload360}
                    />
                </div>
                <div className="lg:col-span-5 xl:col-span-4">
                    <LastSessionSummaryWidget p360={p360} />
                </div>

                {/* Row 4 */}
                <div className="lg:col-span-5 xl:col-span-5">
                    <RecentActivitiesWidget p360={p360} />
                </div>
                <div className="lg:col-span-7 xl:col-span-7">
                    <ViewConversationWidget messages={messages} />
                </div>
            </div>
        </div>
    );
}
