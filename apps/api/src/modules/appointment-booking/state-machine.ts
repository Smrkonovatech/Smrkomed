/**
 * SmrkoMed Unified Appointment Booking State Machine
 * Deterministic, multi-channel state engine driving both WhatsApp and AI Call flows.
 */

import { prisma } from "@smrkomed/database";
import type {
  BookingMachineContext,
  BookingSession,
  BookingSlot,
  StateTransitionResult,
} from "./types";
import {
  formatBookingSuccessPrompt,
  formatConfirmationPrompt,
  formatHandoffPrompt,
  formatIdentifyPatientPrompt,
  formatRegisterPatientPrompt,
  formatSelectDatePrompt,
  formatSelectDoctorPrompt,
  formatSelectSlotPrompt,
  formatViewDoctorPrompt,
} from "./channels/whatsapp";
import {
  formatVoiceConfirmation,
  formatVoiceDoctorList,
  formatVoiceGreeting,
  formatVoiceSlotList,
  formatVoiceSuccess,
} from "./channels/voice";
import { parseNaturalDate, parseNaturalTime } from "./nlp-parser";
import {
  getClinicDoctors,
  getDoctorDaySlots,
  recheckSlotAvailability,
} from "./slot-engine";
import { bookingSessionStore } from "./session-store";

export class AppointmentBookingMachine {
  /**
   * Main entrypoint for processing an incoming user message.
   */
  public static async processMessage(
    session: BookingSession,
    rawInput: string,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    const input = rawInput.trim();
    const lower = input.toLowerCase();

    // ─── 1. Global Interceptors (Back, Restart, Human Handoff) ───────────────
    if (lower === "human" || lower === "agent" || lower === "representative" || lower === "coordinator") {
      return this.handleHandoff(session, "User requested human care coordinator");
    }

    if (lower === "restart" || lower === "start over" || lower === "cancel" || lower === "reset") {
      return this.handleRestart(session, ctx);
    }

    if (lower === "back") {
      return this.handleBack(session, ctx);
    }

    if (lower === "change doctor") {
      session.stepHistory.push(session.currentStep);
      session.currentStep = "SELECT_DOCTOR";
      bookingSessionStore.save(session);
      return this.renderSelectDoctor(session, ctx);
    }

    if (lower === "change date") {
      session.stepHistory.push(session.currentStep);
      session.currentStep = "SELECT_DATE";
      bookingSessionStore.save(session);
      return this.renderSelectDate(session, ctx);
    }

    // ─── 2. State-Specific Handlers ──────────────────────────────────────────
    switch (session.currentStep) {
      case "IDENTIFY_PATIENT":
        return this.stepIdentifyPatient(session, input, ctx);

      case "REGISTER_PATIENT":
        return this.stepRegisterPatient(session, input, ctx);

      case "SELECT_BRANCH":
        return this.stepSelectBranch(session, input, ctx);

      case "SELECT_APPOINTMENT_TYPE":
        return this.stepSelectAppointmentType(session, input, ctx);

      case "SELECT_DOCTOR":
        return this.stepSelectDoctor(session, input, ctx);

      case "VIEW_DOCTOR":
        return this.stepViewDoctor(session, input, ctx);

      case "SELECT_DATE":
        return this.stepSelectDate(session, input, ctx);

      case "SELECT_SLOT":
        return this.stepSelectSlot(session, input, ctx);

      case "REVALIDATE_SLOT":
      case "CONFIRMATION":
        return this.stepConfirmation(session, input, ctx);

      case "BOOKING":
      case "COMPLETED":
        return {
          session,
          responseMessage:
            session.channel === "CALL"
              ? formatVoiceSuccess(session)
              : formatBookingSuccessPrompt(session),
          requiresInput: false,
          actionTaken: "CONFIRM_BOOKING",
        };

      case "HANDOFF":
        return {
          session,
          responseMessage: formatHandoffPrompt(session.handoffReason),
          requiresInput: false,
          actionTaken: "HANDOFF",
        };

      default:
        session.currentStep = "SELECT_DOCTOR";
        bookingSessionStore.save(session);
        return this.renderSelectDoctor(session, ctx);
    }
  }

