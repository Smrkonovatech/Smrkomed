"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Stethoscope, UserCheck, Loader2 } from "lucide-react";
import { clinicApi, type ClinicStaff } from "@/lib/clinic-api";

interface AssignTeamModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  coupleId: string;
  currentDoctorName?: string;
  currentCoordinatorName?: string;
  onSaved: (assigned: { doctorName: string; coordinatorName: string }) => void;
}

export function AssignTeamModal({
  isOpen,
  onOpenChange,
  coupleId,
  currentDoctorName,
  currentCoordinatorName,
  onSaved,
}: AssignTeamModalProps) {
  const [staff, setStaff] = useState<ClinicStaff[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [selectedCoordinatorId, setSelectedCoordinatorId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    clinicApi
      .staff()
      .then((data) => {
        setStaff(data || []);
        // Pre-select by name match if possible
        const doc = data.find(
          (s) =>
            (s.role === "DOCTOR" || s.roleName.toLowerCase().includes("doctor")) &&
            s.name === currentDoctorName,
        );
        if (doc) setSelectedDoctorId(doc.id);

        const coord = data.find(
          (s) =>
            (s.role === "CARE_COORDINATOR" ||
              s.roleName.toLowerCase().includes("coordinator")) &&
            s.name === currentCoordinatorName,
        );
        if (coord) setSelectedCoordinatorId(coord.id);
      })
      .catch((err) => {
        console.error("Failed to load staff:", err);
        setError("Unable to load clinic staff. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [isOpen, currentDoctorName, currentCoordinatorName]);

  const doctors = staff.filter(
    (s) => s.role === "DOCTOR" || s.roleName.toLowerCase().includes("doctor"),
  );
  const coordinators = staff.filter(
    (s) =>
      s.role === "CARE_COORDINATOR" ||
      s.roleName.toLowerCase().includes("coordinator"),
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      await clinicApi.patchCouple(coupleId, {
        ...(selectedDoctorId ? { assignedDoctorId: selectedDoctorId } : {}),
        ...(selectedCoordinatorId
          ? { assignedCoordinatorId: selectedCoordinatorId }
          : {}),
      });

      const docObj = doctors.find((d) => d.id === selectedDoctorId);
      const coordObj = coordinators.find((c) => c.id === selectedCoordinatorId);

      onSaved({
        doctorName: docObj?.name || currentDoctorName || "Unassigned",
        coordinatorName:
          coordObj?.name || currentCoordinatorName || "Unassigned",
      });

      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to assign clinical team:", err);
      setError(err?.message || "Failed to assign clinical team. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-6 bg-white border-0 shadow-2xl rounded-2xl">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#866BE3]" />
            Assign Clinical Care Team
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-1">
            Assign the primary doctor and care coordinator responsible for this couple's fertility journey.
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#866BE3]" />
            <p className="text-xs text-gray-500 mt-2">Loading clinic staff...</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {error && (
              <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            {/* Primary Doctor Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-[#866BE3]" />
                Primary Doctor
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#866BE3] transition-all"
              >
                <option value="">-- Select Primary Doctor --</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} {doc.title ? `(${doc.title})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Holds clinical authority over protocols, treatments, and prescriptions.
              </p>
            </div>

            {/* Care Coordinator Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#C178F5]" />
                Care Coordinator
              </label>
              <select
                value={selectedCoordinatorId}
                onChange={(e) => setSelectedCoordinatorId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C178F5] transition-all"
              >
                <option value="">-- Select Care Coordinator --</option>
                {coordinators.map((coord) => (
                  <option key={coord.id} value={coord.id}>
                    {coord.name} {coord.title ? `(${coord.title})` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Coordinates appointments, patient WhatsApp queries, and lab logistics.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t border-gray-100 flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="rounded-xl text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-xl bg-[#866BE3] hover:bg-[#7254d1] text-white text-xs font-semibold px-5"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Saving...
              </>
            ) : (
              "Save Assignment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
