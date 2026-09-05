/**
 * Resolve natural-language replies against Conversation.pendingAction
 * (slot number, confirm, cancel keep).
 */

import type { TenantContext } from "@smrkomed/database";

import {
  bookAppointmentFromSlot,
  cancelAppointmentForWhatsApp,
  getConversationPendingAction,
  rescheduleAppointmentFromSlot,
  setConversationPendingAction,
  type PendingAction,
} from "../appointments/whatsapp-booking";
import { executePatientTool } from "./tools";

export type PendingResolution =
  | { handled: false }
  | {
      handled: true;
      text: string;
      booked?: boolean;
      cancelled?: boolean;
      rescheduled?: boolean;
      handoffRecommended?: boolean;
    };

function parseSlotIndex(message: string): number | null {
  const t = message.trim();
  const m = /^(?:option\s*)?(\d{1,2})\s*[.)]?$/i.exec(t);
  if (m) return Number(m[1]);
  return null;
}

function isAffirmative(message: string): boolean {
  return /^(yes|yep|yeah|confirm|book\s*it|ok|okay|sure|go\s*ahead)\s*[!.]*$/i.test(message.trim());
}

function isNegative(message: string): boolean {
  return /^(no|nope|cancel|keep|keep\s+it|never\s*mind|dont|don't)\s*[!.]*$/i.test(message.trim());
}

export async function tryResolvePendingAppointmentAction(input: {
  tenant: TenantContext;
  conversationId: string;
  patientId?: string | null;
  coupleId?: string | null;
  patientMessage: string;
}): Promise<PendingResolution> {
  const pending = await getConversationPendingAction({
    clinicId: input.tenant.clinicId,
    conversationId: input.conversationId,
  });
  if (!pending) return { handled: false };

  const msg = input.patientMessage.trim();

  if (pending.kind === "SLOT_CHOICE") {
    const idx = parseSlotIndex(msg);
    if (idx == null) {
      if (isNegative(msg)) {
        await setConversationPendingAction({
          clinicId: input.tenant.clinicId,
          conversationId: input.conversationId,
          action: null,
        });
        return {
          handled: true,
          text: "✦ Smrko AI\n\nOkay — I won't book that right now. Tell me if you'd like other times or to speak with our care team.",
        };
      }
      return { handled: false };
    }
    const chosen = pending.slots.find((s) => s.index === idx);
    if (!chosen) {
      return {
        handled: true,
        text: `✦ Smrko AI\n\nPlease reply with a number from 1 to ${pending.slots.length} to choose a slot.`,
      };
    }

    if (pending.purpose === "BOOK") {
      const result = await bookAppointmentFromSlot({
        tenant: input.tenant,
        conversationId: input.conversationId,
        patientId: input.patientId ?? null,
        coupleId: input.coupleId ?? null,
        slotId: chosen.slotId,
        idempotencyKey: `${pending.idempotencyKey}_book_${chosen.slotId}`,
      });
      await setConversationPendingAction({
        clinicId: input.tenant.clinicId,
        conversationId: input.conversationId,
        action: null,
      });
      if (!result.ok) {
        // Refresh slots
        await executePatientTool("getAvailableAppointmentSlots", {
          tenant: input.tenant,
          conversationId: input.conversationId,
          patientId: input.patientId ?? null,
          coupleId: input.coupleId ?? null,
        });
        return {
          handled: true,
          text:
            result.reason === "SLOT_CONFLICT" || result.reason === "SLOT_IN_PAST"
              ? "✦ Smrko AI\n\nThat appointment is no longer available. I've refreshed the latest times — reply with a new number, or say talk to staff if you need help."
              : "✦ Smrko AI\n\nI couldn't complete that booking safely. I'll connect you with our care team.",
          handoffRecommended: Boolean(result.handoffRecommended) || result.reason === "PATIENT_NOT_LINKED_TO_COUPLE",
        };
      }
      const when = new Date(result.startsAt).toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return {
        handled: true,
        booked: true,
        text: `✦ Smrko AI\n\nYour appointment is confirmed.\n\n${result.type}\n${when}${result.doctorName ? `\n${result.doctorName}` : ""}\n${input.tenant.clinicName}\n\nReply if you need to reschedule or cancel.`,
      };
    }

    if (pending.purpose === "RESCHEDULE" && pending.appointmentId) {
      const result = await rescheduleAppointmentFromSlot({
        tenant: input.tenant,
        conversationId: input.conversationId,
        appointmentId: pending.appointmentId,
        slotId: chosen.slotId,
        idempotencyKey: `${pending.idempotencyKey}_reschedule_${chosen.slotId}`,
      });
      await setConversationPendingAction({
        clinicId: input.tenant.clinicId,
        conversationId: input.conversationId,
        action: null,
      });
      if (!result.ok) {
        return {
          handled: true,
          text: "✦ Smrko AI\n\nThat time is no longer available. Please ask for new slots or talk to staff.",
          handoffRecommended: Boolean(result.handoffRecommended),
        };
      }
      const when = new Date(result.startsAt).toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return {
        handled: true,
        rescheduled: true,
        text: `✦ Smrko AI\n\nYour appointment has been rescheduled to ${when}.`,
      };
    }
  }

  if (pending.kind === "CANCEL_CONFIRM") {
    if (isAffirmative(msg)) {
      const result = await cancelAppointmentForWhatsApp({
        tenant: input.tenant,
        conversationId: input.conversationId,
        appointmentId: pending.appointmentId,
        idempotencyKey: pending.idempotencyKey,
      });
      await setConversationPendingAction({
        clinicId: input.tenant.clinicId,
        conversationId: input.conversationId,
        action: null,
      });
      if (!result.ok) {
        return {
          handled: true,
          text: "✦ Smrko AI\n\nI couldn't cancel that appointment. I'll connect you with our care team.",
          handoffRecommended: true,
        };
      }
      return {
        handled: true,
        cancelled: true,
        text: "✦ Smrko AI\n\nYour appointment has been cancelled. Tell me if you'd like to book a new time.",
      };
    }
    if (isNegative(msg)) {
      await setConversationPendingAction({
        clinicId: input.tenant.clinicId,
        conversationId: input.conversationId,
        action: null,
      });
      return {
        handled: true,
        text: "✦ Smrko AI\n\nOkay — I've kept your appointment as scheduled.",
      };
    }
  }

  return { handled: false };
}

export type { PendingAction };