  // ─── STEP: IDENTIFY_PATIENT ────────────────────────────────────────────────
  private static async stepIdentifyPatient(
    session: BookingSession,
    input: string,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    const clean = input.trim().toLowerCase();

    if (clean === "1" || clean.includes("yes") || clean.includes("me") || clean.includes("existing")) {
      // Confirmed existing profile or has existing file
      session.isExistingPatient = true;
      if (!session.registrationDraft.patientName) {
        session.registrationDraft.patientName = "Valued Patient";
      }
      this.pushHistory(session, "SELECT_DOCTOR");
      bookingSessionStore.save(session);
      return this.renderSelectDoctor(session, ctx);
    }

    if (clean === "2" || clean.includes("no") || clean.includes("new") || clean.includes("register")) {
      // Register new patient
      session.isExistingPatient = false;
      this.pushHistory(session, "REGISTER_PATIENT");
      bookingSessionStore.save(session);
      return {
        session,
        responseMessage: formatRegisterPatientPrompt(session, 1),
        requiresInput: true,
        actionTaken: "ADVANCE",
      };
    }

    // Default re-prompt
    return {
      session,
      responseMessage: formatIdentifyPatientPrompt(session, session.registrationDraft.patientName),
      requiresInput: true,
    };
  }

  // ─── STEP: REGISTER_PATIENT ────────────────────────────────────────────────
  private static async stepRegisterPatient(
    session: BookingSession,
    input: string,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    const draft = session.registrationDraft;

    // Sub-step 1: Patient Name
    if (!draft.patientName) {
      if (input.length < 2) {
        return {
          session,
          responseMessage: "Please enter a valid patient name (at least 2 letters):",
          requiresInput: true,
        };
      }
      draft.patientName = input;
      draft.patientMobile = session.contactPhone; // Reuse channel identity
      bookingSessionStore.save(session);
      return {
        session,
        responseMessage: formatRegisterPatientPrompt(session, 2),
        requiresInput: true,
        actionTaken: "ADVANCE",
      };
    }

    // Sub-step 2: Age or DOB
    if (!draft.age && !draft.dateOfBirth) {
      const ageNum = parseInt(input.replace(/\D/g, ""), 10);
      if (ageNum > 15 && ageNum < 100) {
        draft.age = ageNum;
      } else {
        draft.dateOfBirth = input;
      }
      bookingSessionStore.save(session);
      return {
        session,
        responseMessage: formatRegisterPatientPrompt(session, 3),
        requiresInput: true,
        actionTaken: "ADVANCE",
      };
    }

    // Sub-step 3: Partner Name
    if (!draft.partnerName) {
      if (input.toLowerCase() !== "skip" && input.toLowerCase() !== "no") {
        draft.partnerName = input;
      }
      draft.consentCaptured = true;
      this.pushHistory(session, "SELECT_DOCTOR");
      bookingSessionStore.save(session);
      return this.renderSelectDoctor(session, ctx);
    }

    this.pushHistory(session, "SELECT_DOCTOR");
    bookingSessionStore.save(session);
    return this.renderSelectDoctor(session, ctx);
  }

  // ─── STEP: SELECT_BRANCH ───────────────────────────────────────────────────
  private static async stepSelectBranch(
    session: BookingSession,
    _input: string,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    session.branchName = "Main Clinic";
    this.pushHistory(session, "SELECT_DOCTOR");
    bookingSessionStore.save(session);
    return this.renderSelectDoctor(session, ctx);
  }

  // ─── STEP: SELECT_APPOINTMENT_TYPE ─────────────────────────────────────────
  private static async stepSelectAppointmentType(
    session: BookingSession,
    input: string,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    session.appointmentType = input || "Consultation";
    this.pushHistory(session, "SELECT_DOCTOR");
    bookingSessionStore.save(session);
    return this.renderSelectDoctor(session, ctx);
  }

  // ─── STEP: SELECT_DOCTOR ───────────────────────────────────────────────────
  private static async stepSelectDoctor(
    session: BookingSession,
    input: string,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    const doctors = await getClinicDoctors(ctx.clinicId);
    const num = parseInt(input.replace(/\D/g, ""), 10);

    let selectedDoc = null;
    if (!isNaN(num) && num >= 1 && num <= doctors.length) {
      selectedDoc = doctors[num - 1];
    } else {
      selectedDoc = doctors.find((d) => d.name.toLowerCase().includes(input.toLowerCase()));
    }

    if (!selectedDoc) {
      return {
        session,
        responseMessage:
          "⚠️ Please choose a valid doctor from the list:\n\n" +
          formatSelectDoctorPrompt(doctors),
        requiresInput: true,
      };
    }

    session.doctorId = selectedDoc.id;
    session.doctorName = selectedDoc.displayName;
    this.pushHistory(session, "VIEW_DOCTOR");
    bookingSessionStore.save(session);

    return {
      session,
      responseMessage: formatViewDoctorPrompt(selectedDoc),
      requiresInput: true,
      actionTaken: "ADVANCE",
    };
  }

