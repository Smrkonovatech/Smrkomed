import OpenAI from "openai";
import { toFile } from "openai/uploads";

import { AI_TRANSCRIBE_MODEL, AiUserError, assertOpenAIConfigured } from "@/lib/ai/config";
import { CONSULTATION_SUMMARY_PROMPT } from "@/lib/ai/prompts";
import { AI_MODEL } from "@/lib/ai/config";
import { AI_LIMITS } from "@/lib/ai/config";
import { whisperLanguageFor, type ConsultationLanguageCode } from "@/lib/voice/languages";

export async function transcribeAudioBlob(
  file: File,
  options?: { language?: ConsultationLanguageCode },
): Promise<string> {
  if (!file.size) throw new AiUserError("No audio captured.");
  if (file.size > 20 * 1024 * 1024) {
    throw new AiUserError("Recording is too large. Keep consultations shorter and try again.");
  }

  const client = new OpenAI({ apiKey: assertOpenAIConfigured() });
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = await toFile(buffer, file.name || "consultation.webm", {
    type: file.type || "audio/webm",
  });

  const language = whisperLanguageFor(options?.language);
  const prompt =
    options?.language === "kn"
      ? "ವೈದ್ಯಕೀಯ ಸಮಾಲೋಚನೆ, IVF, fertility clinic consultation with medical terms in Kannada and English (Kanglish)."
      : options?.language === "hi"
        ? "डॉक्टर और मरीज की बातचीत, IVF, fertility clinic consultation in Hindi and English."
        : options?.language === "ta"
          ? "மருத்துவ ஆலோசனை, IVF, fertility clinic consultation in Tamil and English."
          : options?.language === "ml"
            ? "വൈദ്യപരിശോധന, IVF, fertility clinic consultation in Malayalam and English."
            : undefined;

  const result = await client.audio.transcriptions.create({
    file: upload,
    model: AI_TRANSCRIBE_MODEL,
    ...(language ? { language } : {}),
    ...(prompt ? { prompt } : {}),
  });

  const text = (result.text ?? "").trim();
  if (!text) throw new AiUserError("No speech was detected. Please try again.");
  return text.slice(0, AI_LIMITS.maxTranscriptChars);
}

export async function summarizeConsultationTranscript(input: {
  transcript: string;
  coupleLabel: string;
  clinicianName: string;
  clinicName: string;
  /** Preferred language for the written summary (not the spoken language). */
  summaryLanguage?: string;
}): Promise<{ summary: string; reasonForVisit?: string; nextSteps?: string }> {
  const transcript = input.transcript.trim().slice(0, AI_LIMITS.maxTranscriptChars);
  if (transcript.length < 5) {
    throw new AiUserError("Transcript is too short to summarize.");
  }

  const client = new OpenAI({ apiKey: assertOpenAIConfigured() });
  const completion = await client.chat.completions.create({
    model: AI_MODEL,
    temperature: 0.1,
    messages: [
      { role: "system", content: CONSULTATION_SUMMARY_PROMPT },
      {
        role: "user",
        content: [
          `Clinic: ${input.clinicName}`,
          `Patient/Couple: ${input.coupleLabel}`,
          `Doctor/Coordinator: ${input.clinicianName}`,
          `Date: ${new Date().toISOString()}`,
          input.summaryLanguage
            ? `Write the content in: ${input.summaryLanguage}. IMPORTANT: Keep the standard English section headers (Reason for Visit, Discussion Summary, Patient Concerns, Doctor Notes, Next Steps, Follow-up Required) unchanged so medical charts can parse them.`
            : "Write the structured summary in English unless the clinic context clearly requires otherwise.",
          "",
          "TRANSCRIPT:",
          transcript,
        ].join("\n"),
      },
    ],
  });

  const summary = (completion.choices[0]?.message?.content ?? "").trim();
  if (!summary) throw new AiUserError("Unable to generate the consultation summary.");

  const reasonMatch = summary.match(/(?:Reason for Visit|ಭೇಟಿಯ ಕಾರಣ|कारण)\s*[:\n#*]+([\s\S]*?)(?:\n\n|\n[#A-Z]|$)/i);
  const nextMatch = summary.match(/(?:Plan \/ Next Steps|Next Steps|ಮುಂದಿನ ಹಂತಗಳು|अगले कदम)\s*[:\n#*]+([\s\S]*?)(?:\n\n|\n[#A-Z]|$)/i);

  const reasonForVisit = reasonMatch?.[1]?.trim().slice(0, 500);
  const nextSteps = nextMatch?.[1]?.trim().slice(0, 1000);

  return {
    summary,
    ...(reasonForVisit ? { reasonForVisit } : {}),
    ...(nextSteps ? { nextSteps } : {}),
  };
}
