"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Stethoscope,
  ChevronRight,
  Search,
  Filter,
  Sparkles
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

import { INITIAL_DEMO_DATA, DemoPatient } from "./demoDischarges";

const KPIs = [
  { label: "Pending Discharges", value: "12", icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
  { label: "Ready for Discharge", value: "7", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { label: "Awaiting Doctor Review", value: "3", icon: Stethoscope, color: "text-blue-500", bg: "bg-blue-500/10" },
  { label: "Blocked", value: "2", icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-500/10" },
  { label: "Discharged Today", value: "8", icon: ClipboardCheck, color: "text-primary", bg: "bg-primary/10" },
];

export default function DischargeCommandCenter() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const filteredData = INITIAL_DEMO_DATA.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(search.toLowerCase()) || 
                          patient.mrn.includes(search);
    
    if (filter === "All") return matchesSearch;
    if (filter === "Preparing" && patient.status === "PREPARING") return matchesSearch;
    if (filter === "Doctor Review" && patient.status === "READY_FOR_DOCTOR_REVIEW") return matchesSearch;
    if (filter === "Discharged" && patient.status === "DISCHARGED") return matchesSearch;
    
    // Simplistic blocker filter for demo
    if (filter === "Blocked" && patient.blockers.some(b => b.status === "BLOCKED")) return matchesSearch;
    
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PREPARING":
        return <Badge variant="secondary">Preparing</Badge>;
      case "READY_FOR_DOCTOR_REVIEW":
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20">Doctor Review</Badge>;
      case "DOCTOR_APPROVED":
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">Approved</Badge>;
      case "DISCHARGED":
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">Discharged</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-8 p-6 pb-12 pt-6 bg-slate-50/50">
      
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Smart Discharge</h1>
          <p className="text-muted-foreground">
            Prepare, review and complete patient discharges.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">View Completed</Button>
          <Button>Check Readiness</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {KPIs.map((kpi) => (
          <Card key={kpi.label} className="overflow-hidden border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <div className={`rounded-md p-1.5 ${kpi.bg}`}>
                <kpi.icon className={`size-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Discharge Radar */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="size-5 text-purple-500" />
            AI DISCHARGE RADAR
          </h2>
          <p className="text-sm text-muted-foreground">Patients approaching discharge</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {INITIAL_DEMO_DATA.filter(p => p.status !== "DISCHARGED").map((patient) => (
            <Card key={`radar-${patient.id}`} className="shadow-sm border-purple-500/20 bg-gradient-to-br from-white to-purple-50/30">
              <CardHeader className="pb-3 border-b border-purple-500/10">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base text-primary">{patient.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {patient.age} yrs • MRN {patient.mrn}
                    </CardDescription>
                  </div>
                  {getStatusBadge(patient.status)}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-sm">
                <div>
                  <p className="font-semibold text-xs text-muted-foreground tracking-wider mb-1">ESTIMATED DISCHARGE WINDOW</p>
                  <p className="font-medium">{patient.estimatedWindow}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold text-xs text-muted-foreground tracking-wider mb-1">READINESS</p>
                    <div className="flex items-center gap-2">
                      <Progress value={(patient.readinessComplete / patient.readinessTotal) * 100} className="h-1.5" />
                      <span className="font-medium text-xs">{Math.round((patient.readinessComplete / patient.readinessTotal) * 100)}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-xs text-purple-600 tracking-wider mb-1 flex items-center gap-1">
                      <Sparkles className="size-3" />
                      AI PREPARATION
                    </p>
                    <div className="flex items-center gap-2">
                      <Progress value={patient.aiCoverage} className="h-1.5 bg-purple-100" />
                      <span className="font-medium text-xs text-purple-700">{patient.aiCoverage}%</span>
                    </div>
                  </div>
                </div>

                {patient.blockers.filter(b => b.status === "BLOCKED" || b.status === "PENDING").length > 0 && (
                  <div>
                    <p className="font-semibold text-xs text-muted-foreground tracking-wider mb-1">BLOCKERS</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-xs text-rose-600">
                      {patient.blockers.filter(b => b.status === "BLOCKED" || b.status === "PENDING").slice(0,2).map(b => (
                        <li key={b.id}>{b.label} {b.status.toLowerCase()}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0 pb-4">
                <Button className="w-full bg-primary/5 text-primary hover:bg-primary/10 border border-primary/20" variant="outline" asChild>
                  <Link href={`/discharge/${patient.id}`}>Open Discharge Workspace</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Discharge Queue */}
      <Card className="shadow-sm border-none">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Discharge Queue</CardTitle>
              <CardDescription>All patients in the discharge workflow.</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search patient or MRN..."
                  className="pl-8 w-[250px] bg-background"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="size-4" />
                Filter: {filter}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Expected Discharge</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Blocker</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-6">
                    <div className="font-medium text-primary">{row.name}</div>
                    <div className="text-xs text-muted-foreground">MRN: {row.mrn} • {row.treatment}</div>
                  </TableCell>
                  <TableCell className="text-sm">{row.doctor}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.estimatedWindow}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(row.readinessComplete / row.readinessTotal) * 100} 
                        className="h-2 w-16" 
                      />
                      <span className="text-xs text-muted-foreground">
                        {row.readinessComplete}/{row.readinessTotal}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                  <TableCell>
                    {row.blockers.find(b => b.status === "BLOCKED" || b.status === "PENDING") ? (
                      <span className="text-xs text-rose-500 font-medium line-clamp-1 flex items-center gap-1">
                        <AlertCircle className="size-3" />
                        {row.blockers.find(b => b.status === "BLOCKED" || b.status === "PENDING")?.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" asChild className="text-primary">
                      <Link href={`/discharge/${row.id}`}>
                        Open Workspace
                        <ChevronRight className="ml-1 size-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No patients found matching the criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
