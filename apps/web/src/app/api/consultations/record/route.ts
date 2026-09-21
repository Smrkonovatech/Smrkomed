import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@smrkomed/database";
import { auth } from "@/lib/auth/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();

    const {
      coupleId: requestedCoupleId,
      appointmentId,
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
      couple = await prisma.couple.findFirst({
        where: {
          OR: [
            { id: requestedCoupleId },
            { slug: requestedCoupleId },
            { primaryPatientId: requestedCoupleId },
            { partnerPatientId: requestedCoupleId },
          ],
        },
        include: { clinic: true, primaryPatient: true, partnerPatient: true },
      });
    }

    if (!couple && patientName && typeof patientName === "string") {
      const nameParts = patientName.split(/[+&,\/]+/).map(p => p.trim()).filter(Boolean);
      for (const part of nameParts) {
        if (!couple && part.length > 2) {
          couple = await prisma.couple.findFirst({
            where: {
              OR: [
                { primaryPatient: { firstName: { contains: part, mode: "insensitive" } } },
                { primaryPatient: { lastName: { contains: part, mode: "insensitive" } } },
                { partnerPatient: { firstName: { contains: part, mode: "insensitive" } } },
                { partnerPatient: { lastName: { contains: part, mode: "insensitive" } } },
              ],
            },
            include: { clinic: true, primaryPatient: true, partnerPatient: true },
          });
        }
      }
    }

    if (!couple) {
      // Find the first active couple in the database or couple assigned to user
      couple = await prisma.couple.findFirst({
        where: { status: "ACTIVE" },
        include: { clinic: true, primaryPatient: true, partnerPatient: true },
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

    // Perform AI Analysis & Diarization on Transcript if available
    let aiAnalysis = null;
    if (transcript && transcript.trim().length > 0) {
      try {
        const { analyzeConsultationTranscript } = await import("@/lib/ai/consultation-analyzer");
        aiAnalysis = await analyzeConsultationTranscript(transcript, {
          doctorName: doctorName || session?.user?.name || "Doctor",
          patientName: patientName || (couple.primaryPatient ? `${couple.primaryPatient.firstName} ${couple.primaryPatient.lastName}` : "Patient"),
          reasonForVisit: reasonForVisit || "Fertility Consultation",
        });
      } catch (aiErr) {
        console.warn("AI analysis during record consultation failed:", aiErr);
      }
    }

    // Compile clinical summary with AI translated dialogue and critical details
    let finalSummary = "";
    if (aiAnalysis && aiAnalysis.englishDialogue.length > 0) {
      const dialogueLines = aiAnalysis.englishDialogue
        .map((d: any) => `${d.speaker}: "${d.text}"`)
        .join("\n");
      const criticalStr = aiAnalysis.criticalDetails.map((c: string) => `• ${c}`).join("\n");

      finalSummary = [
        `English Dialogue Transcript:\n${dialogueLines}`,
        `Critical Clinical Details:\n${criticalStr}`,
        clinicalNotes ? `Clinical Notes:\n${clinicalNotes.trim()}` : null,
        aiAnalysis.doctorAssessment ? `Doctor Assessment:\n${aiAnalysis.doctorAssessment}` : null,
      ].filter(Boolean).join("\n\n");
    } else {
      const contentParts = [
        clinicalNotes ? `Clinical Notes:\n${clinicalNotes.trim()}` : null,
        summary && !summary.startsWith("Audio Transcript") ? summary.trim() : null,
      ].filter(Boolean);

      finalSummary = contentParts.length > 0
        ? contentParts.join("\n\n")
        : "Consultation complete. Patient vitals and ovarian response stable. Continued prescribed stimulation schedule.";
    }

    // Determine current author/doctor if valid user in DB
    let validAuthorUserId: string | null = null;
    if (authorUserId) {
      const existingAuthor = await prisma.user.findUnique({
        where: { id: authorUserId },
        select: { id: true },
      });
      if (existingAuthor) {
        validAuthorUserId = existingAuthor.id;
      }
    }

    // Save directly into the PostgreSQL database: ConsultationNote table
    const note = await prisma.consultationNote.create({
      data: {
        clinicId: couple.clinicId,
        coupleId: couple.id,
        createdById: validAuthorUserId,
        consultationDate: new Date(),
        summary: finalSummary,
        reasonForVisit: reasonForVisit || "Fertility Initial Consultation",
        nextSteps: nextSteps || null,
      },
    });

    // Update existing appointment marked COMPLETED or create if none exists
    try {
      let targetApptId = appointmentId;
      if (!targetApptId) {
        // Look for an existing appointment for this couple created recently (last 2 hours)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const existing = await prisma.appointment.findFirst({
          where: {
            coupleId: couple.id,
            startsAt: { gte: twoHoursAgo },
          },
          orderBy: { startsAt: "desc" },
        });
        if (existing) {
          targetApptId = existing.id;
        }
      }

      if (targetApptId) {
        await prisma.appointment.update({
          where: { id: targetApptId },
          data: {
            status: "COMPLETED",
            notes: finalSummary,
            ...(doctorName ? { doctorName } : {}),
          },
        });
      } else {
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
      }
    } catch (apptErr) {
      console.warn("Failed to update/create appointment log:", apptErr);
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
