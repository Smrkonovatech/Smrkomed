import { NextResponse } from "next/server";
import { getBangaloreHospexClinic } from "@/server/services/qr-registration";
import { prisma } from "@smrkomed/database";

export const runtime = "nodejs";

export async function GET() {
  try {
    const clinic = await getBangaloreHospexClinic();

    // Fetch doctors from Bangalore Hospex clinic
    const memberships = await prisma.clinicMembership.findMany({
      where: {
        clinicId: clinic.id,
        role: {
          key: { in: ["DOCTOR", "CLINIC_ADMIN"] },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            title: true,
            email: true,
          },
        },
      },
      take: 6,
    });

    const doctors = memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      specialty: m.user.title || "Fertility & IVF Specialist",
    }));

    return NextResponse.json({
      success: true,
      clinic: {
        id: clinic.id,
        name: "Hospex Bangalore Clinic",
        city: clinic.city || "Bangalore",
        address: clinic.address || "12 Lavelle Road, Bangalore 560001",
        phone: clinic.phone || "+91 80 4000 1200",
        whatsappNumber: "+918660717328",
        emergencyPhone: "+91 80 4000 1299",
        hours: "Mon–Sat · 08:00 – 20:00",
        doctors,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch clinic information.",
      },
      { status: 500 },
    );
  }
}
