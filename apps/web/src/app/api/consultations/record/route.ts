import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@smrkomed/database";
import { auth } from "@/lib/auth/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();

    const {
      coupleId: requestedCoupleId,
      patientName,
      doctorName,
      reasonForVisit = "Fertility Initial Consultation",
      summary,
      transcript,
      clinicalNotes,
      nextSteps = "Follow-up scan scheduled",
    } = body;

    // Find the clinic and couple to attach to
    let couple = null;
    if (requestedCoupleId) {
      couple = await prisma.couple.findUnique({
        where: { id: requestedCoupleId },
        include: { clinic: true, primaryPatient: true },
      });
    }

    if (!couple) {
      // Find the first active couple in the database or couple assigned to user
      couple = await prisma.couple.findFirst({
        where: { status: "ACTIVE" },
        include: { clinic: true, primaryPatient: true },
        orderBy: { updatedAt: "desc" },
      });
    }

    if (!couple) {
      return NextResponse.json(
        { success: false, error: "No active patient/couple found in database" },
        { status: 404 }
      );
    }

    // Determine current author/doctor
    const authorUserId = session?.user?.id || couple.assignedDoctorId || undefined;

    // Compile clinical summary
    const contentParts = [
      transcript ? `Audio Transcript (Sarvam AI):\n"${transcript.trim()}"` : null,
      clinicalNotes ? `Clinical Notes:\n${clinicalNotes.trim()}` : null,
      summary ? summary.trim() : null,
    ].filter(Boolean);

    const finalSummary = contentParts.length > 0
      ? contentParts.join("\n\n")
      : "Consultation complete. Patient vitals and ovarian response stable. Continued prescribed stimulation schedule.";

    // Save directly into the PostgreSQL database: ConsultationNote table
    const note = await prisma.consultationNote.create({
      data: {
        clinicId: couple.clinicId,
        coupleId: couple.id,
        createdById: authorUserId ?? null,
        consultationDate: new Date(),
        summary: finalSummary,
        reasonForVisit: reasonForVisit || "Fertility Initial Consultation",
        nextSteps: nextSteps || null,
      },
    });

    // Also update or create an appointment record marked COMPLETED
    try {
      await prisma.appointment.create({
        data: {
          clinicId: couple.clinicId,
          coupleId: couple.id,
          type: reasonForVisit || "Doctor Consultation",
          startsAt: new Date(),
          status: "COMPLETED",
          doctorName: doctorName || session?.user?.name || "Doctor",
          notes: finalSummary,
        },
      });
    } catch (apptErr) {
      console.warn("Failed to create appointment log:", apptErr);
    }

    const patientDisplayName = couple.primaryPatient
      ? `${couple.primaryPatient.firstName} ${couple.primaryPatient.lastName}`.trim()
      : patientName || "Patient";

    const formattedDate = new Date(note.consultationDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return NextResponse.json({
      success: true,
      data: {
        id: note.id,
        title: note.reasonForVisit || "Fertility Initial Consultation",
        date: formattedDate,
        rawDate: note.consultationDate.toISOString(),
        content: note.summary,
        actor: doctorName || session?.user?.name || "Doctor",
        patientName: patientDisplayName,
        coupleId: note.coupleId,
        nextSteps: note.nextSteps,
      },
    });
  } catch (error: any) {
    console.error("Failed to record consultation to database:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to record consultation in database",
      },
      { status: 500 }
    );
  }
}
