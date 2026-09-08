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

    // Query active doctors
    const doctors = SEED_DOCTORS.filter((d) => d.status === "active").slice(0, 5);

    const results = await Promise.all(
      doctors.map(async (doc) => {
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
