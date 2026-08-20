import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { TenantAccessError, PERMISSIONS } from "@smrkomed/database";
import { z } from "zod";

import { AiUserError } from "@/lib/ai/config";
import { toAiHttpError } from "@/lib/ai/service";
import { summarizeConsultationTranscript } from "@/lib/voice/transcription";
import { requirePermission } from "@/server/authz";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  transcript: z.string().min(20).max(40_000),
  coupleLabel: z.string().min(1).max(200),
  summaryLanguage: z.string().min(1).max(40).optional(),
});

export async function POST(request: Request) {
  try {
    const tenant = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
    const session = await auth();
    const json = bodySchema.parse(await request.json());
    const clinicianName = session?.user?.name?.trim() || "Clinic staff";

    const result = await summarizeConsultationTranscript({
      transcript: json.transcript,
      coupleLabel: json.coupleLabel,
      clinicianName,
      clinicName: tenant.clinicName,
      ...(json.summaryLanguage ? { summaryLanguage: json.summaryLanguage } : {}),
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: error.message } },
        { status: error.message === "Unauthorized" ? 401 : 403 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION", message: "Invalid summary request." },
        },
        { status: 400 },
      );
    }
    const mapped = toAiHttpError(error instanceof AiUserError ? error : error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VOICE_ERROR",
          message:
            mapped.status === 400
              ? mapped.message
              : "Unable to generate the consultation summary.",
        },
      },
      { status: mapped.status },
    );
  }
}
