"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  UsersRound, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal,
  Mail,
  ShieldCheck,
  Stethoscope,
  Activity,
  Heart,
  CalendarDays,
  Users,
  FlaskConical
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { STAFF_MEMBERS_DEMO, StaffMember } from "./staffDemoData";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function StaffDirectoryPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const filteredStaff = STAFF_MEMBERS_DEMO.filter(staff => {
    const matchesSearch = staff.firstName.toLowerCase().includes(search.toLowerCase()) || 
                          staff.lastName.toLowerCase().includes(search.toLowerCase()) ||
                          staff.role.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "All" || staff.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    if (role.includes("Doctor") || role.includes("Specialist")) return <Stethoscope className="size-4" />;
    if (role.includes("Lab") || role.includes("Embryologist")) return <FlaskConical className="size-4" />;
    if (role.includes("Nurse")) return <Heart className="size-4" />;
    if (role.includes("Reception")) return <CalendarDays className="size-4" />;
    if (role.includes("Coordinator")) return <Users className="size-4" />;
    return <UsersRound className="size-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active": return <Badge className="bg-emerald-500/10 text-emerald-600 border-none">Active</Badge>;
      case "Pending Invitation": return <Badge className="bg-amber-500/10 text-amber-600 border-none">Pending Invite</Badge>;
      case "Suspended": return <Badge className="bg-rose-500/10 text-rose-600 border-none">Suspended</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <UsersRound className="size-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Team Directory</h1>
            <p className="text-muted-foreground">Manage your clinic team, roles, access and responsibilities.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/staff/roles">
            <Button variant="outline" className="bg-white"><ShieldCheck className="size-4 mr-2"/> Manage Roles</Button>
          </Link>
          <Link href="/staff/invitations">
            <Button variant="outline" className="bg-white"><Mail className="size-4 mr-2"/> Pending Invites</Button>
          </Link>
          <Link href="/staff/add">
            <Button className="bg-indigo-600 hover:bg-indigo-700"><Plus className="size-4 mr-2"/> Add Staff</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card className="shadow-sm border-none bg-white">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-slate-500">Total Staff</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-slate-800">24</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-emerald-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-emerald-800">Active</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-900">20</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-amber-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-amber-800">Pending Invitations</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-amber-900">2</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-blue-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-blue-800">On Leave</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-900">2</div></CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-rose-500/5">
          <CardHeader className="pb-2 pt-4"><CardTitle className="text-xs text-rose-800">Access Restricted</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-rose-900">0</div></CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {["All", "Fertility Specialist", "Lab Technician", "Care Coordinator", "Receptionist", "Nurse"].map(role => (
            <Button 
              key={role} 
              variant={roleFilter === role ? "default" : "outline"} 
              className={roleFilter === role ? "bg-indigo-600 hover:bg-indigo-700" : "bg-white"}
              onClick={() => setRoleFilter(role)}
            >
              {role}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search team..." className="pl-8 w-[250px]" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" className="bg-white"><Filter className="size-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredStaff.map((staff) => (
          <Card key={staff.id} className="shadow-sm border-none overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-2 bg-indigo-600/10"></div>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-700 border shadow-sm">
                    {staff.initials}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-primary leading-tight">
                      {staff.displayName || `${staff.firstName} ${staff.lastName}`}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-indigo-600 font-medium mt-1">
                      {getRoleIcon(staff.role)} {staff.role}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="-mr-2 text-slate-400 hover:text-slate-600">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild><Link href={`/staff/${staff.id}`}>View Profile</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href={`/staff/${staff.id}?tab=access`}>Manage Access</Link></DropdownMenuItem>
                    <DropdownMenuItem className="text-rose-600">Suspend Account</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2 text-sm text-slate-600 mb-6">
                <div className="grid grid-cols-2 gap-2">
                  <p><span className="text-slate-400 block text-xs">Department</span> {staff.department}</p>
                  <p><span className="text-slate-400 block text-xs">Branch</span> {staff.primaryBranch}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <p><span className="text-slate-400 block text-xs">Access Level</span> {staff.accessLevel}</p>
                  <p><span className="text-slate-400 block text-xs">Status</span> <span className="inline-block mt-0.5">{getStatusBadge(staff.status)}</span></p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Activity className="size-3" /> {staff.lastActive}
                </div>
                <Link href={`/staff/${staff.id}`}>
                  <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                    View Profile
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}
