/**
 * WhatsApp Self-Service Interactive Menu (Namma Metro Style)
 * Provides Bangalore Namma Metro-inspired interactive list / button menu
 * for checking appointments, live doctor availability slots, clinic services,
 * and care coordinator assistance.
 */

import type { TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import {
  sendWhatsAppAiSessionText,
  sendWhatsAppInteractiveList,
  sendWhatsAppInteractiveButtons,
} from "../../integrations/providers/whatsapp/messaging";
import { getClinicDoctors, getDoctorDaySlots, getUpcomingDates } from "../appointment-booking/slot-engine";

export const MENU_ACTIONS = {
  CARE_LOOP: "menu_care_loop",
  BOOK_APPOINTMENT: "menu_book_appt",
  MY_APPOINTMENTS: "menu_my_appts",
  DOCTOR_SLOTS: "menu_doc_slots",
  SERVICES: "menu_services",
  DOCTORS: "menu_doctors",
  TIMINGS: "menu_timings",
  COORDINATOR: "menu_coordinator",
  REGISTER: "menu_register",
  FAQS: "menu_faqs",
} as const;

/**
 * Sends the Namma Metro-style main menu.
 * Dispatches a welcoming interactive buttons message (Message 1) followed by
 * the "More Services" interactive list sheet (Message 2), exactly like Namma Metro BMRCL.
 * Falls back to clean emoji text menu if client does not support interactive messages.
 */
export async function sendMainMenu(
  tenant: TenantContext,
  conversationId: string,
  options?: { customHeader?: string; customBody?: string },
): Promise<{ success: boolean; fallbackText?: string }> {
  const clinic = await prisma.clinic.findFirst({
    where: { id: tenant.clinicId },
    select: { name: true, phone: true, city: true },
  });
  const clinicName = clinic?.name ?? tenant.clinicName ?? "ABC Fertility Centre";

  const greetingBody =
    options?.customBody ||
    `😃 Hello!\n\nI am *Smrko*, your care assistant from *${clinicName}* 🏥\n\nI can help you check live doctor appointments, view available slots, explore fertility services, and much more!\n\nType your queries or choose one of the options below for me to assist you 👇`;

  let sentAnyInteractive = false;

  // 1. Primary Message: Welcome + 3 Quick Reply Buttons (Namma Metro Top Buttons)
  // Quick Button 1 is the dedicated IVF Care Loop button as requested!
  try {
    await sendWhatsAppInteractiveButtons(tenant, {
      conversationId,
      body: greetingBody,
      footer: `${clinicName} • Smart Care`,
      buttons: [
        { id: MENU_ACTIONS.CARE_LOOP, title: "🧬 IVF Care Loop" },
        { id: MENU_ACTIONS.BOOK_APPOINTMENT, title: "📅 Book Appt" },
        { id: MENU_ACTIONS.DOCTOR_SLOTS, title: "👩‍⚕️ Doctor Slots" },
      ],
    });
    sentAnyInteractive = true;
  } catch (err) {
    console.log("[WhatsApp Menu] buttons send notice:", err instanceof Error ? err.message : err);
  }

  // 2. Secondary Message: "Please select below for more services:" + More Services Interactive List (Bottom sheet)
  const sections = [
    {
      title: "🧬 Care & Journey",
      rows: [
        {
          id: MENU_ACTIONS.CARE_LOOP,
          title: "🧬 IVF Care Journey",
          description: "Active stage, next action & protocol",
        },
        {
          id: MENU_ACTIONS.MY_APPOINTMENTS,
          title: "📋 My Appointments",
          description: "View scheduled visits & status",
        },
        {
          id: MENU_ACTIONS.COORDINATOR,
          title: "📞 Care Coordinator",
          description: "Speak with clinic care team",
        },
      ],
    },
    {
      title: "🏥 Clinic & Services",
      rows: [
        {
          id: MENU_ACTIONS.SERVICES,
          title: "🔬 Fertility Treatments",
          description: "IVF, ICSI, IUI & Assessment",
        },
        {
          id: MENU_ACTIONS.DOCTORS,
          title: "🩺 Our Specialists",
          description: "Doctor bios & experience",
        },
        {
          id: MENU_ACTIONS.TIMINGS,
          title: "📍 Location & Timings",
          description: "Clinic address & OPD hours",
        },
        {
          id: MENU_ACTIONS.REGISTER,
          title: "📝 Couple Registration",
          description: "Register or update profile",
        },
        {
          id: MENU_ACTIONS.FAQS,
          title: "❓ Clinic FAQs",
          description: "Common patient questions",
        },
      ],
    },
  ];

  try {
    await sendWhatsAppInteractiveList(tenant, {
      conversationId,
      body: "Please select below for more services:",
      buttonLabel: "More Services",
      footerText: "Tap to select an item",
      sections,
    });
    sentAnyInteractive = true;
  } catch (err) {
    console.log("[WhatsApp Menu] list send notice:", err instanceof Error ? err.message : err);
  }

  // 3. If neither interactive payload succeeded (e.g. tests or client unsupported), provide text fallback
  if (!sentAnyInteractive) {
    const textMenu = formatTextMenu({
      clinicName,
      customHeader: options?.customHeader,
      customBody: options?.customBody,
    });
    await sendWhatsAppAiSessionText(tenant, {
      conversationId,
      body: textMenu,
    }).catch(() => undefined);
    return { success: true, fallbackText: textMenu };
  }

  return { success: true };
}

export function formatTextMenu(options: {
  clinicName: string;
  customHeader?: string | undefined;
  customBody?: string | undefined;
}): string {
  const { clinicName, customHeader, customBody } = options;
  let text = customHeader ? `*${customHeader}*\n\n` : `🏥 *${clinicName} — Digital Care Desk*\n\n`;
  text += (customBody || "How can we assist you today? Reply with a number (1-9):") + "\n\n";
  text += `*Care Loop & Appointments*\n`;
  text += `1️⃣ 🧬 *IVF Care Loop* (Active stage, next action & tasks)\n`;
  text += `2️⃣ 📅 *Book Consultation* (Schedule an appointment)\n`;
  text += `3️⃣ 📋 *My Appointments* (View your scheduled visits)\n`;
  text += `4️⃣ 👩‍⚕️ *Available Doctor Slots* (View open times this week)\n\n`;
  text += `*Clinic & Services*\n`;
  text += `5️⃣ 🔬 *Fertility Treatments* (IVF, ICSI, IUI & Assessment)\n`;
  text += `6️⃣ 🩺 *Our Doctors* (Specialist bios & experience)\n`;
  text += `7️⃣ 📍 *Location & Timings* (Address & OPD hours)\n\n`;
  text += `*Care Team & Account*\n`;
  text += `8️⃣ 📞 *Speak with Care Coordinator*\n`;
  text += `9️⃣ 📝 *Couple Registration / Update Profile*\n\n`;
  text += `_Reply with 1 to 9, or type your question anytime!_`;
  return text;
}

export type MenuActionResult = {
  handled: boolean;
  action?: string | undefined;
  responseText?: string | undefined;
};

/**
 * Handle user action triggered via interactive list/button click or text shortcut
 */
export async function handleMenuAction(input: {
  tenant: TenantContext;
  conversationId: string;
  contactPhone: string;
  actionIdOrText: string;
}): Promise<MenuActionResult> {
  const clean = input.actionIdOrText.trim().toLowerCase();

  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, clinicId: input.tenant.clinicId },
    select: {
      id: true,
      patientId: true,
      coupleId: true,
      unmatched: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  });
  if (!conversation) return { handled: false };

  const clinic = await prisma.clinic.findFirst({
    where: { id: input.tenant.clinicId },
    select: { name: true, phone: true, address: true, city: true, slug: true },
  });
  const clinicName = clinic?.name ?? input.tenant.clinicName ?? "ABC Fertility Centre";

  // Check if user requested the Main Menu itself or greeted
  if (
    clean === "menu" ||
    clean === "main_menu" ||
    clean === "help" ||
    clean === "start" ||
    clean === "btn_menu" ||
    clean === "options" ||
    clean === "more services" ||
    /^(hi|hello|hey|namaste|good\s*(morning|afternoon|evening))$/i.test(clean)
  ) {
    const res = await sendMainMenu(input.tenant, input.conversationId);
    return { handled: true, action: "MAIN_MENU", responseText: res.fallbackText };
  }

  // 0. Dedicated IVF Care Loop Journey & Next Action
  if (
    clean === MENU_ACTIONS.CARE_LOOP ||
    clean === "menu_care_loop" ||
    clean === "btn_careloop" ||
    clean === "1" ||
    clean.startsWith("careloop_") ||
    clean === "careloop" ||
    clean === "care loop" ||
    clean === "ivf" ||
    clean === "stage" ||
    clean === "next step" ||
    clean === "next action" ||
    /\b(ivf|stage|next\s*step|next\s*action|care\s*loop|careloop|my\s*protocol|my\s*journey|treatment\s*journey|current\s*stage)\b/i.test(clean) ||
    clean === "done" ||
    clean === "completed" ||
    clean === "mark done"
  ) {
    return handleCareLoopMenuAction(input);
  }

  // 1. My Appointments
  if (
    clean === MENU_ACTIONS.MY_APPOINTMENTS ||
    clean === "3" ||
    clean === "2" ||
    /\b(my\s*app(ointment)?s?|check\s*app(ointment)?s?|existing\s*app(ointment)?s?)\b/i.test(clean)
  ) {
    const normalizedPhone = input.contactPhone.replace(/\s+/g, "");
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId: input.tenant.clinicId,
        OR: [
          ...(conversation.coupleId ? [{ coupleId: conversation.coupleId }] : []),
          ...(conversation.patientId
            ? [
                { couple: { primaryPatientId: conversation.patientId } },
                { couple: { partnerPatientId: conversation.patientId } },
              ]
            : []),
          { lead: { phone: normalizedPhone } },
        ],
      },
      orderBy: { startsAt: "asc" },
      take: 5,
    });

    let msg = "";
    if (appointments.length === 0) {
      if (conversation.patientId && !conversation.unmatched) {
        msg =
          `📋 *My Appointments — ${clinicName}*\n\n` +
          `You currently do not have any appointments scheduled.\n\n` +
          `Would you like to book a consultation with our fertility specialists?\n` +
          `• Reply *1* or *Book* to schedule an appointment.\n` +
          `• Reply *3* or *Slots* to view doctor availability.\n` +
          `• Type *MENU* to view options.`;
      } else {
        msg =
          `📋 *My Appointments — ${clinicName}*\n\n` +
          `We don't see any appointments linked to this mobile number.\n\n` +
          `To schedule your first consultation with our team:\n` +
          `• Reply *Book* or *Register* to get started in 1 minute.\n` +
          `• Type *MENU* to view all services.`;
      }
    } else {
      const now = new Date();
      const upcoming = appointments.filter((a) => new Date(a.startsAt) >= new Date(now.getTime() - 2 * 3600_000));
      const past = appointments.filter((a) => new Date(a.startsAt) < new Date(now.getTime() - 2 * 3600_000));

      msg = `📋 *Your Appointments at ${clinicName}:*\n\n`;
      if (upcoming.length > 0) {
        msg += `*Upcoming Consultations:*\n`;
        for (const appt of upcoming) {
          const d = new Date(appt.startsAt);
          const dateStr = d.toLocaleDateString("en-IN", {
            timeZone: "UTC",
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const timeStr = d.toLocaleTimeString("en-IN", {
            timeZone: "UTC",
            hour: "2-digit",
            minute: "2-digit",
          });
          const doc = appt.doctorName || "Fertility Specialist";
          const statusIcon = appt.status === "CONFIRMED" ? "✅" : "⏳";
          msg += `🗓️ *${dateStr} at ${timeStr}*\n`;
          msg += `   👩‍⚕️ Specialist: ${doc}\n`;
          msg += `   🏷️ Type: ${appt.type || "Consultation"}\n`;
          msg += `   ${statusIcon} Status: *${appt.status}*\n`;
          if (appt.room) msg += `   📍 Room: ${appt.room}\n`;
          msg += `\n`;
        }
        msg += `_To reschedule or cancel an appointment, simply reply "Reschedule" or "Cancel"._\n\n`;
      }

      if (past.length > 0 && upcoming.length === 0) {
        msg += `You have ${past.length} past appointment(s) on file.\n\n`;
        msg += `Reply *Book* to schedule a follow-up consultation.\n`;
      }

      msg += `Type *MENU* to return to the main menu.`;
    }

    await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(
      () => undefined,
    );
    return { handled: true, action: "MY_APPOINTMENTS", responseText: msg };
  }

  // 2. Available Doctor Slots
  if (
    clean === MENU_ACTIONS.DOCTOR_SLOTS ||
    clean === "3" ||
    /\b(available\s*slots?|doctor\s*slots?|slots?|open\s*times?|when\s*can\s*i\s*see)\b/i.test(clean)
  ) {
    const doctors = await getClinicDoctors(input.tenant.clinicId);
    const upcomingDates = getUpcomingDates(3);

    let msg = `👩‍⚕️ *Available Consultation Slots — ${clinicName}*\n\n`;
    msg += `Here are the upcoming open slots with our fertility specialists:\n\n`;

    let totalSlotsShown = 0;
    for (const doc of doctors.slice(0, 2)) {
      msg += `🩺 *${doc.displayName}*\n`;
      msg += `   _${doc.specialty} (${doc.experienceYears}+ yrs exp)_\n`;

      for (const dateIso of upcomingDates.slice(0, 2)) {
        const slots = await getDoctorDaySlots(input.tenant.clinicId, doc.id, dateIso);
        const freeSlots = slots.filter((s) => s.status === "available").slice(0, 4);

        const d = new Date(`${dateIso}T00:00:00`);
        const dayLabel = d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });

        if (freeSlots.length > 0) {
          const times = freeSlots.map((s) => s.timeLabel).join(", ");
          msg += `   📅 *${dayLabel}*: ${times}\n`;
          totalSlotsShown += freeSlots.length;
        } else {
          msg += `   📅 *${dayLabel}*: No open slots\n`;
        }
      }
      msg += `\n`;
    }

    msg += `Tap *Choose Doctor* below to select your specialist and view their open slots:\n\n`;
    msg += `Type *MENU* anytime to view the main menu.`;

    await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(
      () => undefined,
    );

    // Send interactive list dropdown so patient can select doctor and slots directly
    if (doctors.length > 0) {
      await sendWhatsAppInteractiveList(input.tenant, {
        conversationId: input.conversationId,
        body: "Choose your doctor 👩‍⚕️\n\nTap below to select a doctor and view their available consultation slots:",
        buttonLabel: "Choose Doctor",
        sections: [
          {
            title: "Available Specialists",
            rows: doctors.slice(0, 10).map((d) => ({
              id: `appt_doctor_${d.id}`,
              title: d.displayName.slice(0, 24),
              description: `${d.specialty} (${d.experienceYears}+ yrs)`.slice(0, 72),
            })),
          },
        ],
      }).catch((err) => {
        console.log("[WhatsApp Menu] doctor slots interactive list notice:", err instanceof Error ? err.message : err);
      });
    }

    return { handled: true, action: "DOCTOR_SLOTS", responseText: msg };
  }

  // 3. Book Consultation / Appointment
  if (
    clean === MENU_ACTIONS.BOOK_APPOINTMENT ||
    clean === "1" ||
    clean === "btn_book_wa" ||
    clean === "btn_ai_call" ||
    clean === "book" ||
    clean === "book appointment" ||
    clean === "appointment"
  ) {
    // If unregistered, route to couple registration
    if (!conversation.patientId || conversation.unmatched) {
      const { tryHandleRegistrationMessage } = await import("./registration");
      const reg = await tryHandleRegistrationMessage({
        tenant: input.tenant,
        conversationId: input.conversationId,
        contactPhone: input.contactPhone,
        messageText: "book appointment",
      });
      return { handled: true, action: "REGISTRATION_START", responseText: reg.responseMessage };
    }

    // Registered user booking consultation -> launch interactive appointment booking automation
    await prisma.whatsAppFlowExecution.updateMany({
      where: {
        clinicId: input.tenant.clinicId,
        conversationId: input.conversationId,
        status: "WAITING",
      },
      data: {
        status: "CANCELLED",
        error: "Superseded by user booking request",
        completedAt: new Date(),
      },
    });

    const patientName = conversation.patient
      ? `${conversation.patient.firstName} ${conversation.patient.lastName || ""}`.trim()
      : "Valued Patient";

    const { dispatchWhatsAppTrigger } = await import("../whatsapp-automation/triggers");
    const dispatched = await dispatchWhatsAppTrigger({
      tenant: input.tenant,
      triggerType: "INCOMING_WHATSAPP",
      triggerEventId: `wa_menu_book_${Date.now()}_${input.conversationId}`,
      patientId: conversation.patientId,
      coupleId: conversation.coupleId,
      conversationId: input.conversationId,
      vars: {
        message_text: "Appointment",
        message_content: "Appointment",
        sender_phone: input.contactPhone,
        contact_phone: input.contactPhone,
        patient_name: patientName,
        "patient.name": patientName,
        detected_intent: "APPOINTMENT_BOOKING",
        is_appointment_intent: "true",
      },
      isAppointmentIntent: true,
    }).catch((err) => {
      console.error("[WhatsApp Menu] dispatch booking error:", err);
      return { matched: 0, results: [] };
    });

    // Fallback: If no active flow triggered, send the interactive doctor dropdown list directly
    if (!dispatched || dispatched.matched === 0) {
      const doctors = await getClinicDoctors(input.tenant.clinicId);
      if (doctors.length > 0) {
        await sendWhatsAppInteractiveList(input.tenant, {
          conversationId: input.conversationId,
          body: "Choose your doctor 👩‍⚕️\n\nPlease select a specialist from the list below to view available slots and book your consultation:",
          buttonLabel: "Choose Doctor",
          sections: [
            {
              title: "Fertility Specialists",
              rows: doctors.slice(0, 10).map((d) => ({
                id: `appt_doctor_${d.id}`,
                title: d.displayName.slice(0, 24),
                description: `${d.specialty} (${d.experienceYears}+ yrs)`.slice(0, 72),
              })),
            },
          ],
        }).catch(() => undefined);
      }
    }

    return { handled: true, action: "BOOK_APPOINTMENT" };
  }

  // 4. Treatments & Services
  if (
    clean === MENU_ACTIONS.SERVICES ||
    clean === "4" ||
    /\b(fertility\s*treatments?|services?|ivf|iui|icsi|egg\s*freez(ing)?)\b/i.test(clean)
  ) {
    let msg = `🔬 *Fertility Treatments & Services — ${clinicName}*\n\n`;
    msg += `We provide advanced, evidence-based reproductive care tailored for couples:\n\n`;
    msg += `1️⃣ *IVF & ICSI (In Vitro Fertilization)*\n`;
    msg += `   State-of-the-art embryology lab, blastocyst culture, and personalized stimulation protocols.\n\n`;
    msg += `2️⃣ *IUI (Intrauterine Insemination)*\n`;
    msg += `   Natural and stimulated cycles with advanced semen preparation.\n\n`;
    msg += `3️⃣ *Comprehensive Couple Fertility Assessment*\n`;
    msg += `   Ovarian reserve testing (AMH), 3D pelvic ultrasound, semen analysis, and hormone profiling.\n\n`;
    msg += `4️⃣ *Advanced Male Fertility & Andrology*\n`;
    msg += `   DNA fragmentation index (DFI), surgical sperm retrieval (TESA/PESA), and lifestyle optimization.\n\n`;
    msg += `5️⃣ *Fertility Preservation*\n`;
    msg += `   Elective and medical egg, sperm, and embryo cryopreservation.\n\n`;
    msg += `📅 *Ready to begin?* Reply *Book* to schedule a consultation with our fertility specialists, or type *MENU*.`;

    await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(
      () => undefined,
    );
    return { handled: true, action: "SERVICES", responseText: msg };
  }

  // 5. Our Specialists / Doctors
  if (clean === MENU_ACTIONS.DOCTORS || clean === "5" || /\b(doctors?|specialists?|physicians?)\b/i.test(clean)) {
    const doctors = await getClinicDoctors(input.tenant.clinicId);
    let msg = `🩺 *Our Fertility Specialists — ${clinicName}*\n\n`;
    for (const doc of doctors.slice(0, 3)) {
      msg += `👩‍⚕️ *${doc.displayName}*\n`;
      msg += `   • Specialty: ${doc.specialty}\n`;
      msg += `   • Experience: ${doc.experienceYears}+ years\n`;
      if (doc.languages?.length) msg += `   • Languages: ${doc.languages.join(", ")}\n`;
      if (doc.bio) msg += `   • ${doc.bio}\n`;
      msg += `\n`;
    }
    msg += `Reply *Book* to schedule an appointment with any of our specialists, or type *MENU*.`;

    await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(
      () => undefined,
    );
    return { handled: true, action: "DOCTORS", responseText: msg };
  }

  // 6. Timings & Location
  if (
    clean === MENU_ACTIONS.TIMINGS ||
    clean === "6" ||
    /\b(timings?|hours?|location|address|directions?|open\s*hours?)\b/i.test(clean)
  ) {
    const address = clinic?.address || "Main Healthcare Blvd, Indiranagar";
    const city = clinic?.city || "Bangalore";
    const phone = clinic?.phone || "+91 80 4567 8900";

    let msg = `📍 *Clinic Location & OPD Timings — ${clinicName}*\n\n`;
    msg += `🏥 *Address:*\n${address}, ${city}\n\n`;
    msg += `⏰ *OPD Working Hours:*\n`;
    msg += `• Monday – Saturday: 09:00 AM – 06:30 PM\n`;
    msg += `• Sunday: 09:00 AM – 01:00 PM (Emergency & cycle monitoring only)\n\n`;
    msg += `📞 *Contact Phone:* ${phone}\n`;
    if (clinic?.slug) {
      msg += `🌐 *Online Booking:* https://smrkomed.com/book/${clinic.slug}\n\n`;
    }
    msg += `Type *MENU* anytime to view the main menu.`;

    await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(
      () => undefined,
    );
    return { handled: true, action: "TIMINGS", responseText: msg };
  }

  // 7. Care Coordinator Handoff
  if (
    clean === MENU_ACTIONS.COORDINATOR ||
    clean === "7" ||
    /\b(coordinator|human|staff|speak\s*to\s*(staff|human|doctor)|representative|call\s*me)\b/i.test(clean)
  ) {
    // Escalate conversation to human staff
    await prisma.conversation
      .update({
        where: { id: conversation.id },
        data: {
          status: "WAITING_STAFF",
          priority: "HIGH",
        },
      })
      .catch(() => undefined);

    const phone = clinic?.phone || "our front desk";
    const msg =
      `👩‍⚕️ *Care Coordinator Connected*\n\n` +
      `A clinical care coordinator at *${clinicName}* has been notified and will assist you shortly here on WhatsApp.\n\n` +
      `If you have urgent questions or prefer speaking over the phone, you may also call us directly at ${phone}.\n\n` +
      `_Type *MENU* anytime to return to automated options._`;

    await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(
      () => undefined,
    );
    return { handled: true, action: "COORDINATOR", responseText: msg };
  }

  // 8. Couple Registration
  if (
    clean === MENU_ACTIONS.REGISTER ||
    clean === "8" ||
    /\b(register|couple\s*registration|new\s*patient|sign\s*up)\b/i.test(clean)
  ) {
    const { tryHandleRegistrationMessage } = await import("./registration");
    const reg = await tryHandleRegistrationMessage({
      tenant: input.tenant,
      conversationId: input.conversationId,
      contactPhone: input.contactPhone,
      messageText: "register",
    });
    return { handled: true, action: "REGISTER", responseText: reg.responseMessage };
  }

  // 9. Clinic FAQs & Patient Guide
  if (
    clean === MENU_ACTIONS.FAQS ||
    clean === "menu_faqs" ||
    clean === "9" ||
    /\b(faqs?|frequently\s*asked|guidelines?|what\s*to\s*expect)\b/i.test(clean)
  ) {
    let msg = `❓ *Frequently Asked Questions — ${clinicName}*\n\n`;
    msg += `1️⃣ *When should we consult a fertility specialist?*\n`;
    msg += `   If you've been trying to conceive for 1 year (or 6 months if female partner is 35+), an early evaluation is strongly recommended.\n\n`;
    msg += `2️⃣ *Should both partners attend the first visit?*\n`;
    msg += `   Yes, fertility care is a journey for couples. Both partners' evaluations occur simultaneously for the most accurate diagnosis.\n\n`;
    msg += `3️⃣ *What documents should we bring?*\n`;
    msg += `   Any past medical reports, semen analysis, thyroid/hormone tests, or ultrasound scans.\n\n`;
    msg += `4️⃣ *How do I book or reschedule?*\n`;
    msg += `   Simply reply *Book* or *Reschedule* right here on WhatsApp, or select *Doctor Slots* from the menu!\n\n`;
    msg += `Type *MENU* anytime to view all options.`;

    await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(
      () => undefined,
    );
    return { handled: true, action: "FAQS", responseText: msg };
  }

  return { handled: false };
}

