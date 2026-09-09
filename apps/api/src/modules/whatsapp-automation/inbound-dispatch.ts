/**
 * Phase 4 — production inbound WhatsApp → automation wiring.
 * Dispatched asynchronously after message persistence (webhook stays fast).
 * Reuses dispatchWhatsAppTrigger + existing engine — no second bus.
 */

import type { TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { runExecution } from "./engine";
import { dispatchWhatsAppTrigger } from "./triggers";
import { mergeExecutionContext, parseExecutionContext } from "./context";
import { nextNodes, parseDefinition } from "./validate";
import { decodeSlotId } from "../appointments/availability";

/** Start work immediately (do not wait for setImmediate — more reliable on Railway). */
function scheduleBackground(task: () => Promise<void>) {
  void task().catch((err) => {
    console.error(
      "[WhatsApp automation] background task failed:",
      err instanceof Error ? err.message : err,
    );
  });
}

/** Safe automation vars — never secrets / tokens / credentials. */
export function buildIncomingWhatsAppVars(input: {
  clinicId: string;
  clinicName?: string;
  conversationId: string;
  patientId?: string | null;
  coupleId?: string | null;
  leadId?: string | null | undefined;
  contactPhone?: string | null | undefined;
  messageId: string;
  messageType: string;
  messageText: string;
  mediaType?: string | null;
  mediaMimeType?: string | null;
  mediaCaption?: string | null;
  unmatched?: boolean;
  timestampIso: string;
}): Record<string, string> {
  const text = (input.messageText ?? "").slice(0, 2000);
  return {
    clinic_id: input.clinicId,
    clinic_name: input.clinicName ?? "",
    conversation_id: input.conversationId,
    patient_id: input.patientId ?? "",
    couple_id: input.coupleId ?? "",
    lead_id: input.leadId ?? "",
    sender_phone: input.contactPhone ?? "",
    contact_phone: input.contactPhone ?? "",
    message_id: input.messageId,
    message_type: input.messageType,
    message_text: text,
    message_content: text,
    media_type: input.mediaType ?? "",
    media_mime_type: input.mediaMimeType ?? "",
    media_caption: (input.mediaCaption ?? "").slice(0, 500),
    unmatched: input.unmatched ? "true" : "false",
    inbound_at: input.timestampIso,
    ...(text.startsWith("appt_doctor_")
      ? {
          selectedDoctorId: text.replace("appt_doctor_", "").trim(),
          selected_doctor_id: text.replace("appt_doctor_", "").trim(),
        }
      : {}),
    ...(text.startsWith("appt_date_")
      ? (() => {
          const rawDate = text.replace("appt_date_", "").trim();
          let normalized = rawDate;
          const match = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (match && match[1] && match[2] && match[3]) {
            normalized = `${match[1]}-${match[2]}-${match[3]}`;
          }
          console.log("[APPOINTMENT_DATE_SELECTED]", {
            clinicId: input.clinicId,
            conversationId: input.conversationId,
            rawDate,
            normalizedDate: normalized,
          });
          console.log("[APPOINTMENT_DATE_NORMALIZED]", {
            clinicId: input.clinicId,
            rawDate,
            normalizedDate: normalized,
          });
          return {
            selectedDate: normalized,
            selected_date: normalized,
            "appointment.date": normalized,
            appointment_date: normalized,
          };
        })()
      : {}),
    ...(text.startsWith("appt_slot_")
      ? (() => {
          const slotId = text.replace("appt_slot_", "").trim();
          const decoded = decodeSlotId(slotId);
          let timeLabel = "";
          let dateStr = "";
          if (decoded) {
            const d = new Date(decoded.startMs);
            const hours = d.getHours();
            const minutes = String(d.getMinutes()).padStart(2, "0");
            const ampm = hours >= 12 ? "PM" : "AM";
            const h12 = hours % 12 || 12;
            timeLabel = `${String(h12).padStart(2, "0")}:${minutes} ${ampm}`;
            const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
            const month = d.toLocaleDateString("en-US", { month: "short" });
            const day = d.getDate();
            dateStr = `${weekday}, ${day} ${month}`;
          }
          return {
            selectedSlotId: slotId,
            selected_slot_id: slotId,
            ...(timeLabel
              ? {
                  selectedTime: timeLabel,
                  selected_time: timeLabel,
                  "appointment.time": timeLabel,
                  appointment_time: timeLabel,
                }
              : {}),
            ...(dateStr ? { selectedDateLabel: dateStr, "appointment.dateLabel": dateStr } : {}),
            ...(decoded?.doctorName ? { "doctor.name": decoded.doctorName } : {}),
          };
        })()
      : {}),
    ...(text === "appt_confirm"
      ? (() => {
          console.log("[APPOINTMENT_CONFIRM_STARTED]", {
            clinicId: input.clinicId,
            conversationId: input.conversationId,
          });
          return { appointmentConfirmed: "true" };
        })()
      : {}),
    ...(text === "appt_cancel" ? { appointmentCancelled: "true" } : {}),
    ...(text === "appt_reg_myself" ? { booking_as_couple: "false" } : {}),
    ...(text === "appt_reg_couple" ? { booking_as_couple: "true" } : {}),
  };
}

async function resolveCoupleId(clinicId: string, patientId: string | null): Promise<string | null> {
  if (!patientId) return null;
  const couple = await prisma.couple.findFirst({
    where: {
      clinicId,
      OR: [{ primaryPatientId: patientId }, { partnerPatientId: patientId }],
    },
    select: { id: true },
  });
  return couple?.id ?? null;
}

async function resolveLeadId(clinicId: string, phone: string | null): Promise<string | null> {
  if (!phone) return null;
  const suffix = phone.replace(/\D/g, "").slice(-10);
  if (suffix.length < 8) return null;
  const lead = await prisma.lead.findFirst({
    where: {
      clinicId,
      phone: { contains: suffix },
    },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });
  return lead?.id ?? null;
}

async function clinicTenant(clinicId: string): Promise<TenantContext | null> {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { id: true, name: true, organizationId: true },
  });
  if (!clinic) return null;
  return {
    userId: "system-webhook",
    role: "CLINIC_ADMIN",
    clinicId: clinic.id,
    organizationId: clinic.organizationId,
    clinicName: clinic.name,
    organizationName: "",
  };
}

