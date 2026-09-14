"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  Users,
  Copy,
  Edit2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { STAFF_ROLE_PRESETS, StaffRolePreset, STAFF_MEMBERS_DEMO } from "../staffDemoData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function StaffRolesPage() {
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<StaffRolePreset | null>(null);

  const filteredRoles = STAFF_ROLE_PRESETS.filter(role => 
    role.name.toLowerCase().includes(search.toLowerCase()) || 
    role.description.toLowerCase().includes(search.toLowerCase())
  );

  const getStaffCount = (roleName: string) => {
    // For demo purposes, map the generic role names to the specific demo staff
    if (roleName.includes("Doctor")) return 4;
    if (roleName.includes("Lab")) return 2;
    if (roleName.includes("Coordinator")) return 3;
    if (roleName.includes("Receptionist")) return 2;
    if (roleName.includes("Administrator")) return 1;
    return 0;
  };

  const getPermissionBadge = (level: string) => {
    switch (level) {
      case "Manage": return <Badge className="bg-purple-100 text-purple-700 border-none hover:bg-purple-200">Manage</Badge>;
      case "Approve": return <Badge className="bg-rose-100 text-rose-700 border-none hover:bg-rose-200">Approve</Badge>;
      case "Edit": return <Badge className="bg-blue-100 text-blue-700 border-none hover:bg-blue-200">Edit</Badge>;
      case "Create": return <Badge className="bg-emerald-100 text-emerald-700 border-none hover:bg-emerald-200">Create</Badge>;
      case "View": return <Badge className="bg-slate-100 text-slate-700 border-none hover:bg-slate-200">View Only</Badge>;
      default: return <span className="text-xs text-slate-300 font-medium">None</span>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <ShieldCheck className="size-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Roles & Access</h1>
            <p className="text-muted-foreground">Manage permission presets and module access levels.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/staff">
            <Button variant="outline" className="bg-white">Back to Directory</Button>
          </Link>
          <Button className="bg-indigo-600 hover:bg-indigo-700"><Plus className="size-4 mr-2"/> Custom Role</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Search roles..." className="pl-8 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="space-y-3">
            {filteredRoles.map(role => (
              <Card 
                key={role.id} 
                className={`cursor-pointer transition-all hover:border-indigo-300 ${selectedRole?.id === role.id ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'border-slate-200 shadow-sm'}`}
                onClick={() => setSelectedRole(role)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800">{role.name}</h3>
                    <Badge variant={role.type === "SYSTEM" ? "secondary" : "default"} className="text-[10px]">{role.type}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 h-8">{role.description}</p>
                  <div className="flex items-center gap-2 mt-4 text-xs font-medium text-slate-600 bg-slate-50 p-2 rounded w-fit">
                    <Users className="size-3" /> {getStaffCount(role.name)} members
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          {selectedRole ? (
            <Card className="shadow-sm border-none bg-white min-h-[600px]">
              <CardHeader className="border-b pb-4 flex flex-row items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-xl text-indigo-900">{selectedRole.name}</CardTitle>
                    <Badge variant={selectedRole.type === "SYSTEM" ? "secondary" : "default"}>{selectedRole.type}</Badge>
                  </div>
                  <CardDescription className="text-sm">{selectedRole.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Copy className="size-3 mr-2"/> Duplicate</Button>
                  {selectedRole.type === "CUSTOM" && (
                    <Button variant="outline" size="sm"><Edit2 className="size-3 mr-2"/> Edit Role</Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="bg-indigo-50/50 p-4 border-b text-sm text-indigo-800 font-medium flex items-center justify-between">
                  <span>Permission Matrix</span>
                  <span className="text-xs font-normal opacity-70">Changes apply to all {getStaffCount(selectedRole.name)} members using this preset.</span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[200px] pl-6 font-bold text-slate-700">Module</TableHead>
                      <TableHead className="font-bold text-slate-700">Access Level</TableHead>
                      <TableHead className="w-[150px] font-bold text-slate-700">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(selectedRole.defaultPermissions).map(([moduleKey, level]) => (
                      <TableRow key={moduleKey}>
                        <TableCell className="pl-6 font-medium text-slate-800 capitalize">
                          {moduleKey.replace(/([A-Z])/g, ' $1').trim()}
                        </TableCell>
                        <TableCell>
                          {getPermissionBadge(level as string)}
                        </TableCell>
                        <TableCell>
                          {selectedRole.type === "SYSTEM" ? (
                            <span className="text-xs text-slate-400 italic">System locked</span>
                          ) : (
                            <Button variant="ghost" size="sm" className="text-indigo-600 h-6 px-2 text-xs">Modify</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {selectedRole.type === "SYSTEM" && (
                  <div className="p-4 bg-slate-50 text-xs text-slate-500 text-center rounded-b-xl border-t border-slate-100">
                    System roles cannot be edited. Duplicate this role to create a custom variation.
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm border-none border-dashed bg-slate-50 h-full flex items-center justify-center min-h-[600px]">
              <div className="text-center text-slate-400 space-y-3">
                <ShieldCheck className="size-12 mx-auto opacity-20" />
                <p>Select a role to view its permission matrix.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
