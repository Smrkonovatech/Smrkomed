import { NextResponse } from "next/server";
import { prisma } from "@smrkomed/database";
import { getDoctorDaySlots } from "@/lib/doctors/db-availability";
import { parseTimeToMinutes } from "@/lib/doctors/availability";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseDateAndTime(dateStr?: string, timeStr?: string): Date {
  const now = new Date();
  const target = new Date();

  const cleanDate = (dateStr || "").toLowerCase().trim();
  if (cleanDate.includes("tomorrow")) {
    target.setDate(now.getDate() + 1);
  } else if (cleanDate.includes("today")) {
    // Keep today
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    const parts = cleanDate.split("-").map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      target.setFullYear(parts[0], parts[1] - 1, parts[2]);
    }
  } else if (cleanDate && !isNaN(Date.parse(cleanDate))) {
    const parsed = new Date(cleanDate);
    target.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  } else {
    // Default to tomorrow if not specified
    target.setDate(now.getDate() + 1);
  }

  // Parse time
  const cleanTime = (timeStr || "").toLowerCase().trim();
  let hours = 11;
  let minutes = 0;

  if (cleanTime) {
    const isPM = cleanTime.includes("pm");
    const isAM = cleanTime.includes("am");
    const timeDigits = cleanTime.replace(/[^\d:]/g, "").split(":");
    if (timeDigits[0]) {
      let h = parseInt(timeDigits[0], 10);
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      hours = h;
    }
    if (timeDigits[1]) {
      minutes = parseInt(timeDigits[1], 10) || 0;
    }
  }

  target.setHours(hours, minutes, 0, 0);
  return target;
}

interface ActiveCallRecord {
  coupleId?: string | undefined;
  patientName?: string | undefined;
  partnerName?: string | undefined;
  phoneNumber?: string | undefined;
  treatment?: string | undefined;
  doctorName?: string | undefined;
  clinicName?: string | undefined;
  timestamp?: number | undefined;
}

