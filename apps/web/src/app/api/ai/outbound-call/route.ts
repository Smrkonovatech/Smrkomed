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

    // Save active call details globally so book-appointment always knows the exact patient
    (globalThis as unknown as { __lastActiveCall?: Record<string, unknown> }).__lastActiveCall = {
      coupleId: parsed.coupleId,
      patientName: parsed.patientName,
      partnerName: parsed.partnerName,
      phoneNumber: formattedPhone,
      treatment: parsed.treatment,
      doctorName: parsed.doctorName,
      clinicName: parsed.clinicName,
      callType: parsed.callType,
      maxDurationSeconds: parsed.maxDurationSeconds,
      timestamp: Date.now(),
    };

    const clinic = await prisma.clinic.findFirst();
    const clinicId = clinic?.id || "clinic_default";

    // Fetch doctor's real open slots for tomorrow from DB
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    let openSlotsSummary = "";
    try {
      const tomorrowSlots = await getDoctorDaySlots(
        clinicId,
        parsed.doctorName,
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

    let initialBotMessage = parsed.customGreeting;
    if (!initialBotMessage) {
      if (parsed.callType === "CARE_VOICE_CHECKIN") {
        if (parsed.language === "kn") {
          initialBotMessage = `ನಮಸ್ಕಾರ ${parsed.patientName} ಅವರೇ, ನಾನು ${clinicDisplayName} ಪರವಾಗಿ ಕರೆ ಮಾಡುತ್ತಿರುವ ಕೇರ್ ವಾಯ್ಸ್ (Care Voice). ಇಂದು ನಾವು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?`;
        } else if (parsed.language === "hi") {
          initialBotMessage = `नमस्ते ${parsed.patientName} जी, मैं ${clinicDisplayName} की ओर से केयर वॉइस (Care Voice) बात कर रहा हूँ। आज हम आपकी क्या सहायता कर सकते हैं?`;
        } else if (parsed.language === "ta") {
          initialBotMessage = `வணக்கம் ${parsed.patientName}, நான் ${clinicDisplayName} சார்பாக பேசும் கேர் வாய்ஸ் (Care Voice). இன்று நாங்கள் உங்களுக்கு எவ்வாறு உதவலாம்?`;
        } else if (parsed.language === "te") {
          initialBotMessage = `నమస్కారం ${parsed.patientName} గారూ, నేను ${clinicDisplayName} తరపున మాట్లాడుతున్న కేర్ వాయిస్ (Care Voice). ఈరోజు మేము మీకు ఎలా సహాయపడగలము?`;
        } else {
          initialBotMessage = `Hi ${parsed.patientName}, I'm Care Voice, calling on behalf of ${clinicDisplayName}. How can we help you today?`;
        }
      } else {
        if (parsed.language === "kn") {
          initialBotMessage = `ನಮಸ್ಕಾರ ${parsed.patientName} ಅವರೇ, ನಾನು ${clinicDisplayName} ಆಸ್ಪತ್ರೆಯ AI ಕಡೆಯಿಂದ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ. ನಿಮ್ಮ ${parsed.treatment} ಕನ್ಸಲ್ಟೇಶನ್ ಬಗ್ಗೆ ವಿಚಾರಿಸಲು ಕರೆ ಮಾಡಿದೆ. ನೀವು ಹೇಗಿದ್ದೀರಾ?`;
        } else if (parsed.language === "hi") {
          initialBotMessage = `नमस्ते ${parsed.patientName} जी, मैं ${clinicDisplayName} से कॉल कर रहा हूँ। आपके आगामी परामर्श और स्वास्थ्य के बारे में जानने के लिए कॉल किया है। आप कैसे हैं?`;
        } else {
          initialBotMessage = `Hello ${parsed.patientName}, this is the Care Assistant calling from ${clinicDisplayName} regarding your ${parsed.treatment} consultation with ${parsed.doctorName}. How are you feeling today?`;
        }
      }
    }

    if (parsed.callType === "CARE_VOICE_CHECKIN") {
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

      callSummary = `[Care Voice Concierge] Patient: ${parsed.patientName}. Clinic: ${clinicDisplayName}.
Language: ${langLabel}.
STRICT TIME CONSTRAINT: MAXIMUM CALL DURATION IS ${parsed.maxDurationSeconds || 90} SECONDS.

OPENING GREETING (SPOKEN IMMEDIATELY):
"${initialBotMessage}"

CRITICAL INSTRUCTIONS & RULES:
1. STRICTLY DO NOT mention "QR code", "QR scanner", "scanned", or "system registration" under any circumstances.
2. AI IDENTITY AND MODEL RULE: If the patient asks "which model are you?", "what AI is this?", "are you Sarvam / ChatGPT / OpenAI?", "who made you?", or asks about your technology:
   - You must NEVER say "Sarvam", "Sarvam AI", "OpenAI", "ChatGPT", or any external vendor under ANY circumstances.
   - You must ALWAYS answer that you are developed by SmrkoMed:
     * English: "I am Care Voice, developed by SmrkoMed, calling on behalf of ${clinicDisplayName}."
     * Kannada: "ನಾನು SmrkoMed ಸಂಸ್ಥೆಯಿಂದ ಅಭಿವೃದ್ಧಿಪಡಿಸಲಾದ ಕೇರ್ ವಾಯ್ಸ್ (Care Voice), ${clinicDisplayName} ಪರವಾಗಿ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ."
     * Hindi: "मैं SmrkoMed द्वारा विकसित केयर वॉइस (Care Voice) हूँ, ${clinicDisplayName} की ओर से बात कर रहा हूँ."
     * Tamil: "நான் SmrkoMed உருவாக்கிய கேர் வாய்ஸ் (Care Voice), ${clinicDisplayName} சார்பாக பேசுகிறேன்."
     * Telugu: "నేను SmrkoMed అభివృద్ధి చేసిన కేర్ వాయిస్ (Care Voice), ${clinicDisplayName} తరపున మాట్లాడుతున్నాను."
3. You are Care Voice, the polite, calming, and professional AI voice assistant calling on behalf of ${clinicDisplayName}.
4. Speak naturally, cleanly, and helpfully in ${langLabel}.
5. Warmly ask how we can help the patient today and assist with:
   - Doctor consultation queue & specialist availability
   - Waiting lounge locations & clinic amenities
   - General guidance regarding their visit today
6. Guide them comfortably to take a seat in the waiting lounge while our care team is notified.
7. TIME LIMIT WARNING: Keep all answers concise, warm, and helpful. Conclude the call smoothly within ${parsed.maxDurationSeconds || 90} seconds by wishing them a pleasant and comfortable visit.`;
    } else {
      callSummary = `Patient ${parsed.patientName}${
        parsed.partnerName ? ` (partner: ${parsed.partnerName})` : ""
      } undergoing ${parsed.treatment} at stage ${parsed.stage}. Clinic: ${clinicDisplayName}. Doctor: ${
        parsed.doctorName
      }.${parsed.upcomingAppointment ? ` Current appointment: ${parsed.upcomingAppointment}.` : ""}${
        openSlotsSummary
          ? ` Doctor's available open slots for tomorrow: ${openSlotsSummary}. Only book or reschedule within these exact open slots; do not allow overlapping bookings.`
          : ""
      }
MANDATORY IDENTITY RULE: If asked which model you are, who built you, or if you are Sarvam/ChatGPT/OpenAI: NEVER mention Sarvam or external vendors. Always state: "I am Care Voice, developed by SmrkoMed."`;
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
          first_message: initialBotMessage,
          initial_message: initialBotMessage,
          greeting: initialBotMessage,
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
