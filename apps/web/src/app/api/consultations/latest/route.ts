import { NextResponse } from "next/server";
import { prisma } from "@smrkomed/database";

export async function GET() {
  try {
    // Query the latest consultation note from the PostgreSQL database
    const latestNote = await prisma.consultationNote.findFirst({
      orderBy: { consultationDate: "desc" },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            title: true,
            email: true,
          },
        },
        couple: {
          include: {
            primaryPatient: true,
            partnerPatient: true,
          },
        },
      },
    });

    if (!latestNote) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const patientName = latestNote.couple?.primaryPatient
      ? `${latestNote.couple.primaryPatient.firstName} ${latestNote.couple.primaryPatient.lastName}`.trim()
      : latestNote.couple?.partnerPatient
        ? `${latestNote.couple.partnerPatient.firstName} ${latestNote.couple.partnerPatient.lastName}`.trim()
        : "Patient";

    const formattedDate = new Date(latestNote.consultationDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return NextResponse.json({
      success: true,
      data: {
        id: latestNote.id,
        title: latestNote.reasonForVisit || "Fertility Initial Consultation",
        date: formattedDate,
        rawDate: latestNote.consultationDate.toISOString(),
        content: latestNote.summary,
        actor: latestNote.createdBy?.name || "Doctor",
        patientName,
        coupleId: latestNote.coupleId,
        nextSteps: latestNote.nextSteps,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch latest consultation from database:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch consultation note",
      },
      { status: 500 }
    );
  }
}
