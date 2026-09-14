"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  User, 
  ShieldCheck, 
  Activity, 
  Calendar,
  Lock,
  MoreVertical,
  Edit2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STAFF_MEMBERS_DEMO, STAFF_ROLE_PRESETS, ModuleAccess, STAFF_ACTIVITY_DEMO } from "../staffDemoData";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function StaffProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const staffId = params['id'] as string;
  const initialTab = searchParams.get("tab") || "overview";
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const staff = STAFF_MEMBERS_DEMO.find(s => s.id === staffId);
  const [permissions, setPermissions] = useState<ModuleAccess | null>(staff?.permissions || null);

  if (!staff) {
    return <div className="p-12 text-center text-slate-500">Staff member not found.</div>;
  }

  const handleRemoveAccess = (module: keyof ModuleAccess) => {
    if (confirm(`Remove ${module} access from this staff member?`)) {
      setPermissions(prev => prev ? { ...prev, [module]: "None" } : null);
    }
  };

  const handleDeactivate = () => {
    if (confirm("Deactivate this staff member? They will no longer be able to log in, but historical audit records will be preserved.")) {
      alert("Staff member deactivated.");
      router.push("/staff");
    }
  };

  const getPermissionBadge = (level: string) => {
    switch (level) {
      case "Manage": return <Badge className="bg-purple-100 text-purple-700 border-none">Manage</Badge>;
      case "Approve": return <Badge className="bg-rose-100 text-rose-700 border-none">Approve</Badge>;
      case "Edit": return <Badge className="bg-blue-100 text-blue-700 border-none">Edit</Badge>;
      case "Create": return <Badge className="bg-emerald-100 text-emerald-700 border-none">Create</Badge>;
      case "View": return <Badge className="bg-slate-100 text-slate-700 border-none">View Only</Badge>;
      default: return <Badge variant="outline" className="text-slate-300 border-dashed">No Access</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/staff">
          <Button variant="ghost" size="icon" className="rounded-full bg-white shadow-sm hover:bg-slate-100">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="text-sm font-medium text-slate-500">
          <Link href="/staff" className="hover:text-indigo-600">Staff</Link> / {staff.firstName} {staff.lastName}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Left Sidebar Profile Card */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="shadow-sm border-none bg-white overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <CardContent className="px-6 pb-6 pt-0 relative">
              <div className="flex justify-between items-end mb-4">
                <div className="size-20 rounded-xl bg-white flex items-center justify-center text-2xl font-bold text-indigo-700 border-4 border-white shadow-md -mt-10">
                  {staff.initials}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><MoreVertical className="size-4 mr-1"/> Actions</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Edit2 className="size-4 mr-2"/> Edit Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveTab('access')}><ShieldCheck className="size-4 mr-2"/> Manage Access</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-amber-600">Suspend Staff</DropdownMenuItem>
                    <DropdownMenuItem className="text-rose-600" onClick={handleDeactivate}>Deactivate</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-800 leading-tight">
                  {staff.displayName || `${staff.firstName} ${staff.lastName}`}
                </h2>
                <p className="font-medium text-indigo-600">{staff.role}</p>
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Status</span>
                  <Badge className="bg-emerald-100 text-emerald-700 border-none">{staff.status}</Badge>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Department</span>
                  <span className="font-medium text-slate-700">{staff.department}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Primary Branch</span>
                  <span className="font-medium text-slate-700">{staff.primaryBranch}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Employee ID</span>
                  <span className="font-medium text-slate-700">{staff.employeeId}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-slate-500">Joined</span>
                  <span className="font-medium text-slate-700">{staff.joiningDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none bg-white">
            <CardHeader className="pb-3"><CardTitle className="text-sm text-slate-500 uppercase tracking-wider font-bold">Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Email</p>
                <p className="font-medium text-slate-800 truncate" title={staff.email}>{staff.email}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Phone</p>
                <p className="font-medium text-slate-800">{staff.phone}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Main Content */}
        <div className="xl:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
            <TabsList className="bg-white border shadow-sm p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"><User className="size-4 mr-2"/> Overview</TabsTrigger>
              <TabsTrigger value="access" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"><ShieldCheck className="size-4 mr-2"/> Access & Permissions</TabsTrigger>
              <TabsTrigger value="schedule" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"><Calendar className="size-4 mr-2"/> Schedule</TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"><Activity className="size-4 mr-2"/> Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-300">
              <Card className="shadow-sm border-none bg-white">
                <CardHeader>
                  <CardTitle>Professional Responsibilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 p-4 rounded-xl border">
                      <h4 className="font-bold text-slate-700 mb-2">Core Duties</h4>
                      <ul className="list-disc pl-4 space-y-1 text-sm text-slate-600">
                        <li>Assigned to {staff.department}</li>
                        <li>Primary location: {staff.primaryBranch}</li>
                        {staff.additionalBranches.length > 0 && <li>Covers: {staff.additionalBranches.join(", ")}</li>}
                        <li>Has {staff.accessLevel.toLowerCase()} to SmrkoMed system</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="access" className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Lock className="size-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900">Security Warning</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    You are viewing actual system permissions. Changing these values immediately affects what the user can see and do. Clinical approval permissions should only be granted to authorized medical personnel.
                  </p>
                </div>
              </div>

              <Card className="shadow-sm border-none bg-white overflow-hidden">
                <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-800">Module Permissions</h3>
                    <p className="text-xs text-slate-500">Based on {staff.role} preset</p>
                  </div>
                  <Button variant="outline" size="sm"><Edit2 className="size-4 mr-2"/> Edit All Permissions</Button>
                </div>
                
                {permissions && (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-white">
                        <TableHead className="w-[300px] pl-6 font-bold text-slate-700">Module</TableHead>
                        <TableHead className="font-bold text-slate-700">Access Level</TableHead>
                        <TableHead className="w-[150px] font-bold text-slate-700 text-right pr-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(permissions).map(([moduleKey, level]) => (
                        <TableRow key={moduleKey}>
                          <TableCell className="pl-6 font-medium text-slate-800 capitalize">
                            {moduleKey.replace(/([A-Z])/g, ' $1').trim()}
                          </TableCell>
                          <TableCell>
                            {getPermissionBadge(level as string)}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {level !== "None" ? (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 text-xs"
                                onClick={() => handleRemoveAccess(moduleKey as keyof ModuleAccess)}
                              >
                                Remove Access
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50 h-7 text-xs">Grant Access</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </TabsContent>
            
            <TabsContent value="schedule" className="animate-in fade-in duration-300">
               <Card className="shadow-sm border-none bg-white p-12 flex flex-col items-center justify-center text-center border-dashed">
                 <Calendar className="size-12 text-slate-300 mb-4" />
                 <h3 className="font-bold text-lg text-slate-700">Schedule Management</h3>
                 <p className="text-slate-500 max-w-sm mt-2 mb-6">Manage shifts, working hours, and branch availability for this staff member.</p>
                 <Button variant="outline">Configure Schedule</Button>
               </Card>
            </TabsContent>

            <TabsContent value="activity" className="animate-in fade-in duration-300">
               <Card className="shadow-sm border-none bg-white overflow-hidden">
                 <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                   <div>
                     <h3 className="font-bold text-slate-800">Recent Activity</h3>
                     <p className="text-xs text-slate-500">Actions performed by this user</p>
                   </div>
                 </div>
                 <Table>
                   <TableHeader>
                     <TableRow className="bg-slate-50/50">
                       <TableHead className="pl-6 font-bold text-slate-700">Date & Time</TableHead>
                       <TableHead className="font-bold text-slate-700">Action</TableHead>
                       <TableHead className="font-bold text-slate-700">Module</TableHead>
                       <TableHead className="font-bold text-slate-700">Status</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {STAFF_ACTIVITY_DEMO.filter(a => a.staffName === staff.firstName + " " + staff.lastName || a.staffName === staff.displayName).length > 0 ? (
                       STAFF_ACTIVITY_DEMO.filter(a => a.staffName === staff.firstName + " " + staff.lastName || a.staffName === staff.displayName).map(log => (
                         <TableRow key={log.id}>
                           <TableCell className="pl-6">
                             <div className="font-medium text-slate-800">{log.date}</div>
                             <div className="text-xs text-slate-500">{log.time}</div>
                           </TableCell>
                           <TableCell>
                             <div className="text-sm font-medium text-slate-700">{log.action}</div>
                           </TableCell>
                           <TableCell>
                             <Badge variant="outline" className="bg-slate-50 text-slate-600 font-normal">{log.module}</Badge>
                           </TableCell>
                           <TableCell>
                             <Badge className={log.status === "Success" ? "bg-emerald-100 text-emerald-700 border-none" : "bg-amber-100 text-amber-700 border-none"}>
                               {log.status}
                             </Badge>
                           </TableCell>
                         </TableRow>
                       ))
                     ) : (
                       <TableRow>
                         <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                           No recent activity found for this user.
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </Card>
            </TabsContent>

          </Tabs>
        </div>

      </div>
    </div>
  );
}
