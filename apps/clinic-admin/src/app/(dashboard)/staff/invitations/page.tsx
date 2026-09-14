"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Mail, 
  Search, 
  Filter, 
  RefreshCw,
  XCircle,
  MoreHorizontal
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { STAFF_INVITATIONS_DEMO } from "../staffDemoData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function StaffInvitationsPage() {
  const [search, setSearch] = useState("");
  const [invitations, setInvitations] = useState(STAFF_INVITATIONS_DEMO);

  const filteredInvites = invitations.filter(inv => 
    inv.name.toLowerCase().includes(search.toLowerCase()) || 
    inv.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleRevoke = (id: string) => {
    setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: "Revoked" } : inv));
  };

  const handleResend = (id: string) => {
    setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, status: "Pending", invitedOn: "Just now" } : inv));
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Mail className="size-8 text-amber-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Pending Invitations</h1>
            <p className="text-muted-foreground">Manage sent invites and onboarding status.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/staff">
            <Button variant="outline" className="bg-white">Back to Directory</Button>
          </Link>
        </div>
      </div>

      <Card className="shadow-sm border-none bg-white">
        <div className="p-4 border-b flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search emails or names..." className="pl-8 bg-slate-50 w-full sm:w-[300px]" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline"><Filter className="size-4 mr-2"/> Filter Status</Button>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-bold text-slate-700 pl-6">Name / Email</TableHead>
              <TableHead className="font-bold text-slate-700">Role / Branch</TableHead>
              <TableHead className="font-bold text-slate-700">Invited By</TableHead>
              <TableHead className="font-bold text-slate-700">Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvites.length > 0 ? (
              filteredInvites.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="pl-6">
                    <div className="font-bold text-slate-800">{inv.name}</div>
                    <div className="text-xs text-slate-500">{inv.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-700">{inv.role}</div>
                    <div className="text-xs text-slate-500">{inv.branch}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-700">{inv.invitedBy}</div>
                    <div className="text-xs text-slate-500">{inv.invitedOn}</div>
                  </TableCell>
                  <TableCell>
                    {inv.status === 'Pending' && <Badge className="bg-amber-100 text-amber-700 border-none hover:bg-amber-200">Pending</Badge>}
                    {inv.status === 'Expired' && <Badge className="bg-slate-100 text-slate-600 border-none hover:bg-slate-200">Expired</Badge>}
                    {inv.status === 'Revoked' && <Badge className="bg-rose-100 text-rose-700 border-none hover:bg-rose-200">Revoked</Badge>}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleResend(inv.id)}><RefreshCw className="size-4 mr-2 text-blue-600"/> Resend Invite</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRevoke(inv.id)} className="text-rose-600"><XCircle className="size-4 mr-2"/> Revoke Invite</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
                  No invitations found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