  // ─── STEP: VIEW_DOCTOR ─────────────────────────────────────────────────────
  private static async stepViewDoctor(
    session: BookingSession,
    input: string,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    const clean = input.trim();

    if (clean === "1" || clean.toLowerCase().includes("slot") || clean.toLowerCase().includes("see")) {
      // Proceed to date selection
      this.pushHistory(session, "SELECT_DATE");
      bookingSessionStore.save(session);
      return this.renderSelectDate(session, ctx);
    }

    if (clean === "2" || clean.toLowerCase().includes("another") || clean.toLowerCase().includes("choose")) {
      // Choose another doctor
      this.pushHistory(session, "SELECT_DOCTOR");
      bookingSessionStore.save(session);
      return this.renderSelectDoctor(session, ctx);
    }

    // Default: proceed to dates
    this.pushHistory(session, "SELECT_DATE");
    bookingSessionStore.save(session);
    return this.renderSelectDate(session, ctx);
  }

  // ─── STEP: SELECT_DATE ─────────────────────────────────────────────────────
  private static async stepSelectDate(
    session: BookingSession,
    input: string,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    const doctors = await getClinicDoctors(ctx.clinicId);
    const doctor = doctors.find((d) => d.id === session.doctorId) || doctors[0]!;

    let targetDateIso: string | null = null;
    const num = parseInt(input.replace(/\D/g, ""), 10);

    if (!isNaN(num) && num >= 1 && num <= doctor.availableDates.length) {
      targetDateIso = doctor.availableDates[num - 1] ?? null;
    } else {
      const parsed = parseNaturalDate(input);
      if (parsed) {
        targetDateIso = parsed.date;
      }
    }

    if (!targetDateIso) {
      return {
        session,
        responseMessage:
          "⚠️ We couldn't recognize that date. Please select one of the available dates below:\n\n" +
          formatSelectDatePrompt(session.doctorName || "the Doctor", doctor.availableDates),
        requiresInput: true,
      };
    }

    session.selectedDate = targetDateIso;
    this.pushHistory(session, "SELECT_SLOT");
    bookingSessionStore.save(session);

    return this.renderSelectSlot(session, ctx);
  }

  // ─── STEP: SELECT_SLOT ─────────────────────────────────────────────────────
  private static async stepSelectSlot(
    session: BookingSession,
    input: string,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    const slots = await getDoctorDaySlots(
      ctx.clinicId,
      session.doctorId || "default",
      session.selectedDate!,
    );
    const available = slots.filter((s) => s.status === "available");

    let chosenSlot: BookingSlot | null = null;
    const num = parseInt(input.replace(/\D/g, ""), 10);

    if (!isNaN(num) && num >= 1 && num <= available.length) {
      chosenSlot = available[num - 1] ?? null;
    } else {
      const parsedTime = parseNaturalTime(input);
      if (parsedTime) {
        chosenSlot = available.find((s) => s.time === parsedTime.time) || null;
      }
    }

    if (!chosenSlot) {
      return {
        session,
        responseMessage:
          "⚠️ That time slot is not available. Please pick from the open slots:\n\n" +
          formatSelectSlotPrompt(session.doctorName || "Doctor", session.selectedDate!, slots),
        requiresInput: true,
      };
    }

    session.selectedSlot = chosenSlot.timeLabel;

    // Critical Step 13: Live slot revalidation before confirmation
    const reval = await recheckSlotAvailability(
      ctx.clinicId,
      session.doctorName || "Doctor",
      session.selectedDate!,
      chosenSlot.time,
    );

    if (!reval.available) {
      // Slot taken right now!
      return {
        session,
        responseMessage:
          `⚠️ Oh, that slot (${chosenSlot.timeLabel}) was just taken by another patient.\n\n` +
          `Please select another open time:\n\n` +
          formatSelectSlotPrompt(session.doctorName || "Doctor", session.selectedDate!, slots),
        requiresInput: true,
      };
    }

    this.pushHistory(session, "CONFIRMATION");
    bookingSessionStore.save(session);

    return {
      session,
      responseMessage:
        session.channel === "CALL"
          ? formatVoiceConfirmation(session)
          : formatConfirmationPrompt(session),
      requiresInput: true,
      actionTaken: "ADVANCE",
    };
  }