/**
 * Handle dedicated IVF Care Loop actions from WhatsApp.
 * Supports quick button clicks, task completion ("Mark Done"), task lists, and natural queries.
 */
export async function handleCareLoopMenuAction(input: {
  tenant: TenantContext;
  conversationId: string;
  contactPhone: string;
  actionIdOrText: string;
}): Promise<MenuActionResult> {
  const clean = input.actionIdOrText.trim().toLowerCase();

  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, clinicId: input.tenant.clinicId },
    select: {
      id: true,
      patientId: true,
      coupleId: true,
      aiPausedAt: true,
      handoffReason: true,
    },
  });
  if (!conversation) return { handled: false };

  // Clear stale AI pause or handoff if triggered accidentally
  if (conversation.aiPausedAt || conversation.handoffReason === "UNSAFE_AI_OUTPUT") {
    await prisma.conversation
      .update({
        where: { id: conversation.id },
        data: { aiPausedAt: null, handoffAt: null, handoffReason: null, status: "WAITING_PATIENT" },
      })
      .catch(() => undefined);
  }

  const clinic = await prisma.clinic.findFirst({
    where: { id: input.tenant.clinicId },
    select: { name: true, phone: true },
  });
  const clinicName = clinic?.name ?? input.tenant.clinicName ?? "ABC Fertility Centre";

  // Resolve couple ID
  let coupleId = conversation.coupleId;
  if (!coupleId && conversation.patientId) {
    const p = await prisma.patient.findFirst({
      where: { id: conversation.patientId },
      include: { primaryCouples: { select: { id: true } }, partnerCouples: { select: { id: true } } },
    });
    coupleId = p?.primaryCouples[0]?.id ?? p?.partnerCouples[0]?.id ?? null;
  }
  if (!coupleId && input.contactPhone) {
    const normalizedPhone = input.contactPhone.replace(/\s+/g, "");
    const p = await prisma.patient.findFirst({
      where: { clinicId: input.tenant.clinicId, phone: normalizedPhone },
      include: { primaryCouples: { select: { id: true } }, partnerCouples: { select: { id: true } } },
    });
    coupleId = p?.primaryCouples[0]?.id ?? p?.partnerCouples[0]?.id ?? null;
  }

  // Find active care plan
  const plan = coupleId
    ? await prisma.carePlan.findFirst({
        where: { clinicId: input.tenant.clinicId, coupleId, status: "ACTIVE" },
        include: {
          steps: {
            orderBy: { sortOrder: "asc" },
            include: { tasks: { orderBy: { createdAt: "asc" } } },
          },
          couple: {
            include: {
              primaryPatient: { select: { firstName: true, lastName: true } },
              partnerPatient: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      })
    : null;

  // Check for explicit stage command: "stage 7", "step 9", "trigger", etc.
  const stageMatch = clean.match(/(?:stage|step|test\s*stage)\s*(\d+)/i);
  let explicitStageNum: number | null = stageMatch && stageMatch[1] ? parseInt(stageMatch[1], 10) : null;
  if (!explicitStageNum) {
    if (/\b(lead|appointment\s*booking)\b/i.test(clean)) explicitStageNum = 1;
    else if (/\b(initial\s*consult|consultation)\b/i.test(clean)) explicitStageNum = 2;
    else if (/\b(workup|investigation)\b/i.test(clean)) explicitStageNum = 3;
    else if (/\b(ivf\s*decision|milestone)\b/i.test(clean)) explicitStageNum = 4;
    else if (/\b(consent|treatment\s*plan)\b/i.test(clean)) explicitStageNum = 5;
    else if (/\b(cycle\s*prep|preparation)\b/i.test(clean)) explicitStageNum = 6;
    else if (/\b(stimulation|injection|gonal)\b/i.test(clean)) explicitStageNum = 7;
    else if (/\b(monitoring|follicle\s*scan|scan\s*day)\b/i.test(clean)) explicitStageNum = 8;
    else if (/\b(trigger|hcg\s*shot)\b/i.test(clean)) explicitStageNum = 9;
    else if (/\b(opu|egg\s*retrieval|retrieval)\b/i.test(clean)) explicitStageNum = 10;
    else if (/\b(embryology|fertilization|blastocyst)\b/i.test(clean)) explicitStageNum = 11;
    else if (/\b(transfer|fet|embryo\s*transfer)\b/i.test(clean)) explicitStageNum = 12;
    else if (/\b(post\s*transfer|two\s*week\s*wait|2ww)\b/i.test(clean)) explicitStageNum = 13;
    else if (/\b(pregnancy\s*test|beta\s*hcg)\b/i.test(clean)) explicitStageNum = 14;
    else if (/\b(outcome|positive\s*result)\b/i.test(clean)) explicitStageNum = 15;
  }

  if (explicitStageNum && explicitStageNum >= 1 && explicitStageNum <= 15) {
    const { dispatchStageToWhatsApp } = await import("../care-loop/stage-dispatch");
    const res = await dispatchStageToWhatsApp(input.tenant, {
      stageNumber: explicitStageNum,
      phoneNumber: input.contactPhone,
      ...(coupleId ? { coupleId } : {}),
      syncPlanStage: true,
    });
    return {
      handled: true,
      action: `CARE_LOOP_STAGE_${explicitStageNum}_DISPATCHED`,
      responseText: res.sentText,
    };
  }

  if (!plan) {
    const msg =
      `🧬 *IVF Care Desk — ${clinicName}*\n\n` +
      `You are currently not enrolled in an active IVF treatment protocol on this number.\n\n` +
      `Would you like to start your fertility journey or consult our clinical team?\n` +
      `• Tap *Book Appt* below to schedule your consultation.\n` +
      `• Tap *Care Coordinator* to speak with our clinical care team.\n\n` +
      `💡 _Tip: You can test any IVF stage directly by replying *Step 1* through *Step 15*!_`;

    await sendWhatsAppInteractiveButtons(input.tenant, {
      conversationId: input.conversationId,
      body: msg,
      footer: `${clinicName} • Fertility Care`,
      buttons: [
        { id: MENU_ACTIONS.BOOK_APPOINTMENT, title: "📅 Book Appt" },
        { id: "stage_7_test", title: "💉 Test Step 7" },
        { id: MENU_ACTIONS.COORDINATOR, title: "📞 Coordinator" },
      ],
    }).catch(async () => {
      await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(() => undefined);
    });

    return { handled: true, action: "CARE_LOOP_NO_PLAN", responseText: msg };
  }

  const { computeNextAction, completeCareTask } = await import("../care-loop/engine");

  const coupleName =
    [plan.couple.primaryPatient?.firstName, plan.couple.partnerPatient?.firstName].filter(Boolean).join(" & ") ||
    "Patient";

  // Stage-specific button quick replies matching clinical images
  if (clean === "careloop_trigger_done") {
    const msg =
      `🎉 *Thank you!* ✅\n\n` +
      `Your trigger injection has been recorded at *9:32 PM*.\n\n` +
      `Your OPU (egg retrieval) is scheduled in *36 hours* at *${clinicName}*.\n` +
      `Strict fasting instructions: No food or fluids starting from midnight.\n\n` +
      `Our OT care team will keep you updated every step of the way.`;

    await sendWhatsAppInteractiveButtons(input.tenant, {
      conversationId: input.conversationId,
      body: msg,
      footer: "Step 9 Trigger • Confirmed",
      buttons: [
        { id: "careloop_opu_ready", title: "🏥 OPU Details" },
        { id: "menu_coordinator", title: "📞 Talk to Nurse" },
        { id: "main_menu", title: "🏠 Main Menu" },
      ],
    }).catch(async () => {
      await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(() => undefined);
    });
    return { handled: true, action: "TRIGGER_CONFIRMED", responseText: msg };
  }

  if (clean === "careloop_arrived") {
    const msg =
      `🏥 *Welcome to ${clinicName}!* 🌸\n\n` +
      `You have checked in at reception for your clinical procedure.\n\n` +
      `Our nurse will guide you through vital checks and pre-procedure preparation in Room 3.\n` +
      `Please relax, we are with you!`;

    await sendWhatsAppInteractiveButtons(input.tenant, {
      conversationId: input.conversationId,
      body: msg,
      footer: "Clinic Check-in • Confirmed",
      buttons: [
        { id: "careloop_opu_ready", title: "✅ I'm Ready" },
        { id: "menu_coordinator", title: "📞 Call Nurse" },
      ],
    }).catch(async () => {
      await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(() => undefined);
    });
    return { handled: true, action: "CLINIC_ARRIVED", responseText: msg };
  }

  // Case 1: User requested to mark current task as done / taken / confirmed / ready
  const isCompletionAction =
    clean === "careloop_mark_done" ||
    clean === "careloop_taken" ||
    clean === "careloop_confirmed" ||
    clean === "careloop_opu_ready" ||
    clean === "done" ||
    clean === "completed" ||
    clean === "mark done" ||
    clean === "taken" ||
    clean === "i've taken it" ||
    clean === "injected" ||
    clean === "confirmed" ||
    clean === "i'm ready" ||
    clean === "im ready";

  if (isCompletionAction) {
    const currentStep = plan.steps.find((s) => s.sortOrder === plan.currentStageIndex) ?? plan.steps[0];
    const pendingTask = currentStep?.tasks.find((t) => t.status === "WAITING" || t.status === "IN_PROGRESS");

    if (pendingTask) {
      await completeCareTask(input.tenant, pendingTask.id, {
        notes: `Completed by patient via WhatsApp Care Loop (${input.actionIdOrText})`,
        replyText: input.actionIdOrText,
        source: "WHATSAPP",
      }).catch((err) => {
        console.error("[WhatsApp CareLoop] task completion error:", err);
      });

      // Refetch updated plan
      const updatedPlan = await prisma.carePlan.findUnique({
        where: { id: plan.id },
        include: {
          steps: { orderBy: { sortOrder: "asc" }, include: { tasks: { orderBy: { createdAt: "asc" } } } },
        },
      });

      const nextActionInfo = await computeNextAction(input.tenant, plan.id).catch(() => ({
        nextAction: "Continue with treatment protocol",
      }));

      const stageAdvanced = (updatedPlan?.currentStageIndex ?? 0) > plan.currentStageIndex;

      let msg = "";
      if (stageAdvanced) {
        msg =
          `🎉 *Stage Completed!* 🌟\n\n` +
          `You have completed all requirements for:\n` +
          `*${plan.currentStageName}*\n\n` +
          `🚀 *Advancing to Next Stage:*\n` +
          `*${updatedPlan?.currentStageName}*\n\n` +
          `👉 *Next Action:*\n` +
          `*${nextActionInfo.nextAction}*\n\n` +
          `Our clinical team has been updated in real-time. Keep up the great work!`;

        await sendWhatsAppInteractiveButtons(input.tenant, {
          conversationId: input.conversationId,
          body: msg,
          footer: "IVF Care Loop • Stage Advanced",
          buttons: [
            { id: "careloop_mark_done", title: "✅ Mark Next Done" },
            { id: "careloop_view_tasks", title: "📋 Stage Tasks" },
            { id: "main_menu", title: "🏠 Main Menu" },
          ],
        }).catch(async () => {
          await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(() => undefined);
        });
      } else {
        const curStepTasks = updatedPlan?.steps.find((s) => s.sortOrder === updatedPlan.currentStageIndex)?.tasks ?? [];
        const remaining = curStepTasks.filter((t) => t.status === "WAITING" || t.status === "IN_PROGRESS").length;

        msg =
          `✅ *Action Logged Successfully!*\n\n` +
          `*${pendingTask.title}* has been confirmed.\n\n` +
          `📍 *Current Stage:* *${updatedPlan?.currentStageName}*\n` +
          `⏳ *Remaining in Stage:* ${remaining} item(s)\n\n` +
          `👉 *Next Action:*\n` +
          `*${nextActionInfo.nextAction}*\n\n` +
          `_Tap below when you complete your next step._`;

        await sendWhatsAppInteractiveButtons(input.tenant, {
          conversationId: input.conversationId,
          body: msg,
          footer: "IVF Care Loop • Progress Saved",
          buttons: [
            { id: "careloop_mark_done", title: "✅ Mark Done" },
            { id: "careloop_view_tasks", title: "📋 Stage Tasks" },
            { id: "main_menu", title: "🏠 Main Menu" },
          ],
        }).catch(async () => {
          await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(() => undefined);
        });
      }

      return { handled: true, action: "CARE_LOOP_TASK_COMPLETED", responseText: msg };
    }
  }

  // Case 2: User logging symptoms or asking about side effects (Empathetic guardrail)
  if (
    clean === "careloop_symptoms" ||
    /\b(symptom|cramp|cramping|spotting|bleeding|pain|fever|swelling|nausea)\b/i.test(clean)
  ) {
    const msg =
      `🌸 *Care Team Clinical Check-in*\n\n` +
      `We understand going through IVF brings noticeable bodily changes. Mild cramping or slight spotting can occur following injections or procedures.\n\n` +
      `⚠️ *If you experience any of the following:*\n` +
      `• Heavy bright red bleeding (soaking a pad in 1-2 hours)\n` +
      `• Sharp or escalating pelvic pain\n` +
      `• High fever (above 100.4°F / 38°C)\n` +
      `• Sudden abdominal distension or severe vomiting\n\n` +
      `Please contact our emergency clinic helpline directly at *${clinic?.phone ?? "+91 80 4000 1200"}*.\n\n` +
      `Our care coordinator and clinical team have also been alerted to check on you.`;

    await sendWhatsAppInteractiveButtons(input.tenant, {
      conversationId: input.conversationId,
      body: msg,
      footer: `${clinicName} • Clinical Support`,
      buttons: [
        { id: MENU_ACTIONS.COORDINATOR, title: "📞 Call Coordinator" },
        { id: MENU_ACTIONS.CARE_LOOP, title: "🧬 IVF Care Loop" },
        { id: "main_menu", title: "🏠 Main Menu" },
      ],
    }).catch(async () => {
      await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(() => undefined);
    });

    return { handled: true, action: "CARE_LOOP_SYMPTOMS", responseText: msg };
  }

  // Case 3: Upload Report / Lab Documents
  if (
    clean === "careloop_upload" ||
    clean === "careloop_report" ||
    /\b(upload|lab report|scan report|upload document)\b/i.test(clean)
  ) {
    const msg =
      `📄 *Report & Document Ingestion*\n\n` +
      `You can upload your test reports, ultrasound scans, or diagnostic documents directly here on WhatsApp! 📎\n\n` +
      `Simply attach the PDF or send a clear photo of the report pages.\n` +
      `Our clinical system will securely attach it to your medical records for Dr. review.`;

    await sendWhatsAppInteractiveButtons(input.tenant, {
      conversationId: input.conversationId,
      body: msg,
      footer: `${clinicName} • Document Desk`,
      buttons: [
        { id: MENU_ACTIONS.CARE_LOOP, title: "🧬 IVF Care Loop" },
        { id: MENU_ACTIONS.COORDINATOR, title: "📞 Coordinator" },
        { id: "main_menu", title: "🏠 Main Menu" },
      ],
    }).catch(async () => {
      await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(() => undefined);
    });

    return { handled: true, action: "CARE_LOOP_UPLOAD_GUIDE", responseText: msg };
  }

  // Case 4: User requested to view all tasks in current stage
  if (clean === "careloop_view_tasks" || clean === "tasks" || clean === "all tasks") {
    const currentStep = plan.steps.find((s) => s.sortOrder === plan.currentStageIndex) ?? plan.steps[0];
    const stepTasks = currentStep?.tasks ?? [];
    const nextActionInfo = await computeNextAction(input.tenant, plan.id).catch(() => ({
      nextAction: "Continue with treatment protocol",
    }));

    let taskList = "";
    for (const t of stepTasks) {
      const icon = t.status === "COMPLETED" ? "✅" : t.status === "IN_PROGRESS" ? "🔄" : "⏳";
      taskList += `${icon} *${t.title}*\n   _${t.status}_\n`;
    }

    const msg =
      `📋 *${plan.currentStageName}*\n` +
      `Couple: *${coupleName}*\n\n` +
      `*Stage Requirements:*\n${taskList || "No pending tasks listed."}\n` +
      `👉 *Next Action:*\n` +
      `*${nextActionInfo.nextAction}*`;

    await sendWhatsAppInteractiveButtons(input.tenant, {
      conversationId: input.conversationId,
      body: msg,
      footer: "IVF Care Loop • Stage Tasks",
      buttons: [
        { id: "careloop_mark_done", title: "✅ Mark Done" },
        { id: MENU_ACTIONS.CARE_LOOP, title: "🧬 IVF Care Loop" },
        { id: "main_menu", title: "🏠 Main Menu" },
      ],
    }).catch(async () => {
      await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(() => undefined);
    });

    return { handled: true, action: "CARE_LOOP_TASKS_VIEW", responseText: msg };
  }

  // Case 5: Default — IVF Care Loop Status Card with Stage-Tailored Interactive Buttons
  const nextActionInfo = await computeNextAction(input.tenant, plan.id).catch(() => ({
    nextAction: "Continue with treatment protocol",
  }));

  const currentStep = plan.steps.find((s) => s.sortOrder === plan.currentStageIndex) ?? plan.steps[0];
  const stepTasks = currentStep?.tasks ?? [];
  const pendingTasks = stepTasks.filter((t) => t.status === "WAITING" || t.status === "IN_PROGRESS");
  const completedCount = stepTasks.length - pendingTasks.length;

  const stageName = plan.currentStageName || "";

  // Dynamic buttons tailored to the 15 specification stages
  let stageButtons = [
    { id: "careloop_mark_done", title: "✅ Mark Done" },
    { id: "careloop_view_tasks", title: "📋 Stage Tasks" },
    { id: MENU_ACTIONS.COORDINATOR, title: "📞 Coordinator" },
  ];

  if (stageName.includes("Stimulation")) {
    stageButtons = [
      { id: "careloop_taken", title: "✅ Taken" },
      { id: "careloop_view_tasks", title: "📋 Stage Tasks" },
      { id: MENU_ACTIONS.COORDINATOR, title: "❓ Need Help" },
    ];
  } else if (stageName.includes("Trigger")) {
    stageButtons = [
      { id: "careloop_trigger_done", title: "✅ Injection Done" },
      { id: MENU_ACTIONS.COORDINATOR, title: "🚨 Emergency Call" },
      { id: "careloop_view_tasks", title: "📋 Instructions" },
    ];
  } else if (stageName.includes("Egg Retrieval") || stageName.includes("OPU")) {
    stageButtons = [
      { id: "careloop_opu_ready", title: "✅ I'm Ready" },
      { id: "careloop_arrived", title: "📍 I've Arrived" },
      { id: MENU_ACTIONS.COORDINATOR, title: "📞 Coordinator" },
    ];
  } else if (stageName.includes("Monitoring")) {
    stageButtons = [
      { id: "careloop_confirmed", title: "📅 Confirmed" },
      { id: "careloop_upload", title: "📤 Upload Scan" },
      { id: "careloop_view_tasks", title: "📋 Stage Tasks" },
    ];
  } else if (stageName.includes("Embryology")) {
    stageButtons = [
      { id: "careloop_report", title: "📄 Lab Report" },
      { id: MENU_ACTIONS.COORDINATOR, title: "💬 Ask Doctor" },
      { id: "careloop_view_tasks", title: "📋 Next Steps" },
    ];
  } else if (stageName.includes("Transfer")) {
    stageButtons = [
      { id: "careloop_confirmed", title: "✅ Confirmed" },
      { id: "careloop_view_tasks", title: "📋 Guidelines" },
      { id: MENU_ACTIONS.COORDINATOR, title: "📞 Care Team" },
    ];
  } else if (stageName.includes("Post-Transfer") || stageName.includes("Luteal")) {
    stageButtons = [
      { id: "careloop_taken", title: "✅ Meds Taken" },
      { id: "careloop_symptoms", title: "🤒 Log Symptoms" },
      { id: "careloop_view_tasks", title: "📋 Care Guide" },
    ];
  } else if (stageName.includes("Pregnancy") || stageName.includes("Beta-hCG")) {
    stageButtons = [
      { id: "careloop_upload", title: "📤 Upload Beta-hCG" },
      { id: MENU_ACTIONS.BOOK_APPOINTMENT, title: "🏥 Book Lab" },
      { id: MENU_ACTIONS.COORDINATOR, title: "📞 Coordinator" },
    ];
  }

  const msg =
    `🧬 *IVF Care Loop — ${coupleName}*\n` +
    `🏥 *${clinicName}*\n\n` +
    `📍 *Active Stage:* *${plan.currentStageName}*\n` +
    `🏷️ *Protocol:* ${plan.name}\n\n` +
    `👉 *Next Action:*\n` +
    `*${nextActionInfo.nextAction}*\n\n` +
    `📋 *Stage Progress:* ${completedCount}/${stepTasks.length} completed\n` +
    (pendingTasks.length > 0
      ? pendingTasks.slice(0, 3).map((t) => `• ⏳ ${t.title}`).join("\n") + "\n\n"
      : "• ✨ All stage tasks completed!\n\n") +
    `💡 _Tap an action below to update your care team._`;

  await sendWhatsAppInteractiveButtons(input.tenant, {
    conversationId: input.conversationId,
    body: msg,
    footer: `${clinicName} • IVF Care Desk`,
    buttons: stageButtons,
  }).catch(async () => {
    await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(() => undefined);
  });

  return { handled: true, action: "CARE_LOOP_STATUS", responseText: msg };
}
