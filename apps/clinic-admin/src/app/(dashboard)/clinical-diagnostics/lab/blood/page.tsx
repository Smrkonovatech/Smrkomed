"use client";

import { useState } from "react";
import { 
  Droplet, 
  Search, 
  Plus, 
  Filter, 
  TestTube, 
  Activity, 
  AlertTriangle,
  History,
  CheckCircle2,
  FileText,
  Clock,
  Printer,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CLINICAL_DEMO_DATA, LabOrder } from "../../demoData";
import { Textarea } from "@/components/ui/textarea";

export default function BloodPathologyPage() {
  const [search, setSearch] = useState("");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  // Filter only Blood / Pathology orders
  const allBloodOrders = CLINICAL_DEMO_DATA.flatMap(p => 
    p.labOrders.filter(o => o.category === "Blood / Pathology").map(order => ({
      ...order,
      patientName: p.name,
      patientMrn: p.mrn,
      patientId: p.id,
      patientAge: p.age,
      patientDoctor: p.doctor
    }))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified": return <Badge className="bg-emerald-500/10 text-emerald-600 border-none">Verified</Badge>;
      case "Doctor Reviewed": return <Badge className="bg-blue-500/10 text-blue-600 border-none">Doctor Reviewed</Badge>;
      case "Result Ready": return <Badge className="bg-purple-500/10 text-purple-600 border-none">Result Ready</Badge>;
      case "Processing": return <Badge className="bg-indigo-500/10 text-indigo-600 border-none">Processing</Badge>;
      case "Collected": return <Badge className="bg-cyan-500/10 text-cyan-600 border-none">Collected</Badge>;
      case "Sample Pending": return <Badge className="bg-amber-500/10 text-amber-600 border-none">Sample Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const simulateAnalyzerImport = () => {
    // This just simulates the UI delay for the hospEx demo
    const btn = document.getElementById("import-btn");
    if(btn) btn.innerHTML = "Importing...";
    setTimeout(() => {
      if(btn) btn.innerHTML = "Result Imported!";
      setTimeout(() => {
        setIsVerified(false); // Can verify now
      }, 1000);
    }, 2000);
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Droplet className="size-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Blood & Pathology</h1>
            <p className="text-muted-foreground">Manage blood samples, laboratory tests and verified results.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCollectModal(true)} className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50">
            <TestTube className="size-4 mr-2" /> Collect Sample
          </Button>
          <Button onClick={() => setShowOrderModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="size-4 mr-2" /> New Blood Test
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-6 mb-6">
        <Card className="shadow-sm border-none bg-white">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-slate-500">Blood Tests Today</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-slate-800">18</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-amber-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-amber-800">Samples Pending</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-900">4</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-blue-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-blue-800">Processing</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-900">9</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-purple-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-purple-800">Results Ready</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-purple-900">5</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-emerald-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-emerald-800">Awaiting Verification</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-900">3</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-rose-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-rose-800">Doctor Review</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-rose-900">6</div></CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-4 text-slate-800">Blood Test Categories</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <h3 className="font-bold text-blue-900 mb-2">ROUTINE BLOOD TESTS</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                CBC • Blood Group • Blood Glucose • HbA1c • Lipid Profile • Liver Function • Kidney Function • Electrolytes
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-pink-500">
            <CardContent className="p-4">
              <h3 className="font-bold text-pink-900 mb-2">FERTILITY / HORMONE TESTS</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                AMH • FSH • LH • Estradiol • Progesterone • Prolactin • Thyroid-related • Androgen Profile
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <h3 className="font-bold text-emerald-900 mb-2">PRE-TREATMENT / SCREENING</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Infection screening • Viral Markers (HIV, HBsAg, HCV) • VDRL • Rubella IgG • Thalassemia Screen
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm border-none mt-6">
        <CardHeader className="border-b bg-white pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Blood Test Queue</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search patient, test, sample..." className="pl-8 w-[300px]" />
              </div>
              <Button variant="outline" className="bg-white"><Filter className="size-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Patient</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Sample ID</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allBloodOrders.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="pl-6">
                    <div className="font-medium text-primary">{row.patientName}</div>
                    <div className="text-xs text-muted-foreground">MRN: {row.patientMrn}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-sm text-slate-800">{row.testName}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs bg-slate-50 text-slate-600">{row.sampleId}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{row.collectedAt}</TableCell>
                  <TableCell>
                    {row.priority === "Urgent" ? <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">Urgent</span> : <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Routine</span>}
                  </TableCell>
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                  <TableCell className="text-sm">{row.technician}</TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSelectedOrder(row);
                      setIsVerified(row.status === "Verified" || row.status === "Doctor Reviewed");
                      setShowResultModal(true);
                    }} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      {row.status === "Result Ready" || row.status === "Processing" ? "Enter Result" : "View"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-xl shadow-lg animate-in zoom-in-95">
            <CardHeader className="border-b bg-slate-50 rounded-t-xl"><CardTitle>Create Blood Test Order</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 relative">
                  <label className="text-xs font-bold text-slate-500">Patient</label>
                  <Input defaultValue="Ananya Sharma" />
                  <Search className="absolute right-3 top-7 size-4 text-slate-400" />
                </div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">MRN</label><Input defaultValue="10452" readOnly className="bg-slate-50" /></div>
                
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Doctor</label><Input defaultValue="Dr. Shreya" readOnly className="bg-slate-50" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Department</label><Input defaultValue="Fertility / IVF" readOnly className="bg-slate-50" /></div>

                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Test Category</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option>Routine</option><option>Fertility / Hormone</option><option>Screening</option><option>Other</option>
                  </select>
                </div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Test</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option>CBC + Fertility Panel</option>
                    <option>AMH</option>
                    <option>Thyroid Profile</option>
                  </select>
                </div>

                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Priority</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option>Routine</option><option>Urgent</option>
                  </select>
                </div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Requested Date</label><Input type="date" defaultValue="2026-09-18" /></div>
                
                <div className="space-y-1 col-span-2"><label className="text-xs font-bold text-slate-500">Clinical Notes</label><Textarea placeholder="Any specific instructions for the lab..." /></div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 p-4 justify-end gap-2 rounded-b-xl border-t">
              <Button variant="outline" onClick={() => setShowOrderModal(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowOrderModal(false)}>Create Order</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Collect Sample Modal */}
      {showCollectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-xl shadow-lg animate-in zoom-in-95">
            <CardHeader className="border-b bg-slate-50 rounded-t-xl"><CardTitle>Blood Sample Collection</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-4">
              
              {/* Traceability Card Demo */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-4">
                <div className="bg-white p-2 rounded border shadow-sm">
                  {/* Fake Barcode */}
                  <div className="h-12 w-24 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/e9/UPC-A-036000291452.svg')] bg-cover opacity-50 filter grayscale"></div>
                  <p className="text-[10px] font-mono text-center mt-1">BLD-10452-001</p>
                </div>
                <div>
                  <h4 className="font-bold text-blue-900">Ananya Sharma <span className="text-xs font-normal text-slate-500">(MRN: 10452)</span></h4>
                  <p className="text-sm font-bold mt-1">CBC + Fertility Panel</p>
                  <p className="text-xs text-slate-600 mt-1">Order: BT-10452-001</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Sample ID</label><Input defaultValue="BLD-10452-001" className="bg-slate-50 font-mono" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Sample Type</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option>Whole Blood</option><option>Serum</option><option>Plasma</option>
                  </select>
                </div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Collection Date</label><Input type="date" defaultValue="2026-09-18" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Collection Time</label><Input type="time" defaultValue="09:28" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Collected By</label><Input defaultValue="Asha • Lab Technician" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Collection Location</label><Input defaultValue="Triage Room 1" /></div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 p-4 justify-end gap-2 rounded-b-xl border-t">
              <Button variant="outline" onClick={() => setShowCollectModal(false)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowCollectModal(false)}>Confirm Collection</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* View Result Modal */}
      {showResultModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <Card className="w-full max-w-4xl shadow-2xl animate-in zoom-in-95 my-auto">
            <CardHeader className="border-b bg-slate-50 rounded-t-xl flex flex-row justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <TestTube className="size-5 text-blue-600" /> Blood Test Result
                </CardTitle>
                <CardDescription className="text-blue-700 font-medium">{selectedOrder.testName}</CardDescription>
              </div>
              <div className="flex gap-2">
                {isVerified && <Button variant="outline" size="sm" onClick={() => setShowReport(true)} className="gap-2"><FileText className="size-4"/> View Report</Button>}
                <Button variant="ghost" onClick={() => setShowResultModal(false)}>Close</Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">{selectedOrder.patientName[0]}</div>
                  <div><h3 className="font-bold">{selectedOrder.patientName}</h3><p className="text-sm text-slate-500">MRN: {selectedOrder.patientMrn}</p></div>
                </div>
                <div className="text-sm space-y-1 border-l pl-4 border-slate-200">
                  <p><span className="font-bold text-slate-500">Sample:</span> <span className="font-mono">{selectedOrder.sampleId}</span></p>
                  <p><span className="font-bold text-slate-500">Collected:</span> {selectedOrder.collectedAt}</p>
                </div>
                <div className="text-sm space-y-1 border-l pl-4 border-slate-200">
                  <p><span className="font-bold text-slate-500">Technician:</span> {selectedOrder.technician}</p>
                  <p><span className="font-bold text-slate-500">Status:</span> {getStatusBadge(selectedOrder.status)}</p>
                </div>
              </div>

              {!isVerified && (
                <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100 p-4 rounded-lg">
                  <div>
                    <h4 className="font-bold text-sm text-blue-900">Capture Method</h4>
                    <p className="text-xs text-blue-700 mt-1">You can manually enter results or import from a connected analyzer.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="bg-white">Manual Entry</Button>
                    <Button id="import-btn" onClick={simulateAnalyzerImport} className="bg-blue-600 hover:bg-blue-700 gap-2">
                      <Activity className="size-4" /> Analyzer Import
                    </Button>
                  </div>
                </div>
              )}

              {selectedOrder.results && selectedOrder.results.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow><TableHead>Parameter</TableHead><TableHead>Result</TableHead><TableHead>Unit</TableHead><TableHead>Reference / Expected Range</TableHead><TableHead>Flag</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.results.map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{r.parameter}</TableCell>
                          <TableCell>
                            {isVerified ? (
                              <span className="font-bold text-lg">{r.result}</span>
                            ) : (
                              <Input defaultValue={r.result} className="w-24 h-8 font-bold" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">{r.unit}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.range}</TableCell>
                          <TableCell>
                            {r.flag === "Normal" ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-none">Normal</Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-700 border-none flex items-center w-fit gap-1"><AlertTriangle className="size-3"/> {r.flag} (Review)</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-2 bg-slate-50 text-[10px] text-slate-400 text-center italic border-t border-slate-100">
                    * Reference ranges are for demonstration purposes and do not represent autonomous clinical diagnosis.
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-lg text-muted-foreground border border-dashed">
                  No results entered yet. Select a capture method above.
                </div>
              )}

              {/* Versioning & Traceability Demo */}
              {isVerified && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="size-6 text-emerald-600" />
                    <div>
                      <h3 className="font-bold">✓ Result Verified</h3>
                      <p className="text-sm">Verified by {selectedOrder.technician} • Awaiting Doctor Review</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-auto bg-white border-emerald-200 text-emerald-700">Amend Result</Button>
                  </div>
                  
                  {/* Timeline */}
                  <div className="pl-6 border-l-2 border-slate-200 space-y-4 relative ml-4 mt-6">
                    <div className="relative">
                      <div className="absolute -left-[31px] top-1 size-3 rounded-full bg-slate-300 border-2 border-white"></div>
                      <p className="text-sm font-bold text-slate-700">Original Result Entered</p>
                      <p className="text-xs text-slate-500">18 Sep • 10:15 AM via Analyzer Import</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[31px] top-1 size-3 rounded-full bg-emerald-500 border-2 border-white"></div>
                      <p className="text-sm font-bold text-emerald-700">Result Verified</p>
                      <p className="text-xs text-emerald-600">18 Sep • 10:55 AM by {selectedOrder.technician}</p>
                    </div>
                  </div>
                </div>
              )}

              {!isVerified && selectedOrder.results?.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-orange-800">Confirm Result Verification</h4>
                    <p className="text-sm text-orange-700">Confirm that this laboratory result has been reviewed and is ready for clinical use.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="bg-white">Save Draft</Button>
                    <Button onClick={() => setIsVerified(true)} className="bg-orange-600 hover:bg-orange-700">Verify Result</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Blood Test Report Preview Modal */}
      {showReport && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4">
          <Card className="w-full max-w-3xl h-[90vh] shadow-2xl flex flex-col">
            <CardHeader className="border-b bg-slate-800 text-white rounded-t-xl shrink-0 flex flex-row justify-between items-center">
              <CardTitle className="flex items-center gap-2"><FileText className="size-5"/> Report Preview</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 hover:bg-slate-600"><Printer className="size-4 mr-2"/> Print</Button>
                <Button variant="outline" size="sm" className="bg-slate-700 border-slate-600 hover:bg-slate-600"><Download className="size-4 mr-2"/> Download</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowReport(false)}>Close</Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 bg-slate-200 flex-1 overflow-y-auto">
              {/* Paper Document Simulation */}
              <div className="bg-white max-w-2xl mx-auto shadow-lg min-h-[800px] p-10 font-sans relative">
                
                <div className="text-center border-b-2 border-slate-800 pb-6 mb-6">
                  <h1 className="text-3xl font-bold tracking-widest text-slate-800">SMRKOMED</h1>
                  <h2 className="text-lg font-bold text-slate-600 mt-2">LABORATORY REPORT</h2>
                </div>

                <div className="grid grid-cols-2 gap-8 text-sm mb-8 border-b pb-6">
                  <div className="space-y-2">
                    <p><span className="font-bold w-24 inline-block">Patient:</span> {selectedOrder.patientName}</p>
                    <p><span className="font-bold w-24 inline-block">MRN:</span> {selectedOrder.patientMrn}</p>
                    <p><span className="font-bold w-24 inline-block">Age/Sex:</span> {selectedOrder.patientAge} Y / F</p>
                    <p><span className="font-bold w-24 inline-block">Doctor:</span> {selectedOrder.patientDoctor}</p>
                  </div>
                  <div className="space-y-2">
                    <p><span className="font-bold w-24 inline-block">Sample ID:</span> {selectedOrder.sampleId}</p>
                    <p><span className="font-bold w-24 inline-block">Test Name:</span> {selectedOrder.testName}</p>
                    <p><span className="font-bold w-24 inline-block">Collected:</span> {selectedOrder.collectedAt}</p>
                    <p><span className="font-bold w-24 inline-block">Reported:</span> 18 Sep • 10:55 AM</p>
                  </div>
                </div>

                <h3 className="font-bold text-lg mb-4 uppercase bg-slate-100 p-2 text-center">{selectedOrder.testName}</h3>

                <table className="w-full text-sm mb-12">
                  <thead>
                    <tr className="border-b-2 border-slate-300">
                      <th className="text-left py-2">Parameter</th>
                      <th className="text-left py-2">Result</th>
                      <th className="text-left py-2">Unit</th>
                      <th className="text-left py-2">Reference / Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.results?.map((r: any, i: number) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="py-3 font-medium">{r.parameter}</td>
                        <td className={`py-3 font-bold ${r.flag !== 'Normal' ? 'text-rose-600' : ''}`}>
                          {r.result} {r.flag !== 'Normal' ? '*' : ''}
                        </td>
                        <td className="py-3 text-slate-600">{r.unit}</td>
                        <td className="py-3 text-slate-600 text-xs">{r.range}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="absolute bottom-10 left-10 right-10 border-t pt-4 text-xs flex justify-between items-end">
                  <div>
                    <p className="font-bold mb-1">VERIFIED BY:</p>
                    <p className="italic text-lg text-blue-900 signature-font">{selectedOrder.technician}</p>
                    <p className="text-slate-500 mt-1">Laboratory Technician</p>
                  </div>
                  <div className="text-right text-slate-400">
                    <p>SmrkoMed Healthcare Demo • Page 1 of 1</p>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
