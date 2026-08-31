import type { DoctorProfile } from "./types";
import { findOverlappingSlots, validateSlot } from "./availability";
import { WEEKDAYS } from "./types";

export type FieldErrors = Record<string, string>;

export function validateBasic(doctor: DoctorProfile): FieldErrors {
  const errors: FieldErrors = {};
  if (!doctor.firstName.trim()) errors["firstName"] = "First name is required.";
  if (!doctor.lastName.trim()) errors["lastName"] = "Last name is required.";
  if (!doctor.phone.trim()) errors["phone"] = "Phone number is required.";
  if (!doctor.email.trim()) errors["email"] = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doctor.email.trim())) {
    errors["email"] = "Enter a valid email address.";
  }
  if (!doctor.registrationNumber.trim()) {
    errors["registrationNumber"] = "Medical registration number is required.";
  }
  return errors;
}

export function validateProfessional(doctor: DoctorProfile): FieldErrors {
  const errors: FieldErrors = {};
  if (!doctor.designation.trim()) errors["designation"] = "Designation is required.";
  if (!doctor.department.trim()) errors["department"] = "Department is required.";
  if (!doctor.primarySpecialty.trim()) errors["primarySpecialty"] = "Primary specialty is required.";
  if (doctor.yearsExperience < 0) errors["yearsExperience"] = "Enter a valid experience value.";
  return errors;
}

export function validateAvailability(doctor: DoctorProfile): FieldErrors {
  const errors: FieldErrors = {};
  for (const day of WEEKDAYS) {
    const schedule = doctor.weeklySchedule[day];
    if (!schedule.enabled) continue;
    if (schedule.slots.length === 0) {
      errors[`schedule.${day}`] = "Add at least one time slot or disable the day.";
      continue;
    }
    for (const slot of schedule.slots) {
      const err = validateSlot(slot);
      if (err) {
        errors[`schedule.${day}`] = err;
        break;
      }
    }
    const overlap = findOverlappingSlots(schedule.slots);
    if (overlap) errors[`schedule.${day}`] = overlap;
  }
  const settings = doctor.appointmentSettings;
  if (settings.consultationMinutes < 5) {
    errors["consultationMinutes"] = "Consultation duration must be at least 5 minutes.";
  }
  if (settings.followUpMinutes < 5) {
    errors["followUpMinutes"] = "Follow-up duration must be at least 5 minutes.";
  }
  return errors;
}

export function validateForActivate(doctor: DoctorProfile): FieldErrors {
  return {
    ...validateBasic(doctor),
    ...validateProfessional(doctor),
    ...validateAvailability(doctor),
  };
}
