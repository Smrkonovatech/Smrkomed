import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface TranscriptMessage {
  turn_id: number;
  role: "assistant" | "user" | string;
  content: string;
  language_name: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interactionId = searchParams.get("interactionId");
    const summarize = searchParams.get("summarize") === "true";

    if (!interactionId || interactionId === "NO_INTERACTION_ID") {
      return NextResponse.json(
        {
          success: false,
          error: "No conversation transcript recorded for this call attempt (call may have been busy or unanswered).",
          messages: [],
        },
        { status: 400 },
      );
    }

    const apiKey =
      process.env["SARVAM_SAMVAAD_API_KEY"] ||
      process.env["SARVAM_API_KEY"] ||
      "sk_samvaad_xywpvl90_4qRfmMh1fcGrL9XcM48TdBbF";
    const orgId = process.env["SARVAM_ORG_ID"] || "01a06777-00d4-7317-835c-507054052514";
    const workspaceId = process.env["SARVAM_WORKSPACE_ID"] || "01a06777-00da-7f77-abe3-dc1fc871a5ab";
    const appId = process.env["SARVAM_APP_ID"] || "smrkomed-8401f738-b749";

    const transcriptUrl = `https://apps.sarvam.ai/api/analytics/v1/${orgId}/${workspaceId}/${appId}/transcripts/${interactionId}`;

    const response = await fetch(transcriptUrl, {
      headers: {
        "X-API-Key": apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: `Sarvam transcript error (${response.status}): ${errorText}`,
          messages: [],
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    const messages: TranscriptMessage[] = data.messages || [];

    let summary: string | null = null;
    let detectedLanguages = Array.from(new Set(messages.map((m) => m.language_name).filter(Boolean)));

    // Generate clinical summary & English translation if requested and messages exist
    if (summarize && messages.length > 0) {
      const openaiApiKey = process.env["OPENAI_API_KEY"];
      if (openaiApiKey) {
        try {
          const openai = new OpenAI({ apiKey: openaiApiKey });
          const transcriptText = messages
            .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
            .join("\n");

          const aiResponse = await openai.chat.completions.create({
            model: process.env["OPENAI_MODEL"] || "gpt-4.1-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are a clinical transcription summarizer for a fertility & healthcare clinic. Given a voice call transcript (which may be in Kannada, Hindi, or English), provide a 2-3 sentence concise clinical summary in English explaining what was discussed, patient response, and any action items or booking requests.",
              },
              {
                role: "user",
                content: `Here is the call transcript:\n\n${transcriptText}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 250,
          });

          summary = aiResponse.choices[0]?.message?.content?.trim() || null;
        } catch {
          // Graceful fallback if OpenAI fails
          summary = null;
        }
      }
    }

    return NextResponse.json({
      success: true,
      interactionId,
      languages: detectedLanguages,
      turnCount: messages.length,
      summary,
      messages,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error fetching transcript",
      },
      { status: 500 },
    );
  }
}
