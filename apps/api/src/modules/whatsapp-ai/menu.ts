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
  try {
    await sendWhatsAppInteractiveButtons(tenant, {
      conversationId,
      body: greetingBody,
      footer: `${clinicName} • Smart Care`,
      buttons: [
        { id: MENU_ACTIONS.BOOK_APPOINTMENT, title: "📅 Book Appt" },
        { id: MENU_ACTIONS.DOCTOR_SLOTS, title: "👩‍⚕️ Doctor Slots" },
        { id: MENU_ACTIONS.MY_APPOINTMENTS, title: "📋 My Appts" },
      ],
    });
    sentAnyInteractive = true;
  } catch (err) {
    console.log("[WhatsApp Menu] buttons send notice:", err instanceof Error ? err.message : err);
  }

  // 2. Secondary Message: "Please select below for more services:" + More Services Interactive List (Bottom sheet)
  const sections = [
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
      ],
    },
    {
      title: "💬 Care & Profile",
      rows: [
        {
          id: MENU_ACTIONS.REGISTER,
          title: "📝 Couple Registration",
          description: "Register or update profile",
        },
        {
          id: MENU_ACTIONS.COORDINATOR,
          title: "📞 Care Coordinator",
          description: "Speak with clinic care team",
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
  text += `*Appointments & Booking*\n`;
  text += `1️⃣ 📅 *Book Consultation* (Schedule an appointment)\n`;
  text += `2️⃣ 📋 *My Appointments* (View your scheduled visits)\n`;
  text += `3️⃣ 👩‍⚕️ *Available Doctor Slots* (View open times this week)\n\n`;
  text += `*Clinic & Services*\n`;
  text += `4️⃣ 🔬 *Fertility Treatments* (IVF, ICSI, IUI & Assessment)\n`;
  text += `5️⃣ 🩺 *Our Doctors* (Specialist bios & experience)\n`;
  text += `6️⃣ 📍 *Location & Timings* (Address & OPD hours)\n\n`;
  text += `*Care Team & Account*\n`;
  text += `7️⃣ 📞 *Speak with Care Coordinator*\n`;
  text += `8️⃣ 📝 *Couple Registration / Update Profile*\n`;
  text += `9️⃣ ❓ *Clinic FAQs & Patient Guide*\n\n`;
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
    select: { id: true, patientId: true, coupleId: true, unmatched: true },
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

  // 1. My Appointments
  if (
    clean === MENU_ACTIONS.MY_APPOINTMENTS ||
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
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
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

    if (totalSlotsShown > 0) {
      msg += `💡 *To book any slot:*\n`;
      msg += `Reply with your preferred doctor and time (e.g. *"Book Dr. Ananya Tomorrow 10am"*), or reply *Book* to start guided booking.\n\n`;
    } else {
      msg += `Please reply *Book* to request a custom consultation slot with our coordinator.\n\n`;
    }
    msg += `Type *MENU* anytime to view the main menu.`;

    await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(
      () => undefined,
    );
    return { handled: true, action: "DOCTOR_SLOTS", responseText: msg };
  }

  // 3. Book Consultation / Appointment
  if (
    clean === MENU_ACTIONS.BOOK_APPOINTMENT ||
    clean === "1" ||
    clean === "btn_book_wa" ||
    clean === "btn_ai_call"
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

    // Registered user booking consultation
    const doctors = await getClinicDoctors(input.tenant.clinicId);
    let msg = `📅 *Schedule a Consultation — ${clinicName}*\n\n`;
    msg += `Please select your preferred doctor or share your preferred day:\n\n`;
    doctors.slice(0, 3).forEach((d, idx) => {
      msg += `${idx + 1}️⃣ *${d.displayName}* — ${d.specialty}\n`;
    });
    msg += `\n💬 Reply with a number (1-${Math.min(doctors.length, 3)}) or say e.g.:\n*"Tomorrow at 10:30 AM with Dr. Ananya"*\n\n`;
    msg += `Type *MENU* to view other options.`;

    await sendWhatsAppAiSessionText(input.tenant, { conversationId: input.conversationId, body: msg }).catch(
      () => undefined,
    );
    return { handled: true, action: "BOOK_APPOINTMENT", responseText: msg };
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
