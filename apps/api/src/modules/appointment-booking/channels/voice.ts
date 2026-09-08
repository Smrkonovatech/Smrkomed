/**
 * AI Voice Call Formatter — Sarvam AI Samvaad Integration
 * Generates spoken dialogue and natural speech prompts compatible with Sarvam agent variables.
 */

import type { BookingDoctorSummary, BookingSession, BookingSlot } from "../types";
import { formatDateLabel } from "../nlp-parser";

export interface SpokenPromptOptions {
  language?: "en" | "kn" | "hi";
}

export function formatVoiceGreeting(patientName: string, doctorName: string, clinicName: string, lang = "en"): string {
  if (lang === "kn") {
    return `ನಮಸ್ಕಾರ ${patientName} ಅವರೇ, ನಾನು ${clinicName} ಆಸ್ಪತ್ರೆಯ AI ಕಡೆಯಿಂದ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ. ${doctorName} ಅವರೊಂದಿಗೆ ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕಿಂಗ್ ಮಾಡಲು ಸಹಾಯ ಮಾಡಲು ಬಯಸುತ್ತೇನೆ. ನೀವು ಮುಂದುವರಿಯಲು ಸಿದ್ಧರಿದ್ದೀರಾ?`;
  }
  if (lang === "hi") {
    return `नमस्ते ${patientName} जी, मैं ${clinicName} से कॉल कर रहा हूँ। ${doctorName} के साथ आपके परामर्श का समय निर्धारित करने के लिए कॉल किया है। क्या हम शुरू करें?`;
  }
  return `Hello ${patientName}, this is the Care Assistant calling from ${clinicName}. I am calling to help schedule your consultation with ${doctorName}. Shall we proceed?`;
}

export function formatVoiceDoctorList(doctors: BookingDoctorSummary[], lang = "en"): string {
  const docNames = doctors.map((d) => d.displayName).join(", or ");
  if (lang === "kn") {
    return `ನಮ್ಮಲ್ಲಿ ${docNames} ಲಭ್ಯವಿದ್ದಾರೆ. ನೀವು ಯಾರೊಂದಿಗೆ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬಯಸುತ್ತೀರಿ?`;
  }
  if (lang === "hi") {
    return `हमारे पास ${docNames} उपलब्ध हैं। आप किस डॉक्टर से मिलना चाहेंगे?`;
  }
  return `Available specialists include ${docNames}. Which doctor would you like to book with?`;
}

export function formatVoiceSlotList(doctorName: string, dateIso: string, slots: BookingSlot[], lang = "en"): string {
  const d = new Date(`${dateIso}T00:00:00`);
  const open = slots.filter((s) => s.status === "available").slice(0, 4).map((s) => s.timeLabel).join(", ");

  if (!open) {
    if (lang === "kn") {
      return `ಕ್ಷಮಿಸಿ, ${doctorName} ಅವರಿಗೆ ${formatDateLabel(d)} ರಂದು ಯಾವುದೇ ಸ್ಲಾಟ್‌ಗಳು ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಂದು ದಿನವನ್ನು ತಿಳಿಸಿ.`;
    }
    if (lang === "hi") {
      return `माफ़ कीजिए, ${formatDateLabel(d)} को ${doctorName} के लिए कोई समय उपलब्ध नहीं है। कृपया कोई अन्य दिन बताएं।`;
    }
    return `I am sorry, ${doctorName} has no open slots on ${formatDateLabel(d)}. Would you like to check another day?`;
  }

  if (lang === "kn") {
    return `${doctorName} ಅವರಿಗೆ ${formatDateLabel(d)} ರಂದು ಲಭ್ಯವಿರುವ ಸಮಯಗಳು: ${open}. ನೀವು ಯಾವ ಸಮಯವನ್ನು ಆಯ್ಕೆ ಮಾಡುತ್ತೀರಿ?`;
  }
  if (lang === "hi") {
    return `${doctorName} के लिए ${formatDateLabel(d)} को उपलब्ध समय हैं: ${open}। आप किस समय को चुनना चाहेंगे?`;
  }
  return `Available times for ${doctorName} on ${formatDateLabel(d)} are ${open}. What time works best for you?`;
}

export function formatVoiceConfirmation(session: BookingSession, lang = "en"): string {
  const d = new Date(`${session.selectedDate}T00:00:00`);
  const patient = session.registrationDraft.patientName || "Patient";

  if (lang === "kn") {
    return `${patient} ಅವರೇ, ${formatDateLabel(d)} ರಂದು ${session.selectedSlot} ಗಂಟೆಗೆ ${session.doctorName} ಅವರೊಂದಿಗೆ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಬೇಕೇ? ಹೌದು ಎಂದು ದೃಢೀಕರಿಸಿ ಅಥವಾ ದಿನ ಬದಲಾಯಿಸಲು ತಿಳಿಸಿ.`;
  }
  if (lang === "hi") {
    return `${patient} जी, क्या आप ${formatDateLabel(d)} को ${session.selectedSlot} बजे ${session.doctorName} के साथ परामर्श की पुष्टि करना चाहते हैं? पुष्टि करने के लिए हाँ कहें।`;
  }
  return `Just to confirm: would you like me to book the appointment for ${patient} with ${session.doctorName} on ${formatDateLabel(d)} at ${session.selectedSlot}? Please say yes to confirm.`;
}

export function formatVoiceSuccess(session: BookingSession, lang = "en"): string {
  const d = new Date(`${session.selectedDate}T00:00:00`);

  if (lang === "kn") {
    return `ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಯಶಸ್ವಿಯಾಗಿ ಬುಕ್ ಆಗಿದೆ. ${formatDateLabel(d)} ರಂದು ${session.selectedSlot} ಗಂಟೆಗೆ ಭೇಟಿ ನೀಡಿ. ವಿವರಗಳನ್ನು ನಿಮ್ಮ ವಾಟ್ಸಾಪ್‌ಗೆ ಕಳುಹಿಸಲಾಗಿದೆ.`;
  }
  if (lang === "hi") {
    return `धन्यवाद! आपका परामर्श सफलतापूर्वक बुक हो गया है। विवरण आपके व्हाट्सऐप पर भेज दिया गया है। आपका दिन शुभ हो!`;
  }
  return `Thank you! Your appointment is confirmed with ${session.doctorName} on ${formatDateLabel(d)} at ${session.selectedSlot}. A confirmation has also been sent to your WhatsApp. Have a great day!`;
}