/**
 * Resume executions parked on WAIT_FOR_REPLY / WAIT mode=wait_for_reply for this conversation.
 */
export async function resumeWaitForReplyExecutions(input: {
  tenant: TenantContext;
  conversationId: string;
  inboundVars?: Record<string, string>;
}) {
  const waiting = await prisma.whatsAppFlowExecution.findMany({
    where: {
      clinicId: input.tenant.clinicId,
      conversationId: input.conversationId,
      status: "WAITING",
    },
    take: 25,
    orderBy: { updatedAt: "asc" },
  });

  const resumed: Array<{ executionId: string; status?: string; skipped?: string }> = [];

  for (const row of waiting) {
    const ctx = parseExecutionContext(row.context);
    if (ctx.waitKind !== "reply") continue;

    const flow = await prisma.whatsAppFlow.findFirst({
      where: { id: row.flowId, clinicId: input.tenant.clinicId },
    });
    // In-flight executions that are WAITING should always be allowed to proceed unless deleted
    if (!flow) {
      resumed.push({ executionId: row.id, skipped: "flow_not_found" });
      continue;
    }

    const def = parseDefinition(flow.definition);
    const waitId = row.currentNodeId;
    const rawReply = (input.inboundVars?.["message_text"] ?? "").trim();
    const cleanLower = rawReply.toLowerCase();

    // If user types 'appointment' or 'restart' or triggers a menu booking while waiting on an old mid-flow step (other than channel choice), cancel old execution and allow fresh flow
    const isRestartTrigger =
      cleanLower === "appointment" ||
      cleanLower === "book appointment" ||
      cleanLower === "book appt" ||
      cleanLower === "menu_book_appt" ||
      cleanLower === "menu_doctor_slots" ||
      cleanLower === "restart" ||
      cleanLower === "start over" ||
      cleanLower === "reset";

    if (waitId !== "n_channel_choice" && isRestartTrigger) {
      await prisma.whatsAppFlowExecution.update({
        where: { id: row.id },
        data: {
          status: "CANCELLED",
          error: "Superseded by fresh appointment request",
          completedAt: new Date(),
        },
      });
      const { setConversationPendingAction } = await import("../appointments/whatsapp-booking");
      await setConversationPendingAction({
        clinicId: input.tenant.clinicId,
        conversationId: input.conversationId,
        action: null,
      }).catch(() => undefined);
      continue;
    }

    let replyAction = rawReply;

    const mergedVars: Record<string, string> = {
      ...(ctx.vars ?? {}),
      ...(input.inboundVars ?? {}),
      patient_replied: "true",
    };

    // Deterministic state-aware reply normalization
    if (waitId === "n_confirm") {
      if (/^(appt_confirm|action_confirm_appointment|confirm|yes|yes\s+confirm|sure|ok|proceed|book|yep)$/i.test(rawReply)) {
        replyAction = "appt_confirm";
        mergedVars["appointmentConfirmed"] = "true";
      } else if (/^(appt_change_time|change\s+time|different\s+time|change\s+date|reschedule)$/i.test(rawReply)) {
        replyAction = "appt_change_time";
      } else if (/^(appt_cancel|action_cancel_confirm|cancel|no|don't\s+book)$/i.test(rawReply)) {
        replyAction = "appt_cancel";
      }
    } else if (waitId === "n_show_dates") {
      if (rawReply.startsWith("appt_date_")) {
        const datePart = rawReply.slice("appt_date_".length);
        mergedVars["selectedDate"] = datePart;
        mergedVars["appointment.date"] = datePart;
        replyAction = rawReply;
      } else if (/tomorrow/i.test(rawReply) || /\b(today|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(rawReply) || /^\d{4}-\d{2}-\d{2}$/.test(rawReply)) {
        const { parseNaturalDate } = await import("../appointment-booking/nlp-parser");
        const parsed = parseNaturalDate(rawReply);
        if (parsed) {
          const datePart = parsed.date;
          mergedVars["selectedDate"] = datePart;
          mergedVars["appointment.date"] = datePart;
          replyAction = `appt_date_${datePart}`;
        }
      }
    } else if (waitId === "n_show_slots") {
      if (rawReply.startsWith("appt_slot_")) {
        const slotPart = rawReply.slice("appt_slot_".length);
        mergedVars["selectedSlotId"] = slotPart;
        mergedVars["slotId"] = slotPart;
        replyAction = rawReply;
      } else {
        const slotsJson = mergedVars["_availableSlotsJson"] || ctx.vars?.["_availableSlotsJson"];
        if (slotsJson) {
          try {
            const slots = JSON.parse(slotsJson);
            if (Array.isArray(slots) && slots.length > 0) {
              const idx = parseInt(rawReply, 10);
              let matched = !isNaN(idx) && idx >= 1 && idx <= slots.length ? slots[idx - 1] : null;
              if (!matched) {
                matched =
                  slots.find((s: any) => {
                    const d = new Date(s.startTime);
                    const h12 = d
                      .toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
                      .toLowerCase();
                    return cleanLower.includes(h12) || cleanLower.includes(s.timeLabel?.toLowerCase() || "");
                  }) ?? null;
              }
              if (matched) {
                mergedVars["selectedSlotId"] = matched.slotId;
                mergedVars["slotId"] = matched.slotId;
                replyAction = `appt_slot_${matched.slotId}`;
              }
            }
          } catch {
            /* ignore parse error */
          }
        }
      }
    } else if (waitId === "n_show_details") {
      const isSeeSlots =
        rawReply === "btn_see_slots" ||
        rawReply.startsWith("appt_doctor_slots_") ||
        cleanLower === "see slots" ||
        cleanLower.includes("see slot") ||
        cleanLower === "slots" ||
        cleanLower === "slot" ||
        rawReply === "1";

      const isOtherDoctor =
        rawReply === "btn_other_doc" ||
        rawReply === "appt_doctors_list" ||
        rawReply === "btn_doctors_list" ||
        cleanLower.includes("other doctor") ||
        cleanLower.includes("other doc") ||
        cleanLower.includes("change doctor") ||
        cleanLower.includes("choose doctor") ||
        rawReply === "2";

      if (isSeeSlots) {
        if (rawReply.startsWith("appt_doctor_slots_")) {
          const docId = rawReply.slice("appt_doctor_slots_".length);
          mergedVars["selectedDoctorId"] = docId;
          mergedVars["doctor.id"] = docId;
        }
        replyAction = "btn_see_slots";
      } else if (isOtherDoctor) {
        replyAction = "btn_other_doc";
      } else {
        // User asked a question or sent text instead of choosing See Slots or Other Doctor
        await prisma.whatsAppFlowExecution.update({
          where: { id: row.id },
          data: {
            status: "CANCELLED",
            error: "Superseded by user inquiry: " + rawReply.slice(0, 80),
            completedAt: new Date(),
          },
        });
        continue;
      }
    } else if (waitId === "n_show_doctors") {
      if (rawReply.startsWith("appt_doctor_slots_")) {
        const docId = rawReply.slice("appt_doctor_slots_".length);
        mergedVars["selectedDoctorId"] = docId;
        mergedVars["doctor.id"] = docId;
        replyAction = "btn_see_slots";
      } else if (rawReply.startsWith("appt_doctor_")) {
        const docId = rawReply.slice("appt_doctor_".length);
        mergedVars["selectedDoctorId"] = docId;
        mergedVars["doctor.id"] = docId;
        replyAction = rawReply;
      } else {
        const { resolveClinicDoctors } = await import("./appointment-nodes");
        const docs = await resolveClinicDoctors(input.tenant.clinicId);
        const docIdx = parseInt(rawReply, 10);
        let matched = !isNaN(docIdx) && docIdx >= 1 && docIdx <= docs.length ? docs[docIdx - 1] : null;
        if (!matched) {
          matched = docs.find((d: { name: string; id: string }) => {
            const parts = d.name.split(/\s+/);
            const firstName = parts[0] || "";
            const lastName = parts[parts.length - 1] || "";
            return (
              (firstName && new RegExp(`\\b${firstName}\\b`, "i").test(rawReply)) ||
              (lastName && new RegExp(`\\b${lastName}\\b`, "i").test(rawReply))
            );
          }) ?? null;
        }
        if (matched) {
          mergedVars["selectedDoctorId"] = matched.id;
          mergedVars["doctor.id"] = matched.id;
          replyAction = `appt_doctor_${matched.id}`;
        } else if (!rawReply.startsWith("appt_")) {
          // User asked a question or sent text instead of picking a doctor
          await prisma.whatsAppFlowExecution.update({
            where: { id: row.id },
            data: {
              status: "CANCELLED",
              error: "Superseded by user inquiry: " + rawReply.slice(0, 80),
              completedAt: new Date(),
            },
          });
          continue;
        }
      }
    } else if (waitId === "n_channel_choice") {
      const isCallChoice =
        /btn_ai_call/i.test(rawReply) ||
        /\b(call|phone|voice)\b/i.test(rawReply) ||
        cleanLower.includes("call") ||
        cleanLower.includes("phone") ||
        cleanLower.includes("voice") ||
        rawReply === "2";

      const isBookChoice =
        /btn_book_wa/i.test(rawReply) ||
        /\b(book|chat|whatsapp|message|text)\b/i.test(rawReply) ||
        cleanLower.includes("book") ||
        cleanLower.includes("chat") ||
        cleanLower.includes("whatsapp") ||
        rawReply === "1";

      if (isCallChoice) {
        replyAction = "btn_ai_call";
        mergedVars["bookingChannel"] = "CALL";
        mergedVars["channel_choice"] = "CALL";

        // Trigger Sarvam AI Outbound Call to the caller's phone
        let callerPhone =
          input.inboundVars?.["sender_phone"] ||
          input.inboundVars?.["contact_phone"] ||
          mergedVars["sender_phone"] ||
          mergedVars["contact_phone"] ||
          mergedVars["patient_phone"] ||
          "";

        let resolvedPatientName = mergedVars["patient_name"];
        const conv = await prisma.conversation.findUnique({
          where: { id: input.conversationId },
          include: { patient: { select: { firstName: true, lastName: true, phone: true, whatsappNumber: true } } },
        });

        if (!callerPhone && conv?.patient) {
          callerPhone = conv.patient.phone || conv.patient.whatsappNumber || "";
        }

        if (!resolvedPatientName || resolvedPatientName === "Valued Patient") {
          if (conv?.patient) {
            resolvedPatientName = `${conv.patient.firstName} ${conv.patient.lastName || ""}`.trim();
          } else if (callerPhone) {
            const phoneSearch = callerPhone.slice(-10);
            if (phoneSearch.length >= 8) {
              const p = await prisma.patient.findFirst({
                where: {
                  clinicId: input.tenant.clinicId,
                  OR: [
                    { phone: { contains: phoneSearch } },
                    { whatsappNumber: { contains: phoneSearch } },
                  ],
                },
                select: { firstName: true, lastName: true },
              });
              if (p) {
                resolvedPatientName = `${p.firstName} ${p.lastName || ""}`.trim();
              }
            }
          }
        }
        if (resolvedPatientName) {
          mergedVars["patient_name"] = resolvedPatientName;
          mergedVars["patient.name"] = resolvedPatientName;
        }

        console.log("[SARVAM OUTBOUND DISPATCH]", {
          callerPhone,
          patientName: resolvedPatientName || "Valued Patient",
          conversationId: input.conversationId,
        });

        if (callerPhone) {
          const { triggerSarvamOutboundCall } = await import("../appointment-booking/channels/voice");
          await triggerSarvamOutboundCall({
            phoneNumber: callerPhone,
            patientName: resolvedPatientName || undefined,
            clinicName: input.tenant.clinicName || "SmrkoMed",
            doctorName: "Dr. Ananya Rao",
          }).catch((err) => {
            console.error("[SARVAM OUTBOUND ERROR]", err);
          });
        }
      } else if (isBookChoice) {
        replyAction = "btn_book_wa";
        mergedVars["bookingChannel"] = "WHATSAPP";
        mergedVars["channel_choice"] = "WHATSAPP";
      } else {
        // User asked a question or sent text inquiry instead of picking Call or WhatsApp booking.
        // Cancel the waiting execution so general AI or menu can immediately answer their question!
        await prisma.whatsAppFlowExecution.update({
          where: { id: row.id },
          data: {
            status: "CANCELLED",
            error: "Superseded by user inquiry: " + rawReply.slice(0, 80),
            completedAt: new Date(),
          },
        });
        continue;
      }
    } else if (waitId === "n_ask_name" && rawReply && !rawReply.startsWith("appt_")) {
      mergedVars["patient_name"] = rawReply;
      mergedVars["patient.name"] = rawReply;
    } else if (waitId === "n_ask_couple" && rawReply && !rawReply.startsWith("appt_")) {
      mergedVars["partner_name"] = rawReply;
    }

    const branchCandidates = (waitId && replyAction) ? nextNodes(def, waitId, replyAction) : [];
    const nextId =
      (branchCandidates[0]?.id) ??
      ctx.waitNextNodeId ??
      (waitId ? nextNodes(def, waitId)[0]?.id : null) ??
      row.currentNodeId;

    console.log("[APPOINTMENT_EXECUTION_RESUME]", {
      clinicId: input.tenant.clinicId,
      executionId: row.id,
      currentNodeId: waitId,
      nextNodeId: nextId,
      rawReply,
      replyAction: replyAction ?? null,
      doctorId: mergedVars["doctor.id"] || mergedVars["selectedDoctorId"] || null,
      selectedDate: mergedVars["selectedDate"] || null,
      selectedSlotId: mergedVars["selectedSlotId"] || null,
    });

    await prisma.whatsAppFlowExecution.update({
      where: { id: row.id },
      data: {
        status: "PENDING",
        currentNodeId: nextId,
        resumeAt: null,
        error: null,
        context: mergeExecutionContext(ctx, {
          vars: mergedVars,
          waitKind: null,
          waitNextNodeId: null,
          lockedAt: null,
          lockToken: null,
          lockExpiresAt: null,
        }),
      },
    });

    try {
      const ran = await runExecution(input.tenant, row.id);
      resumed.push({ executionId: row.id, status: ran.status });
    } catch (err) {
      resumed.push({
        executionId: row.id,
        skipped: err instanceof Error ? err.message : "resume_failed",
      });
    }
  }

  return resumed;
}

/** Ensure settings row exists; respect clinic opt-out. Kill switch: WHATSAPP_AI_AUTO_REPLY=0. */
export async function ensureInboundAiEnabled(clinicId: string): Promise<boolean> {
  if (process.env["WHATSAPP_AI_AUTO_REPLY"] === "0") {
    console.log("[WhatsApp AI] disabled by WHATSAPP_AI_AUTO_REPLY=0");
    return false;
  }
  try {
    const row = await prisma.whatsAppClinicSettings.upsert({
      where: { clinicId },
      create: { clinicId, aiAutoReplyEnabled: true },
      update: {},
    });
    return row.aiAutoReplyEnabled;
  } catch (err) {
    console.error(
      "[WhatsApp AI] failed to load aiAutoReplyEnabled:",
      err instanceof Error ? err.message : err,
    );
    // Fail open so patients still get a reply when settings table has issues
    return true;
  }
}

type InboundPayload = {
  clinicId: string;
  conversationId: string;
  patientId?: string | null;
  contactPhone?: string | null;
  unmatched?: boolean;
  messageId: string;
  providerMessageId: string;
  messageType: string;
  messageText: string;
  mediaType?: string | null;
  mediaMimeType?: string | null;
  mediaCaption?: string | null;
  timestampIso: string;
  /** When true, AI already ran in the webhook — only run flows. */
  skipAi?: boolean;
};

/** Run Smrko AI auto-reply for one inbound patient message (background after webhook). */
export async function runInboundWhatsAppAi(input: InboundPayload) {
  console.log("[WhatsApp AI] inbound scheduled", {
    clinicId: input.clinicId,
    conversationId: input.conversationId,
    messageId: input.messageId,
  });

  const tenant = await clinicTenant(input.clinicId);
  if (!tenant) {
    console.error("[WhatsApp AI] clinic tenant missing", { clinicId: input.clinicId });
    return { skipped: true as const, reason: "clinic_not_found" };
  }

  const aiAllowed = await ensureInboundAiEnabled(input.clinicId);
  if (!aiAllowed) {
    console.log("[WhatsApp AI] inbound skipped — auto-reply OFF", {
      clinicId: input.clinicId,
      conversationId: input.conversationId,
      messageId: input.messageId,
    });
    return { skipped: true as const, reason: "Clinic AI auto-reply disabled" };
  }

  try {
    const { runWhatsAppAiPipeline } = await import("../whatsapp-ai/pipeline");
    // force:false — clinic toggle + human takeover must be respected for auto-reply.
    // Staff "Send AI reply now" uses force:true separately.
    const ai = await runWhatsAppAiPipeline({
      tenant,
      conversationId: input.conversationId,
      patientMessage: input.messageText || `(${input.messageType} message)`,
      trigger: "inbound",
      mode: "send",
      force: false,
      inboundMessageId: input.messageId,
    });
    console.log("[WhatsApp AI] inbound result", {
      clinicId: input.clinicId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      skipped: Boolean(ai.skipped),
      reason: ai.reason ?? null,
      handoff: Boolean(ai.handoff),
      sentMessageId: ai.messageId ?? null,
      interactionId: ai.interactionId ?? null,
      textPreview: String(ai.text ?? "").slice(0, 80),
    });
    return ai;
  } catch (err) {
    console.error("[WhatsApp AI] pipeline failed", {
      clinicId: input.clinicId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      error: err instanceof Error ? err.message : err,
    });
    return {
      skipped: true as const,
      reason: err instanceof Error ? err.message : "AI pipeline failed",
    };
  }
}

export async function handleInboundWhatsAppAutomation(input: InboundPayload) {
  console.log("[WhatsApp inbound] processing", {
    clinicId: input.clinicId,
    conversationId: input.conversationId,
    messageId: input.messageId,
    messageType: input.messageType,
    preview: (input.messageText ?? "").slice(0, 80),
  });

  const tenant = await clinicTenant(input.clinicId);
  if (!tenant) return { skipped: "clinic_not_found" as const };

  const coupleId = await resolveCoupleId(input.clinicId, input.patientId ?? null);
  const leadId = await resolveLeadId(input.clinicId, input.contactPhone ?? null);

  const vars = buildIncomingWhatsAppVars({
    clinicId: input.clinicId,
    clinicName: tenant.clinicName,
    conversationId: input.conversationId,
    patientId: input.patientId ?? null,
    coupleId,
    leadId,
    contactPhone: input.contactPhone,
    messageId: input.messageId,
    messageType: input.messageType,
    messageText: input.messageText,
    mediaType: input.mediaType ?? null,
    mediaMimeType: input.mediaMimeType ?? null,
    mediaCaption: input.mediaCaption ?? null,
    unmatched: input.unmatched ?? false,
    timestampIso: input.timestampIso,
  });

  // 1. Resume waiting executions first!
  const resumed = await resumeWaitForReplyExecutions({
    tenant,
    conversationId: input.conversationId,
    inboundVars: vars,
  }).catch((err) => {
    console.error(
      "[WhatsApp automation] resume wait-for-reply failed:",
      err instanceof Error ? err.message : err,
    );
    return [] as Awaited<ReturnType<typeof resumeWaitForReplyExecutions>>;
  });

  const hasResumedActive = resumed.some((r) => r.status && r.status !== "FAILED" && !r.skipped);
  if (hasResumedActive) {
    const { setConversationPendingAction } = await import("../appointments/whatsapp-booking");
    await setConversationPendingAction({
      clinicId: input.clinicId,
      conversationId: input.conversationId,
      action: null,
    }).catch(() => undefined);
    console.log("[WhatsApp inbound] active flow resumed, bypassing new dispatch and general AI", {
      resumed,
      conversationId: input.conversationId,
    });
    return { resumed, dispatched: null, ai: { skipped: true as const, reason: "flow_resumed" } };
  }

  // 1.2. Check for Interactive Main Menu trigger, greeting, or interactive menu action
  const cleanInboundText = input.messageText.trim().toLowerCase();
  const isMenuTrigger =
    cleanInboundText === "menu" ||
    cleanInboundText === "main_menu" ||
    cleanInboundText === "help" ||
    cleanInboundText === "options" ||
    cleanInboundText === "btn_menu" ||
    cleanInboundText === "more services" ||
    cleanInboundText.startsWith("menu_") ||
    /^(hi|hello|hey|namaste|start|good\s*(morning|afternoon|evening))$/i.test(cleanInboundText);

  if (isMenuTrigger) {
    const { handleMenuAction } = await import("../whatsapp-ai/menu");
    const menuResult: Awaited<ReturnType<typeof handleMenuAction>> = await handleMenuAction({
      tenant,
      conversationId: input.conversationId,
      contactPhone: input.contactPhone || "",
      actionIdOrText: input.messageText,
    }).catch((err) => {
      console.error("[WhatsApp inbound] menu handler error:", err);
      return { handled: false };
    });

    if (menuResult.handled) {
      console.log("[WhatsApp inbound] menu action handled", {
        conversationId: input.conversationId,
        action: menuResult.action,
      });
      return {
        resumed,
        dispatched: null,
        menu: menuResult,
        ai: { skipped: true as const, reason: "menu_action_handled" },
      };
    }
  }

  // 1.5. Check if contact is unregistered/unmatched and replying to registration
  if (input.unmatched || !input.patientId) {
    if (input.skipAi) {
      return { resumed, dispatched: null, ai: { skipped: true as const, reason: "already_ran_in_webhook" } };
    }

    const { tryHandleRegistrationMessage } = await import("../whatsapp-ai/registration");
    const regResult: Awaited<ReturnType<typeof tryHandleRegistrationMessage>> =
      await tryHandleRegistrationMessage({
        tenant,
        conversationId: input.conversationId,
        contactPhone: input.contactPhone || "",
        messageText: input.messageText,
      }).catch((err) => {
        console.error("[WhatsApp automation] registration handler error:", err);
        return { handled: false };
      });

    if (regResult.handled) {
      console.log("[WhatsApp inbound] unregistered contact registration handled", {
        conversationId: input.conversationId,
        registered: regResult.registered,
        patientId: regResult.patientId,
      });
      return {
        resumed,
        dispatched: null,
        registration: regResult,
        ai: { skipped: true as const, reason: "registration_handled" },
      };
    }

    // Unregistered contact message didn't contain registration data (e.g. "Hi", "Appointment", inquiry).
    // Route directly to AI to explain they are not yet registered, prompt for registration, and answer queries.
    // Do NOT trigger automated flows that create ghost appointments without patient records.
    console.log("[WhatsApp inbound] unregistered contact — routing to registration AI", {
      conversationId: input.conversationId,
      phone: input.contactPhone,
    });
    const ai = input.skipAi
      ? { skipped: true as const, reason: "already_ran_in_webhook" }
      : await runInboundWhatsAppAi(input);
    return { resumed, dispatched: null, ai };
  }

  // 2. Check if this is an appointment intent or interactive appointment button
  const { classifyPatientIntent, isAppointmentRelatedIntent } = await import("../whatsapp-ai/intent");
  const intentResult = classifyPatientIntent(input.messageText);
  const isApptIntent =
    input.messageText.startsWith("appt_") ||
    input.messageText.startsWith("btn_") ||
    isAppointmentRelatedIntent(intentResult.intent);

  // 3. Dispatch INCOMING_WHATSAPP trigger (filters appointment flows based on isApptIntent)
  const dispatched = await dispatchWhatsAppTrigger({
    tenant,
    triggerType: "INCOMING_WHATSAPP",
    triggerEventId: `wa_in_${input.providerMessageId}`,
    patientId: input.patientId ?? null,
    coupleId,
    conversationId: input.conversationId,
    vars: {
      ...vars,
      detected_intent: intentResult.intent,
      is_appointment_intent: isApptIntent ? "true" : "false",
    },
    isAppointmentIntent: isApptIntent,
  }).catch((err) => {
    console.error(
      "[WhatsApp automation] INCOMING_WHATSAPP dispatch failed:",
      err instanceof Error ? err.message : err,
    );
    return { matched: 0, results: [] };
  });

  // 4. Check if an active automation flow started
  const activeFlowStarted = (dispatched.results ?? []).some((r) => r.executionId && !r.error);

  const routingDecision = activeFlowStarted
    ? "APPOINTMENT_FLOW"
    : intentResult.intent === "APPOINTMENT_CANCEL"
      ? "CANCELLATION_FLOW"
      : intentResult.intent === "APPOINTMENT_RESCHEDULE"
        ? "RESCHEDULE_FLOW"
        : intentResult.intent === "APPOINTMENT_BOOKING"
          ? "APPOINTMENT_FLOW"
          : "GENERIC_AI";

  console.log("[WHATSAPP ROUTING]", {
    messageId: input.messageId,
    conversationId: input.conversationId,
    patientId: input.patientId ?? null,
    detectedIntent: intentResult.intent,
    executionState: "IDLE",
    routingDecision,
  });

  if (activeFlowStarted || (isApptIntent && (dispatched.matched ?? 0) > 0)) {
    console.log("[WhatsApp inbound] automation flow active/started for appointment intent, bypassing generic AI", {
      isApptIntent,
      activeFlowStarted,
      intent: intentResult.intent,
    });
    return { resumed, dispatched, ai: { skipped: true as const, reason: "flow_active_or_appointment_intent" } };
  }

  // 5. Fallback to general AI auto-reply only when no automation is active
  const ai = input.skipAi
    ? { skipped: true as const, reason: "already_ran_in_webhook" }
    : await runInboundWhatsAppAi(input);

  return { resumed, dispatched, ai };
}

/**
 * Fire-and-forget inbound AI + automation.
 * Must respect `skipAi` — hardcoding true previously dropped all AI retries when
 * the webhook await timed out or Meta aborted the request.
 */
export function scheduleInboundWhatsAppAutomation(
  input: InboundPayload & { skipAi?: boolean },
) {
  const skipAi = Boolean(input.skipAi);
  console.log("[WhatsApp AI] inbound scheduled", {
    conversationId: input.conversationId,
    messageId: input.messageId,
    skipAi,
  });
  scheduleBackground(async () => {
    await handleInboundWhatsAppAutomation({ ...input, skipAi });
  });
}

/** Shared Care Loop → automation dispatch helper. */
export async function dispatchCareLoopTrigger(input: {
  tenant: TenantContext;
  triggerType:
    | "CARE_TASK_CREATED"
    | "CARE_TASK_ASSIGNED"
    | "CARE_TASK_COMPLETED"
    | "CARE_LOOP_STAGE_CHANGED"
    | "CARE_LOOP_ESCALATED"
    | "CARE_TASK_DUE"
    | "CARE_TASK_OVERDUE";
  triggerEventId: string;
  coupleId?: string | null;
  patientId?: string | null;
  vars?: Record<string, string>;
}) {
  return dispatchWhatsAppTrigger({
    tenant: input.tenant,
    triggerType: input.triggerType,
    triggerEventId: input.triggerEventId,
    ...(input.coupleId != null ? { coupleId: input.coupleId } : {}),
    ...(input.patientId != null ? { patientId: input.patientId } : {}),
    ...(input.vars ? { vars: input.vars } : {}),
  });
}
