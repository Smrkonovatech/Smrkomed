import { NextResponse } from "next/server";
import { getBangaloreHospexClinic } from "@/server/services/qr-registration";
import { prisma } from "@smrkomed/database";

export const runtime = "nodejs";

export async function GET() {
  try {
    const clinic = await getBangaloreHospexClinic();

    // Fetch active doctor memberships from Bangalore Hospex clinic
    const memberships = await prisma.clinicMembership.findMany({
      where: {
        clinicId: clinic.id,
        status: "ACTIVE",
        user: { isActive: true },
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
            phone: true,
          },
        },
        role: {
          select: { key: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch automation rules for saved doctor profile metadata (specialty, designation, etc.)
    const profileRules = await prisma.automationRule.findMany({
      where: {
        clinicId: clinic.id,
        trigger: "DOCTOR_PROFILE",
      },
    });
    const profileMap = new Map<string, any>();
    for (const rule of profileRules) {
      if (rule.name) profileMap.set(rule.name, rule.config);
    }

    // Filter to ONLY real doctors added by admin (excluding mock/seed accounts)
    const doctors = memberships
      .filter((m) => {
        const email = (m.user.email || "").toLowerCase();
        const name = (m.user.name || "").toLowerCase();
        // Exclude mock seed accounts and generic admin accounts
        if (
          email.endsWith("@abcfertility.demo") ||
          email.endsWith(".local") ||
          email.endsWith(".test") ||
          name === "clinic admin" ||
          name === "test doctor" ||
          name.includes("debug")
        ) {
          return false;
        }
        // Must be a doctor by role or by medical title/Dr. prefix
        const isDoctor =
          m.role.key === "DOCTOR" ||
          name.startsWith("dr.") ||
          (m.user.title ? /doctor|specialist|consultant/i.test(m.user.title) : false);

        return isDoctor;
      })
      .map((m) => {
        const config = profileMap.get(m.user.id) || profileMap.get(`doc_${m.user.id}`) || {};
        const displayName = m.user.name.startsWith("Dr.") ? m.user.name : `Dr. ${m.user.name}`;
        const specialty =
          config.primarySpecialty ||
          config.designation ||
          m.user.title ||
          "Fertility & IVF Specialist";

        return {
          id: m.user.id,
          doctorId: `doc_${m.user.id}`,
          name: displayName,
          specialty,
        };
      });

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
