"use client";

import { useState } from "react";
import { UploadCloud, Search, Calendar, FileImage, DownloadCloud, Activity, LayoutGrid, Import } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CLINICAL_DEMO_DATA } from "../demoData";
import { Textarea } from "@/components/ui/textarea";

export default function ImagingUltrasoundPage() {
  const [search, setSearch] = useState("");
  const [selectedScan, setSelectedScan] = useState<any>(null);
  const [showImportSim, setShowImportSim] = useState(false);

  const scans = CLINICAL_DEMO_DATA.flatMap(p => 
    p.ultrasounds.map(usg => ({
      ...usg,
      patientName: p.name,
      patientMrn: p.mrn,
      activeCycle: p.activeCycle,
      patientId: p.id
    }))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Report Ready": return <Badge className="bg-emerald-500/10 text-emerald-600 border-none">Report Ready</Badge>;
      case "Reviewed": return <Badge className="bg-blue-500/10 text-blue-600 border-none">Reviewed</Badge>;
      case "Report Pending": return <Badge className="bg-amber-500/10 text-amber-600 border-none">Report Pending</Badge>;
      case "Scheduled": return <Badge className="bg-slate-100 text-slate-600 border-none">Scheduled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const simulateImport = () => {
    setShowImportSim(true);
    setTimeout(() => {
      setShowImportSim(false);
      // Simulating state update
    }, 2500);
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UploadCloud className="size-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Imaging & Ultrasound</h1>
            <p className="text-muted-foreground">Follicular tracking, pelvic scans, and imaging reports.</p>
          </div>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">Schedule Scan</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card className="shadow-sm border-none bg-slate-100/50">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-slate-600">Scheduled</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-slate-800">12</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-blue-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-blue-800">In Progress</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-900">2</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-amber-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-amber-800">Report Pending</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-900">4</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-emerald-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-emerald-800">Report Ready</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-900">9</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-purple-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-sm text-purple-800">Doctor Review</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-purple-900">5</div></CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-none">
        <CardHeader className="border-b bg-white pb-4">
          <div className="flex justify-between items-center">
            <CardTitle>Imaging Queue</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search patient, scan type..." className="pl-8 w-[250px]" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Scan Type / Cycle Context</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scans.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-6 font-medium text-slate-700">{row.date}</TableCell>
                  <TableCell>
                    <div className="font-bold text-primary">{row.patientName}</div>
                    <div className="text-xs text-muted-foreground">MRN: {row.patientMrn}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-sm">{row.type}</div>
                    {row.activeCycle && <div className="text-xs font-medium text-pink-600">{row.activeCycle} • Day {row.cycleDay}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{row.machine}</TableCell>
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedScan(row)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      Open Workspace
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ultrasound Workspace Modal */}
      {selectedScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="my-auto">
            <Card className="w-full max-w-4xl shadow-2xl flex flex-col animate-in zoom-in-95">
              <CardHeader className="border-b bg-slate-50 rounded-t-xl shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl text-blue-800 flex items-center gap-2">
                      <LayoutGrid className="size-6" /> Ultrasound Workspace
                    </CardTitle>
                    <CardDescription className="text-blue-600 font-medium mt-1">{selectedScan.type}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedScan(null)}>Close</Button>
                    <Button onClick={simulateImport} variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 gap-2 border border-blue-200">
                      <Import className="size-4" /> Import Study
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 mt-4 bg-white p-3 rounded-lg border shadow-sm">
                  <div><p className="text-xs text-muted-foreground">Patient</p><p className="font-bold">{selectedScan.patientName}</p></div>
                  <div><p className="text-xs text-muted-foreground">MRN</p><p className="font-bold">{selectedScan.patientMrn}</p></div>
                  <div><p className="text-xs text-muted-foreground">Cycle</p><p className="font-bold text-pink-600">{selectedScan.activeCycle}</p></div>
                  <div><p className="text-xs text-muted-foreground">Cycle Day</p><p className="font-bold">Day {selectedScan.cycleDay}</p></div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 bg-white space-y-8">
                
                {showImportSim && (
                  <div className="flex flex-col items-center justify-center p-8 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
                    <DownloadCloud className="size-12 text-blue-500 mb-4 animate-bounce" />
                    <h3 className="font-bold text-lg text-blue-800">Connecting to {selectedScan.machine}...</h3>
                    <p className="text-sm text-blue-600 mt-2">Simulating API / DICOM pull via SmrkoMed Device Adapter</p>
                  </div>
                )}

                {!showImportSim && (
                  <>
                    <div className="grid grid-cols-2 gap-8">
                      {/* Right Ovary */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-slate-100 p-3 border-b font-bold text-slate-800">RIGHT OVARY</div>
                        <div className="p-4 space-y-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 mb-2 block">Follicles</label>
                            <div className="flex flex-wrap gap-2">
                              {selectedScan.rightOvary.map((f: string, i: number) => (
                                <Badge key={i} variant="outline" className="px-3 py-1 text-sm bg-white border-slate-300">{f}</Badge>
                              ))}
                              <Badge variant="outline" className="px-3 py-1 text-sm bg-slate-50 border-dashed border-slate-400 text-slate-500 cursor-pointer hover:bg-slate-100">+ Add Follicle</Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Left Ovary */}
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-slate-100 p-3 border-b font-bold text-slate-800">LEFT OVARY</div>
                        <div className="p-4 space-y-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 mb-2 block">Follicles</label>
                            <div className="flex flex-wrap gap-2">
                              {selectedScan.leftOvary.map((f: string, i: number) => (
                                <Badge key={i} variant="outline" className="px-3 py-1 text-sm bg-white border-slate-300">{f}</Badge>
                              ))}
                              <Badge variant="outline" className="px-3 py-1 text-sm bg-slate-50 border-dashed border-slate-400 text-slate-500 cursor-pointer hover:bg-slate-100">+ Add Follicle</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-pink-50/50">
                      <label className="text-xs font-bold text-slate-500 mb-2 block">Endometrial Measurement</label>
                      <Input defaultValue={selectedScan.endometrium} className="max-w-xs bg-white font-bold" />
                    </div>

                    <div className="space-y-4 border-t pt-6">
                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-2 block">Findings & Technician Notes</label>
                        <Textarea defaultValue={selectedScan.findings} className="min-h-[100px]" />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 border rounded-lg p-4 bg-slate-50">
                      <FileImage className="size-8 text-slate-400" />
                      <div>
                        <h4 className="font-bold text-sm">Attachments</h4>
                        <p className="text-xs text-muted-foreground">3 ultrasound images attached from {selectedScan.machine}</p>
                      </div>
                      <Button variant="outline" size="sm" className="ml-auto bg-white">View Images</Button>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline">Save Draft</Button>
                      <Button variant="outline">Upload Report</Button>
                      <Button className="bg-blue-600 hover:bg-blue-700">Mark Report Ready</Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
