"use client";

import { useState } from "react";
import { Activity, Bluetooth, Search, CheckCircle2, ChevronDown, User, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLINICAL_DEMO_DATA, CONNECTED_DEVICES } from "../demoData";

export default function VitalsPage() {
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(CLINICAL_DEMO_DATA[0]);
  
  const [captureMethod, setCaptureMethod] = useState<"Manual" | "Device">("Manual");
  const [isScanning, setIsScanning] = useState(false);
  const [devicesFound, setDevicesFound] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Form State
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [spo2, setSpo2] = useState("");
  const [temp, setTemp] = useState("");
  const [resp, setResp] = useState("");
  const [weight, setWeight] = useState("");

  const handleDeviceScan = () => {
    setIsScanning(true);
    setDevicesFound(false);
    setTimeout(() => {
      setIsScanning(false);
      setDevicesFound(true);
    }, 1500); // simulate scan delay
  };

  const handleUseReading = () => {
    // Simulate getting data from device
    setBp("118/76");
    setHr("72");
    setSpo2("98%");
    setCaptureMethod("Manual"); // switch back to show form with populated data
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  if (!selectedPatient) {
    return <div className="p-12 text-center text-slate-500">No patient data available.</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="size-8 text-emerald-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Vitals</h1>
          <p className="text-muted-foreground">Record and track patient measurements.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Record Vitals Area */}
        <div className="md:col-span-8 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-4 border-b">
              <CardTitle>Record Patient Vitals</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              
              {/* Patient Search */}
              <div className="flex gap-4 mb-8">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Search Patient / MRN..." 
                    className="pl-8" 
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* Patient Banner */}
              <div className="flex items-center justify-between p-4 mb-8 bg-blue-50/50 border border-blue-100 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                    {selectedPatient.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{selectedPatient.name}</h3>
                    <p className="text-sm text-slate-500">MRN: {selectedPatient.mrn} • {selectedPatient.age} yrs • {selectedPatient.doctor}</p>
                  </div>
                </div>
              </div>

              {/* Capture Method Toggle */}
              <div className="flex items-center gap-4 mb-6 border-b pb-4">
                <span className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Capture Method:</span>
                <div className="flex bg-slate-100 p-1 rounded-md">
                  <Button 
                    variant={captureMethod === "Manual" ? "default" : "ghost"} 
                    size="sm" 
                    onClick={() => setCaptureMethod("Manual")}
                    className={captureMethod === "Manual" ? "bg-white text-slate-900 shadow-sm hover:bg-white" : "text-slate-500"}
                  >
                    Manual Entry
                  </Button>
                  <Button 
                    variant={captureMethod === "Device" ? "default" : "ghost"} 
                    size="sm" 
                    onClick={() => { setCaptureMethod("Device"); handleDeviceScan(); }}
                    className={captureMethod === "Device" ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700" : "text-slate-500 gap-2"}
                  >
                    <Bluetooth className="size-4" />
                    Device Capture
                  </Button>
                </div>
              </div>

              {captureMethod === "Manual" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Blood Pressure</Label>
                    <Input placeholder="120/80" value={bp} onChange={e => setBp(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Heart Rate</Label>
                    <Input placeholder="72" value={hr} onChange={e => setHr(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>SpO₂ (%)</Label>
                    <Input placeholder="98" value={spo2} onChange={e => setSpo2(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature (°C)</Label>
                    <Input placeholder="36.6" value={temp} onChange={e => setTemp(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Resp. Rate</Label>
                    <Input placeholder="16" value={resp} onChange={e => setResp(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input placeholder="65.0" value={weight} onChange={e => setWeight(e.target.value)} />
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50/30 border border-blue-100 border-dashed rounded-lg p-8 flex flex-col items-center justify-center min-h-[200px]">
                  {isScanning && (
                    <div className="flex flex-col items-center text-blue-600">
                      <Bluetooth className="size-8 animate-pulse mb-4" />
                      <p className="font-medium animate-pulse">Searching for nearby devices...</p>
                    </div>
                  )}
                  {devicesFound && (
                    <div className="w-full max-w-md space-y-4">
                      <h4 className="font-bold text-slate-700 text-center mb-4">Devices Found</h4>
                      
                      <div className="flex items-center justify-between p-4 bg-white border rounded-md shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-full text-blue-700">
                            <Activity className="size-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">Digital BP Monitor</p>
                            <p className="text-xs text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="size-3" /> Connected
                            </p>
                          </div>
                        </div>
                        <Button size="sm" onClick={handleUseReading}>Use Reading</Button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white border rounded-md shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-full text-blue-700">
                            <Activity className="size-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">Pulse Oximeter</p>
                            <p className="text-xs text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="size-3" /> Connected
                            </p>
                          </div>
                        </div>
                        <Button size="sm" onClick={handleUseReading}>Use Reading</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </CardContent>
            {captureMethod === "Manual" && (
              <CardFooter className="border-t pt-4 flex justify-between items-center bg-slate-50/50">
                <Button variant="ghost">Cancel</Button>
                <div className="flex items-center gap-4">
                  {isSaved && (
                    <span className="text-emerald-600 text-sm font-bold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="size-4" />
                      Vitals recorded
                    </span>
                  )}
                  <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                    Save Vitals
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* History Area */}
        <div className="md:col-span-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Vitals History</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <div className="px-4 pb-2 flex gap-2">
                <Button variant="secondary" size="sm" className="h-7 text-xs">Today</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs">7 Days</Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs">30 Days</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>BP</TableHead>
                    <TableHead>SpO₂</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPatient.vitalsHistory.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="text-xs whitespace-nowrap">{v.date}</TableCell>
                      <TableCell className="font-medium text-xs">{v.bp}</TableCell>
                      <TableCell className="text-xs">{v.spo2}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell className="text-xs whitespace-nowrap">16 Sep • 09:15 AM</TableCell>
                    <TableCell className="font-medium text-xs">118/74</TableCell>
                    <TableCell className="text-xs">98%</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs whitespace-nowrap">15 Sep • 11:30 AM</TableCell>
                    <TableCell className="font-medium text-xs">122/80</TableCell>
                    <TableCell className="text-xs">99%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
