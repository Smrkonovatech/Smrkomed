/**
 * Resolve natural-language replies against Conversation.pendingAction
 * (slot number, confirm, cancel keep).
 */

import type { TenantContext } from "@smrkomed/database";

import {
  bookAppointmentFromSlot,
  cancelAppointmentForWhatsApp,
  formatSlotLabel,
  getConversationPendingAction,
  rescheduleAppointmentFromSlot,
  setConversationPendingAction,
  type PendingAction,
} from "../appointments/whatsapp-booking";
import { decodeSlotId } from "../appointments/availability";
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

const ORDINALS: Record<string, number> = {
  first: 1,
  "1st": 1,
  second: 2,
  "2nd": 2,
  third: 3,
  "3rd": 3,
  fourth: 4,
  "4th": 4,
  fifth: 5,
  "5th": 5,
  sixth: 6,
  "6th": 6,
  seventh: 7,
  "7th": 7,
  eighth: 8,
  "8th": 8,
  ninth: 9,
  "9th": 9,
  tenth: 10,
  "10th": 10,
};

function parseSlotIndex(message: string): number | null {
  const t = message.trim();
  const bare = /^(?:option\s*|#\s*)?(\d{1,2})\s*[.)]?$/i.exec(t);
  if (bare) return Number(bare[1]);
  const ordinal = /(?:^|\b)(?:the\s+)?(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th|seventh|7th|eighth|8th|ninth|9th|tenth|10th)(?:\s+one)?\b/i.exec(
    t,
  );
  if (ordinal) {
    const key = ordinal[1]!.toLowerCase();
    return ORDINALS[key] ?? null;
  }
  return null;
}

/** Match by clock time only when exactly one pending slot matches. */
function matchSlotByTimeLabel(
  message: string,
  slots: Array<{ index: number; slotId: string; label: string }>,
): { index: number; slotId: string; label: string } | "ambiguous" | null {
  const t = message.trim().toLowerCase();
  const timeRe =
    /\b((1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)|([01]?\d|2[0-3]):([0-5]\d))\b/i;
  const m = timeRe.exec(t);
  if (!m) return null;

  const matches = slots.filter((s) => {
    const decoded = decodeSlotId(s.slotId);
    if (!decoded) return false;
    const d = new Date(decoded.startMs);
    const label = s.label.toLowerCase();
    if (label.includes(m[0]!.toLowerCase().replace(/\s+/g, " "))) return true;
    // Compare 12h display fragments
    const h12 = d.toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
    return t.includes(h12) || label.includes(h12);
  });
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) return "ambiguous";
  return null;
}

function isAffirmative(message: string): boolean {
  return /^(yes|yep|yeah|confirm|book\s*it|ok|okay|sure|go\s*ahead)\s*[!.]*$/i.test(message.trim());
}

