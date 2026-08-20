import { NextResponse } from "next/server";
import { TenantAccessError } from "@smrkomed/database";

import { toAiHttpError } from "@/lib/ai/service";
import { AiUserError } from "@/lib/ai/config";
import { CONSULTATION_LANGUAGES, type ConsultationLanguageCode } from "@/lib/voice/languages";
import { transcribeAudioBlob } from "@/lib/voice/transcription";
import { requirePermission } from "@/server/authz";
import { PERMISSIONS } from "@smrkomed/database";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    await requirePermission(PERMISSIONS.PATIENTS_WRITE);
    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      throw new AiUserError("Audio file is required.");
    }
    const languageRaw = form.get("language");
    const language =
      typeof languageRaw === "string" &&
      CONSULTATION_LANGUAGES.some((lang) => lang.code === languageRaw)
        ? (languageRaw as ConsultationLanguageCode)
        : undefined;

    const transcript = await transcribeAudioBlob(file, language ? { language } : undefined);
    // Intentionally do not persist audio — only return transient transcript.
    return NextResponse.json({ success: true, data: { transcript } });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: error.message } },
        { status: error.message === "Unauthorized" ? 401 : 403 },
      );
    }
    const mapped = toAiHttpError(error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VOICE_ERROR",
          message:
            mapped.status === 400
              ? mapped.message
              : "Voice processing failed. Please try again.",
        },
      },
      { status: mapped.status },
    );
  }
}
