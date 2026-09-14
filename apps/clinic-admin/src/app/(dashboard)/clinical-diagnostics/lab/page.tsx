"use client";

import { useState } from "react";
import Link from "next/link";
import { FlaskConical, Droplet, Search, Filter, CheckCircle2, AlertTriangle, Eye, Plus, Beaker, FileText, Activity, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CLINICAL_DEMO_DATA, LabOrder } from "../demoData";

export default function LaboratoryPage() {
  const [search, setSearch] = useState("");
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Flatten lab orders for the queue
  const allOrders = CLINICAL_DEMO_DATA.flatMap(p => 
    p.labOrders.map(order => ({
      ...order,
      patientName: p.name,
      patientMrn: p.mrn,
      patientId: p.id
    }))
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Result Ready": return <Badge className="bg-purple-500/10 text-purple-600 border-none">Result Ready</Badge>;
      case "Verified": return <Badge className="bg-emerald-500/10 text-emerald-600 border-none">Verified</Badge>;
      case "Processing": return <Badge className="bg-blue-500/10 text-blue-600 border-none">Processing</Badge>;
      case "Sample Pending": return <Badge className="bg-amber-500/10 text-amber-600 border-none">Sample Pending</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <FlaskConical className="size-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Laboratory</h1>
            <p className="text-muted-foreground">Manage samples, result entry, and verifications.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCollectModal(true)} className="bg-white">
            Collect Sample
          </Button>
          <Button onClick={() => setShowOrderModal(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="size-4 mr-2" /> New Lab Test
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="shadow-sm border-none bg-blue-500/5">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm text-blue-800">Pending Samples</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-900">4</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-purple-500/5">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm text-purple-800">Processing</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-purple-900">12</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-orange-500/5">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm text-orange-800">Results Ready</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-900">7</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-emerald-500/5">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm text-emerald-800">Verified Today</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-900">21</div></CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-4 text-slate-800">Test Categories</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Link href="/clinical-diagnostics/lab/blood">
            <Card className="shadow-sm cursor-pointer hover:border-blue-300 h-full">
              <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-700 rounded-lg"><Droplet className="size-5 text-blue-600" /></div>
                <div><h3 className="font-bold">Blood / Pathology</h3><p className="text-xs text-muted-foreground">CBC, Routine & Screening</p></div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/clinical-diagnostics/fertility">
            <Card className="shadow-sm cursor-pointer hover:border-pink-300 h-full">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-pink-100 text-pink-700 rounded-lg"><FlaskConical className="size-5" /></div>
                <div><h3 className="font-bold">Fertility Lab</h3><p className="text-xs text-muted-foreground">AMH, Hormone Panels</p></div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/clinical-diagnostics/semen-analysis">
            <Card className="shadow-sm cursor-pointer hover:border-orange-300 h-full">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-orange-100 text-orange-700 rounded-lg"><Beaker className="size-5" /></div>
                <div><h3 className="font-bold">Semen Analysis</h3><p className="text-xs text-muted-foreground">Andrology testing</p></div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/clinical-diagnostics/ivf-lab">
            <Card className="shadow-sm cursor-pointer hover:border-indigo-300 h-full">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-lg"><Layers className="size-5" /></div>
                <div><h3 className="font-bold">IVF / Embryology</h3><p className="text-xs text-muted-foreground">Sperm Processing, Oocytes</p></div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <Card className="shadow-sm border-none mt-6">
        <CardHeader className="border-b bg-white pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Lab Test Queue</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search patient, sample..." className="pl-8 w-[250px]" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Patient</TableHead>
                <TableHead>Test / Sample ID</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allOrders.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-6">
                    <div className="font-medium text-primary">{row.patientName}</div>
                    <div className="text-xs text-muted-foreground">MRN: {row.patientMrn}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{row.testName}</div>
                    <div className="text-xs text-muted-foreground">{row.sampleId}</div>
                  </TableCell>
                  <TableCell><span className="text-xs text-slate-500 border px-2 py-0.5 rounded-full">{row.category}</span></TableCell>
                  <TableCell>
                    {row.priority === "Urgent" ? <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">Urgent</span> : <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Routine</span>}
                  </TableCell>
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" onClick={() => {
                      setSelectedOrder(row);
                      setIsVerified(row.status === "Verified");
                      setShowResultModal(true);
                    }} className="text-primary">
                      <Eye className="size-4 mr-2" /> View
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
          <Card className="w-full max-w-lg shadow-lg animate-in zoom-in-95">
            <CardHeader className="border-b bg-slate-50 rounded-t-xl"><CardTitle>Create Lab Order</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Patient</label><Input defaultValue="Ananya Sharma" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">MRN</label><Input defaultValue="10452" readOnly /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Test Category</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option>Pathology</option><option>Fertility Lab</option><option>Semen Analysis</option><option>IVF / Embryology</option>
                  </select>
                </div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Test</label><Input defaultValue="CBC" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Priority</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option>Routine</option><option>Urgent</option>
                  </select>
                </div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Requested Date</label><Input type="date" /></div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 p-4 justify-end gap-2 rounded-b-xl border-t">
              <Button variant="outline" onClick={() => setShowOrderModal(false)}>Cancel</Button>
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setShowOrderModal(false)}>Create Order</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Collect Sample Modal */}
      {showCollectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg shadow-lg animate-in zoom-in-95">
            <CardHeader className="border-b bg-slate-50 rounded-t-xl"><CardTitle>Sample Collection</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Sample ID</label><Input placeholder="Scan barcode or enter ID" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Sample Type</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <option>Blood</option><option>Serum</option><option>Plasma</option><option>Urine</option><option>Semen</option><option>Other</option>
                  </select>
                </div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Collection Date</label><Input type="date" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Collection Time</label><Input type="time" /></div>
                <div className="space-y-1 col-span-2"><label className="text-xs font-bold text-slate-500">Collected By</label><Input defaultValue="Nurse Priya" /></div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 p-4 justify-end gap-2 rounded-b-xl border-t">
              <Button variant="outline" onClick={() => setShowCollectModal(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCollectModal(false)}>Confirm Collection</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* View Result Modal */}
      {showResultModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-3xl shadow-lg animate-in zoom-in-95">
            <CardHeader className="border-b bg-slate-50 rounded-t-xl flex flex-row justify-between">
              <div>
                <CardTitle className="text-xl">{selectedOrder.testName}</CardTitle>
                <CardDescription>Sample: {selectedOrder.sampleId} • Category: {selectedOrder.category}</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setShowResultModal(false)}>Close</Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6 p-4 bg-blue-50 border rounded-lg">
                <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">{selectedOrder.patientName[0]}</div>
                <div><h3 className="font-bold">{selectedOrder.patientName}</h3><p className="text-sm text-slate-500">MRN: {selectedOrder.patientMrn}</p></div>
              </div>

              {selectedOrder.results && selectedOrder.results.length > 0 ? (
                <Table className="border rounded-lg">
                  <TableHeader className="bg-slate-50">
                    <TableRow><TableHead>Parameter</TableHead><TableHead>Result</TableHead><TableHead>Unit</TableHead><TableHead>Flag</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.results.map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.parameter}</TableCell>
                        <TableCell className="font-bold">{r.result}</TableCell>
                        <TableCell className="text-sm text-slate-500">{r.unit}</TableCell>
                        <TableCell>{r.flag === "Normal" ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">Normal</Badge> : <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none">{r.flag}</Badge>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-8 text-muted-foreground bg-slate-50 rounded-lg">No parsed results available for this view. Please refer to specialized module.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
