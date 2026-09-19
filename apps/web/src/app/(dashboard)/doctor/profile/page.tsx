import { DoctorProfileSlotManagement } from "@/components/doctors/doctor-profile-slot-management";

export const metadata = {
  title: "Doctor Profile & Slot Management | Hospex",
  description: "Manage doctor availability, weekly recurring schedule, OPD rules and slot buffers.",
};

export default function DoctorProfilePage() {
  return <DoctorProfileSlotManagement />;
}
