"use client";

import { useState } from "react";
import { Baby, Search, ArrowRight, Activity, Beaker, CheckCircle2, Clock, Snowflake } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CLINICAL_DEMO_DATA, IvfCase } from "../demoData";
import { Textarea } from "@/components/ui/textarea";

export default function IvfEmbryologyPage() {
  const [selectedCase, setSelectedCase] = useState<any>(null);

  const cases = CLINICAL_DEMO_DATA.flatMap(p => 
    p.ivfCases.map(ivf => ({
      ...ivf,
      patientName: p.name,
      patientMrn: p.mrn,
      patientId: p.id
    }))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Progress": return <Badge className="bg-indigo-500/10 text-indigo-700 border-none">In Progress</Badge>;
      case "Assessed": return <Badge className="bg-emerald-500/10 text-emerald-700 border-none">Assessed</Badge>;
      case "Ready": return <Badge className="bg-purple-500/10 text-purple-700 border-none">Ready</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Baby className="size-8 text-indigo-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">IVF / Embryology Lab</h1>
            <p className="text-muted-foreground">Oocyte processing, fertilisation, embryo culture and cryopreservation.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-6 mb-6">
        <Card className="shadow-sm border-none bg-blue-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-blue-800 text-center">OPU Today</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-900 text-center">2</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-indigo-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-indigo-800 text-center">Oocytes</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-indigo-900 text-center">24</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-purple-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-purple-800 text-center">Fertilisation Pending</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-purple-900 text-center">1</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-pink-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-pink-800 text-center">In Culture</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-pink-900 text-center">16</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-orange-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-orange-800 text-center">To Assess</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-900 text-center">5</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-emerald-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-emerald-800 text-center">Transfer Today</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-900 text-center">1</div></CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-none">
        <CardHeader className="border-b bg-white pb-4">
          <div className="flex justify-between items-center">
            <CardTitle>Active Cases</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search patient, cycle..." className="pl-8 w-[250px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Patient</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Embryologist</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-6">
                    <div className="font-bold text-primary">{row.patientName}</div>
                    <div className="text-xs text-muted-foreground">MRN: {row.patientMrn}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-sm text-pink-600">{row.cycleId}</div>
                    <div className="text-xs text-muted-foreground">OPU: {row.opuDate}</div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{row.embryologist}</TableCell>
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCase(row)} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                      Open Lab Workspace <ArrowRight className="size-4 ml-2" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* IVF Lab Workspace Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="my-auto w-full max-w-6xl">
            <Card className="shadow-2xl flex flex-col animate-in zoom-in-95">
              <CardHeader className="border-b bg-slate-50 rounded-t-xl shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl text-indigo-800 flex items-center gap-2">
                      <Baby className="size-6" /> IVF / Embryology Workspace
                    </CardTitle>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedCase(null)}>Close</Button>
                </div>
                <div className="grid grid-cols-5 gap-4 mt-4 bg-white p-3 rounded-lg border shadow-sm">
                  <div><p className="text-xs text-muted-foreground">Patient</p><p className="font-bold">{selectedCase.patientName}</p></div>
                  <div><p className="text-xs text-muted-foreground">MRN</p><p className="font-bold">{selectedCase.patientMrn}</p></div>
                  <div><p className="text-xs text-muted-foreground">Cycle</p><p className="font-bold text-pink-600">{selectedCase.cycleId}</p></div>
                  <div><p className="text-xs text-muted-foreground">OPU Date</p><p className="font-bold">{selectedCase.opuDate}</p></div>
                  <div><p className="text-xs text-muted-foreground">Embryologist</p><p className="font-bold">{selectedCase.embryologist}</p></div>
                </div>
              </CardHeader>
              
              <CardContent className="p-0 bg-white grid grid-cols-4 min-h-[60vh]">
                
                {/* Left Sidebar: Workflow Timeline */}
                <div className="col-span-1 border-r bg-slate-50/50 p-4 space-y-2">
                  <h3 className="font-bold text-slate-800 mb-4 px-2">Lab Workflow</h3>
                  
                  <div className="p-3 bg-white border border-emerald-200 rounded-lg shadow-sm flex items-start gap-3 relative before:content-[''] before:absolute before:left-[19px] before:top-10 before:bottom-[-20px] before:w-[2px] before:bg-emerald-200">
                    <CheckCircle2 className="size-5 text-emerald-500 bg-white z-10" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Oocytes / OPU</h4>
                      <p className="text-xs text-slate-500">Completed</p>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-emerald-200 rounded-lg shadow-sm flex items-start gap-3 relative before:content-[''] before:absolute before:left-[19px] before:top-10 before:bottom-[-20px] before:w-[2px] before:bg-emerald-200">
                    <CheckCircle2 className="size-5 text-emerald-500 bg-white z-10" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Sperm Processing</h4>
                      <p className="text-xs text-slate-500">Completed</p>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-emerald-200 rounded-lg shadow-sm flex items-start gap-3 relative before:content-[''] before:absolute before:left-[19px] before:top-10 before:bottom-[-20px] before:w-[2px] before:bg-emerald-200">
                    <CheckCircle2 className="size-5 text-emerald-500 bg-white z-10" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Fertilisation</h4>
                      <p className="text-xs text-slate-500">Completed</p>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm flex items-start gap-3 relative before:content-[''] before:absolute before:left-[19px] before:top-10 before:bottom-[-20px] before:w-[2px] before:bg-slate-200">
                    <Activity className="size-5 text-indigo-600 bg-indigo-50 z-10" />
                    <div>
                      <h4 className="font-bold text-sm text-indigo-900">Embryo Culture</h4>
                      <p className="text-xs text-indigo-700">In Progress (Day 3)</p>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 opacity-60 rounded-lg flex items-start gap-3 relative before:content-[''] before:absolute before:left-[19px] before:top-10 before:bottom-[-20px] before:w-[2px] before:bg-slate-200">
                    <div className="size-5 rounded-full border-2 border-slate-300 bg-white z-10" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Embryo Assessment</h4>
                      <p className="text-xs text-slate-500">Pending</p>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 opacity-60 rounded-lg flex items-start gap-3">
                    <div className="size-5 rounded-full border-2 border-slate-300 bg-white z-10" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">Cryopreservation</h4>
                      <p className="text-xs text-slate-500">Pending</p>
                    </div>
                  </div>
                </div>

                {/* Right Area: Active Workflow Stage */}
                <div className="col-span-3 p-6 space-y-8 h-full overflow-y-auto">
                  
                  {/* Summary Ribbon */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border text-center">
                      <p className="text-xs text-muted-foreground font-bold">Retrieved</p>
                      <p className="text-2xl font-bold text-slate-800">{selectedCase.oocytesRetrieved}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border text-center">
                      <p className="text-xs text-muted-foreground font-bold">Mature (MII)</p>
                      <p className="text-2xl font-bold text-indigo-600">{selectedCase.oocytesMature}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border text-center">
                      <p className="text-xs text-muted-foreground font-bold">Fertilised (2PN)</p>
                      <p className="text-2xl font-bold text-emerald-600">{selectedCase.fertilisedCount}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border text-center">
                      <p className="text-xs text-muted-foreground font-bold">In Culture</p>
                      <p className="text-2xl font-bold text-pink-600">{selectedCase.embryos.length}</p>
                    </div>
                  </div>

                  <section>
                    <h3 className="text-lg font-bold border-b pb-2 mb-4">Embryo Culture (Day 3 Assessment)</h3>
                    
                    <div className="grid gap-4">
                      {selectedCase.embryos.map((e: any, i: number) => (
                        <div key={i} className="border rounded-lg p-4 bg-white shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="size-12 rounded bg-indigo-50 flex items-center justify-center border border-indigo-100">
                              <span className="font-bold text-indigo-800">{e.id}</span>
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">Grade: {e.grade}</p>
                              <p className="text-sm text-slate-500">Day {e.day} • {e.notes}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">Update Grade</Button>
                            <Button variant="secondary" size="sm" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">Select for Transfer</Button>
                            <Button variant="secondary" size="sm" className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">
                              <Snowflake className="size-3 mr-1" /> Cryopreserve
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4">
                      <Button variant="outline" className="w-full border-dashed">+ Add Embryo Observation</Button>
                    </div>
                  </section>

                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

    </div>
  );
}
