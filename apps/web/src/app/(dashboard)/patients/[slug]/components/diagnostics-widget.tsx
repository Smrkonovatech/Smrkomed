"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FlaskConical, ArrowRight, Plus, CheckCircle2, Clock, AlertCircle, FileText, Stethoscope } from "lucide-react";
import { clinicApi } from "@/lib/clinic-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function PatientDiagnosticsWidget({
  patientId,
  coupleId,
}: {
  patientId: string;
  coupleId?: string;
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [testName, setTestName] = useState("AMH & Hormone Panel");
  const [category, setCategory] = useState("Fertility Lab");
  const [priority, setPriority] = useState<"Routine" | "Urgent" | "Stat">("Routine");
  const [ordering, setOrdering] = useState(false);

  const loadData = () => {
    if (!patientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    clinicApi
      .patientDiagnostics(patientId)
      .then((res: any) => {
        setOrders(res?.orders || []);
      })
      .catch((err) => {
        console.error("Failed to load patient diagnostics:", err);
        setOrders([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [patientId]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrdering(true);
    try {
      await clinicApi.createDiagnosticOrder({
        patientId,
        coupleId,
        testName,
        category,
        priority,
      });
      setShowOrderModal(false);
      loadData();
    } catch {
      // Optimistic local append
      setOrders((prev) => [
        {
          id: `local_${Date.now()}`,
          testName,
          category,
          priority,
          status: "Ordered",
          dueDate: new Date().toISOString(),
        },
        ...prev,
      ]);
      setShowOrderModal(false);
    } finally {
      setOrdering(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Doctor Reviewed":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Reviewed</Badge>;
      case "Verified":
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">Needs Review</Badge>;
      case "Result Ready":
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">Result Ready</Badge>;
      case "Processing":
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Processing</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border-slate-200 text-[10px]">Ordered</Badge>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Clinical Diagnostics</h2>
            <p className="text-[11px] text-gray-500">Orders, lab tests & verified reports</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2 gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
            onClick={() => setShowOrderModal(true)}
          >
            <Plus className="w-3.5 h-3.5" /> Order Test
          </Button>
          <Link
            href="/clinical-diagnostics"
            className="text-purple-600 text-xs font-semibold flex items-center gap-1 hover:text-purple-700"
          >
            All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-50/80 p-2.5 rounded-xl text-center">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-medium">Total</span>
          <p className="text-base font-bold text-slate-800">{orders.length}</p>
        </div>
        <div>
          <span className="text-[10px] text-purple-600 uppercase font-medium">Pending Review</span>
          <p className="text-base font-bold text-purple-700">
            {orders.filter((o) => o.status === "Verified" || o.status === "Result Ready").length}
          </p>
        </div>
        <div>
          <span className="text-[10px] text-emerald-600 uppercase font-medium">Reviewed</span>
          <p className="text-base font-bold text-emerald-700">
            {orders.filter((o) => o.status === "Doctor Reviewed").length}
          </p>
        </div>
      </div>

      {/* Orders List */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[260px] pr-1">
        {orders.length > 0 ? (
          orders.map((order) => (
            <div
              key={order.id}
              className="p-3 rounded-xl border border-slate-100 hover:border-purple-200 transition-colors bg-white space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-900 truncate max-w-[170px]">{order.testName}</span>
                {getStatusBadge(order.status)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{order.category}</span>
                {order.priority !== "Routine" && (
                  <span className="text-rose-600 font-bold uppercase text-[10px]">{order.priority}</span>
                )}
              </div>
              {order.results && order.results.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {order.results.slice(0, 3).map((r: any, idx: number) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono"
                    >
                      {r.parameter}: {r.result} {r.unit}
                    </span>
                  ))}
                </div>
              )}
              {order.findings && (
                <p className="text-[11px] text-slate-600 truncate italic">Scan: {order.findings}</p>
              )}
              {order.doctorReview?.doctorNotes && (
                <p className="text-[11px] text-emerald-700 font-medium truncate">
                  Dr: {order.doctorReview.doctorNotes}
                </p>
              )}
              {order.status === "Verified" && (
                <div className="pt-1">
                  <Link href="/clinical-diagnostics/review">
                    <span className="text-[11px] text-purple-700 font-semibold hover:underline flex items-center gap-1">
                      <Stethoscope className="w-3 h-3" /> Doctor Review Required
                    </span>
                  </Link>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-center text-slate-400 text-xs">
            <FlaskConical className="w-6 h-6 mb-1 text-slate-300" />
            No diagnostic orders yet
          </div>
        )}
      </div>

      {/* Quick Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full border space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900">Order Clinical Diagnostic</h3>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-slate-700">Test / Investigation Name</label>
                <input
                  type="text"
                  required
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="e.g. AMH & Hormone Panel, Semen Analysis, Follicular Scan"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-purple-600 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-purple-600 text-xs bg-white"
                  >
                    <option value="Fertility Lab">Fertility Lab (AMH/Hormones)</option>
                    <option value="Pathology">General Pathology</option>
                    <option value="Semen Analysis">Semen Analysis / Andrology</option>
                    <option value="Imaging">Imaging & Ultrasound</option>
                    <option value="IVF / Embryology">IVF / Embryology</option>
                    <option value="Blood / Pathology">Blood / CBC</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-slate-700">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-purple-600 text-xs bg-white"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Stat">Stat (Immediate)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowOrderModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={ordering}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {ordering ? "Ordering..." : "Confirm Diagnostic Order"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
