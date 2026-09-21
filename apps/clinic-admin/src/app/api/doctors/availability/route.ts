import { NextResponse } from "next/server";
import { prisma } from "@smrkomed/database";
import { getDoctorDaySlots } from "@/lib/doctors/db-availability";
import { SEED_DOCTORS } from "@/lib/doctors/seed";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const targetDate = new Date(`${dateParam}T00:00:00`);

    const clinic = await prisma.clinic.findFirst();
    const clinicId = clinic?.id || "clinic_default";

    // Query active doctors in clinic from database
    const memberships = await prisma.clinicMembership.findMany({
      where: {
        clinicId,
        status: "ACTIVE",
        user: { isActive: true },
        OR: [
          { role: { key: "DOCTOR" } },
          { role: { name: { contains: "Doctor", mode: "insensitive" } } },
        ],
      },
      include: {
        user: { select: { id: true, name: true, title: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    const docList = memberships.length > 0
      ? memberships.map((m) => ({
          id: m.userId,
          displayName: m.user.name.startsWith("Dr.") ? m.user.name : `Dr. ${m.user.name}`,
          designation: m.user.title || "Fertility Specialist",
          department: "Reproductive Medicine",
        }))
      : SEED_DOCTORS.filter((d) => d.status === "active").slice(0, 5);

    const results = await Promise.all(
      docList.map(async (doc) => {
        const slotsInfo = await getDoctorDaySlots(clinicId, doc.id, targetDate);
        return {
          id: doc.id,
          name: doc.displayName,
          designation: doc.designation,
          department: doc.department,
          isWorkingDay: slotsInfo.isWorkingDay,
          openSlots: slotsInfo.openSlots,
          bookedCount: slotsInfo.bookedCount,
        };
      }),
    );

    return NextResponse.json({
      success: true,
      date: dateParam,
      doctors: results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load clinic availability",
      },
      { status: 500 },
    );
  }
}