function isNegative(message: string): boolean {
  return /^(no|nope|cancel|keep|keep\s+it|never\s*mind|dont|don't)\s*[!.]*$/i.test(message.trim());
}

function confirmPrompt(kind: "BOOK" | "RESCHEDULE", label: string, clinicName: string): string {
  const verb = kind === "BOOK" ? "book" : "reschedule to";
  return `✦ Smrko AI\n\nPlease confirm your appointment:\n\n${label}\n${clinicName}\n\nWould you like to ${verb} this appointment?\n\nReply Yes to confirm, or No to choose another time.`;
}

async function refreshSlotsAfterConflict(input: {
  tenant: TenantContext;
  conversationId: string;
  patientId?: string | null;
  coupleId?: string | null;
}): Promise<string> {
  await executePatientTool("getAvailableAppointmentSlots", {
    tenant: input.tenant,
    conversationId: input.conversationId,
    patientId: input.patientId ?? null,
    coupleId: input.coupleId ?? null,
  });
  return "✦ Smrko AI\n\nThat appointment is no longer available. I've refreshed the latest times — reply with a new number, or say talk to staff if you need help.";
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

    let chosen = (() => {
      const idx = parseSlotIndex(msg);
      if (idx != null) return pending.slots.find((s) => s.index === idx) ?? null;
      return null;
    })();

    if (!chosen) {
      const byTime = matchSlotByTimeLabel(msg, pending.slots);
      if (byTime === "ambiguous") {
        return {
          handled: true,
          text: `✦ Smrko AI\n\nI found more than one matching time. Please reply with a number from 1 to ${pending.slots.length}.`,
        };
      }
      if (byTime) chosen = byTime;
    }

    if (!chosen) {
      // Ambiguous / unrelated while slots pending — ask clarification; do not mutate.
      if (/^\d+$/.test(msg) || /slot|time|option|prefer/i.test(msg)) {
        return {
          handled: true,
          text: `✦ Smrko AI\n\nPlease reply with a number from 1 to ${pending.slots.length} to choose a slot.`,
        };
      }
      return { handled: false };
    }

    const decoded = decodeSlotId(chosen.slotId);
    const label =
      chosen.label ||
      (decoded
        ? formatSlotLabel({
            startTime: new Date(decoded.startMs).toISOString(),
            doctorName: decoded.doctorName,
            appointmentType: decoded.appointmentType,
          })
        : chosen.slotId);

    if (pending.purpose === "BOOK") {
      await setConversationPendingAction({
        clinicId: input.tenant.clinicId,
        conversationId: input.conversationId,
        action: {
          kind: "BOOK_CONFIRM",
          slotId: chosen.slotId,
          idempotencyKey: `${pending.idempotencyKey}_book_${chosen.slotId}`,
          appointmentType: decoded?.appointmentType ?? "Consultation",
          doctorName: decoded?.doctorName ?? null,
          startTime: decoded ? new Date(decoded.startMs).toISOString() : new Date().toISOString(),
          durationMin: decoded?.durationMin ?? 30,
        },
      });
      return {
        handled: true,
        text: confirmPrompt("BOOK", label, input.tenant.clinicName),
      };
    }

    if (pending.purpose === "RESCHEDULE" && pending.appointmentId) {
      await setConversationPendingAction({
        clinicId: input.tenant.clinicId,
        conversationId: input.conversationId,
        action: {
          kind: "RESCHEDULE_CONFIRM",
          appointmentId: pending.appointmentId,
          slotId: chosen.slotId,
          idempotencyKey: `${pending.idempotencyKey}_reschedule_${chosen.slotId}`,
          startTime: decoded ? new Date(decoded.startMs).toISOString() : new Date().toISOString(),
          durationMin: decoded?.durationMin ?? 30,
          doctorName: decoded?.doctorName ?? null,
        },
      });
      return {
        handled: true,
        text: confirmPrompt("RESCHEDULE", label, input.tenant.clinicName),
      };
    }
  }

  if (pending.kind === "BOOK_CONFIRM") {
    if (isAffirmative(msg)) {
      const result = await bookAppointmentFromSlot({
        tenant: input.tenant,
        conversationId: input.conversationId,
        patientId: input.patientId ?? null,
        coupleId: input.coupleId ?? null,
        slotId: pending.slotId,
        idempotencyKey: pending.idempotencyKey,
      });
      await setConversationPendingAction({
        clinicId: input.tenant.clinicId,
        conversationId: input.conversationId,
        action: null,
      });
      if (!result.ok) {
        if (result.reason === "SLOT_CONFLICT" || result.reason === "SLOT_IN_PAST") {
          return {
            handled: true,
            text: await refreshSlotsAfterConflict(input),
          };
        }
        return {
          handled: true,
          text: "✦ Smrko AI\n\nI couldn't complete that booking safely. I'll connect you with our care team.",
          handoffRecommended:
            Boolean(result.handoffRecommended) || result.reason === "PATIENT_NOT_LINKED_TO_COUPLE",
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
    if (isNegative(msg)) {
      await setConversationPendingAction({
        clinicId: input.tenant.clinicId,
        conversationId: input.conversationId,
        action: null,
      });
      return {
        handled: true,
        text: "✦ Smrko AI\n\nOkay — I didn't book that time. Tell me if you'd like other available times.",
      };
    }
    return {
      handled: true,
      text: "✦ Smrko AI\n\nPlease reply Yes to confirm the booking, or No to cancel.",
    };
  }

  if (pending.kind === "RESCHEDULE_CONFIRM") {
    if (isAffirmative(msg)) {
      const result = await rescheduleAppointmentFromSlot({
        tenant: input.tenant,
        conversationId: input.conversationId,
        appointmentId: pending.appointmentId,
        slotId: pending.slotId,
        idempotencyKey: pending.idempotencyKey,
      });
      await setConversationPendingAction({
        clinicId: input.tenant.clinicId,
        conversationId: input.conversationId,
        action: null,
      });
      if (!result.ok) {
        if (result.reason === "SLOT_CONFLICT" || result.reason === "SLOT_IN_PAST") {
          return {
            handled: true,
            text: await refreshSlotsAfterConflict(input),
          };
        }
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
    if (isNegative(msg)) {
      await setConversationPendingAction({
        clinicId: input.tenant.clinicId,
        conversationId: input.conversationId,
        action: null,
      });
      return {
        handled: true,
        text: "✦ Smrko AI\n\nOkay — I kept your previous appointment time. Tell me if you'd like other slots.",
      };
    }
    return {
      handled: true,
      text: "✦ Smrko AI\n\nPlease reply Yes to confirm the new time, or No to keep looking.",
    };
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
    return {
      handled: true,
      text: "✦ Smrko AI\n\nPlease reply Yes to cancel the appointment, or No to keep it.",
    };
  }

  return { handled: false };
}

export type { PendingAction };
