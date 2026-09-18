import { NextResponse } from "next/server";
import { registerPatientViaQr, type QrRegistrationInput } from "@/server/services/qr-registration";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<QrRegistrationInput> & { fullName?: string };

    let firstName = (body.firstName || "").trim();
    let lastName = (body.lastName || "").trim();

    if ((!firstName || !lastName) && body.fullName?.trim()) {
      const parts = body.fullName.trim().split(/\s+/);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || parts[0] || "";
    }

    if (!firstName) {
      return NextResponse.json(
        { success: false, error: "Full name is required." },
        { status: 400 },
      );
    }

    if (!lastName) {
      lastName = firstName;
    }

    if (!body.phone || !body.phone.trim()) {
      return NextResponse.json(
        { success: false, error: "Phone number is required." },
        { status: 400 },
      );
    }

    const result = await registerPatientViaQr({
      firstName,
      lastName,
      phone: body.phone,
      email: body.email || null,
      gender: body.gender || "UNSPECIFIED",
      age: body.age || null,
      dateOfBirth: body.dateOfBirth || null,
      purpose: body.purpose || "Consultation & Check-in",
      doctorId: body.doctorId || null,
      doctorPreference: body.doctorPreference || null,
    });

    return NextResponse.json({
      success: true,
      message: "Successfully registered at Hospex Bangalore Clinic.",
      data: result,
    });
  } catch (error) {
    console.error("QR Registration Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to register patient.",
      },
      { status: 500 },
    );
  }
}
