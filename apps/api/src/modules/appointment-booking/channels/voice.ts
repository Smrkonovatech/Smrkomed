/**
 * AI Voice Call Formatter & Sync Engine — Sarvam AI Samvaad Integration
 * Generates spoken dialogue, initiates outbound calls, and synchronizes call
 * outcomes into SmrkoMed appointments in real time.
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

export interface ActiveVoiceCall {
  phoneNumber: string;
  patientName?: string | undefined;
  partnerName?: string | undefined;
  coupleId?: string | undefined;
  doctorName?: string | undefined;
  clinicName?: string | undefined;
  startedAt: number;
}

const activeVoiceCalls: ActiveVoiceCall[] = [];

export function recordActiveVoiceCall(call: ActiveVoiceCall) {
  activeVoiceCalls.unshift(call);
  if (activeVoiceCalls.length > 30) {
    activeVoiceCalls.pop();
  }
}

export function getLatestActiveVoiceCall(phoneSuffix?: string): ActiveVoiceCall | undefined {
  const now = Date.now();
  const recent = activeVoiceCalls.filter((c) => now - c.startedAt < 30 * 60 * 1000);
  if (phoneSuffix && phoneSuffix.length >= 8) {
    const matched = recent.find((c) => c.phoneNumber.includes(phoneSuffix));
    if (matched) return matched;
  }
  return recent[0];
}

/**
 * Initiates an automated AI Outbound Phone Call via the Sarvam Samvaad API.
 */
export async function triggerSarvamOutboundCall(params: {
  phoneNumber: string;
  patientName?: string | undefined;
  partnerName?: string | undefined;
  coupleId?: string | undefined;
  treatment?: string | undefined;
  stage?: string | undefined;
  doctorName?: string | undefined;
  clinicName?: string | undefined;
  language?: "kn" | "hi" | "en" | undefined;
}): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const apiKey =
      process.env["SARVAM_SAMVAAD_API_KEY"] ||
      process.env["SARVAM_API_KEY"] ||
      "sk_samvaad_xywpvl90_4qRfmMh1fcGrL9XcM48TdBbF";
    const orgId = process.env["SARVAM_ORG_ID"] || "01a06777-00d4-7317-835c-507054052514";
    const workspaceId = process.env["SARVAM_WORKSPACE_ID"] || "01a06777-00da-7f77-abe3-dc1fc871a5ab";
    const appId = process.env["SARVAM_APP_ID"] || "smrkomed-8401f738-b749";
    const appVersion = Number(process.env["SARVAM_APP_VERSION"]) || 7;
    const connectionId = process.env["SARVAM_CONNECTION_ID"] || "587ab0c5-8f-f564346c-f2ae";
    const agentPhoneNumber = process.env["SARVAM_AGENT_PHONE_NUMBER"] || "+918064265889";

    const digits = params.phoneNumber.replace(/\D/g, "");
    let formattedPhone = params.phoneNumber;
    if (digits.length === 10) {
      formattedPhone = `+91${digits}`;
    } else if (digits.length === 12 && digits.startsWith("91")) {
      formattedPhone = `+${digits}`;
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = `+${digits}`;
    }

    const patientName = params.patientName || "Valued Patient";
    const clinicName = params.clinicName || "Hospex";
    const doctorName = params.doctorName || "Dr. Jismon J";

    // Fetch doctor's real schedule and open slots for tomorrow from database
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateIso = tomorrow.toISOString().split("T")[0]!;
    let openSlotsSummary = "09:30 AM, 10:00 AM, 10:30 AM, 11:00 AM, 11:30 AM, 02:00 PM";
    try {
      const { getDoctorDaySlots } = await import("../slot-engine");
      const { prisma } = await import("@smrkomed/database");
      const clinic = await prisma.clinic.findFirst();
      if (clinic) {
        const daySlots = await getDoctorDaySlots(clinic.id, doctorName, dateIso);
        const available = daySlots.filter((s) => s.status === "available").slice(0, 6).map((s) => s.timeLabel);
        if (available.length > 0) {
          openSlotsSummary = available.join(", ");
        }
      }
    } catch (e) {
      console.warn("[Voice Call Schedule Fetch Warning]", e);
    }

    const callSummary = `Patient ${patientName} booking consultation at ${clinicName} with ${doctorName}. Available open slots for tomorrow (${dateIso}): ${openSlotsSummary}. Only book within these verified open slots. Do NOT double-book or overlap with existing appointments.`;

    // Track active voice call
    recordActiveVoiceCall({
      phoneNumber: formattedPhone,
      patientName: params.patientName,
      partnerName: params.partnerName,
      coupleId: params.coupleId,
      doctorName,
      clinicName,
      startedAt: Date.now(),
    });

    const payload = {
      app_config: {
        app_id: appId,
        app_version: appVersion,
        app_type: "agent",
        connection_config: {
          connection_id: connectionId,
          agent_phone_number: agentPhoneNumber,
        },
        agent_variables: {
          call_summary: callSummary,
          user_name: patientName,
        },
      },
      user_config: {
        user_phone_number: formattedPhone,
      },
    };

    const url = `https://apps.sarvam.ai/api/outbounds/v1/orgs/${orgId}/workspaces/${workspaceId}/outbounds`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = (responseData as { message?: string })?.message || "Sarvam API call failed";
      console.error("[Sarvam Outbound Call Error]", response.status, responseData);
      return { success: false, error: err };
    }

    console.log("[Sarvam Outbound Call Initiated]", { phone: formattedPhone, patientName });

    // Schedule automatic post-call outcome synchronization
    scheduleSarvamPostCallSync({
      phoneNumber: formattedPhone,
      patientName: params.patientName,
      doctorName,
      clinicName,
      orgId,
      workspaceId,
      appId,
      apiKey,
    });

    return { success: true, data: responseData };
  } catch (err) {
    console.error("[Sarvam Outbound Call Exception]", err);
    return { success: false, error: err instanceof Error ? err.message : "Outbound call failed" };
  }
}

