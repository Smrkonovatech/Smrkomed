"use client";

import { Bluetooth, Search, Activity, Share2, Server, Smartphone, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CONNECTED_DEVICES } from "../demoData";

export default function DevicesIntegrationsPage() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONNECTED":
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">Live</Badge>;
      case "DEMO CONNECTED":
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20">Demo Mode</Badge>;
      case "PLANNED":
        return <Badge variant="outline" className="text-slate-500 border-slate-300 border-dashed bg-slate-50">Planned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bluetooth className="size-8 text-slate-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Devices & Integrations</h1>
            <p className="text-muted-foreground">Manage clinical hardware and lab analyser connections.</p>
          </div>
        </div>
        <Button className="bg-slate-800 hover:bg-slate-900">Add Device</Button>
      </div>

      <Card className="shadow-sm border-none bg-blue-900 text-white mb-6 overflow-hidden relative">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none">
          <Share2 className="w-96 h-96 -mt-20 -mr-20" />
        </div>
        <CardHeader className="relative z-10 pb-2">
          <CardTitle className="text-xl">Device Adapter Architecture (Future Concept)</CardTitle>
          <CardDescription className="text-blue-200">How external machines will feed data into SmrkoMed.</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 pt-4">
          <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-white/10 p-6 rounded-xl border border-white/20">
            <div className="text-center flex-1">
              <div className="size-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2 border border-white/30">
                <Monitor className="size-6 text-white" />
              </div>
              <h4 className="font-bold text-sm">External Device</h4>
              <p className="text-xs text-blue-200 mt-1">Ultrasound, Analyser, BP Monitor</p>
            </div>
            
            <div className="hidden md:flex flex-col items-center">
              <Share2 className="size-5 text-blue-300" />
              <div className="h-0.5 w-16 bg-blue-300/50 mt-1" />
            </div>

            <div className="text-center flex-1">
              <div className="size-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2 border border-emerald-400/50">
                <Server className="size-6 text-emerald-400" />
              </div>
              <h4 className="font-bold text-sm text-emerald-100">SmrkoMed Adapter</h4>
              <p className="text-xs text-blue-200 mt-1">Data Normalization & Validation</p>
            </div>

            <div className="hidden md:flex flex-col items-center">
              <Share2 className="size-5 text-emerald-300" />
              <div className="h-0.5 w-16 bg-emerald-300/50 mt-1" />
            </div>

            <div className="text-center flex-1">
              <div className="size-12 rounded-full bg-blue-500 flex items-center justify-center mx-auto mb-2 border border-blue-400">
                <Smartphone className="size-6 text-white" />
              </div>
              <h4 className="font-bold text-sm">Clinical Diagnostics</h4>
              <p className="text-xs text-blue-200 mt-1">Patient Record & Review</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-none">
        <CardHeader className="border-b bg-white pb-4 flex flex-row justify-between items-center">
          <CardTitle>Connected Systems</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search devices..." className="pl-8 w-[250px]" />
          </div>
        </CardHeader>
        <CardContent className="p-0 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Device Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Connection Type</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CONNECTED_DEVICES.map((device) => (
                <TableRow key={device.id}>
                  <TableCell className="pl-6">
                    <div className="font-bold text-primary">{device.name}</div>
                    <div className="text-xs text-muted-foreground">{device.manufacturer}</div>
                  </TableCell>
                  <TableCell className="text-sm">{device.type}</TableCell>
                  <TableCell className="text-sm text-slate-600">{device.location}</TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="secondary" className="font-mono text-xs">{device.connection}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{device.lastSync}</TableCell>
                  <TableCell>{getStatusBadge(device.status)}</TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" className="text-slate-600">Configure</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
