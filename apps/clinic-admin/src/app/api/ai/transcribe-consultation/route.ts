import { NextRequest, NextResponse } from "next/server";
import { transcribeAudioWithSarvam } from "@/lib/sarvam/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("file");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    const requestedLang = (formData.get("language_code") as string) || "unknown";
    const requestedMode = (formData.get("mode") as string) || "translate";

    const languageCode =
      requestedLang && requestedLang !== "auto" && requestedLang !== "unknown"
        ? requestedLang
        : "unknown";

    try {
      const result = await transcribeAudioWithSarvam(audioFile, {
        model: "saaras:v4",
        language_code: languageCode,
        mode: requestedMode,
        sample_rate: 16000,
      });

      return NextResponse.json({
        success: true,
        transcript: result.transcript || "",
        language_code: result.language_code || languageCode,
        provider: "sarvam",
        model: "saaras:v4",
        mode: requestedMode,
      });
    } catch (sarvamErr: any) {
      console.warn("Sarvam AI saaras:v4 transcription failed, attempting fallback:", sarvamErr?.message || sarvamErr);
    }

    const openaiApiKey = process.env["OPENAI_API_KEY"];
    if (openaiApiKey) {
      try {
        const whisperFormData = new FormData();
        whisperFormData.append("file", audioFile, "audio.webm");
        whisperFormData.append("model", "whisper-1");

        const whisperRes = await fetch(
          "https://api.openai.com/v1/audio/transcriptions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openaiApiKey}`,
            },
            body: whisperFormData,
          }
        );

        if (whisperRes.ok) {
          const whisperData = await whisperRes.json();
          return NextResponse.json({
            success: true,
            transcript: whisperData.text || "",
            language_code: "en",
            provider: "whisper-fallback",
            model: "whisper-1",
            mode: requestedMode,
          });
        }
      } catch (whisperErr) {
        console.error("Whisper fallback error:", whisperErr);
      }
    }

    return NextResponse.json(
      { error: "Transcription service unavailable" },
      { status: 502 }
    );
  } catch (error: any) {
    console.error("Consultation transcription error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
