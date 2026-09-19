"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckSquare, Calendar, Info, X, Loader2, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { clinicApi } from "@/lib/clinic-api";

interface AddCareTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  couple: { id: string; primaryPatient?: { firstName: string; lastName: string } } | any;
  defaultDate: Date;
  onSaved?: (() => void) | undefined;
}

export function AddCareTaskModal({
  isOpen,
  onClose,
  couple,
  defaultDate,
  onSaved,
}: AddCareTaskModalProps) {
  const safeDefaultDate = defaultDate && !isNaN(defaultDate.getTime()) ? defaultDate : new Date();

  const [taskType, setTaskType] = useState("Blood Test");
  const [taskName, setTaskName] = useState("Estradiol (E2) blood test");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState(format(safeDefaultDate, "yyyy-MM-dd"));
  const [instructions, setInstructions] = useState(
    "Fasting not required. Sample to be collected at the nearest partner lab.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) {
      toast.error("Please enter a task name or description");
      return;
    }

    setIsSubmitting(true);
    try {
      await clinicApi.createTask({
        title: taskName.trim(),
        coupleId: couple.id || couple.slug,
        category: taskType,
        dueDate,
        dueTime: "10:00",
        taskType: "PATIENT_TASK",
        priority: priority.toUpperCase(),
        description: instructions.trim(),
        ownerRole: "COORDINATOR",
        sendWhatsApp: true,
      });

      const parsedDate = new Date(dueDate);
      const dateDisplay = !isNaN(parsedDate.getTime()) ? format(parsedDate, "d MMM yyyy") : dueDate;
      toast.success(`Task "${taskName}" assigned for ${dateDisplay}`);

      onSaved?.();
      onClose();
    } catch (err: any) {
      console.error("Failed to create care task:", err);
      toast.error(err?.message || "Failed to assign care task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[540px] p-0 overflow-hidden bg-white border border-gray-100 shadow-2xl rounded-[28px]">
        {/* Header matching Image 2 */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#F8F5FF] text-[#866BE3] border border-[#866BE3]/20 flex items-center justify-center shrink-0 shadow-xs">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 tracking-tight">
                Assign task
              </DialogTitle>
              <p className="text-xs text-gray-500 font-normal mt-0.5">
                Create a task for this patient and notify your team.
              </p>
            </div>
          </div>
        </div>

        {/* Form Body matching Image 2 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Task Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-800 block">
              Task Type
            </label>
            <div className="relative">
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full h-11 px-3.5 pr-8 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
              >
                <option value="Blood Test">Blood Test</option>
                <option value="Hormone Test">Hormone Test</option>
                <option value="Ultrasound Scan">Ultrasound Scan</option>
                <option value="Follicular Monitoring">Follicular Monitoring</option>
                <option value="Semen Analysis">Semen Analysis</option>
                <option value="Medication / Injection">Medication / Injection</option>
                <option value="Doctor Review">Doctor Review</option>
                <option value="Follow-up Call">Follow-up Call</option>
                <option value="Patient Task">Patient Task</option>
                <option value="Consents & Documents">Consents & Documents</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Task Name / Description * with counter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-800">
                Task Name / Description <span className="text-[#866BE3]">*</span>
              </label>
              <span className="text-[11px] text-gray-400 font-medium">
                {taskName.length}/100
              </span>
            </div>
            <input
              type="text"
              maxLength={100}
              placeholder="Estradiol (E2) blood test"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              required
              className="w-full h-11 px-3.5 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] placeholder:text-gray-400 transition-all shadow-2xs"
            />
          </div>

          {/* Priority | Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 block">
                Priority
              </label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full h-11 px-3.5 pr-8 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] appearance-none cursor-pointer shadow-2xs"
                >
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Low">Low</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-800 block">
                Due Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-11 px-3.5 pr-8 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] shadow-2xs cursor-pointer"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Patient Instructions (Optional) with counter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-800">
                Patient Instructions <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-gray-400 font-medium">
                {instructions.length}/500
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Fasting not required. Sample to be collected at the nearest partner lab."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full p-3 text-xs font-medium text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#866BE3]/20 focus:border-[#866BE3] placeholder:text-gray-400 transition-all resize-none shadow-2xs leading-relaxed"
            />
          </div>

          {/* Notification Info banner matching Image 2 */}
          <div className="bg-[#F5F1FF] border border-[#E9E1FF] rounded-2xl p-3.5 flex items-start gap-2.5 shadow-2xs">
            <Info className="w-4 h-4 text-[#866BE3] shrink-0 mt-0.5" />
            <p className="text-xs text-[#6A52BA] leading-relaxed font-normal">
              The patient and assigned team will automatically receive an instant notification with task instructions.
            </p>
          </div>

          {/* Footer matching Image 2 */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full bg-[#7C5CE5] hover:bg-[#6D4CD4] text-white text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Task"
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
