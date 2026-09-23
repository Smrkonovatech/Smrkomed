import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@smrkomed/database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const coupleId = searchParams.get("coupleId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

    const notes = await prisma.consultationNote.findMany({
      where: coupleId ? { coupleId } : {},
      orderBy: { consultationDate: "desc" },
      take: limit,
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
            primaryPatient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            partnerPatient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    const formatted = notes.map((note) => {
      const patientName = note.couple?.primaryPatient
        ? `${note.couple.primaryPatient.firstName} ${note.couple.primaryPatient.lastName}`.trim()
        : note.couple?.partnerPatient
          ? `${note.couple.partnerPatient.firstName} ${note.couple.partnerPatient.lastName}`.trim()
          : "Patient";

      return {
        id: note.id,
        title: note.reasonForVisit || "Fertility Consultation",
        date: new Date(note.consultationDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        rawDate: note.consultationDate.toISOString(),
        content: note.summary,
        actor: note.createdBy?.name || "Doctor",
        actorTitle: note.createdBy?.title || "",
        patientName,
        coupleId: note.coupleId,
        clinicId: note.clinicId,
        nextSteps: note.nextSteps,
        type: "Consultation",
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
      total: formatted.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch consultation history:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch consultation history",
      },
      { status: 500 }
    );
  }
}