export interface VoiceAppointmentSyncParams {
  phoneNumber: string;
  patientName?: string | undefined;
  doctorName?: string | undefined;
  clinicName?: string | undefined;
  summary?: string | undefined;
  dateStr?: string | undefined;
  timeStr?: string | undefined;
}

/**
 * Creates an appointment for the patient matched by phone number or details.
 * Parses call summary for requested slot, doctor, and date.
 * Returns true if appointment was created or already existed.
 */
export async function createVoiceAppointmentFromPhone(
  prisma: any,
  params: VoiceAppointmentSyncParams
): Promise<boolean> {
  const phone10 = params.phoneNumber.replace(/\D/g, "").slice(-10);

  // 1. Resolve Patient
  let patient = await prisma.patient.findFirst({
    where: {
      OR: [
        { phone: { contains: phone10 } },
        { whatsappNumber: { contains: phone10 } },
      ],
    },
    include: { primaryCouples: true, partnerCouples: true, clinic: true },
  });

  if (!patient && params.patientName) {
    patient = await prisma.patient.findFirst({
      where: {
        firstName: { contains: params.patientName.split(" ")[0], mode: "insensitive" },
      },
      include: { primaryCouples: true, partnerCouples: true, clinic: true },
    });
  }

  if (!patient) {
    console.warn("[Sarvam Sync] No patient found for phone suffix:", phone10);
    return false;
  }

  // 2. Resolve Couple
  let couple = patient.primaryCouples[0] || patient.partnerCouples[0];
  if (!couple) {
    couple = await prisma.couple.create({
      data: {
        clinicId: patient.clinicId,
        slug: `c-${patient.id.slice(-8)}-${Date.now().toString(36)}`,
        primaryPatientId: patient.id,
      },
    });
  }

  // 3. Parse Date & Time from summary or parameters
  const summary = params.summary || "";
  const now = new Date();
  const targetDate = new Date();

  if (summary.toLowerCase().includes("tomorrow") || !params.dateStr) {
    targetDate.setDate(now.getDate() + 1);
  } else if (params.dateStr && !isNaN(Date.parse(params.dateStr))) {
    const p = new Date(params.dateStr);
    targetDate.setFullYear(p.getFullYear(), p.getMonth(), p.getDate());
  }

  // Extract time from summary (e.g., "10:00 AM", "09:30 AM", "2:00 PM")
  let hours = 10;
  let minutes = 0;
  let timeLabel = "10:00 AM";

  const timeMatch = summary.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)/);
  if (timeMatch && timeMatch[1]) {
    let h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2] || "0", 10);
    const isPm = timeMatch[3]?.toLowerCase() === "pm";
    const isAm = timeMatch[3]?.toLowerCase() === "am";
    if (isPm && h < 12) h += 12;
    if (isAm && h === 12) h = 0;
    hours = h;
    minutes = m;
    const dispH = h % 12 || 12;
    const dispMeridian = h >= 12 ? "PM" : "AM";
    timeLabel = `${String(dispH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${dispMeridian}`;
  } else if (params.timeStr) {
    timeLabel = params.timeStr;
  }

  // IST is UTC + 5:30 -> UTC = IST - 5:30
  const y = targetDate.getFullYear();
  const mo = String(targetDate.getMonth() + 1).padStart(2, "0");
  const d = String(targetDate.getDate()).padStart(2, "0");
  const isoDate = `${y}-${mo}-${d}`;

  // Construct startsAt in UTC (subtract 5 hours 30 minutes from IST hours/minutes)
  const startsAt = new Date(`${isoDate}T00:00:00.000Z`);
  const totalUtcMinutes = hours * 60 + minutes - 330;
  startsAt.setUTCMinutes(totalUtcMinutes);

  // 4. Resolve Doctor Name
  let doctorName = params.doctorName || "Dr. Jismon J";
  if (/jisman|jismon/i.test(summary)) {
    doctorName = "Dr. Jismon J";
  } else if (/manideep/i.test(summary)) {
    doctorName = "Dr. Manideep";
  } else if (/ananya/i.test(summary)) {
    doctorName = "Dr. Ananya Rao";
  }

  // 5. Idempotency Check: Avoid double-booking around the same slot
  const existing = await prisma.appointment.findFirst({
    where: {
      clinicId: patient.clinicId,
      coupleId: couple.id,
      startsAt: {
        gte: new Date(startsAt.getTime() - 2 * 3600 * 1000),
        lte: new Date(startsAt.getTime() + 2 * 3600 * 1000),
      },
    },
  });

  if (existing) {
    console.log("[Sarvam Sync] Appointment already exists, skipping duplicate:", existing.id);
    return true;
  }

  // 6. Create the Confirmed Appointment
  const appt = await prisma.appointment.create({
    data: {
      clinicId: patient.clinicId,
      coupleId: couple.id,
      doctorName,
      type: "CONSULTATION",
      startsAt,
      durationMin: 30,
      status: "CONFIRMED",
      notes: summary
        ? `Booked via Sarvam AI Voice Call. Summary: ${summary}`.slice(0, 500)
        : `Booked via Sarvam AI Voice Call. Patient confirmed booking during phone call.`,
    },
  });

  console.log("[Sarvam Sync] Successfully created appointment:", appt.id, "patient:", patient.firstName, "time:", timeLabel);

  // 7. Sync CareTask so Care Loop tracks it
  try {
    const { syncCareTaskForAppointment } = await import("../../../modules/appointments/whatsapp-booking");
    await syncCareTaskForAppointment({
      clinicId: patient.clinicId,
      coupleId: couple.id,
      appointmentId: appt.id,
      title: `Consultation with ${doctorName}`,
      description: `Confirmed appointment on ${isoDate} at ${timeLabel}.`,
      startsAt,
      mode: "book",
    });
  } catch (taskErr) {
    console.warn("[Sarvam Sync] CareTask sync warning:", taskErr);
  }

  // 8. Dispatch WhatsApp Confirmation
  const conv = await prisma.conversation.findFirst({
    where: {
      clinicId: patient.clinicId,
      OR: [{ patientId: patient.id }, { contactPhone: { contains: phone10 } }],
    },
    orderBy: { updatedAt: "desc" },
  });

  if (conv) {
    const formattedDate = startsAt.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const patientDisplayName = `${patient.firstName} ${patient.lastName || ""}`.trim();
    const cleanDoc = `Dr. ${doctorName.replace(/^(dr\s*\.?\s*)+/i, "").trim().replace(/\b\w/g, (c: string) => c.toUpperCase())}`;
    const clinicDisplayName = patient.clinic?.name || params.clinicName || "Hospex";

    const text = `You're all set, ${patientDisplayName}! 🎉\n\nYour appointment is confirmed from your AI phone call:\n\n👩‍⚕️ ${cleanDoc}\n📅 ${formattedDate}\n⏰ ${timeLabel}\n📍 ${clinicDisplayName}\n\nWe'll remind you before your appointment!`;

    await prisma.message.create({
      data: {
        conversationId: conv.id,
        direction: "OUTBOUND",
        senderType: "STAFF",
        content: text,
        messageType: "text",
        status: "SENT",
      },
    }).catch(() => undefined);
  }

  return true;
}

