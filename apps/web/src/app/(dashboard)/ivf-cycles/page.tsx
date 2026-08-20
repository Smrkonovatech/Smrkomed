"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { useGlobalActions } from "@/components/actions/global-action-provider";
import { MdTableWrap, MobileCards, RecordCard } from "@/components/responsive-data";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppState } from "@/lib/app-state";
import { coupleLabel, fertilityStages, type TreatmentCycle } from "@/lib/demo-data";
import { treatmentTone, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

const filters = [
  "All",
  "Active",
  "Monitoring",
  "Procedure",
  "Transfer",
  "Follow-up",
  "Completed",
  "Needs Attention",
] as const;

const treatments = ["All treatments", "IVF", "IUI", "FET", "Evaluation"] as const;

const statusTone: Record<string, Tone> = {
  Active: "success",
  "Needs Attention": "danger",
  Completed: "info",
};

export default function CyclesPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Active");
  const [treatment, setTreatment] = useState<(typeof treatments)[number]>("All treatments");
  const [query, setQuery] = useState("");
  const { openAction } = useGlobalActions();
  const { cycles, couples } = useAppState();
  const coupleById = useMemo(
    () => new Map(couples.map((couple) => [couple.id, couple])),
    [couples],
  );

  const list = useMemo(
    () =>
      cycles.filter((cycle) => {
        const couple = coupleById.get(cycle.coupleId);
        const normalizedQuery = query.trim().toLowerCase();
        const matchesQuery =
          !normalizedQuery ||
          [
            cycle.cycleLabel,
            cycle.treatment,
            cycle.stage,
            cycle.doctor,
            cycle.nextStep,
            couple ? coupleLabel(couple) : "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesTreatment = treatment === "All treatments" || cycle.treatment === treatment;
        return matchesQuery && matchesTreatment && matchesCycleFilter(cycle, filter);
      }),
    [coupleById, cycles, filter, query, treatment],
  );

  const activeCount = cycles.filter((cycle) => cycle.status === "Active").length;
  const attentionCount = cycles.filter((cycle) => cycle.status === "Needs Attention").length;

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="IVF Cycles"
        subtitle="Track treatment progress, cycle timing, and the next clinical milestone."
        actions={
          <Button className="rounded-lg" onClick={() => openAction("start-cycle")}>
            <Plus className="size-4" /> Start Cycle
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b bg-muted/20 px-4 py-2 text-xs">
          <span>
            <strong className="text-sm text-foreground">{activeCount}</strong>{" "}
            <span className="text-muted-foreground">active</span>
          </span>
          <span>
            <strong className="text-sm text-danger">{attentionCount}</strong>{" "}
            <span className="text-muted-foreground">need attention</span>
          </span>
          <span className="text-muted-foreground">{cycles.length} total cycles</span>
        </div>

        <div className="grid gap-3 border-b p-3 xl:grid-cols-[minmax(260px,1fr)_auto_180px] xl:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search couple, cycle, stage, doctor, or milestone"
              className="h-9 rounded-lg pl-9 shadow-none"
              aria-label="Search cycles"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {filters.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  filter === item
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-accent",
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <Select
            value={treatment}
            onValueChange={(value) => setTreatment(value as (typeof treatments)[number])}
          >
            <SelectTrigger className="h-9 rounded-lg shadow-none" aria-label="Filter by treatment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {treatments.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {list.length === 0 ? (
          <EmptyState
            title="No matching cycles"
            description="Adjust the status, treatment, or search filters."
            action={
              <Button
                variant="outline"
                className="rounded-lg"
                onClick={() => {
                  setFilter("All");
                  setTreatment("All treatments");
                  setQuery("");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
          <MobileCards>
            {list.map((cycle) => {
              const couple = coupleById.get(cycle.coupleId);
              return (
                <RecordCard key={cycle.id}>
                  <p className="font-semibold">
                    {couple ? coupleLabel(couple) : "Unknown couple"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cycle.cycleLabel} · {cycle.treatment}
                  </p>
                  <p className="mt-2 text-sm">{cycle.stage}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {cycle.doctor} · Next: {cycle.nextStep}
                  </p>
                  <div className="mt-2">
                    <StatusBadge label={cycle.status} tone={statusTone[cycle.status] ?? "muted"} />
                  </div>
                  {couple && (
                    <Button asChild size="sm" className="mt-3 w-full">
                      <Link href={`/patients/${couple.slug}`}>Open</Link>
                    </Button>
                  )}
                </RecordCard>
              );
            })}
          </MobileCards>
          <MdTableWrap>
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b bg-muted/35 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium">Couple</th>
                  <th className="px-3 py-2.5 font-medium">Cycle ID</th>
                  <th className="px-3 py-2.5 font-medium">Treatment</th>
                  <th className="px-3 py-2.5 font-medium">Current stage</th>
                  <th className="px-3 py-2.5 font-medium">Cycle day</th>
                  <th className="px-3 py-2.5 font-medium">Doctor</th>
                  <th className="px-3 py-2.5 font-medium">Next milestone</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((cycle) => {
                  const couple = coupleById.get(cycle.coupleId);
                  return (
                    <tr
                      key={cycle.id}
                      className="group border-b transition-colors last:border-0 hover:bg-accent/45"
                    >
                      <td className="px-4 py-2.5">
                        {couple ? (
                          <Link
                            href={`/patients/${couple.slug}`}
                            className="font-semibold group-hover:text-primary hover:underline"
                          >
                            {coupleLabel(couple)}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Unknown couple</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="block font-medium">{cycle.cycleLabel}</span>
                        <span className="text-xs text-muted-foreground">
                          Started {cycle.started}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          label={cycle.treatment}
                          tone={treatmentTone[cycle.treatment] ?? "muted"}
                          dot={false}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-medium">{cycle.stage}</span>
                        <CycleProgress stageIndex={cycle.stageIndex} />
                      </td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {cycle.status === "Completed" ? "—" : `Day ${cycleDay(cycle)}`}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{cycle.doctor}</td>
                      <td className="px-3 py-2.5">
                        <span className="block font-medium">{cycle.nextStep}</span>
                        <span className="text-xs text-muted-foreground">{cycle.nextDate}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          label={cycle.status}
                          tone={statusTone[cycle.status] ?? "muted"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </MdTableWrap>
          </>
        )}
        <div className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
          Showing {list.length} of {cycles.length} cycles
        </div>
      </section>
    </div>
  );
}

function matchesCycleFilter(cycle: TreatmentCycle, filter: (typeof filters)[number]) {
  if (filter === "All") return true;
  if (filter === "Active" || filter === "Completed" || filter === "Needs Attention") {
    return cycle.status === filter;
  }
  return cycle.stage.toLowerCase().includes(filter.toLowerCase());
}

function cycleDay(cycle: TreatmentCycle) {
  const idNumber = Number(cycle.id.replace(/\D/g, "")) || 1;
  return cycle.stageIndex * 3 + ((idNumber * 2) % 5) + 2;
}

function CycleProgress({ stageIndex }: { stageIndex: number }) {
  return (
    <div
      className="mt-1.5 flex w-28 gap-0.5"
      aria-label={`Stage ${stageIndex + 1} of ${fertilityStages.length}`}
    >
      {fertilityStages.map((stage, index) => (
        <span
          key={stage}
          className={cn("h-1 flex-1 rounded-full", index <= stageIndex ? "bg-primary" : "bg-muted")}
        />
      ))}
    </div>
  );
}
