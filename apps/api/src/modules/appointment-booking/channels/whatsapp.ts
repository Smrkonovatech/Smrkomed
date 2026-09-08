/**
 * WhatsApp Channel Formatter
 * Generates user-friendly WhatsApp messages with numbered menus, doctor previews,
 * and standard navigation footers.
 */

import type { BookingDoctorSummary, BookingSession, BookingSlot } from "../types";
import { formatDateLabel } from "../nlp-parser";

const FOOTER_NAV = "\n\n_Reply with option number, or type *BACK*, *RESTART*, or *HUMAN* for assistance._";

export function formatIdentifyPatientPrompt(session: BookingSession, matchedName?: string | null): string {
  if (matchedName) {
    return (
      `👋 Welcome to *SmrkoMed*!\n\n` +
      `We found an existing profile matching this number: *${matchedName}*.\n\n` +
      `1️⃣ Yes, that's me (Continue)\n` +
      `2️⃣ No, register a new patient` +
      FOOTER_NAV
    );
  }

  return (
    `👋 Welcome to *SmrkoMed Fertility Services*!\n\n` +
    `I can help you schedule an in-person or video consultation.\n\n` +
    `Are you an existing registered patient?\n` +
    `1️⃣ Yes, I have an existing file\n` +
    `2️⃣ No, I am a new patient` +
    FOOTER_NAV
  );
}

export function formatRegisterPatientPrompt(session: BookingSession, subStep = 1): string {
  if (subStep === 1) {
    return (
      `📝 *Patient Registration (1/3)*\n\n` +
      `Please reply with the *Patient's Full Name*:` +
      `\n\n_(Note: We will use your current WhatsApp number for appointment updates.)_`
    );
  }
  if (subStep === 2) {
    return (
      `📝 *Patient Registration (2/3)*\n\n` +
      `Thank you, *${session.registrationDraft.patientName}*!\n` +
      `Please enter your *Age* or *Date of Birth* (e.g. 29, or 1995-06-15):`
    );
  }
  return (
    `📝 *Patient Registration (3/3)*\n\n` +
    `For fertility consultations, having partner details helps us prepare your couple record.\n\n` +
    `Please reply with *Partner's Full Name* (or reply *SKIP* to proceed):`
  );
}

export function formatSelectDoctorPrompt(doctors: BookingDoctorSummary[]): string {
  let text = `🩺 *Select a Doctor*\n\nPlease choose a doctor for your consultation:\n\n`;
  doctors.forEach((doc, idx) => {
    text += `${idx + 1}️⃣ *${doc.displayName}*\n   _${doc.specialty}_ (${doc.experienceYears} yrs exp)\n   Fee: ₹${doc.consultationFee ?? 1000}\n\n`;
  });
  text += `Reply with the doctor's number to view profile and slots.` + FOOTER_NAV;
  return text;
}

export function formatViewDoctorPrompt(doctor: BookingDoctorSummary): string {
  return (
    `👨‍⚕️ *Doctor Profile: ${doctor.displayName}*\n\n` +
    `• *Specialty:* ${doctor.specialty}\n` +
    `• *Experience:* ${doctor.experienceYears} years\n` +
    `• *Languages:* ${doctor.languages.join(", ")}\n` +
    `• *Consultation Fee:* ₹${doctor.consultationFee ?? 1000}\n` +
    `• *Bio:* ${doctor.bio}\n\n` +
    `What would you like to do?\n` +
    `1️⃣ See Available Slots\n` +
    `2️⃣ Choose Another Doctor` +
    FOOTER_NAV
  );
}

export function formatSelectDatePrompt(doctorName: string, availableDates: string[]): string {
  let text = `📅 *Choose a Date for ${doctorName}*\n\nAvailable upcoming dates:\n\n`;
  availableDates.slice(0, 5).forEach((dateIso, idx) => {
    const d = new Date(`${dateIso}T00:00:00`);
    text += `${idx + 1}️⃣ ${formatDateLabel(d)} (${dateIso})\n`;
  });
  text += `\n_You can also reply with "tomorrow", "Friday", or any custom date._` + FOOTER_NAV;
  return text;
}

export function formatSelectSlotPrompt(doctorName: string, dateIso: string, slots: BookingSlot[]): string {
  const d = new Date(`${dateIso}T00:00:00`);
  const availableSlots = slots.filter((s) => s.status === "available");

  if (availableSlots.length === 0) {
    return (
      `⚠️ *No Open Slots for ${doctorName} on ${formatDateLabel(d)}*\n\n` +
      `All slots on this date are fully booked or closed.\n\n` +
      `1️⃣ Choose another date\n` +
      `2️⃣ Choose another doctor\n` +
      `3️⃣ Speak with Care Coordinator` +
      FOOTER_NAV
    );
  }

  let text = `⏰ *Available Slots on ${formatDateLabel(d)}*\nDoctor: *${doctorName}*\n\n`;
  availableSlots.slice(0, 8).forEach((slot, idx) => {
    text += `${idx + 1}️⃣ ${slot.timeLabel}\n`;
  });
  text += `\nReply with slot number or type time (e.g. "11:30 AM").` + FOOTER_NAV;
  return text;
}

export function formatConfirmationPrompt(session: BookingSession): string {
  const patientName = session.registrationDraft.patientName || "Patient";
  const partnerName = session.registrationDraft.partnerName ? `\n• *Partner:* ${session.registrationDraft.partnerName}` : "";
  const d = new Date(`${session.selectedDate}T00:00:00`);

  return (
    `📋 *Please Confirm Your Appointment Summary*\n\n` +
    `• *Patient:* ${patientName}${partnerName}\n` +
    `• *Doctor:* ${session.doctorName}\n` +
    `• *Date:* ${formatDateLabel(d)} (${session.selectedDate})\n` +
    `• *Time:* ${session.selectedSlot}\n` +
    `• *Type:* ${session.appointmentType}\n` +
    `• *Clinic:* ABC Fertility Centre\n\n` +
    `1️⃣ Confirm & Book\n` +
    `2️⃣ Change Date/Time\n` +
    `3️⃣ Cancel / Start Again` +
    FOOTER_NAV
  );
}

export function formatBookingSuccessPrompt(session: BookingSession): string {
  const d = new Date(`${session.selectedDate}T00:00:00`);
  const apptId = session.appointmentId || `APT-${Date.now().toString().slice(-6)}`;

  return (
    `🎉 *Appointment Confirmed!*\n\n` +
    `Your appointment has been successfully scheduled.\n\n` +
    `🔖 *Appointment ID:* #${apptId}\n` +
    `👨‍⚕️ *Doctor:* ${session.doctorName}\n` +
    `📅 *Date:* ${formatDateLabel(d)}\n` +
    `⏰ *Time:* ${session.selectedSlot}\n` +
    `🏥 *Location:* Consultation Room 1, ABC Fertility Centre\n\n` +
    `Our Care Team has sent your details to the clinic. You will receive a reminder 2 hours prior to your visit.\n\n` +
    `_Need to reschedule or cancel? You can message us here at any time._`
  );
}

export function formatHandoffPrompt(reason?: string | null): string {
  return (
    `🤝 *Connecting you to a Care Coordinator*\n\n` +
    `I have notified our clinical care coordinator${reason ? ` regarding: ${reason}` : ""}.\n\n` +
    `A member of our team will review your request and reply to you directly in this chat shortly.\n\n` +
    `_Clinic Operating Hours: Mon–Sat, 8:00 AM – 8:00 PM._`
  );
}
