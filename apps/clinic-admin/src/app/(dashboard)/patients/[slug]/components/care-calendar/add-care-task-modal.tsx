"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Bot, CalendarIcon, Clock, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppState } from "@/lib/app-state";
import { type Couple } from "@/lib/demo-data";
import { toast } from "sonner";
import { clinicApi } from "@/lib/clinic-api";

interface AddCareTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  couple: { id: string, primaryPatient?: { firstName: string, lastName: string } } | any;
  defaultDate: Date;
  onSaved?: () => void;
}

export function AddCareTaskModal({ isOpen, onClose, couple, defaultDate, onSaved }: AddCareTaskModalProps) {
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    type: "Blood Test",
    date: format(defaultDate, "yyyy-MM-dd"),
    time: "10:00",
    assignedTo: "Care Coordinator",
    enableCareLoop: true
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error("Task name required");
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate network delay for demo
    await new Promise(r => setTimeout(r, 600));
    
    try {
      await clinicApi.createTask({
        title: formData.title,
        coupleId: couple.id,
        category: formData.type,
        dueDate: formData.date,
        dueTime: formData.time,
        taskType: "PATIENT_TASK",
        priority: "NORMAL",
        ownerRole: formData.assignedTo.includes("Coordinator") ? "COORDINATOR" : "DOCTOR",
        sendWhatsApp: formData.enableCareLoop,
      });

      toast.success(`"${formData.title}" scheduled for ${format(new Date(formData.date), "d MMM")} • ${formData.time}`);
      
      if (onSaved) {
        onSaved();
      }
      onClose();
    } catch (err) {
      toast.error("Failed to create care task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white border-none shadow-lg">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="text-xl font-bold text-slate-800">Create Care Task</DialogTitle>
          <DialogDescription>Schedule a clinical activity or patient follow-up.</DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Task Name *</label>
            <Input 
              placeholder="e.g. Repeat E2 + LH Test" 
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Category</label>
              <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Appointment">Appointment</SelectItem>
                  <SelectItem value="Blood Test">Blood Test</SelectItem>
                  <SelectItem value="Hormone Test">Hormone Test</SelectItem>
                  <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                  <SelectItem value="Follicular Scan">Follicular Scan</SelectItem>
                  <SelectItem value="Semen Analysis">Semen Analysis</SelectItem>
                  <SelectItem value="Medication">Medication / Injection</SelectItem>
                  <SelectItem value="Doctor Review">Doctor Review</SelectItem>
                  <SelectItem value="Follow-up Call">Follow-up Call</SelectItem>
                  <SelectItem value="Patient Task">Patient Task</SelectItem>
                  <SelectItem value="Custom Task">Custom Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Assigned To</label>
              <Select value={formData.assignedTo} onValueChange={v => setFormData({...formData, assignedTo: v})}>
                <SelectTrigger><SelectValue placeholder="Select assignee..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dr. Shreya Iyer">Dr. Shreya Iyer</SelectItem>
                  <SelectItem value="Care Coordinator">Care Coordinator</SelectItem>
                  <SelectItem value="Lab Technician">Lab Technician</SelectItem>
                  <SelectItem value="Patient">Patient ({couple.primary.name})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Date *</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-2.5 size-4 text-slate-400" />
                <Input 
                  type="date" 
                  className="pl-9"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-2.5 size-4 text-slate-400" />
                <Input 
                  type="time" 
                  className="pl-9"
                  value={formData.time}
                  onChange={e => setFormData({...formData, time: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 flex items-start gap-3">
            <div className="bg-purple-100 p-2 rounded-lg shrink-0">
              <Bot className="size-5 text-purple-700" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-purple-900 text-sm">Add to Care Loop</h4>
                <Switch 
                  checked={formData.enableCareLoop} 
                  onCheckedChange={c => setFormData({...formData, enableCareLoop: c})}
                />
              </div>
              <p className="text-xs text-purple-700 mt-1">
                Care Loop will automatically remind the patient on WhatsApp and monitor completion status.
              </p>
            </div>
          </div>

        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="bg-white">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
            {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Check className="size-4 mr-2" />}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
