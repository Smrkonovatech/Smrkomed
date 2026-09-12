"use client";

import { notFound, useParams, useRouter } from "next/navigation";
import { useAppState } from "@/lib/app-state";
import { findCouple, type Couple } from "@/lib/demo-data";
import { EmptyState } from "@/components/ui-kit";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

import { PatientHeader } from "./components/patient-header";
import { PatientProfileCards } from "./components/patient-profile-cards";
import { IvfCycleWidget } from "./components/ivf-cycle-widget";
import { FertilityEstimateWidget } from "./components/fertility-estimate-widget";
import { AbdmStatusWidget, UpcomingSessionWidget, UpcomingTasksWidget } from "./components/row2-widgets";
import { LastSessionSummaryWidget, ConsultationHistoryWidget, MedicationsWidget } from "./components/row3-widgets";
import { ViewConversationWidget, RecentActivitiesWidget } from "./components/row4-widgets";
import { conversationFor } from "@/components/whatsapp-thread";

export default function PatientProfile() {
    const { slug } = useParams<{ slug: string }>();
    const appState = useAppState() as ReturnType<typeof useAppState> & {
        couples?: Couple[];
    };

    if (appState.loadState === "loading") {
        return <p className="p-6 text-sm text-muted-foreground">Loading patient...</p>;
    }
    if (appState.loadState === "error") {
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

    const couples = appState.couples ?? [];
    const couple = findCouple(slug, couples);
    if (!couple) notFound();

    const coupleTasks = appState.tasks.filter((task) => task.coupleId === couple.id);
    const coupleAppointments = appState.appointments.filter(
        (appointment) => appointment.coupleId === couple.id,
    );
    const people = [couple.primary.name, couple.partner?.name].filter(Boolean) as string[];
    const recentActivity = appState.activity.filter((item) => people.includes(item.patient));
    const messages = conversationFor(couple.id);

    return (
        <div className="space-y-6 pb-24">
            <PatientHeader couple={couple} />

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-5 auto-rows-[minmax(250px,auto)]">
                {/* Row 1 */}
                <div className="xl:col-span-4">
                    <PatientProfileCards couple={couple} />
                </div>
                <div className="xl:col-span-5">
                    <IvfCycleWidget couple={couple} />
                </div>
                <div className="xl:col-span-3">
                    <FertilityEstimateWidget />
                </div>

                {/* Row 2 */}
                <div className="xl:col-span-4">
                    <AbdmStatusWidget couple={couple} />
                </div>
                <div className="xl:col-span-4">
                    <UpcomingSessionWidget appointments={coupleAppointments} />
                </div>
                <div className="xl:col-span-4">
                    <UpcomingTasksWidget tasks={coupleTasks} />
                </div>

                {/* Row 3 */}
                <div className="xl:col-span-4">
                    <LastSessionSummaryWidget activity={recentActivity} />
                </div>
                <div className="xl:col-span-4">
                    <ConsultationHistoryWidget appointments={coupleAppointments} />
                </div>
                <div className="xl:col-span-4">
                    <MedicationsWidget coupleId={couple.id} />
                </div>

                {/* Row 4 */}
                <div className="xl:col-span-8 lg:col-span-2">
                    <ViewConversationWidget messages={messages} />
                </div>
                <div className="xl:col-span-4">
                    <RecentActivitiesWidget activity={recentActivity} />
                </div>
            </div>
        </div>
    );
}