  // ─── STEP: CONFIRMATION & COMMIT ───────────────────────────────────────────
  private static async stepConfirmation(
    session: BookingSession,
    input: string,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    const clean = input.trim().toLowerCase();

    if (clean === "2" || clean.includes("change") || clean.includes("different time")) {
      this.pushHistory(session, "SELECT_DATE");
      bookingSessionStore.save(session);
      return this.renderSelectDate(session, ctx);
    }

    if (clean === "3" || clean.includes("cancel") || clean.includes("start over")) {
      return this.handleRestart(session, ctx);
    }

    if (clean === "1" || clean.includes("yes") || clean.includes("confirm") || clean.includes("book")) {
      // Commit the booking transactionally!
      return this.commitBooking(session, ctx);
    }

    return {
      session,
      responseMessage: formatConfirmationPrompt(session),
      requiresInput: true,
    };
  }

  // ─── COMMIT TRANSACTION ────────────────────────────────────────────────────
  private static async commitBooking(
    session: BookingSession,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    // Recheck idempotency: if already booked, return existing
    if (session.appointmentId) {
      return {
        session,
        responseMessage:
          session.channel === "CALL"
            ? formatVoiceSuccess(session)
            : formatBookingSuccessPrompt(session),
        requiresInput: false,
        actionTaken: "CONFIRM_BOOKING",
      };
    }

    try {
      const [h, m] = (session.selectedSlot || "10:00 AM")
        .replace(/[^0-9:]/g, "")
        .split(":")
        .map(Number);
      const isPM = (session.selectedSlot || "").toLowerCase().includes("pm");
      let realH = h || 10;
      if (isPM && realH < 12) realH += 12;
      if (!isPM && realH === 12) realH = 0;

      const startsAt = new Date(`${session.selectedDate}T00:00:00.000Z`);
      startsAt.setUTCHours(realH, m || 0, 0, 0);

      // Find or create clinic reference
      let clinic = await prisma.clinic.findFirst({ where: { id: ctx.clinicId } });
      if (!clinic) {
        clinic = await prisma.clinic.findFirst();
      }
      const clinicId = clinic?.id || ctx.clinicId;

      // Find or attach couple
      let couple = await prisma.couple.findFirst({
        where: {
          clinicId,
          OR: [
            { primaryPatient: { phone: { contains: session.contactPhone.slice(-10) } } },
            { partnerPatient: { phone: { contains: session.contactPhone.slice(-10) } } },
          ],
        },
      });

      if (!couple) {
        couple = await prisma.couple.findFirst({ where: { clinicId } });
      }

      // Create appointment in database
      const appointment = await prisma.appointment.create({
        data: {
          clinicId,
          coupleId: couple?.id ?? null,
          type: session.appointmentType || "Consultation",
          doctorName: session.doctorName || "Dr. Ananya Rao",
          room: "Consultation Room 1",
          startsAt,
          durationMin: 30,
          status: "CONFIRMED",
          notes: `Booked via AI Appointment Flow (${session.channel}). Patient: ${
            session.registrationDraft.patientName || "Patient"
          }. Partner: ${session.registrationDraft.partnerName || "N/A"}`,
        },
      });

      session.appointmentId = appointment.id;
      session.currentStep = "COMPLETED";
      session.status = "COMPLETED";
      bookingSessionStore.save(session);

      // Fire WhatsApp automation flow trigger if active (non-blocking)
      void import("../whatsapp-automation/triggers")
        .then(({ dispatchWhatsAppTrigger }) => {
          if (couple?.id) {
            void dispatchWhatsAppTrigger({
              tenant: {
                organizationId: ctx.organizationId,
                organizationName: ctx.clinicName || "SmrkoMed",
                clinicId,
                clinicName: ctx.clinicName || "SmrkoMed Clinic",
                userId: "ai_bot",
                role: "CLINIC_ADMIN",
              },
              triggerType: "APPOINTMENT_BOOKED",
              triggerEventId: appointment.id,
              coupleId: couple.id,
              vars: {
                appointment_date: session.selectedDate || "",
                appointment_time: session.selectedSlot || "",
                doctor_name: session.doctorName || "",
                clinic_name: ctx.clinicName || "SmrkoMed Clinic",
              },
            });
          }
        })
        .catch(() => undefined);

      return {
        session,
        responseMessage:
          session.channel === "CALL"
            ? formatVoiceSuccess(session)
            : formatBookingSuccessPrompt(session),
        requiresInput: false,
        actionTaken: "CONFIRM_BOOKING",
      };
    } catch (err) {
      session.lastErrorMessage = err instanceof Error ? err.message : "Database error";
      bookingSessionStore.save(session);

      return {
        session,
        responseMessage:
          "⚠️ We encountered an issue while finalizing your appointment. Please reply *1* to retry, or *HUMAN* to speak with our care coordinator.",
        requiresInput: true,
        error: session.lastErrorMessage,
      };
    }
  }

