"use client";

import { useState, useEffect } from "react";
import { Stethoscope, Search, CheckCircle2, AlertTriangle, ChevronRight, FileText, Activity, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CLINICAL_DEMO_DATA } from "../demoData";
import { Textarea } from "@/components/ui/textarea";
import { clinicApi } from "@/lib/clinic-api";

export default function ClinicalReviewPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dbReviews, setDbReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = () => {
    setLoading(true);
    clinicApi
      .diagnostics({ reviewPending: "true" })
      .then((items) => {
        if (Array.isArray(items)) {
          const mapped = items.map((o) => ({
            id: o.id,
            patientName: o.patientName,
            patientMrn: o.patientId?.slice(-6) || "P-REV",
            type: o.category || "Laboratory",
            subType: o.category || "Pathology",
            title: o.testName,
            date: o.updatedAt ? new Date(o.updatedAt).toLocaleDateString() : "Today",
            status: o.status,
            urgent: o.priority === "Urgent" || o.priority === "Stat",
            results: o.results,
            findings: o.findings,
            source: o.specimen?.collectedBy ? `Staff (${o.specimen.collectedBy})` : "Lab",
            isDbRecord: true,
          }));
          setDbReviews(mapped);
        }
      })
      .catch(() => {
        // Quietly keep local demo data if API not responding
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Demo reviews fallback
  const demoReviews: any[] = [];
  CLINICAL_DEMO_DATA.forEach((p) => {
    p.labOrders.forEach((o) => {
      if (o.status === "Verified" || o.status === "Result Ready") {
        demoReviews.push({
          id: o.id,
          patientName: p.name,
          patientMrn: p.mrn,
          type: "Laboratory",
          subType: o.category,
          title: o.testName,
          date: o.collectedAt,
          status: o.status,
          urgent: o.priority === "Urgent",
          results: o.results,
          source: "Lab Technician",
        });
      }
    });

    p.semenAnalyses.forEach((sa) => {
      if (sa.status === "Verified") {
        demoReviews.push({
          id: sa.id,
          patientName: p.name,
          patientMrn: p.mrn,
          type: "Semen Analysis",
          subType: "Andrology",
          title: "Semen Analysis",
          date: sa.date,
          status: sa.status,
          urgent: false,
          source: "Andrology Lab",
        });
      }
    });

    p.ultrasounds.forEach((us) => {
      if (us.status === "Report Ready") {
        demoReviews.push({
          id: us.id,
          patientName: p.name,
          patientMrn: p.mrn,
          type: "Imaging",
          subType: us.type,
          title: us.type,
          date: us.date,
          status: us.status,
          urgent: false,
          findings: us.findings,
          source: us.machine,
        });
      }
    });
  });

  const allReviews = [...dbReviews, ...demoReviews].filter((item, idx, arr) =>
    arr.findIndex((x) => x.id === item.id) === idx
  );

  const filteredReviews = allReviews.filter((r) => {
    const matchesFilter =
      filter === "All" ||
      r.type.toLowerCase().includes(filter.toLowerCase()) ||
      r.subType.toLowerCase().includes(filter.toLowerCase());
    const matchesSearch =
      !search ||
      r.patientName.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.patientMrn.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleReviewAction = async (action: "APPROVE" | "REQUEST_RETEST") => {
    if (!selectedReview) return;
    setSubmitting(true);
    try {
      if (selectedReview.isDbRecord) {
        await clinicApi.reviewDiagnosticOrder(selectedReview.id, {
          doctorNotes: clinicalNotes || (action === "APPROVE" ? "Approved by doctor" : "Retest requested"),
          action,
        });
      }
      // Optimistically remove from review list
      setDbReviews((prev) => prev.filter((r) => r.id !== selectedReview.id));
      setSelectedReview(null);
      setClinicalNotes("");
      fetchReviews();
    } catch (err) {
      console.error("Failed to submit doctor review", err);
      // Fallback local removal
      setDbReviews((prev) => prev.filter((r) => r.id !== selectedReview.id));
      setSelectedReview(null);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-none">Verified</Badge>;
      case "Result Ready":
        return <Badge className="bg-purple-500/10 text-purple-600 border-none">Result Ready</Badge>;
      case "Report Ready":
        return <Badge className="bg-blue-500/10 text-blue-600 border-none">Report Ready</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Stethoscope className="size-8 text-rose-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Clinical Review</h1>
            <p className="text-muted-foreground">Doctor verification queue for diagnostics, imaging and labs.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReviews} className="gap-2 bg-white">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Queue
        </Button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {["All", "Vitals", "Laboratory", "Blood / Pathology", "Fertility", "Semen Analysis", "Imaging", "IVF Lab"].map(
          (f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              className={filter === f ? "bg-rose-600 hover:bg-rose-700" : "bg-white"}
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          )
        )}
      </div>

      <Card className="shadow-sm border-none">
        <CardHeader className="border-b bg-white pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">Needs Review ({filteredReviews.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search patient, test..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-[250px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Patient</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Report / Test</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.length > 0 ? (
                filteredReviews.map((row, idx) => (
                  <TableRow key={row.id || idx}>
                    <TableCell className="pl-6">
                      <div className="font-bold text-primary">{row.patientName}</div>
                      <div className="text-xs text-muted-foreground">MRN: {row.patientMrn}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-sm">{row.type}</div>
                      <div className="text-xs text-muted-foreground">{row.subType}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.title}</span>
                        {row.urgent && (
                          <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                            URGENT
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{row.date}</div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{row.source}</TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedReview(row);
                          setClinicalNotes("");
                        }}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        Review <ChevronRight className="size-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                    No diagnostic reports awaiting doctor review.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Review Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <Card className="w-full max-w-3xl shadow-2xl flex flex-col animate-in zoom-in-95 my-auto">
            <CardHeader className="border-b bg-slate-50 rounded-t-xl shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl text-rose-800">{selectedReview.title}</CardTitle>
                  <CardDescription className="text-rose-600 font-medium">
                    {selectedReview.type} • {selectedReview.subType}
                  </CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setSelectedReview(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 bg-white space-y-6">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border">
                <div className="size-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-bold">
                  {selectedReview.patientName[0]}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{selectedReview.patientName}</h3>
                  <p className="text-sm text-slate-500">MRN: {selectedReview.patientMrn}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500">Source</p>
                  <p className="text-sm font-bold text-slate-700">{selectedReview.source}</p>
                </div>
              </div>

              {selectedReview.results && selectedReview.results.length > 0 ? (
                <Table className="border rounded-lg">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Reference Range</TableHead>
                      <TableHead>Flag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReview.results.map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-slate-700">{r.parameter}</TableCell>
                        <TableCell className="font-bold text-lg">
                          {r.result} <span className="text-xs text-muted-foreground font-normal">{r.unit}</span>
                        </TableCell>
                        <TableCell className="text-sm text-slate-400">{r.range || "Standard"}</TableCell>
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
              ) : selectedReview.findings ? (
                <div className="border rounded-lg p-4 bg-slate-50 space-y-2">
                  <h4 className="font-bold text-sm text-slate-700">Report Findings</h4>
                  <p className="text-slate-800">{selectedReview.findings}</p>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground bg-slate-50 rounded-lg border">
                  Detailed view for this diagnostic type recorded in clinic repository.
                </div>
              )}

              <div className="space-y-2 border-t pt-4">
                <label className="text-sm font-bold text-slate-700">Add Clinical Note</label>
                <Textarea
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Enter your clinical interpretation or next steps here..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  disabled={submitting}
                  onClick={() => handleReviewAction("REQUEST_RETEST")}
                >
                  Request Re-test
                </Button>
                <Button
                  className="bg-rose-600 hover:bg-rose-700"
                  disabled={submitting}
                  onClick={() => handleReviewAction("APPROVE")}
                >
                  {submitting ? "Signing Off..." : "Mark Reviewed"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