/**
 * Automatically syncs completed Sarvam call outcomes to create appointments in SmrkoMed.
 */
export function scheduleSarvamPostCallSync(params: {
  phoneNumber: string;
  patientName?: string | undefined;
  doctorName?: string | undefined;
  clinicName?: string | undefined;
  orgId: string;
  workspaceId: string;
  appId: string;
  apiKey: string;
}) {
  const delays = [15_000, 35_000, 60_000, 95_000, 130_000];
  let alreadyCreated = false;

  for (const delay of delays) {
    const timer = setTimeout(async () => {
      if (alreadyCreated) return;
      try {
        const { prisma } = await import("@smrkomed/database");
        const now = new Date();
        const start = new Date(now.getTime() - 45 * 60 * 1000).toISOString();
        const end = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

        const url = `https://apps.sarvam.ai/api/analytics/v1/${params.orgId}/${params.workspaceId}/${params.appId}/attempts?start_datetime=${encodeURIComponent(start)}&end_datetime=${encodeURIComponent(end)}`;
        const res = await fetch(url, { headers: { "X-API-Key": params.apiKey } });

        console.log(`[Sarvam Post-Call Sync] delay=${delay}ms analytics_status=${res.status} phone=${params.phoneNumber}`);

        if (!res.ok) {
          if (delay >= 60_000) {
            const created = await createVoiceAppointmentFromPhone(prisma, {
              phoneNumber: params.phoneNumber,
              patientName: params.patientName,
              doctorName: params.doctorName,
              clinicName: params.clinicName,
            });
            if (created) alreadyCreated = true;
          }
          return;
        }

        const data = (await res.json().catch(() => ({}))) as {
          items?: Array<{
            user_contact?: string;
            connectivity_status?: string;
            agent_variables?: { call_summary?: string };
          }>;
        };

        const phone10 = params.phoneNumber.replace(/\D/g, "").slice(-10);
        const attempt = (data.items || []).find((i) =>
          String(i.user_contact || "").includes(phone10)
        );

        if (!attempt) {
          if (delay === 130_000) {
            console.warn("[Sarvam Post-Call Sync] Call attempt not indexed yet — using direct booking fallback");
            const created = await createVoiceAppointmentFromPhone(prisma, {
              phoneNumber: params.phoneNumber,
              patientName: params.patientName,
              doctorName: params.doctorName,
              clinicName: params.clinicName,
            });
            if (created) alreadyCreated = true;
          }
          return;
        }

        const summary = String(attempt.agent_variables?.call_summary || "");
        const isBookingIntent =
          /(?:scheduled|booked|confirm|consultation|appointment|visit|meet)/i.test(summary) ||
          attempt.connectivity_status === "connected";

        if (isBookingIntent) {
          const created = await createVoiceAppointmentFromPhone(prisma, {
            phoneNumber: params.phoneNumber,
            patientName: params.patientName,
            doctorName: params.doctorName,
            clinicName: params.clinicName,
            summary,
          });
          if (created) alreadyCreated = true;
        }
      } catch (e) {
        console.error("[Sarvam Post-Call Sync Error]", e);
      }
    }, delay);
    timer.unref?.();
  }
}

