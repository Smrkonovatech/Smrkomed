"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Activity, 
  Search, 
  Filter, 
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { STAFF_ACTIVITY_DEMO } from "../staffDemoData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function StaffActivityPage() {
  const [search, setSearch] = useState("");

  const filteredLogs = STAFF_ACTIVITY_DEMO.filter(log => 
    log.staffName.toLowerCase().includes(search.toLowerCase()) || 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.module.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Success": return <CheckCircle2 className="size-4 text-emerald-500" />;
      case "Warning": return <AlertTriangle className="size-4 text-amber-500" />;
      case "Failed": return <XCircle className="size-4 text-rose-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <Activity className="size-8 text-slate-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Audit Trail</h1>
            <p className="text-muted-foreground">Monitor system access, permission changes, and security events.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/staff">
            <Button variant="outline" className="bg-white">Back to Directory</Button>
          </Link>
          <Button variant="outline" className="bg-white"><Download className="size-4 mr-2"/> Export</Button>
        </div>
      </div>

      <Card className="shadow-sm border-none bg-white">
        <div className="p-4 border-b flex flex-col md:flex-row justify-between gap-4">
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search logs..." className="pl-8 bg-slate-50 w-[250px]" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" className="bg-slate-50"><Calendar className="size-4 mr-2"/> Date Range</Button>
          </div>
          <Button variant="outline"><Filter className="size-4 mr-2"/> Filters</Button>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-bold text-slate-700 pl-6">Timestamp</TableHead>
              <TableHead className="font-bold text-slate-700">Staff Member</TableHead>
              <TableHead className="font-bold text-slate-700">Action Performed</TableHead>
              <TableHead className="font-bold text-slate-700">Module</TableHead>
              <TableHead className="font-bold text-slate-700">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="pl-6">
                    <div className="font-medium text-slate-800">{log.date}</div>
                    <div className="text-xs text-slate-500">{log.time}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-indigo-700">{log.staffName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-700">{log.action}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 font-normal">{log.module}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className="text-sm font-medium text-slate-700">{log.status}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                  No audit logs match your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