export async function POST(request: Request) {
  try {
    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const lastActiveCall = (globalThis as unknown as { __lastActiveCall?: ActiveCallRecord }).__lastActiveCall;

    let rawPhone = String(
      json["phoneNumber"] ||
      json["phone_number"] ||
      json["patient_phone"] ||
      json["phone"] ||
      "",
    ).replace(/\D/g, "");

    // If phone is missing or contains placeholder, check active call memory
    if (rawPhone.length < 8 && lastActiveCall?.phoneNumber) {
      rawPhone = String(lastActiveCall.phoneNumber).replace(/\D/g, "");
    }

    let inputDate = String(
      json["appointmentDate"] ||
      json["appointment_date"] ||
      json["date"] ||
      "tomorrow",
    );
    if (inputDate.includes("<") || inputDate.includes("{")) {
      inputDate = "tomorrow";
    }

    let inputTime = String(
      json["appointmentTime"] ||
      json["appointment_time"] ||
      json["time"] ||
      "11:00 AM",
    );
    if (inputTime.includes("<") || inputTime.includes("{")) {
      inputTime = "11:00 AM";
    }

    let rawName = String(
      json["patientName"] ||
      json["patient_name"] ||
      json["userName"] ||
      json["user_name"] ||
      json["name"] ||
      "",
    ).trim();

    // If rawName is empty or contains placeholder, resolve from active call
    if ((!rawName || rawName.includes("{") || rawName.includes("<")) && lastActiveCall?.patientName) {
      rawName = String(lastActiveCall.patientName);
    }

    const inputDoctor =
      typeof json["doctorName"] === "string" && !json["doctorName"].includes("<")
        ? json["doctorName"]
        : typeof json["doctor_name"] === "string" && !json["doctor_name"].includes("<")
          ? json["doctor_name"]
          : typeof json["doctor"] === "string" && !json["doctor"].includes("<")
            ? json["doctor"]
            : (lastActiveCall?.doctorName as string | undefined) || "Dr. Ananya Rao";

    const inputType =
      typeof json["appointmentType"] === "string" && !json["appointmentType"].includes("<")
        ? json["appointmentType"]
        : typeof json["appointment_type"] === "string" && !json["appointment_type"].includes("<")
          ? json["appointment_type"]
          : typeof json["type"] === "string" && !json["type"].includes("<")
            ? json["type"]
            : lastActiveCall?.treatment
              ? `${lastActiveCall.treatment} Consultation`
              : "Consultation";

    const inputNotes =
      typeof json["notes"] === "string" && !json["notes"].includes("<")
        ? json["notes"]
        : typeof json["reason"] === "string" && !json["reason"].includes("<")
          ? json["reason"]
          : "";

    const phoneLast10 = rawPhone.slice(-10);

    let couple = null;
    let patient = null;

    // 1. Direct Couple ID Match from Active Call Memory (100% exact match)
    if (lastActiveCall?.coupleId) {
      couple = await prisma.couple.findUnique({
        where: { id: String(lastActiveCall.coupleId) },
        include: {
          clinic: true,
          assignedDoctor: true,
          primaryPatient: true,
          partnerPatient: true,
        },
      });
      if (couple) {
        patient = couple.primaryPatient;
      }
    }

    if (!couple && phoneLast10.length >= 8) {
      patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { phone: { contains: phoneLast10 } },
            { whatsappNumber: { contains: phoneLast10 } },
          ],
        },
        include: {
          primaryCouples: {
            include: {
              clinic: true,
              assignedDoctor: true,
              primaryPatient: true,
              partnerPatient: true,
            },
          },
          partnerCouples: {
            include: {
              clinic: true,
              assignedDoctor: true,
              primaryPatient: true,
              partnerPatient: true,
            },
          },
        },
      });

      if (patient) {
        couple = patient.primaryCouples[0] || patient.partnerCouples[0] || null;
      }
    }

    if (!couple && rawName) {
      const nameParts = rawName.split(/\s+/).filter(Boolean);
      for (const part of nameParts) {
        if (part.length >= 2) {
          patient = await prisma.patient.findFirst({
            where: {
              OR: [
                { firstName: { contains: part, mode: "insensitive" } },
                { lastName: { contains: part, mode: "insensitive" } },
              ],
            },
            include: {
              primaryCouples: {
                include: {
                  clinic: true,
                  assignedDoctor: true,
                  primaryPatient: true,
                  partnerPatient: true,
                },
              },
              partnerCouples: {
                include: {
                  clinic: true,
                  assignedDoctor: true,
                  primaryPatient: true,
                  partnerPatient: true,
                },
              },
            },
          });
          if (patient) {
            couple = patient.primaryCouples[0] || patient.partnerCouples[0] || null;
            if (couple) break;
          }
        }
      }
    }

    // Fallback: If not found by phone or name, attach to first active couple in clinic
    if (!couple) {
      couple = await prisma.couple.findFirst({
        where: { status: "ACTIVE" },
        include: {
          clinic: true,
          assignedDoctor: true,
          primaryPatient: true,
          partnerPatient: true,
        },
      });
      patient = couple?.primaryPatient || null;
    }

    if (!couple) {
      return NextResponse.json(
        {
          success: false,
          error: "No active patient clinic profile found to attach appointment.",
        },
        { status: 404 },
      );
    }

    const startsAt = parseDateAndTime(inputDate, inputTime);
    const doctorName = inputDoctor || couple.assignedDoctor?.name || "Dr. Ananya Rao";
    const appointmentType = inputType || "Consultation";
    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`.trim()
      : couple.primaryPatient
        ? `${couple.primaryPatient.firstName} ${couple.primaryPatient.lastName}`.trim()
        : "Patient";

    const formattedDate = startsAt.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const formattedTime = startsAt.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // ─── Real-Time Doctor Availability & Conflict Checking ───────────────────
    const daySlots = await getDoctorDaySlots(couple.clinicId, doctorName, startsAt);

    if (!daySlots.isWorkingDay) {
      return NextResponse.json({
        success: false,
        available: false,
        reason: "DOCTOR_NOT_WORKING_TODAY",
        doctor_name: doctorName,
        requested_date: formattedDate,
        requested_time: formattedTime,
        message: `${doctorName} is not available on ${formattedDate}. The clinic/doctor is closed on this day. Please choose another date.`,
      });
    }

    const reqMins = startsAt.getHours() * 60 + startsAt.getMinutes();
    const isWithinShift = daySlots.openSlots.some((slot) => {
      const slotMins = parseTimeToMinutes(slot.time);
      return Math.abs(slotMins - reqMins) <= 25; // 25-min matching tolerance
    });

    const checkNotes = (inputNotes + " " + inputType + " " + String(json["action"] || "")).toLowerCase();
    const isReschedule =
      checkNotes.includes("reschedule") ||
      checkNotes.includes("change") ||
      checkNotes.includes("postpone") ||
      checkNotes.includes("shift") ||
      checkNotes.includes("move") ||
      checkNotes.includes("update time") ||
      checkNotes.includes("different time");

    // Fetch confirmed appointments for this doctor on this day
    const dayStart = new Date(startsAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(startsAt);
    dayEnd.setHours(23, 59, 59, 999);

    const doctorAppointments = await prisma.appointment.findMany({
      where: {
        clinicId: couple.clinicId,
        status: "CONFIRMED",
        doctorName: { contains: doctorName.replace("Dr. ", ""), mode: "insensitive" },
        startsAt: {
          gte: dayStart,
          lte: dayEnd,
        },
        ...(isReschedule ? { coupleId: { not: couple.id } } : {}),
      },
    });

    // Strict Interval Overlap Check: [reqStart, reqEnd) overlaps with [apptStart, apptEnd)
    // iff reqStart < apptEnd && reqEnd > apptStart
    const reqDuration = 30; // standard consultation duration
    const reqStart = startsAt.getTime();
    const reqEnd = reqStart + reqDuration * 60 * 1000;

    const conflictingAppt = doctorAppointments.find((appt) => {
      const apptStart = appt.startsAt.getTime();
      const apptEnd = apptStart + (appt.durationMin || 30) * 60 * 1000;
      return reqStart < apptEnd && reqEnd > apptStart;
    });

    if (conflictingAppt || (!isWithinShift && daySlots.openSlots.length > 0)) {
      const availableList = daySlots.openSlots.slice(0, 5).map((s) => s.timeLabel).join(", ");
      return NextResponse.json({
        success: false,
        available: false,
        reason: conflictingAppt ? "SLOT_ALREADY_BOOKED" : "OUTSIDE_DOCTOR_HOURS",
        doctor_name: doctorName,
        requested_date: formattedDate,
        requested_time: formattedTime,
        message: conflictingAppt
          ? `${doctorName} already has an appointment booked that overlaps with ${formattedTime} on ${formattedDate}. That time slot is not available. Her available open slots are: ${availableList}. Please choose one of these times.`
          : `${doctorName} is not available at ${formattedTime} on ${formattedDate}. Her available open slots are: ${availableList}. Please choose one of these times.`,
        available_slots: daySlots.openSlots.slice(0, 8).map((s) => s.timeLabel),
      });
    }

    let appointment = null;
    let wasRescheduled = false;

    if (isReschedule) {
      // Find the most recent confirmed appointment for this couple to reschedule
      const existing = await prisma.appointment.findFirst({
        where: {
          coupleId: couple.id,
          status: "CONFIRMED",
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        appointment = await prisma.appointment.update({
          where: { id: existing.id },
          data: {
            startsAt: startsAt,
            doctorName: doctorName,
            notes: `Rescheduled in real-time via Sarvam AI Voice Call. ${inputNotes ? `Notes: ${inputNotes}` : ""
              }`.trim(),
          },
        });
        wasRescheduled = true;
      }
    }

    if (!appointment) {
      appointment = await prisma.appointment.create({
        data: {
          clinicId: couple.clinicId,
          coupleId: couple.id,
          type: appointmentType,
          doctorName: doctorName,
          room: "Consultation Room 1",
          startsAt: startsAt,
          durationMin: 30,
          status: "CONFIRMED",
          notes: `Booked in real-time via Sarvam AI Voice Call. ${inputNotes ? `Patient notes: ${inputNotes}` : ""
            }`.trim(),
        },
      });
    }

    const confirmMessage = wasRescheduled
      ? `Appointment successfully rescheduled for ${patientName} to ${formattedDate} at ${formattedTime} with ${doctorName}.`
      : `Appointment successfully booked and confirmed for ${patientName} on ${formattedDate} at ${formattedTime} with ${doctorName}.`;

    return NextResponse.json({
      success: true,
      action: wasRescheduled ? "rescheduled" : "booked",
      appointment_id: appointment.id,
      patient_name: patientName,
      doctor_name: doctorName,
      appointment_type: appointmentType,
      confirmed_date: formattedDate,
      confirmed_time: formattedTime,
      message: confirmMessage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error booking appointment",
      },
      { status: 500 },
    );
  }
}
