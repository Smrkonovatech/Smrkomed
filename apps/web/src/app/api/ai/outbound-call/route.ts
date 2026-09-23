import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@smrkomed/database";
import { getDoctorDaySlots } from "@/lib/doctors/db-availability";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  phoneNumber: z.string().min(8),
  patientName: z.string().min(1),
  partnerName: z.string().optional(),
  treatment: z.string().optional().default("IVF"),
  stage: z.string().optional().default("Consultation"),
  doctorName: z.string().optional().default("Dr. Ananya Rao"),
  clinicName: z.string().optional().default("Hospex"),
  upcomingAppointment: z.string().optional(),
  language: z.enum(["kn", "hi", "en", "ta", "te"]).optional().default("en"),
  customGreeting: z.string().optional(),
  coupleId: z.string().optional(),
  callType: z.enum(["CARE_VOICE_CHECKIN", "OUTBOUND", "APPOINTMENT_REMINDER"]).optional().default("OUTBOUND"),
  maxDurationSeconds: z.number().optional().default(90),
});

function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  if (phone.startsWith("+")) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = requestSchema.parse(json);

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

    const formattedPhone = formatE164(parsed.phoneNumber);

    const clinic = await prisma.clinic.findFirst();
    const clinicId = clinic?.id || "clinic_default";

    let activeDoctorName = parsed.doctorName;
    if (!activeDoctorName || activeDoctorName.toLowerCase().includes("ananya rao")) {
      const activeDoc = await prisma.clinicMembership.findFirst({
        where: {
          clinicId,
          status: "ACTIVE",
          OR: [
            { role: { key: "DOCTOR" } },
            { role: { name: { contains: "Doctor", mode: "insensitive" } } },
          ],
        },
        include: { user: { select: { name: true } } },
      });
      activeDoctorName = activeDoc?.user?.name || "Dr. Jismon J";
    }

    // Save active call details globally so book-appointment always knows the exact patient
    (globalThis as unknown as { __lastActiveCall?: Record<string, unknown> }).__lastActiveCall = {
      coupleId: parsed.coupleId,
      patientName: parsed.patientName,
      partnerName: parsed.partnerName,
      phoneNumber: formattedPhone,
      treatment: parsed.treatment,
      doctorName: activeDoctorName,
      clinicName: parsed.clinicName,
      callType: parsed.callType,
      maxDurationSeconds: parsed.maxDurationSeconds,
      timestamp: Date.now(),
    };

    // Fetch doctor's real open slots for tomorrow from DB
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    let openSlotsSummary = "";
    try {
      const tomorrowSlots = await getDoctorDaySlots(
        clinicId,
        activeDoctorName,
        tomorrow,
      );
      if (tomorrowSlots.isWorkingDay && tomorrowSlots.openSlots.length > 0) {
        openSlotsSummary = tomorrowSlots.openSlots.slice(0, 6).map((s) => s.timeLabel).join(", ");
      }
    } catch {
      // Graceful fallback
    }

    let callSummary = "";
    const clinicDisplayName = parsed.clinicName?.toLowerCase().includes("hospex")
      ? "Hospex Fertility Clinic"
      : (parsed.clinicName || "Hospex Fertility Clinic");

    const patientDisplayName = parsed.patientName?.trim() || "there";
    let initialBotMessage =
      parsed.customGreeting ||
      `Hi ${patientDisplayName}, I'm Care Voice from Hospex Fertility Clinic. How can I help you today?`;

    const langLabel =
      parsed.language === "kn"
        ? "Kannada"
        : parsed.language === "hi"
        ? "Hindi"
        : parsed.language === "ta"
        ? "Tamil"
        : parsed.language === "te"
        ? "Telugu"
        : "English";

    const langNative =
      parsed.language === "kn"
        ? "ಕನ್ನಡ"
        : parsed.language === "hi"
        ? "हिन्दी"
        : parsed.language === "ta"
        ? "தமிழ்"
        : parsed.language === "te"
        ? "తెలుగు"
        : "English";

    if (parsed.callType === "CARE_VOICE_CHECKIN") {
      callSummary = `[Care Voice Concierge] Patient: ${parsed.patientName}. Clinic: ${clinicDisplayName}.
Target User Language: ${langLabel} (${langNative}).
STRICT TIME CONSTRAINT: MAXIMUM CALL DURATION IS ${parsed.maxDurationSeconds || 90} SECONDS.

INITIAL OPENING GREETING (SPOKEN IMMEDIATELY IN ENGLISH):
"${initialBotMessage}"

CRITICAL INSTRUCTIONS & RULES:
1. INITIAL GREETING RULE (MANDATORY):
   - You MUST begin the call by speaking the exact opening line in ENGLISH verbatim:
     "${initialBotMessage}"
   - Do NOT say anything in any other language before speaking this exact English opening line.
2. MULTILINGUAL CONVERSATION & USER LANGUAGE RULE (CRITICAL):
   - Immediately following the initial English greeting, you MUST converse and respond according to the user's language: ${langLabel} (${langNative}).
   - If the patient replies in ${langLabel} (or switches to Kannada, Hindi, Tamil, Telugu, or English), immediately adopt and continue speaking fluently in the patient's chosen language for the rest of the call.
3. STRICTLY DO NOT mention "QR code", "QR scanner", "scanned", or "system registration" under any circumstances.
4. AI IDENTITY AND MODEL RULE: If the patient asks "which model are you?", "what AI is this?", "are you Sarvam / ChatGPT / OpenAI?", "who made you?", or asks about your technology:
   - You must NEVER say "Sarvam", "Sarvam AI", "OpenAI", "ChatGPT", or any external vendor under ANY circumstances.
   - You must ALWAYS answer that you are developed by SmrkoMed:
     * English: "I am Care Voice, developed by SmrkoMed, calling on behalf of ${clinicDisplayName}."
     * Kannada: "ನಾನು SmrkoMed ಸಂಸ್ಥೆಯಿಂದ ಅಭಿವೃದ್ಧಿಪಡಿಸಲಾದ ಕೇರ್ ವಾಯ್ಸ್ (Care Voice), ${clinicDisplayName} ಪರವಾಗಿ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ."
     * Hindi: "मैं SmrkoMed द्वारा विकसित केयर वॉइस (Care Voice) हूँ, ${clinicDisplayName} की ओर से बात कर रहा हूँ."
     * Tamil: "நான் SmrkoMed உருவாக்கிய கேர் வாய்ஸ் (Care Voice), ${clinicDisplayName} சார்பாக பேசுகிறேன்."
     * Telugu: "నేను SmrkoMed అభివృద్ధి చేసిన కేర్ వాయిస్ (Care Voice), ${clinicDisplayName} తరపున మాట్లాడుతున్నాను."
5. You are Care Voice, the polite, calming, and professional AI voice assistant calling on behalf of ${clinicDisplayName}.
6. Warmly ask how we can help the patient today and assist with:
   - Doctor consultation queue & specialist availability
   - Waiting lounge locations & clinic amenities
   - General guidance regarding their visit today
7. Guide them comfortably to take a seat in the waiting lounge while our care team is notified.
8. TIME LIMIT WARNING: Keep all answers concise, warm, and helpful. Conclude the call smoothly within ${parsed.maxDurationSeconds || 90} seconds by wishing them a pleasant and comfortable visit.`;
    } else {
      callSummary = `[Care Voice Outbound Call — Appointment Booking & Clinical Follow-up]
Patient: ${parsed.patientName}${parsed.partnerName ? ` (partner: ${parsed.partnerName})` : ""}
Clinic: Hospex Fertility Clinic (${clinicDisplayName})
Doctor: ${activeDoctorName}
Treatment: ${parsed.treatment} (Stage: ${parsed.stage})
${parsed.upcomingAppointment ? `Current appointment: ${parsed.upcomingAppointment}.` : ""}
${
  openSlotsSummary
    ? `Doctor's available open slots for tomorrow: ${openSlotsSummary}. Only book or reschedule within these exact open slots; do not allow overlapping bookings.`
    : ""
}
Target User Language: ${langLabel} (${langNative}).

