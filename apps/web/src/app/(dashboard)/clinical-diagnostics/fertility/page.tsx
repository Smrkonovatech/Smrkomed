"use client";

import { useState } from "react";
import { Microscope, Search, History, LineChart, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CLINICAL_DEMO_DATA } from "../demoData";

export default function FertilityDiagnosticsPage() {
  const [search, setSearch] = useState("");
  const [selectedResult, setSelectedResult] = useState<any>(null);

  // Filter lab orders specific to Fertility Lab
  const fertilityTests = CLINICAL_DEMO_DATA.flatMap(p => 
    p.labOrders.filter(o => o.category === "Fertility Lab").map(order => ({
      ...order,
      patientName: p.name,
      patientMrn: p.mrn,
      activeCycle: p.activeCycle,
      patientId: p.id
    }))
  );

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Microscope className="size-8 text-pink-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Fertility Diagnostics</h1>
            <p className="text-muted-foreground">Hormone testing, Ovarian Reserve, and specialized fertility panels.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="shadow-sm border-none bg-blue-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-blue-800">Pending Samples</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-900">8</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-pink-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-pink-800">Hormone Panels Processing</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-pink-900">14</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-purple-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-purple-800">Results Ready</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-purple-900">3</div></CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-none">
        <CardHeader className="border-b bg-white pb-4 flex flex-row justify-between items-center">
          <CardTitle>Fertility Lab Queue</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search patient, test..." className="pl-8 w-[250px]" />
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Patient</TableHead>
                <TableHead>Cycle Context</TableHead>
                <TableHead>Test / Sample</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fertilityTests.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-6">
                    <div className="font-medium text-primary">{row.patientName}</div>
                    <div className="text-xs text-muted-foreground">MRN: {row.patientMrn}</div>
                  </TableCell>
                  <TableCell>
                    {row.activeCycle ? (
                      <Badge variant="outline" className="text-xs text-slate-500">{row.activeCycle}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{row.testName}</div>
                    <div className="text-xs text-muted-foreground">Sample: {row.sampleId}</div>
                  </TableCell>
                  <TableCell>
                    {row.status === "Result Ready" ? (
                      <Badge className="bg-purple-100 text-purple-700 border-none">Result Ready</Badge>
                    ) : (
                      <Badge variant="outline">{row.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedResult(row)} className="text-pink-600 hover:bg-pink-50">
                      <FileText className="size-4 mr-2" /> View Result
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Result View Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-3xl shadow-lg animate-in zoom-in-95">
            <CardHeader className="border-b bg-slate-50 rounded-t-xl flex flex-row justify-between">
              <div>
                <CardTitle className="text-xl text-pink-800">{selectedResult.testName}</CardTitle>
                <CardDescription>Sample: {selectedResult.sampleId} • Collected: {selectedResult.collectedAt}</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setSelectedResult(null)}>Close</Button>
            </CardHeader>
            <CardContent className="p-6">
              
              <div className="flex justify-between items-start mb-6 bg-pink-50/50 p-4 rounded-lg border border-pink-100">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-700 font-bold">{selectedResult.patientName[0]}</div>
                  <div>
                    <h3 className="font-bold">{selectedResult.patientName}</h3>
                    <p className="text-sm text-slate-500">MRN: {selectedResult.patientMrn}</p>
                  </div>
                </div>
                {selectedResult.activeCycle && (
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-500">Cycle Context</p>
                    <p className="text-sm font-bold text-pink-700">{selectedResult.activeCycle}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">Current Results</h3>
                <Button variant="outline" size="sm" className="gap-2">
                  <History className="size-4" /> View Previous Results
                </Button>
              </div>

              <Table className="border rounded-lg mb-6">
                <TableHeader className="bg-slate-50">
                  <TableRow><TableHead>Parameter</TableHead><TableHead>Result</TableHead><TableHead>Unit</TableHead><TableHead>Reference Information</TableHead><TableHead>Flag</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {selectedResult.results?.map((r: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-slate-700">{r.parameter}</TableCell>
                      <TableCell className="font-bold text-lg">{r.result}</TableCell>
                      <TableCell className="text-sm text-slate-500">{r.unit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.range}</TableCell>
                      <TableCell>
                        {r.flag === "Normal" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-none">Normal</Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-700 border-none">{r.flag}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline">Print Report</Button>
                <Button className="bg-pink-600 hover:bg-pink-700">Verify & Send to Doctor</Button>
              </div>

            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