  // ─── RENDERING HELPERS ─────────────────────────────────────────────────────
  private static async renderSelectDoctor(
    session: BookingSession,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    const doctors = await getClinicDoctors(ctx.clinicId);
    return {
      session,
      responseMessage:
        session.channel === "CALL"
          ? formatVoiceDoctorList(doctors)
          : formatSelectDoctorPrompt(doctors),
      requiresInput: true,
      actionTaken: "ADVANCE",
    };
  }

  private static async renderSelectDate(
    session: BookingSession,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    const doctors = await getClinicDoctors(ctx.clinicId);
    const doctor = doctors.find((d) => d.id === session.doctorId) || doctors[0]!;
    return {
      session,
      responseMessage: formatSelectDatePrompt(session.doctorName || "the Doctor", doctor.availableDates),
      requiresInput: true,
      actionTaken: "ADVANCE",
    };
  }

  private static async renderSelectSlot(
    session: BookingSession,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    const slots = await getDoctorDaySlots(
      ctx.clinicId,
      session.doctorId || "default",
      session.selectedDate!,
    );
    return {
      session,
      responseMessage:
        session.channel === "CALL"
          ? formatVoiceSlotList(session.doctorName || "Doctor", session.selectedDate!, slots)
          : formatSelectSlotPrompt(session.doctorName || "Doctor", session.selectedDate!, slots),
      requiresInput: true,
      actionTaken: "ADVANCE",
    };
  }

  // ─── NAVIGATION & RECOVERY HELPERS ─────────────────────────────────────────
  private static handleHandoff(session: BookingSession, reason: string): StateTransitionResult {
    session.currentStep = "HANDOFF";
    session.status = "HANDED_OFF";
    session.handoffReason = reason;
    bookingSessionStore.save(session);

    return {
      session,
      responseMessage: formatHandoffPrompt(reason),
      requiresInput: false,
      actionTaken: "HANDOFF",
    };
  }

  private static async handleRestart(
    session: BookingSession,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    // Reset booking-specific fields while preserving patient profile info
    session.doctorId = null;
    session.doctorName = null;
    session.selectedDate = null;
    session.selectedSlot = null;
    session.appointmentId = null;
    session.stepHistory = [];
    session.currentStep = "SELECT_DOCTOR";
    bookingSessionStore.save(session);

    return this.renderSelectDoctor(session, ctx);
  }

  private static async handleBack(
    session: BookingSession,
    ctx: BookingMachineContext,
  ): Promise<StateTransitionResult> {
    const prev = session.stepHistory.pop();
    if (!prev) {
      session.currentStep = "SELECT_DOCTOR";
      bookingSessionStore.save(session);
      return this.renderSelectDoctor(session, ctx);
    }

    session.currentStep = prev;
    bookingSessionStore.save(session);

    switch (prev) {
      case "SELECT_DOCTOR":
        return this.renderSelectDoctor(session, ctx);
      case "SELECT_DATE":
        return this.renderSelectDate(session, ctx);
      case "SELECT_SLOT":
        return this.renderSelectSlot(session, ctx);
      default:
        return this.renderSelectDoctor(session, ctx);
    }
  }

  private static pushHistory(session: BookingSession, nextState: BookingSession["currentStep"]): void {
    if (session.currentStep !== nextState) {
      session.stepHistory.push(session.currentStep);
    }
    session.currentStep = nextState;
  }
}
