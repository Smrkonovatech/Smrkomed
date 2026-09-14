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
  clinicName: z.string().optional().default("ABC Fertility Centre"),
  upcomingAppointment: z.string().optional(),
  language: z.enum(["kn", "hi", "en", "ta", "te"]).optional().default("kn"),
  customGreeting: z.string().optional(),
  coupleId: z.string().optional(),
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

    const callSummary = `Patient ${parsed.patientName}${
      parsed.partnerName ? ` (partner: ${parsed.partnerName})` : ""
    } undergoing ${parsed.treatment} at stage ${parsed.stage}. Clinic: ${parsed.clinicName}. Doctor: ${
      parsed.doctorName
    }.${parsed.upcomingAppointment ? ` Current appointment: ${parsed.upcomingAppointment}.` : ""}${
      openSlotsSummary
        ? ` Doctor's available open slots for tomorrow: ${openSlotsSummary}. Only book or reschedule within these exact open slots; do not allow overlapping bookings.`
        : ""
    }`;

    let initialBotMessage = parsed.customGreeting;
    if (!initialBotMessage) {
      if (parsed.language === "kn") {
        initialBotMessage = `ನಮಸ್ಕಾರ ${parsed.patientName} ಅವರೇ, ನಾನು ${parsed.clinicName} ಆಸ್ಪತ್ರೆಯ AI ಕಡೆಯಿಂದ ಕರೆ ಮಾಡುತ್ತಿದ್ದೇನೆ. ನಿಮ್ಮ ${parsed.treatment} ಕನ್ಸಲ್ಟೇಶನ್ ಬಗ್ಗೆ ವಿಚಾರಿಸಲು ಕರೆ ಮಾಡಿದೆ. ನೀವು ಹೇಗಿದ್ದೀರಾ?`;
      } else if (parsed.language === "hi") {
        initialBotMessage = `नमस्ते ${parsed.patientName} जी, मैं ${parsed.clinicName} से कॉल कर रहा हूँ। आपके आगामी परामर्श और स्वास्थ्य के बारे में जानने के लिए कॉल किया है। आप कैसे हैं?`;
      } else {
        initialBotMessage = `Hello ${parsed.patientName}, this is the Care Assistant calling from ${parsed.clinicName} regarding your ${parsed.treatment} consultation with ${parsed.doctorName}. How are you feeling today?`;
      }
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
        responseData?.error?.data?.details ||
        responseData?.message ||
        "Failed to initiate call via Sarvam AI.";
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
