"use client";

import { Filter, Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { useGlobalActions } from "@/components/actions/global-action-provider";
import { PageVisualBanner } from "@/components/page-visual-banner";
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
import { leads as demoLeads } from "@/lib/demo-data";
import { treatmentTone } from "@/lib/status";

const stages = [
  "New enquiry",
  "Contacted",
  "Consultation",
  "Treatment discussion",
  "Treatment started",
] as const;

const stageMap: Record<string, string> = {
  "New Lead": "New enquiry",
  "New Enquiry": "New enquiry",
  Contacted: "Contacted",
  "Consultation Booked": "Consultation",
  "Consultation Completed": "Consultation",
  "Treatment Discussion": "Treatment discussion",
  "Treatment Started": "Treatment started",
  "Active Patient": "Treatment started",
};

interface OperationalEnquiry {
  id: string;
  name: string;
  source: string;
  treatment: string;
  owner: string;
  nextAction: string;
  stage: string;
}

export default function EnquiriesPage() {
  const { openAction } = useGlobalActions();
  const appState = useAppState();
  const enquiries = useMemo<OperationalEnquiry[]>(
    () =>
      appState.enquiries?.length
        ? appState.enquiries.map((enquiry) => ({
            id: enquiry.id,
            name: enquiry.partner ? `${enquiry.name} & ${enquiry.partner}` : enquiry.name,
            source: enquiry.source,
            treatment: enquiry.treatment,
            owner: enquiry.counselor,
            nextAction: enquiry.followUp,
            stage: enquiry.stage,
          }))
        : demoLeads.map((enquiry) => ({
            id: enquiry.id,
            name: enquiry.name,
            source: enquiry.source,
            treatment: enquiry.interest,
            owner: enquiry.counselor,
            nextAction: enquiry.nextAction,
            stage: enquiry.stage,
          })),
    [appState.enquiries],
  );
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("All");
  const [source, setSource] = useState("All");
  const sources = useMemo(
    () => Array.from(new Set(enquiries.map((enquiry) => enquiry.source))).sort(),
    [enquiries],
  );
  const rows = useMemo(
    () =>
      enquiries.filter((enquiry) => {
        const normalizedStage = stageMap[enquiry.stage] ?? enquiry.stage;
        const haystack = [
          enquiry.name,
          enquiry.source,
          enquiry.treatment,
          enquiry.owner,
          enquiry.nextAction,
          normalizedStage,
        ]
          .join(" ")
          .toLowerCase();
        return (
          haystack.includes(query.trim().toLowerCase()) &&
          (stage === "All" || normalizedStage === stage) &&
          (source === "All" || enquiry.source === source)
        );
      }),
    [enquiries, query, source, stage],
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <PageHeader
        title="Enquiries"
        subtitle="Manage the fertility pipeline from first contact to treatment start."
        actions={
          <Button className="rounded-lg" onClick={() => openAction("add-enquiry")}>
            <Plus className="size-4" /> Add Enquiry
          </Button>
        }
      />

      <PageVisualBanner
        src="/images/consultation-banner.png"
        alt="Couple speaking with a fertility doctor in a calm consultation room"
        eyebrow="From first conversation to active care"
        title="Turn interest into a supported fertility journey."
        description="Keep every enquiry, consultation, owner, and next action clear—without turning SmrkoMed into a generic CRM."
      />

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="grid gap-3 border-b p-3 lg:grid-cols-[minmax(280px,1fr)_180px_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search enquiry, treatment, owner, or next action"
              className="rounded-lg pl-9 shadow-none"
            />
          </div>
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All stages</SelectItem>
              {stages.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All sources</SelectItem>
              {sources.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 divide-x border-b bg-muted/20 sm:grid-cols-5">
          {stages.map((item) => (
            <button
              key={item}
              onClick={() => setStage(stage === item ? "All" : item)}
              className="px-3 py-2 text-left hover:bg-muted/50"
            >
              <span className="block text-[11px] font-medium text-muted-foreground">{item}</span>
              <span className="num-display text-lg">
                {enquiries.filter((enquiry) => (stageMap[enquiry.stage] ?? enquiry.stage) === item)
                  .length}
              </span>
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No matching enquiries"
            description="Adjust the search or filters to see more pipeline records."
            icon={Users}
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setStage("All");
                  setSource("All");
                }}
              >
                <Filter className="size-4" /> Clear filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead className="bg-muted/35 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                <tr className="border-b">
                  {["Enquiry", "Source", "Treatment", "Owner", "Next action", "Status"].map(
                    (heading) => (
                      <th key={heading} className="px-3 py-2.5 font-medium first:pl-4">
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((enquiry) => {
                  const normalizedStage = stageMap[enquiry.stage] ?? enquiry.stage;
                  return (
                    <tr key={enquiry.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-semibold">{enquiry.name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{enquiry.source}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          label={enquiry.treatment}
                          tone={treatmentTone[enquiry.treatment] ?? "muted"}
                          dot={false}
                        />
                      </td>
                      <td className="px-3 py-2.5">{enquiry.owner}</td>
                      <td className="px-3 py-2.5 font-medium">{enquiry.nextAction}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          label={normalizedStage}
                          tone={
                            normalizedStage === "Treatment started"
                              ? "success"
                              : normalizedStage === "New enquiry"
                                ? "info"
                                : "warning"
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
          Showing {rows.length} of {enquiries.length} enquiries
        </div>
      </section>
    </div>
  );
}
