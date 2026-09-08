/**
 * SmrkoMed Appointment Booking Module — Hono Routes
 * Serves session management and conversational turns for WhatsApp and AI Call channels.
 */

import { Hono } from "hono";
import { z } from "zod";
import { prisma, type TenantContext } from "@smrkomed/database";

import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";

import { AppointmentBookingMachine } from "./state-machine";
import { bookingSessionStore } from "./session-store";
import { formatIdentifyPatientPrompt, formatSelectChannelPrompt } from "./channels/whatsapp";
import { formatVoiceGreeting } from "./channels/voice";
import { getClinicDoctors } from "./slot-engine";

const initSessionSchema = z.object({
  channel: z.enum(["WHATSAPP", "CALL"]),
  contactPhone: z.string().min(8),
  patientName: z.string().optional(),
  partnerName: z.string().optional(),
  language: z.enum(["en", "kn", "hi"]).optional().default("en"),
});

const messageSchema = z.object({
  sessionId: z.string().optional(),
  contactPhone: z.string().min(8),
  channel: z.enum(["WHATSAPP", "CALL"]).optional().default("WHATSAPP"),
  content: z.string().min(1),
  language: z.enum(["en", "kn", "hi"]).optional().default("en"),
});

export const appointmentBookingRoutes = new Hono<AppEnv>()
  /**
   * Start or resume a booking session for WhatsApp or AI Voice Call
   */
  .post("/session", validate("json", initSessionSchema), async (c) => {
    const body = c.req.valid("json");
    const clinic = await prisma.clinic.findFirst();
    const clinicId = clinic?.id || "clinic_default";
    const orgId = clinic?.organizationId || "org_default";

    let session = bookingSessionStore.getActiveByPhone(clinicId, body.contactPhone);
    if (!session) {
      session = bookingSessionStore.create({
        channel: body.channel,
        clinicId,
        organizationId: orgId,
        contactPhone: body.contactPhone,
      });

      if (body.patientName) {
        session.registrationDraft.patientName = body.patientName;
        session.isExistingPatient = true;
      }
      if (body.partnerName) {
        session.registrationDraft.partnerName = body.partnerName;
      }
      bookingSessionStore.save(session);
    }

    const initialMessage =
      session.channel === "CALL"
        ? formatVoiceGreeting(
            session.registrationDraft.patientName || "Patient",
            "Dr. Ananya Rao",
            clinic?.name || "ABC Fertility Centre",
            body.language,
          )
        : session.currentStep === "SELECT_CHANNEL"
          ? formatSelectChannelPrompt(session)
          : formatIdentifyPatientPrompt(session, session.registrationDraft.patientName);

    return ok(c, {
      sessionId: session.id,
      channel: session.channel,
      currentStep: session.currentStep,
      status: session.status,
      message: initialMessage,
      expiresAt: session.expiresAt.toISOString(),
    });
  })

  /**
   * Process incoming user message / selection in a booking session
   */
  .post("/message", validate("json", messageSchema), async (c) => {
    const body = c.req.valid("json");
    const clinic = await prisma.clinic.findFirst();
    const clinicId = clinic?.id || "clinic_default";
    const orgId = clinic?.organizationId || "org_default";

    let session = body.sessionId ? bookingSessionStore.get(body.sessionId) : null;
    if (!session) {
      session = bookingSessionStore.getActiveByPhone(clinicId, body.contactPhone);
    }

    if (!session) {
      session = bookingSessionStore.create({
        channel: body.channel,
        clinicId,
        organizationId: orgId,
        contactPhone: body.contactPhone,
      });
    }

    const result = await AppointmentBookingMachine.processMessage(session, body.content, {
      clinicId,
      organizationId: orgId,
      clinicName: clinic?.name || "ABC Fertility Centre",
    });

    return ok(c, {
      sessionId: result.session.id,
      channel: result.session.channel,
      currentStep: result.session.currentStep,
      status: result.session.status,
      responseMessage: result.responseMessage,
      appointmentId: result.session.appointmentId || null,
      actionTaken: result.actionTaken || "ADVANCE",
      requiresInput: result.requiresInput,
    });
  })

  /**
   * Inspect session state
   */
  .get("/session/:id", async (c) => {
    const id = c.req.param("id");
    const session = bookingSessionStore.get(id);
    if (!session) {
      return c.json({ error: "Session not found or expired" }, 404);
    }
    return ok(c, session);
  })

  /**
   * List available clinic doctors and their upcoming open slots
   */
  .get("/doctors", async (c) => {
    const clinic = await prisma.clinic.findFirst();
    const clinicId = clinic?.id || "clinic_default";
    const doctors = await getClinicDoctors(clinicId);
    return ok(c, doctors);
  });
