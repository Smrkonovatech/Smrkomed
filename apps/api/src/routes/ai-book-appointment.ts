/**
 * Real-Time Appointment Booking Endpoint for AI Voice Call (Sarvam AI Tool)
 * Allows Sarvam AI voice assistant to book confirmed appointments in real time
 * and automatically dispatches WhatsApp confirmation to the patient.
 */

import { Hono } from "hono";
import { prisma } from "@smrkomed/database";
import { getLatestActiveVoiceCall } from "../modules/appointment-booking/channels/voice";
import type { AppEnv } from "../types";

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
    // Default to tomorrow
    target.setDate(now.getDate() + 1);
  }

  // Parse time
  const cleanTime = (timeStr || "").toLowerCase().trim();
  let hours = 9;
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

  const y = target.getFullYear();
  const mo = String(target.getMonth() + 1).padStart(2, "0");
  const d = String(target.getDate()).padStart(2, "0");
  const isoDate = `${y}-${mo}-${d}`;

  const startsAt = new Date(`${isoDate}T00:00:00.000Z`);
  startsAt.setUTCHours(hours, minutes, 0, 0);
  return startsAt;
}

export const aiBookAppointmentRoute = new Hono<AppEnv>()
  .get("/", async (c) => {
    try {
      const doctorQuery = c.req.query("doctor") || c.req.query("doctorName") || "Dr. Ananya Rao";
      const dateQuery = c.req.query("date") || "tomorrow";

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateIso = dateQuery === "tomorrow" ? tomorrow.toISOString().split("T")[0]! : dateQuery;

      const clinic = await prisma.clinic.findFirst();
      const clinicId = clinic?.id || "clinic_default";

      const { getDoctorDaySlots } = await import("../modules/appointment-booking/slot-engine");
      const slots = await getDoctorDaySlots(clinicId, doctorQuery, dateIso);

      const availableSlots = slots.filter((s) => s.status === "available").map((s) => s.timeLabel);
      const bookedSlots = slots.filter((s) => s.status === "booked").map((s) => s.timeLabel);

      return c.json({
        status: "ok",
        service: "ai-book-appointment",
        doctor: doctorQuery,
        date: dateIso,
        is_working_day: slots.length > 0,
        available_slots: availableSlots,
        booked_slots: bookedSlots,
        total_slots: slots.length,
      });
    } catch (e: any) {
      return c.json({ status: "ok", service: "ai-book-appointment", error: e?.message });
    }
  })
  .post("/", async (c) => {
  try {
    const json = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;

    const activeCall = getLatestActiveVoiceCall();

    let rawPhone = String(
      json["phoneNumber"] ||
        json["phone_number"] ||
        json["patient_phone"] ||
        json["phone"] ||
        activeCall?.phoneNumber ||
        "",
    ).replace(/\D/g, "");

    const inputDate = String(
      json["appointmentDate"] ||
        json["appointment_date"] ||
        json["date"] ||
        "tomorrow",
    );

    const inputTime = String(
      json["appointmentTime"] ||
        json["appointment_time"] ||
        json["time"] ||
        "09:00 AM",
    );

    let rawName = String(
      json["patientName"] ||
        json["patient_name"] ||
        json["userName"] ||
        json["user_name"] ||
        json["name"] ||
        activeCall?.patientName ||
        "",
    ).trim();

    const doctorName = String(
      json["doctorName"] ||
        json["doctor_name"] ||
        json["doctor"] ||
        activeCall?.doctorName ||
        "Dr. Ananya Rao",
    );

    const inputType = String(
      json["appointmentType"] ||
        json["appointment_type"] ||
        json["type"] ||
        "Consultation",
    );

    const phoneLast10 = rawPhone.slice(-10);

    // Resilient patient & couple resolution
    let patient = null;
    let couple = null;

    // 1. Match patient by phone number
    if (phoneLast10.length >= 8) {
      patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { phone: { contains: phoneLast10 } },
            { whatsappNumber: { contains: phoneLast10 } },
          ],
        },
        include: {
          clinic: true,
          primaryCouples: true,
          partnerCouples: true,
        },
      });

      if (patient) {
        couple = patient.primaryCouples[0] || patient.partnerCouples[0] || null;
      }
    }

    // 2. Fallback: match by recent active conversation (within 30 mins)
    if (!patient) {
      const recentConv = await prisma.conversation.findFirst({
        where: {
          updatedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
          patientId: { not: null },
        },
        orderBy: { updatedAt: "desc" },
        include: {
          patient: {
            include: {
              clinic: true,
              primaryCouples: true,
              partnerCouples: true,
            },
          },
        },
      });
      if (recentConv?.patient) {
        patient = recentConv.patient;
        couple = patient.primaryCouples[0] || patient.partnerCouples[0] || null;
      }
    }

    // 3. Fallback: match by patient name if provided
    if (!patient && rawName) {
      patient = await prisma.patient.findFirst({
        where: {
          OR: [
            { firstName: { contains: rawName, mode: "insensitive" } },
            { lastName: { contains: rawName, mode: "insensitive" } },
          ],
        },
        include: {
          clinic: true,
          primaryCouples: true,
          partnerCouples: true,
        },
      });
      if (patient) {
        couple = patient.primaryCouples[0] || patient.partnerCouples[0] || null;
      }
    }

    // 4. Fallback: latest active patient in clinic
    if (!patient) {
      patient = await prisma.patient.findFirst({
        orderBy: { updatedAt: "desc" },
        include: {
          clinic: true,
          primaryCouples: true,
          partnerCouples: true,
        },
      });
      if (patient) {
        couple = patient.primaryCouples[0] || patient.partnerCouples[0] || null;
      }
    }

    // 5. If still no patient, create default patient for consultation
    if (!patient) {
      const clinic = await prisma.clinic.findFirst();
      if (clinic) {
        patient = await prisma.patient.create({
          data: {
            clinicId: clinic.id,
            firstName: rawName.split(" ")[0] || "Patient",
            lastName: rawName.split(" ").slice(1).join(" ") || "",
            phone: rawPhone ? `+91${phoneLast10}` : `+9199999${Math.floor(10000 + Math.random() * 90000)}`,
            status: "ACTIVE",
          },
        });
      }
    }

    if (patient && !couple) {
      couple = await prisma.couple.create({
        data: {
          clinicId: patient.clinicId,
          slug: `c-${patient.id.slice(-8)}-${Date.now().toString(36)}`,
          primaryPatientId: patient.id,
        },
      });
    }

    if (!patient || !couple) {
      return c.json(
        {
          success: false,
          error: "Could not find or create patient record for appointment.",
        },
        404,
      );
    }

    const startsAt = parseDateAndTime(inputDate, inputTime);
    const durationMin = 30;
    const cleanDoc = doctorName.replace(/^dr\.?\s*/i, "").trim();

    // 1. DUPLICATE CHECK FOR SAME PATIENT / COUPLE:
    // If patient already has a confirmed appointment on this day, update/reschedule it to avoid duplicate overlapping records
    const existingPatientAppt = await prisma.appointment.findFirst({
      where: {
        clinicId: couple.clinicId,
        coupleId: couple.id,
        status: "CONFIRMED",
        startsAt: {
          gte: new Date(startsAt.getTime() - 6 * 3600 * 1000),
          lte: new Date(startsAt.getTime() + 6 * 3600 * 1000),
        },
      },
    });

    let conflictResolved = false;
    let originalRequestedTime = startsAt.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // 2. DOCTOR COLLISION / CONFLICT CHECK (with ANY other patient):
    const reqStart = startsAt.getTime();
    const doctorConflict = await prisma.appointment.findFirst({
      where: {
        clinicId: couple.clinicId,
        status: "CONFIRMED",
        doctorName: { contains: cleanDoc, mode: "insensitive" },
        ...(existingPatientAppt ? { id: { not: existingPatientAppt.id } } : {}),
        startsAt: {
          gte: new Date(reqStart - 29 * 60 * 1000),
          lte: new Date(reqStart + 29 * 60 * 1000),
        },
      },
    });

    if (doctorConflict) {
      // Slot collision detected! Find the nearest available open slot for this doctor on this day
      const { getDoctorDaySlots } = await import("../modules/appointment-booking/slot-engine");
      const dateIso = startsAt.toISOString().split("T")[0]!;
      const daySlots = await getDoctorDaySlots(couple.clinicId, doctorName, dateIso);
      const openSlots = daySlots.filter((s) => s.status === "available");

      if (openSlots.length > 0) {
        const reqMinutes = startsAt.getHours() * 60 + startsAt.getMinutes();
        const sorted = [...openSlots].sort((a, b) => {
          const [ha, ma] = a.time.split(":").map(Number);
          const [hb, mb] = b.time.split(":").map(Number);
          const diffA = Math.abs((ha! * 60 + ma!) - reqMinutes);
          const diffB = Math.abs((hb! * 60 + mb!) - reqMinutes);
          return diffA - diffB;
        });

        const nearest = sorted[0]!;
        const [nh, nm] = nearest.time.split(":").map(Number);
        startsAt.setUTCHours(nh!, nm!, 0, 0);
        conflictResolved = true;
      } else {
        return c.json(
          {
            success: false,
            error: "SLOT_UNAVAILABLE",
            message: `${doctorName} is fully booked on this day. Please select another date.`,
          },
          409,
        );
      }
    }

    let appointment: any = null;
    if (existingPatientAppt) {
      // Reschedule/update existing appointment without creating duplicate
      appointment = await prisma.appointment.update({
        where: { id: existingPatientAppt.id },
        data: {
          startsAt,
          doctorName,
          type: inputType,
          status: "CONFIRMED",
          notes: conflictResolved
            ? `Rescheduled via AI Voice Call. Requested ${originalRequestedTime} was taken, automatically resolved to open slot.`
            : `Updated via AI Voice Call.`,
        },
      });
    } else {
      appointment = await prisma.appointment.create({
        data: {
          clinicId: couple.clinicId,
          coupleId: couple.id,
          type: inputType,
          doctorName,
          startsAt,
          durationMin,
          status: "CONFIRMED",
          notes: conflictResolved
            ? `Booked via AI Voice Call. Conflict avoided: requested ${originalRequestedTime} was busy, allocated nearest open slot.`
            : `Booked in real-time via Sarvam AI Voice Call.`,
        },
      });
    }

    const patientDisplayName = `${patient.firstName} ${patient.lastName || ""}`.trim();
    const formattedDate = startsAt.toLocaleDateString("en-IN", {
      timeZone: "UTC",
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const formattedTime = startsAt.toLocaleTimeString("en-IN", {
      timeZone: "UTC",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Send WhatsApp confirmation if conversation exists
    const conv = await prisma.conversation.findFirst({
      where: {
        clinicId: couple.clinicId,
        OR: [
          { patientId: patient.id },
          { contactPhone: { contains: phoneLast10 } },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });

    const clinic = await prisma.clinic.findUnique({
      where: { id: couple.clinicId },
      select: { name: true },
    });
    const clinicName = clinic?.name || "ABC Fertility Centre";

    if (conv) {
      let confirmationText = `You're all set, ${patientDisplayName}! 🎉\n\nYour appointment is confirmed:\n\n👩‍⚕️ ${doctorName}\n📅 ${formattedDate}\n⏰ ${formattedTime}\n📍 ${clinicName}\n\nWe'll remind you before your appointment!`;
      if (conflictResolved) {
        confirmationText = `You're all set, ${patientDisplayName}! 🎉\n\nYour appointment is confirmed for the nearest available open slot:\n\n👩‍⚕️ ${doctorName}\n📅 ${formattedDate}\n⏰ ${formattedTime} (adjusted from ${originalRequestedTime} to avoid schedule conflict)\n📍 ${clinicName}\n\nWe'll remind you before your appointment!`;
      }

      await prisma.message.create({
        data: {
          conversationId: conv.id,
          direction: "OUTBOUND",
          senderType: "STAFF",
          content: confirmationText,
          messageType: "text",
          status: "SENT",
        },
      }).catch(() => undefined);
    }

    return c.json({
      success: true,
      action: "booked",
      appointment_id: appointment.id,
      patient_name: patientDisplayName,
      doctor_name: doctorName,
      confirmed_date: formattedDate,
      confirmed_time: formattedTime,
      conflict_avoided: conflictResolved,
      message: conflictResolved
        ? `Appointment successfully confirmed for ${patientDisplayName} on ${formattedDate} at ${formattedTime} with ${doctorName} (adjusted from ${originalRequestedTime} to avoid doctor schedule conflict).`
        : `Appointment successfully confirmed for ${patientDisplayName} on ${formattedDate} at ${formattedTime} with ${doctorName}.`,
    });
  } catch (error) {
    console.error("[AI Book Appointment Route Error]", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal error booking appointment",
      },
      500,
    );
  }
});
