import { NextRequest, NextResponse } from "next/server";
import { analyzeConsultationTranscript } from "@/lib/ai/consultation-analyzer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript, doctorName, patientName, reasonForVisit } = body;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    const analysis = await analyzeConsultationTranscript(transcript, {
      doctorName,
      patientName,
      reasonForVisit,
    });

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    console.error("Consultation analysis error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to analyze consultation" },
      { status: 500 }
    );
  }
}
