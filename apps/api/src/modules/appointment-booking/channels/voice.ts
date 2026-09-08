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

/**
 * Initiates an automated AI Outbound Phone Call via the Sarvam Samvaad API.
 */
export async function triggerSarvamOutboundCall(params: {
  phoneNumber: string;
  patientName?: string | undefined;
  partnerName?: string | undefined;
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
    const clinicName = params.clinicName || "SmrkoMed";
    const doctorName = params.doctorName || "Dr. Ananya Rao";
    const treatment = params.treatment || "Consultation";

    const callSummary = `Patient ${patientName} booking consultation at ${clinicName} with ${doctorName}. Only book within verified open slots.`;

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
      patientName,
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

/**
 * Automatically syncs completed Sarvam call outcomes to create appointments in SmrkoMed
 * if the patient scheduled an appointment on the call.
 */
function scheduleSarvamPostCallSync(params: {
  phoneNumber: string;
  patientName?: string;
  doctorName?: string;
  clinicName?: string;
  orgId: string;
  workspaceId: string;
  appId: string;
  apiKey: string;
}) {
  const delays = [60_000, 100_000, 140_000];
  for (const delay of delays) {
    setTimeout(async () => {
      try {
        const { prisma } = await import("@smrkomed/database");
        const now = new Date();
        const start = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
        const end = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

        const url = `https://apps.sarvam.ai/api/analytics/v1/${params.orgId}/${params.workspaceId}/${params.appId}/attempts?start_datetime=${encodeURIComponent(start)}&end_datetime=${encodeURIComponent(end)}`;
        const res = await fetch(url, { headers: { "X-API-Key": params.apiKey } });
        if (!res.ok) return;

        const data = (await res.json().catch(() => ({}))) as { items?: Array<{ user_contact?: string; agent_variables?: { call_summary?: string } }> };
        const phone10 = params.phoneNumber.slice(-10);
        const attempt = (data.items || []).find((i) =>
          String(i.user_contact || "").includes(phone10)
        );

        if (!attempt) return;
        const summary = String(attempt.agent_variables?.call_summary || "");

        // If call summary indicates an appointment was booked
        if (/booked\s+(?:an\s+)?appointment|scheduled\s+(?:an\s+)?appointment/i.test(summary)) {
          const patient = await prisma.patient.findFirst({
            where: {
              OR: [
                { phone: { contains: phone10 } },
                { whatsappNumber: { contains: phone10 } },
              ],
            },
            include: { primaryCouples: true, partnerCouples: true, clinic: true },
          });
          if (!patient) return;

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

          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);

          const existing = await prisma.appointment.findFirst({
            where: {
              clinicId: patient.clinicId,
              coupleId: couple.id,
              startsAt: {
                gte: new Date(tomorrow.getTime() - 4 * 3600 * 1000),
                lte: new Date(tomorrow.getTime() + 4 * 3600 * 1000),
              },
            },
          });
          if (existing) return;

          const doctorName = params.doctorName || "Dr. Ananya Rao";
          const appt = await prisma.appointment.create({
            data: {
              clinicId: patient.clinicId,
              coupleId: couple.id,
              doctorName,
              type: "CONSULTATION",
              startsAt: tomorrow,
              durationMin: 30,
              status: "CONFIRMED",
              notes: `Booked via Sarvam AI Voice Call. Summary: ${summary}`.slice(0, 500),
            },
          });

          console.log("[Sarvam Post-Call Sync] Automatically created appointment from voice call summary:", appt.id);

          const conv = await prisma.conversation.findFirst({
            where: {
              clinicId: patient.clinicId,
              OR: [{ patientId: patient.id }, { contactPhone: { contains: phone10 } }],
            },
            orderBy: { updatedAt: "desc" },
          });

          if (conv) {
            const dateStr = tomorrow.toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            const timeStr = "09:00 AM";
            const patientName = `${patient.firstName} ${patient.lastName || ""}`.trim();
            const text = `You're all set, ${patientName}! 🎉\n\nYour appointment is confirmed from your phone call:\n\n👩‍⚕️ ${doctorName}\n📅 ${dateStr}\n⏰ ${timeStr}\n📍 ${patient.clinic?.name || "ABC Fertility Centre"}\n\nWe'll remind you before your appointment!`;

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
        }
      } catch (e) {
        console.error("[Sarvam Post-Call Sync Error]", e);
      }
    }, delay);
  }
}