/**
 * Scans recent Sarvam call attempts from the analytics API and creates appointments
 * for any completed booking calls.
 */
export async function syncSarvamRecentCalls(): Promise<{ synced: number; checked: number }> {
  try {
    const apiKey =
      process.env["SARVAM_SAMVAAD_API_KEY"] ||
      process.env["SARVAM_API_KEY"] ||
      "sk_samvaad_xywpvl90_4qRfmMh1fcGrL9XcM48TdBbF";
    const orgId = process.env["SARVAM_ORG_ID"] || "01a06777-00d4-7317-835c-507054052514";
    const workspaceId = process.env["SARVAM_WORKSPACE_ID"] || "01a06777-00da-7f77-abe3-dc1fc871a5ab";
    const appId = process.env["SARVAM_APP_ID"] || "smrkomed-8401f738-b749";

    const now = new Date();
    const start = new Date(now.getTime() - 180 * 60 * 1000).toISOString();
    const end = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    const url = `https://apps.sarvam.ai/api/analytics/v1/${orgId}/${workspaceId}/${appId}/attempts?start_datetime=${encodeURIComponent(start)}&end_datetime=${encodeURIComponent(end)}`;
    const res = await fetch(url, { headers: { "X-API-Key": apiKey } });
    if (!res.ok) {
      console.warn("[Sarvam Sync Recent] Analytics API returned status:", res.status);
      return { synced: 0, checked: 0 };
    }

    const data = (await res.json().catch(() => ({}))) as {
      items?: Array<{
        user_contact?: string;
        connectivity_status?: string;
        duration_in_seconds?: number;
        agent_variables?: { call_summary?: string; user_name?: string };
      }>;
    };

    const items = data.items || [];
    const { prisma } = await import("@smrkomed/database");
    let synced = 0;

    for (const item of items) {
      const contact = item.user_contact || "";
      if (!contact) continue;
      const summary = item.agent_variables?.call_summary || "";
      const isBooking =
        /(?:scheduled|booked|confirm|consultation|appointment|visit)/i.test(summary) ||
        (item.connectivity_status === "connected" && (item.duration_in_seconds || 0) > 20);

      if (isBooking) {
        const ok = await createVoiceAppointmentFromPhone(prisma, {
          phoneNumber: contact,
          patientName: item.agent_variables?.user_name,
          summary,
        });
        if (ok) synced++;
      }
    }

    return { synced, checked: items.length };
  } catch (err) {
    console.error("[Sarvam Sync Recent Error]", err);
    return { synced: 0, checked: 0 };
  }
}

// Background poller: runs every 30 seconds to catch any newly finished voice calls
if (typeof setInterval !== "undefined") {
  const syncInterval = setInterval(() => {
    void syncSarvamRecentCalls().catch(() => undefined);
  }, 30_000);
  syncInterval.unref?.();
}
