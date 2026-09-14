"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  UsersRound, 
  ChevronRight, 
  Check, 
  User, 
  Briefcase, 
  Building2, 
  ShieldCheck, 
  Lock,
  Mail
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { STAFF_ROLE_PRESETS } from "../staffDemoData";

export default function AddStaffPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    roleId: "", department: "", branch: "Bangalore"
  });

  const steps = [
    { id: 1, label: "Basic Info", icon: User },
    { id: 2, label: "Role & Dept", icon: Briefcase },
    { id: 3, label: "Clinic / Branch", icon: Building2 },
    { id: 4, label: "Permissions", icon: ShieldCheck },
    { id: 5, label: "Security", icon: Lock }
  ];

  const handleNext = () => setStep(prev => Math.min(prev + 1, 5));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));
  
  const handleSimulateInvite = () => {
    // Simulate API call for the hospEx demo
    const btn = document.getElementById("finish-btn");
    if (btn) btn.innerHTML = "Sending secure invitation...";
    setTimeout(() => {
      router.push("/staff/invitations");
    }, 1500);
  };

  const selectedPreset = STAFF_ROLE_PRESETS.find(p => p.id === formData.roleId);

  return (
    <div className="flex-1 space-y-6 p-6 bg-slate-50/50 min-h-screen flex flex-col items-center">
      
      <div className="w-full max-w-4xl flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Add Staff Member</h1>
          <p className="text-muted-foreground">Configure profile, roles, and access permissions.</p>
        </div>
        <Link href="/staff"><Button variant="ghost">Cancel</Button></Link>
      </div>

      <div className="w-full max-w-4xl bg-white p-4 rounded-xl shadow-sm flex items-center justify-between mb-6">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center">
            <div className={`flex items-center gap-2 ${step === s.id ? 'text-indigo-600 font-bold' : step > s.id ? 'text-emerald-500 font-medium' : 'text-slate-400'}`}>
              <div className={`size-8 rounded-full flex items-center justify-center ${step === s.id ? 'bg-indigo-100' : step > s.id ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                {step > s.id ? <Check className="size-4"/> : <s.icon className="size-4"/>}
              </div>
              <span className="hidden md:inline-block text-sm">{s.label}</span>
            </div>
            {idx < steps.length - 1 && <ChevronRight className="size-4 mx-4 text-slate-300" />}
          </div>
        ))}
      </div>

      <Card className="w-full max-w-4xl shadow-sm border-none bg-white">
        
        {step === 1 && (
          <CardContent className="p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Basic Information</h2>
              <p className="text-sm text-slate-500 mb-6">Provide the foundational details for this team member.</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">First Name *</label><Input placeholder="Asha" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})}/></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Last Name *</label><Input placeholder="Kumar" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})}/></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Email Address *</label><Input placeholder="asha.k@smrkomed.com" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Phone Number *</label><Input placeholder="+91 98765 43210" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}/></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Employee ID</label><Input placeholder="EMP-000"/></div>
              <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Joining Date</label><Input type="date" /></div>
            </div>
          </CardContent>
        )}

        {step === 2 && (
          <CardContent className="p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Role & Department</h2>
              <p className="text-sm text-slate-500 mb-6">Assigning a primary role will determine default system permissions.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Primary Role *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {STAFF_ROLE_PRESETS.map(preset => (
                    <div 
                      key={preset.id} 
                      onClick={() => setFormData({...formData, roleId: preset.id})}
                      className={`p-4 border rounded-xl cursor-pointer transition-all ${formData.roleId === preset.id ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'hover:border-slate-300'}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <h4 className="font-bold text-slate-800">{preset.name}</h4>
                        {formData.roleId === preset.id && <Check className="size-4 text-indigo-600"/>}
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2">{preset.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 mt-6">
                <label className="text-sm font-bold text-slate-700">Department</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                  <option value="">Select Department...</option>
                  <option>Reproductive Medicine</option>
                  <option>Clinical Diagnostics</option>
                  <option>Laboratory</option>
                  <option>Patient Care</option>
                  <option>Front Desk</option>
                  <option>Operations</option>
                </select>
              </div>
            </div>
          </CardContent>
        )}

        {step === 3 && (
          <CardContent className="p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div>
              <h2 className="text-xl font-bold text-slate-800">Clinic & Branch Access</h2>
              <p className="text-sm text-slate-500 mb-6">Assign which physical locations this staff member can operate in.</p>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Organization</p>
                <p className="font-bold text-slate-800 text-lg">ABC Fertility Centre</p>
              </div>

              <div className="space-y-3 mt-4">
                <label className="text-sm font-bold text-slate-700">Primary Branch</label>
                <div className="grid grid-cols-2 gap-3">
                  {["Bangalore", "Kochi", "Chennai"].map(branch => (
                    <div 
                      key={branch}
                      onClick={() => setFormData({...formData, branch})}
                      className={`p-4 border rounded-xl cursor-pointer flex items-center justify-between ${formData.branch === branch ? 'bg-indigo-50 border-indigo-500' : 'bg-white'}`}
                    >
                      <span className="font-bold text-slate-700">{branch}</span>
                      {formData.branch === branch && <Check className="size-4 text-indigo-600"/>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        )}

        {step === 4 && (
          <CardContent className="p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Module Access & Permissions</h2>
              <p className="text-sm text-slate-500 mb-6">Review the recommended permissions for a <span className="font-bold text-indigo-700">{selectedPreset?.name || "selected role"}</span>.</p>
            </div>
            
            {selectedPreset ? (
              <div className="bg-slate-50 rounded-xl border overflow-hidden">
                <div className="p-3 bg-indigo-100 text-indigo-800 font-medium text-sm flex items-center justify-between">
                  <span>✓ Recommended Preset Applied</span>
                  <span className="text-xs underline cursor-pointer">Customize Permissions</span>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
                  {Object.entries(selectedPreset.defaultPermissions).map(([mod, perm]) => (
                    <div key={mod} className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-sm font-medium text-slate-700 capitalize">{mod.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <Badge variant="outline" className={`
                        ${perm === 'Manage' ? 'bg-purple-50 text-purple-700 border-purple-200' : ''}
                        ${perm === 'Approve' ? 'bg-rose-50 text-rose-700 border-rose-200' : ''}
                        ${perm === 'Edit' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                        ${perm === 'Create' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ''}
                        ${perm === 'View' ? 'bg-slate-100 text-slate-700 border-slate-300' : ''}
                        ${perm === 'None' ? 'bg-transparent text-slate-300 border-dashed' : ''}
                      `}>{perm}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-rose-500 bg-rose-50 rounded-xl border border-rose-200">
                Please go back to Step 2 and select a role first.
              </div>
            )}
          </CardContent>
        )}

        {step === 5 && (
          <CardContent className="p-8 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Login & Security</h2>
              <p className="text-sm text-slate-500 mb-6">Configure how this team member will access the system.</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center space-y-4">
               <ShieldCheck className="size-12 text-amber-500 mx-auto" />
               <h3 className="font-bold text-lg text-amber-900">Secure Invitation</h3>
               <p className="text-sm text-amber-700 max-w-md mx-auto">
                 For security reasons, plaintext passwords are never generated or shown. We will send a secure invitation link to <span className="font-bold">{formData.email || "their email address"}</span> allowing them to set up their own credentials and two-factor authentication.
               </p>
               <div className="bg-white p-3 rounded-lg border border-amber-200 inline-block mt-4 text-xs font-mono text-slate-500 shadow-sm">
                 Account Status: <span className="font-bold text-amber-600">Pending Invitation</span>
               </div>
            </div>

          </CardContent>
        )}

        <CardFooter className="p-6 bg-slate-50 rounded-b-xl border-t flex justify-between">
          <Button variant="outline" onClick={handleBack} disabled={step === 1} className="bg-white">Back</Button>
          {step < 5 ? (
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleNext}>Continue <ChevronRight className="size-4 ml-2"/></Button>
          ) : (
            <Button id="finish-btn" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSimulateInvite}>
              <Mail className="size-4 mr-2"/> Send Secure Invitation
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
