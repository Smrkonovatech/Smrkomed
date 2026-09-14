"use client";

import Link from "next/link";
import { 
  Activity, 
  FlaskConical, 
  UploadCloud, 
  Bluetooth, 
  Clock, 
  AlertCircle,
  FileText,
  Stethoscope,
  Users,
  Microscope,
  Baby
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ClinicalDiagnosticsDashboard() {
  const kpis = [
    { label: "Today's Patients", value: "28", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Vitals Recorded", value: "21", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Pending Samples", value: "12", icon: FlaskConical, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Results Ready", value: "7", icon: Microscope, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Awaiting Doctor Review", value: "4", icon: Stethoscope, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "Flagged Results", value: "3", icon: AlertCircle, color: "text-rose-700", bg: "bg-rose-700/10" },
  ];

  return (
    <div className="flex-1 space-y-8 p-6 pb-12 pt-6 bg-slate-50/50">
      
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Clinical Diagnostics</h1>
          <p className="text-muted-foreground">
            Capture, process and review clinical data across your fertility centre.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm">
            <Link href="/clinical-diagnostics/vitals">
              <Activity className="size-4 text-emerald-600" />
              Record Vitals
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm">
            <Link href="/clinical-diagnostics/lab">
              <FlaskConical className="size-4 text-purple-600" />
              New Lab Test
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm">
            <Link href="/clinical-diagnostics/fertility">
              <Microscope className="size-4 text-pink-600" />
              New Fertility Test
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2 bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm">
            <Link href="/clinical-diagnostics/diagnostics">
              <UploadCloud className="size-4 text-blue-600" />
              Schedule Scan
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="overflow-hidden border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <div className={`rounded-md p-1.5 ${kpi.bg}`}>
                <kpi.icon className={`size-3.5 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Module Navigation Cards */}
        <div className="grid gap-4 grid-cols-2">
          
          <Card className="shadow-sm hover:border-emerald-500/50 transition-colors cursor-pointer">
            <Link href="/clinical-diagnostics/vitals">
              <CardHeader className="pb-3">
                <div className="rounded-full bg-emerald-500/10 w-10 h-10 flex items-center justify-center mb-2">
                  <Activity className="size-5 text-emerald-600" />
                </div>
                <CardTitle className="text-base">Vitals</CardTitle>
                <CardDescription className="text-xs">Patient measurements & device integration</CardDescription>
              </CardHeader>
            </Link>
          </Card>
          
          <Card className="shadow-sm hover:border-purple-500/50 transition-colors cursor-pointer">
            <Link href="/clinical-diagnostics/lab">
              <CardHeader className="pb-3">
                <div className="rounded-full bg-purple-500/10 w-10 h-10 flex items-center justify-center mb-2">
                  <FlaskConical className="size-5 text-purple-600" />
                </div>
                <CardTitle className="text-base">General Laboratory</CardTitle>
                <CardDescription className="text-xs">Pathology, CBC, & standard testing</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="shadow-sm hover:border-pink-500/50 transition-colors cursor-pointer border-pink-100">
            <Link href="/clinical-diagnostics/fertility">
              <CardHeader className="pb-3">
                <div className="rounded-full bg-pink-500/10 w-10 h-10 flex items-center justify-center mb-2">
                  <Microscope className="size-5 text-pink-600" />
                </div>
                <CardTitle className="text-base">Fertility Diagnostics</CardTitle>
                <CardDescription className="text-xs">Hormone panels & specialised tests</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="shadow-sm hover:border-orange-500/50 transition-colors cursor-pointer border-orange-100">
            <Link href="/clinical-diagnostics/semen-analysis">
              <CardHeader className="pb-3">
                <div className="rounded-full bg-orange-500/10 w-10 h-10 flex items-center justify-center mb-2">
                  <FlaskConical className="size-5 text-orange-600" />
                </div>
                <CardTitle className="text-base">Semen Analysis</CardTitle>
                <CardDescription className="text-xs">Andrology & sperm processing</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="shadow-sm hover:border-blue-500/50 transition-colors cursor-pointer border-blue-100">
            <Link href="/clinical-diagnostics/diagnostics">
              <CardHeader className="pb-3">
                <div className="rounded-full bg-blue-500/10 w-10 h-10 flex items-center justify-center mb-2">
                  <UploadCloud className="size-5 text-blue-600" />
                </div>
                <CardTitle className="text-base">Imaging & Ultrasound</CardTitle>
                <CardDescription className="text-xs">Follicular tracking & pelvic scans</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="shadow-sm hover:border-indigo-500/50 transition-colors cursor-pointer border-indigo-100">
            <Link href="/clinical-diagnostics/ivf-lab">
              <CardHeader className="pb-3">
                <div className="rounded-full bg-indigo-500/10 w-10 h-10 flex items-center justify-center mb-2">
                  <Baby className="size-5 text-indigo-600" />
                </div>
                <CardTitle className="text-base">IVF / Embryology</CardTitle>
                <CardDescription className="text-xs">Culture, assessment & cryopreservation</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="shadow-sm hover:border-rose-500/50 transition-colors cursor-pointer">
            <Link href="/clinical-diagnostics/review">
              <CardHeader className="pb-3">
                <div className="rounded-full bg-rose-500/10 w-10 h-10 flex items-center justify-center mb-2">
                  <Stethoscope className="size-5 text-rose-600" />
                </div>
                <CardTitle className="text-base">Clinical Review</CardTitle>
                <CardDescription className="text-xs">Doctor verification queue</CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="shadow-sm hover:border-slate-500/50 transition-colors cursor-pointer">
            <Link href="/clinical-diagnostics/devices">
              <CardHeader className="pb-3">
                <div className="rounded-full bg-slate-500/10 w-10 h-10 flex items-center justify-center mb-2">
                  <Bluetooth className="size-5 text-slate-600" />
                </div>
                <CardTitle className="text-base">Devices</CardTitle>
                <CardDescription className="text-xs">Analyser & machine integrations</CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* Activity Timeline / Operations Summary */}
        <div className="space-y-6">
          <Card className="shadow-sm border-none">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="size-5 text-primary" />
                Today's Clinical Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <div className="divide-y">
                
                <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-emerald-100 text-emerald-700">
                      <Activity className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Vitals</h4>
                      <p className="text-xs text-muted-foreground">Triage & general measurements</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">21 <span className="text-xs font-normal text-muted-foreground">recorded</span></p>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-purple-100 text-purple-700">
                      <FlaskConical className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Laboratory</h4>
                      <p className="text-xs text-muted-foreground">Pathology & processing</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">42 <span className="text-xs font-normal text-muted-foreground">samples</span></p>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-pink-100 text-pink-700">
                      <Microscope className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Fertility Diagnostics</h4>
                      <p className="text-xs text-muted-foreground">Hormone & semen analysis</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">14 <span className="text-xs font-normal text-muted-foreground">tests</span></p>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-blue-100 text-blue-700">
                      <UploadCloud className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Imaging</h4>
                      <p className="text-xs text-muted-foreground">Follicular & pelvic scans</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">8 <span className="text-xs font-normal text-muted-foreground">scans</span></p>
                  </div>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-indigo-100 text-indigo-700">
                      <Baby className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">IVF / Embryology</h4>
                      <p className="text-xs text-muted-foreground">Active culture cycles</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">5 <span className="text-xs font-normal text-muted-foreground">cases</span></p>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
