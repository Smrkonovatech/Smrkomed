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
            <PatientHeader couple={effectiveCouple} p360={p360} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Row 1 */}
                <div className="lg:col-span-4">
                    <PatientProfileCards couple={effectiveCouple} p360={p360} />
                </div>
                <div className="lg:col-span-5">
                    <IvfCycleWidget couple={effectiveCouple} p360={p360} />
                </div>
                <div className="lg:col-span-3">
                    <FertilityEstimateWidget />
                </div>

                {/* Row 2 - Care Calendar */}
                <div className="lg:col-span-12">
                    <CareCalendarWidget couple={effectiveCouple} />
                </div>

                {/* Row 3 */}
                <div className="lg:col-span-7 xl:col-span-8">
                    <MedicationsWidget coupleId={effectiveCouple.id} p360={p360} />
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
