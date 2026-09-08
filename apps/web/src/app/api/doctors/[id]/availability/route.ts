import { NextResponse } from "next/server";
import { prisma } from "@smrkomed/database";
import {
  getDoctorAvailability,
  getDoctorDaySlots,
  saveDoctorAvailability,
} from "@/lib/doctors/db-availability";
import { SEED_DOCTORS } from "@/lib/doctors/seed";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    const clinic = await prisma.clinic.findFirst();
    const clinicId = clinic?.id || "clinic_default";

    const availability = await getDoctorAvailability(clinicId, id);

    let daySlots = null;
    if (dateParam) {
      const targetDate = new Date(`${dateParam}T00:00:00`);
      if (!isNaN(targetDate.getTime())) {
        daySlots = await getDoctorDaySlots(clinicId, id, targetDate);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...availability,
        daySlots,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load doctor availability",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;
    const json = await request.json();

    const clinic = await prisma.clinic.findFirst();
    const clinicId = clinic?.id || "clinic_default";

    const seedDoc = SEED_DOCTORS.find((d) => d.id === id);
    const doctorName = json.doctorName || seedDoc?.displayName || "Dr. Ananya Rao";

    const saved = await saveDoctorAvailability(
      clinicId,
      id,
      doctorName,
      json.weeklySchedule,
      json.settings,
      json.leaves,
      json.blockedTimes,
    );

    return NextResponse.json({
      success: true,
      message: `Availability schedule saved successfully for ${doctorName}.`,
      data: saved,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save doctor availability",
      },
      { status: 500 },
    );
  }
}
