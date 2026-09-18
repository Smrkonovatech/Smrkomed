import { NextRequest, NextResponse } from "next/server";

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

    const sarvamApiKey =
      process.env["SARVAM_API_KEY"] || "sk_l0nfgdq0_MRxkA28Stuh6JXP2AE4Anbcp";

    const requestedLang = (formData.get("language_code") as string) || "unknown";
    const requestedMode = (formData.get("mode") as string) || "transcribe";

    // 1. Prepare form data for Sarvam AI
    const sarvamFormData = new FormData();
    const fileName = (audioFile as File).name || "consultation_audio.wav";
    sarvamFormData.append("file", audioFile, fileName);
    sarvamFormData.append("model", "saaras:v3");
    sarvamFormData.append("mode", requestedMode);
    if (requestedLang && requestedLang !== "auto") {
      sarvamFormData.append("language_code", requestedLang);
    } else {
      sarvamFormData.append("language_code", "unknown");
    }

    // Call Sarvam AI STT API
    let sarvamRes: Response | null = null;
    try {
      sarvamRes = await fetch("https://api.sarvam.ai/speech-to-text", {
        method: "POST",
        headers: {
          "api-subscription-key": sarvamApiKey,
        },
        body: sarvamFormData,
      });
    } catch (fetchErr) {
      console.warn("Sarvam fetch failed, checking fallback:", fetchErr);
    }

    if (sarvamRes && sarvamRes.ok) {
      const data = await sarvamRes.json();
      return NextResponse.json({
        success: true,
        transcript: data.transcript || "",
        language_code: data.language_code || "unknown",
        provider: "sarvam",
      });
    }

    // Log Sarvam error details if available
    if (sarvamRes) {
      const errText = await sarvamRes.text().catch(() => "");
      console.warn(`Sarvam STT returned ${sarvamRes.status}:`, errText);
    }

    // 2. Fallback to OpenAI Whisper if configured
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