INITIAL OPENING GREETING (SPOKEN IMMEDIATELY IN ENGLISH):
"${initialBotMessage}"

CRITICAL INSTRUCTIONS & RULES:
1. INITIAL GREETING RULE (MANDATORY):
   - You MUST begin the call by speaking the exact opening line in ENGLISH verbatim:
     "${initialBotMessage}"
   - Do NOT say anything in any other language before speaking this exact English opening line.
2. MULTILINGUAL CONVERSATION & USER LANGUAGE RULE (CRITICAL):
   - Immediately following the initial English greeting, you MUST converse and respond according to the user's language: ${langLabel} (${langNative}).
   - If the patient replies in ${langLabel} (or switches to Kannada, Hindi, Tamil, Telugu, or English), immediately adopt and continue speaking fluently in the patient's chosen language for the rest of the call.
3. APPOINTMENT BOOKING & SCHEDULING:
   - If the patient wants to book an appointment, check doctor schedule, or reschedule:
     * Offer the doctor's verified open slots: ${openSlotsSummary || "09:30 AM, 10:00 AM, 11:30 AM, 02:00 PM"}.
     * Confirm their preferred slot with ${activeDoctorName}, verify patient details, and confirm the appointment booking.
   - If the patient has questions regarding their ${parsed.treatment} treatment or clinic visit, answer helpfully and empathetically.
4. AI IDENTITY AND MODEL RULE: If asked which model you are, who built you, or if you are Sarvam/ChatGPT/OpenAI: NEVER mention Sarvam or external vendors. Always state: "I am Care Voice, developed by SmrkoMed, calling on behalf of ${clinicDisplayName}."
5. You are Care Voice, the polite, empathetic, and professional AI voice assistant from Hospex Fertility Clinic.`;
    }

    const payload: Record<string, unknown> = {
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
          user_name: parsed.patientName,
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

    const responseData = await response.json();

    if (!response.ok) {
      const errorMsg =
        responseData?.error?.message ||
        responseData?.message ||
        responseData?.error ||
        "Failed to dispatch call via Sarvam outbound service";

      return NextResponse.json(
        { success: false, error: { message: errorMsg, details: responseData } },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      details: {
        dialedNumber: formattedPhone,
        agentNumber: agentPhoneNumber,
        patientName: parsed.patientName,
        language: parsed.language,
        callType: parsed.callType,
        maxDurationSeconds: parsed.maxDurationSeconds || 90,
        initialGreeting: initialBotMessage,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Internal error initiating outbound call",
        },
      },
      { status: 500 },
    );
  }
}
