"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { User, Activity, FlaskConical, Clock, ChevronRight, Stethoscope, AlertTriangle, UploadCloud, CheckCircle2, Baby } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CLINICAL_DEMO_DATA, TimelineEvent } from "../demoData";

export default function PatientDiagnosticsView() {
  const routeParams = useParams<{ patientId: string }>();
  const patientId = routeParams?.patientId;
  // Use matching patient or first patient as demo fallback
  const patient = (patientId ? CLINICAL_DEMO_DATA.find(p => p.id === patientId) : null) || CLINICAL_DEMO_DATA[0];
  const [activeTab, setActiveTab] = useState("Overview");

  const tabs = ["Overview", "Timeline", "Vitals", "Laboratory", "Blood Tests", "Fertility", "Semen", "Imaging", "IVF Lab"];

  const getTimelineIcon = (role: string) => {
    switch (role) {
      case "Nurse": return <Activity className="size-4 text-emerald-500" />;
      case "Lab Tech": return <FlaskConical className="size-4 text-purple-500" />;
      case "Diag Tech": return <UploadCloud className="size-4 text-blue-500" />;
      case "Doctor": return <Stethoscope className="size-4 text-rose-500" />;
      default: return <Clock className="size-4 text-slate-500" />;
    }
  };

  if (!patient) {
    return <div className="p-12 text-center text-slate-500">Patient not found.</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      
      {/* Patient Header */}
      <Card className="shadow-sm border-none bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-bold text-slate-700">
                {patient.name[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-primary">{patient.name}</h1>
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                  <span>MRN: {patient.mrn}</span>
                  <span>Age: {patient.age}</span>
                  <span>Doctor: {patient.doctor}</span>
                </div>
              </div>
            </div>
            
            {patient.activeCycle && (
              <div className="bg-pink-50 border border-pink-100 p-3 rounded-lg text-right">
                <p className="text-xs font-bold text-pink-500">Active Treatment Context</p>
                <p className="text-sm font-bold text-pink-800">{patient.activeCycle}</p>
                <p className="text-xs text-pink-600">{patient.visit}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <Button 
            key={tab} 
            variant={activeTab === tab ? "default" : "outline"} 
            className={activeTab === tab ? "bg-slate-800 hover:bg-slate-900" : "bg-white"}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          
          {activeTab === "Overview" && (
            <>
              {/* IVF Context */}
              {patient.ivfCases.length > 0 && (
                <Card className="shadow-sm border-none border-t-4 border-t-indigo-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-indigo-800">
                      <Baby className="size-5" /> Active IVF Workflow
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-8 items-center bg-indigo-50/50 p-4 rounded-lg">
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-500">Oocytes</p>
                        <p className="text-2xl font-bold text-indigo-900">{patient.ivfCases[0]?.oocytesRetrieved}</p>
                      </div>
                      <ChevronRight className="text-indigo-200" />
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-500">Fertilised</p>
                        <p className="text-2xl font-bold text-indigo-900">{patient.ivfCases[0]?.fertilisedCount}</p>
                      </div>
                      <ChevronRight className="text-indigo-200" />
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-500">In Culture</p>
                        <p className="text-2xl font-bold text-indigo-900">{patient.ivfCases[0]?.embryos.length}</p>
                      </div>
                      <div className="ml-auto">
                        <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200 bg-white">View Lab Sheet</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Latest Lab Results */}
              <Card className="shadow-sm border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FlaskConical className="size-5 text-purple-600" /> Latest Lab Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {patient.labOrders.length > 0 ? (
                    <div className="space-y-4">
                      {patient.labOrders.map(order => (
                        <div key={order.id} className="p-4 border rounded-lg bg-white shadow-sm flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-800">{order.testName}</h4>
                            <p className="text-sm text-slate-500">{order.collectedAt} • {order.category}</p>
                          </div>
                          <div>
                            <Badge className="bg-purple-50 text-purple-700 border-purple-200">{order.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 p-4 text-center bg-slate-50 rounded-lg">No lab results available.</p>
                  )}
                </CardContent>
              </Card>

              {/* Latest Imaging */}
              <Card className="shadow-sm border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UploadCloud className="size-5 text-blue-600" /> Latest Imaging
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {patient.ultrasounds.length > 0 ? (
                    <div className="space-y-4">
                      {patient.ultrasounds.map(scan => (
                        <div key={scan.id} className="p-4 border rounded-lg bg-white shadow-sm flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-800">{scan.type}</h4>
                            <p className="text-sm text-slate-500">{scan.date} • {scan.machine}</p>
                          </div>
                          <div>
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200">{scan.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 p-4 text-center bg-slate-50 rounded-lg">No imaging available.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "Timeline" && (
            <Card className="shadow-sm border-none">
              <CardHeader>
                <CardTitle>Unified Diagnostic Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {patient.timeline.map((event: TimelineEvent) => (
                    <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-[.is-active]:bg-emerald-50 text-slate-500 group-[.is-active]:text-emerald-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        {getTimelineIcon(event.role)}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-100 bg-white shadow-sm">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-slate-900">{event.text}</div>
                          <time className="font-mono text-xs text-slate-500">{event.time}</time>
                        </div>
                        <div className="text-xs text-slate-500 mt-2 flex gap-2">
                          <span className="font-medium bg-slate-100 px-2 py-0.5 rounded">{event.role}</span>
                          {event.source && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{event.source}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab !== "Overview" && activeTab !== "Timeline" && (
            <Card className="shadow-sm border-none">
              <CardContent className="p-12 text-center text-muted-foreground">
                <p>Detailed view for {activeTab} will render here.</p>
                <p className="text-sm mt-2">See Overview or Timeline for mock data.</p>
              </CardContent>
            </Card>
          )}

        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-none bg-slate-800 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Pending Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-rose-400">0</div>
              <p className="text-sm text-slate-300 mt-2">All diagnostics reviewed by doctor.</p>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
