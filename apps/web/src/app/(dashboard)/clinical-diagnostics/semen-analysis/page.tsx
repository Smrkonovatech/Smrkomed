"use client";

import { useState } from "react";
import { Beaker, Search, CheckCircle2, FlaskConical, AlertTriangle, Eye, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CLINICAL_DEMO_DATA, SemenAnalysis } from "../demoData";

export default function SemenAnalysisPage() {
  const [search, setSearch] = useState("");
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Flatten semen analyses for the queue
  const queue = CLINICAL_DEMO_DATA.flatMap(p => 
    p.semenAnalyses.map(sa => ({
      ...sa,
      patientName: p.name,
      patientMrn: p.mrn,
      patientId: p.id
    }))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified": return <Badge className="bg-emerald-500/10 text-emerald-600 border-none">Verified</Badge>;
      case "Processing": return <Badge className="bg-blue-500/10 text-blue-600 border-none">Processing</Badge>;
      case "Received": return <Badge className="bg-amber-500/10 text-amber-600 border-none">Received</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openWorkspace = (sa: any) => {
    setSelectedAnalysis(sa);
    setIsVerified(sa.status === "Verified" || sa.status === "Doctor Reviewed");
    setShowWorkspace(true);
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Beaker className="size-8 text-orange-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Semen Analysis</h1>
            <p className="text-muted-foreground">Andrology testing and sperm parameter verification.</p>
          </div>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700">Sperm Processing Queue</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="shadow-sm border-none bg-blue-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-blue-800">Samples Expected</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-900">3</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-amber-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-amber-800">Samples Received</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-900">5</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-purple-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-purple-800">Processing</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-purple-900">2</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-emerald-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-emerald-800">Verified Today</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-900">6</div></CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-none">
        <CardHeader className="border-b bg-white pb-4">
          <div className="flex justify-between items-center">
            <CardTitle>Today's Semen Analysis</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search patient, sample..." className="pl-8 w-[250px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Patient</TableHead>
                <TableHead>Sample ID</TableHead>
                <TableHead>Collection</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-6">
                    <div className="font-medium">{row.patientName}</div>
                    <div className="text-xs text-muted-foreground">MRN: {row.patientMrn}</div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-700">{row.sampleId}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.date}</TableCell>
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                  <TableCell className="text-sm">{row.technician}</TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" onClick={() => openWorkspace(row)} className="text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                      Open Workspace <ArrowRight className="size-4 ml-2" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Semen Analysis Workspace Modal */}
      {showWorkspace && selectedAnalysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-4xl h-[90vh] shadow-2xl flex flex-col animate-in zoom-in-95">
            <CardHeader className="border-b bg-slate-50 rounded-t-xl shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl text-orange-800 flex items-center gap-2">
                    <Beaker className="size-6" /> Semen Analysis Workspace
                  </CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowWorkspace(false)}>Close</Button>
                  {!isVerified && <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setIsVerified(true)}>Verify Result</Button>}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4 bg-white p-3 rounded-lg border shadow-sm">
                <div><p className="text-xs text-muted-foreground">Patient</p><p className="font-bold">{selectedAnalysis.patientName}</p></div>
                <div><p className="text-xs text-muted-foreground">MRN</p><p className="font-bold">{selectedAnalysis.patientMrn}</p></div>
                <div><p className="text-xs text-muted-foreground">Sample</p><p className="font-bold">{selectedAnalysis.sampleId}</p></div>
                <div><p className="text-xs text-muted-foreground">Collection</p><p className="font-bold">{selectedAnalysis.date}</p></div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 overflow-y-auto flex-1 bg-white space-y-8">
              
              {isVerified && (
                <div className="flex items-center gap-3 bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="size-6 text-emerald-600" />
                  <div>
                    <h3 className="font-bold">✓ Technician Verified</h3>
                    <p className="text-sm">Verified by {selectedAnalysis.technician} • Awaiting Doctor Review</p>
                  </div>
                </div>
              )}

              <section>
                <h3 className="text-lg font-bold border-b pb-2 mb-4">Sample Information</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Collection Time</label><Input defaultValue="08:15 AM" readOnly={isVerified} /></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Received Time</label><Input defaultValue="08:20 AM" readOnly={isVerified} /></div>
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Abstinence Period</label><Input defaultValue="3 Days" readOnly={isVerified} /></div>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold border-b pb-2 mb-4">Macroscopic Examination</h3>
                <Table className="border rounded-lg">
                  <TableHeader className="bg-slate-50">
                    <TableRow><TableHead>Parameter</TableHead><TableHead>Result</TableHead><TableHead>Unit</TableHead><TableHead>Reference / Range</TableHead><TableHead>Flag</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Volume</TableCell>
                      <TableCell><Input defaultValue={selectedAnalysis.volume} className="w-24 h-8" readOnly={isVerified}/></TableCell>
                      <TableCell className="text-muted-foreground">mL</TableCell>
                      <TableCell className="text-muted-foreground">&ge; 1.5</TableCell>
                      <TableCell><Badge className="bg-emerald-100 text-emerald-700 border-none">Normal</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Appearance</TableCell>
                      <TableCell><Input defaultValue={selectedAnalysis.appearance} className="w-24 h-8" readOnly={isVerified}/></TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">Normal</TableCell>
                      <TableCell><Badge className="bg-emerald-100 text-emerald-700 border-none">Normal</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">pH</TableCell>
                      <TableCell><Input defaultValue={selectedAnalysis.ph} className="w-24 h-8" readOnly={isVerified}/></TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell className="text-muted-foreground">&ge; 7.2</TableCell>
                      <TableCell><Badge className="bg-emerald-100 text-emerald-700 border-none">Normal</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </section>

              <section>
                <h3 className="text-lg font-bold border-b pb-2 mb-4">Microscopic / Semen Parameters</h3>
                <Table className="border rounded-lg">
                  <TableHeader className="bg-slate-50">
                    <TableRow><TableHead>Parameter</TableHead><TableHead>Result</TableHead><TableHead>Unit</TableHead><TableHead>Reference / Range</TableHead><TableHead>Flag</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Concentration</TableCell>
                      <TableCell><Input defaultValue={selectedAnalysis.concentration} className="w-24 h-8" readOnly={isVerified}/></TableCell>
                      <TableCell className="text-muted-foreground">Million/mL</TableCell>
                      <TableCell className="text-muted-foreground">&ge; 15.0</TableCell>
                      <TableCell><Badge className="bg-emerald-100 text-emerald-700 border-none">Normal</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Total Count</TableCell>
                      <TableCell><Input defaultValue={selectedAnalysis.totalCount} className="w-24 h-8" readOnly={isVerified}/></TableCell>
                      <TableCell className="text-muted-foreground">Million</TableCell>
                      <TableCell className="text-muted-foreground">&ge; 39.0</TableCell>
                      <TableCell><Badge className="bg-emerald-100 text-emerald-700 border-none">Normal</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Progressive Motility (PR)</TableCell>
                      <TableCell><Input defaultValue={selectedAnalysis.progMotility} className="w-24 h-8" readOnly={isVerified}/></TableCell>
                      <TableCell className="text-muted-foreground">%</TableCell>
                      <TableCell className="text-muted-foreground">&ge; 32%</TableCell>
                      <TableCell><Badge className="bg-emerald-100 text-emerald-700 border-none">Normal</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Normal Morphology</TableCell>
                      <TableCell><Input defaultValue={selectedAnalysis.morphology} className="w-24 h-8 text-rose-700 font-bold" readOnly={isVerified}/></TableCell>
                      <TableCell className="text-muted-foreground">%</TableCell>
                      <TableCell className="text-muted-foreground">&ge; 4% (Strict)</TableCell>
                      <TableCell><Badge className="bg-rose-100 text-rose-700 border-none">Low</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </section>

              {!isVerified && (
                <div className="flex justify-end pt-4">
                  <Button variant="outline" className="mr-2">Save Draft</Button>
                  <Button onClick={() => setIsVerified(true)} className="bg-orange-600 hover:bg-orange-700">Verify Result</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
