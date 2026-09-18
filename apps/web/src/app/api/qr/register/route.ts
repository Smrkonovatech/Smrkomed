import { NextResponse } from "next/server";
import { registerPatientViaQr, type QrRegistrationInput } from "@/server/services/qr-registration";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<QrRegistrationInput>;

    if (!body.firstName || !body.firstName.trim()) {
      return NextResponse.json(
        { success: false, error: "First name is required." },
        { status: 400 },
      );
    }

    if (!body.lastName || !body.lastName.trim()) {
      return NextResponse.json(
        { success: false, error: "Last name is required." },
        { status: 400 },
      );
    }

    if (!body.phone || !body.phone.trim()) {
      return NextResponse.json(
        { success: false, error: "Phone number is required." },
        { status: 400 },
      );
    }

    const result = await registerPatientViaQr({
      firstName: body.firstName,
      lastName: body.lastName,
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
