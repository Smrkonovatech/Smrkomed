"use client";

import Link from "next/link";
import { Filter, Search, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { useGlobalActions } from "@/components/actions/global-action-provider";
import { EmptyState, PageHeader, StatusBadge, Avatar } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/lib/app-state";
import { coupleLabel, type Couple, type Treatment } from "@/lib/demo-data";
import { patientStatusTone } from "@/lib/status";
import { cn } from "@/lib/utils";

const filters = [
  "All",
  "IVF",
  "IUI",
  "Evaluation",
  "FET",
  "Needs Attention",
  "On Track",
  "Paused",
] as const;

export default function PatientsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const { openAction } = useGlobalActions();
  const { couples, loadState, loadError, reload } = useAppState();

  const rows = useMemo(
    () =>
      couples.filter((c) => {
        const query = q.trim().toLowerCase();
        const matchQ =
          !query ||
          [
            c.primary.name,
            c.partner?.name ?? "",
            c.treatment,
            c.stage,
            c.doctor,
            c.coordinator,
            c.nextStep,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        const matchF = matchesFilter(c, filter);
        return matchQ && matchF;
      }),
    [couples, filter, q],
  );

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Patients"
        subtitle="Manage every couple’s treatment journey, care owner, and next clinical step."
        actions={
          <Button className="rounded-lg" onClick={() => openAction("add-couple")}>
            <UserPlus className="size-4" /> Add Couple
          </Button>
        }
      />

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="grid gap-3 border-b p-3 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-center">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search couples, stage, doctor, coordinator, or next step"
              className="h-9 rounded-lg pl-9 shadow-none"
              aria-label="Search patients"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="size-4 shrink-0 text-muted-foreground" />
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-accent",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loadState === "loading" ? (
          <p className="p-6 text-sm text-muted-foreground">Loading patients...</p>
        ) : loadState === "error" ? (
          <EmptyState
            title="Unable to load patients"
            description={loadError ?? "Try again."}
            icon={Users}
            action={
              <Button variant="outline" className="rounded-lg" onClick={() => void reload()}>
                Try again
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={couples.length === 0 && !q && filter === "All" ? "No patients yet" : "No matching patients"}
            description={
              couples.length === 0 && !q && filter === "All"
                ? "Create a couple to start storing clinic records in PostgreSQL."
                : "Try a different search term or clear the filters."
            }
            icon={Users}
            action={
              couples.length === 0 && !q && filter === "All" ? (
                <Button className="rounded-lg" onClick={() => openAction("add-couple")}>
                  <UserPlus className="size-4" /> Add Couple
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="rounded-lg"
                  onClick={() => {
                    setQ("");
                    setFilter("All");
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b bg-muted/35 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium">Couple</th>
                  <th className="px-3 py-2.5 font-medium">Treatment</th>
                  <th className="px-3 py-2.5 font-medium">Current stage</th>
                  <th className="px-3 py-2.5 font-medium">Doctor</th>
                  <th className="px-3 py-2.5 font-medium">Coordinator</th>
                  <th className="px-3 py-2.5 font-medium">Next step</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    className="group border-b transition-colors last:border-0 hover:bg-accent/45"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/patients/${c.slug}`}
                        className="flex min-w-0 items-center gap-2.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Avatar
                          initials={c.primary.name
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)}
                          tone="primary"
                          className="size-8"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold group-hover:text-primary">
                            {coupleLabel(c)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {c.primary.name}
                            {c.partner ? ` · ${c.partner.name}` : ""}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 font-medium">{c.treatment}</td>
                    <td className="px-3 py-2.5">{c.stage}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.doctor}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.coordinator}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{c.nextStep}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge label={c.status} tone={patientStatusTone[c.status] ?? "muted"} />
                      {c.careLoop === "Paused" && (
                        <StatusBadge label="Paused" tone="warning" className="ml-1.5" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
          Showing {rows.length} of {couples.length} couples
        </div>
      </section>
    </div>
  );
}

function matchesFilter(couple: Couple, filter: (typeof filters)[number]) {
  if (filter === "All") return true;
  if (filter === "Needs Attention" || filter === "On Track") return couple.status === filter;
  if (filter === "Paused") return couple.careLoop === "Paused";
  return couple.treatment === (filter as Treatment);
}
