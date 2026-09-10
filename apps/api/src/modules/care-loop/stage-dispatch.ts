import type { TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";
import {
  sendWhatsAppAiSessionText,
  sendWhatsAppInteractiveButtons,
} from "../../integrations/providers/whatsapp/messaging";
import { normalizeWhatsAppPhone } from "../../integrations/providers/whatsapp/phone";

export type StageDispatchResult = {
  success: boolean;
  stageNumber: number;
  stageName: string;
  recipientPhone: string;
  messageId?: string | undefined;
  sentText: string;
  buttonsSent: string[];
  note?: string | undefined;
};

export const STAGE_DISPATCH_SPECS: Record<
  number,
  {
    name: string;
    body: (clinicName: string, patientName: string) => string;
    buttons: Array<{ id: string; title: string }>;
    footer: (clinicName: string) => string;
  }
> = {
  1: {
    name: "01. Lead / Appointment Booking",
    body: (clinic, patient) =>
      `👋 Hi ${patient || "there"}!\n\nWelcome to *${clinic}* 🏥\nHow can I help you today?\n\nOur Fertility Specialists:\n• *Dr. Aditi Sharma* — 12+ yrs experience\n• *Dr. Rohit Mehta* — 15+ yrs experience\n• *Dr. Neha Kapoor* — 10+ yrs experience\n\nTap below to book an appointment or ask a question 👇`,
    buttons: [
      { id: "menu_book_appt", title: "📅 Book Appt" },
      { id: "menu_doc_slots", title: "👩‍⚕️ Doctor Slots" },
      { id: "menu_coordinator", title: "💬 Ask Question" },
    ],
    footer: (clinic) => `${clinic} • Step 1 Lead`,
  },
  2: {
    name: "02. Initial Consultation",
    body: (clinic, patient) =>
      `👋 Hi ${patient || "Priya"},\n\nThis is a reminder for your fertility consultation tomorrow at *10:00 AM* with *Dr. Aditi Sharma* at *${clinic}*.\n\nPlease confirm if you will be attending, or let us know if you need to reschedule.`,
    buttons: [
      { id: "careloop_confirmed", title: "✅ Yes, I'll come" },
      { id: "careloop_upload", title: "📋 Pre-Consult Form" },
      { id: "menu_coordinator", title: "📅 Reschedule" },
    ],
    footer: (clinic) => `${clinic} • Step 2 Consultation`,
  },
  3: {
    name: "03. Fertility Investigation / Workup",
    body: (clinic, patient) =>
      `📋 *Fertility Investigation Plan — ${clinic}*\n\nHi ${patient || "Priya"},\nBased on your consultation, the following tests are scheduled:\n\n✅ Blood hormonal panel (Day 2-5)\n✅ Pelvic Ultrasound (TVS)\n✅ Semen analysis (for partner)\n✅ Infectious disease screen\n\nPlease fast for 8-10 hours before blood work. Tap below to upload reports or book lab slot.`,
    buttons: [
      { id: "careloop_upload", title: "📤 Upload Report" },
      { id: "careloop_confirmed", title: "📅 Book Lab Slot" },
      { id: "menu_coordinator", title: "❓ Need Help" },
    ],
    footer: (clinic) => `${clinic} • Step 3 Workup`,
  },
  4: {
    name: "04. IVF Decision Milestone",
    body: (clinic, patient) =>
      `📊 *IVF Decision Milestone — ${clinic}*\n\nHi ${patient || "Priya"},\nDr. Aditi Sharma has reviewed your complete diagnostic workup and recommended:\n\n✅ *IVF (ICSI) Antagonist Protocol*\n\nOur team is ready to guide you through package options, digital consent, and cycle preparation.`,
    buttons: [
      { id: "careloop_mark_done", title: "👉 View Next Steps" },
      { id: "careloop_view_tasks", title: "📄 View Summary" },
      { id: "menu_coordinator", title: "📞 Coordinator" },
    ],
    footer: (clinic) => `${clinic} • Step 4 Decision`,
  },
  5: {
    name: "05. Treatment Planning & Consent",
    body: (clinic, patient) =>
      `📝 *Treatment Planning & E-Consent — ${clinic}*\n\nHi ${patient || "Priya"},\nHere is your treatment plan summary:\n• Protocol: *Antagonist Protocol (4-6 weeks)*\n• Package: *₹1,75,000 (Advance ₹50,000)*\n\nPlease review and sign the 4 required consents:\n1. IVF Treatment Consent\n2. Anesthesia Consent\n3. Embryology Lab Consent\n4. Data & Privacy Consent`,
    buttons: [
      { id: "careloop_mark_done", title: "✍️ Review & Sign" },
      { id: "careloop_view_tasks", title: "💳 Pay Advance" },
      { id: "menu_coordinator", title: "📞 Coordinator" },
    ],
    footer: (clinic) => `${clinic} • Step 5 Consent`,
  },
  6: {
    name: "06. Cycle Preparation",
    body: (clinic, patient) =>
      `🌸 *Cycle Preparation Checklist — ${clinic}*\n\nHi ${patient || "Priya"},\nYou are now in Cycle Preparation! Let's ensure everything is ready:\n\n1. Baseline ultrasound & Day 2 bloods\n2. Medication order & home delivery\n3. Subcutaneous injection training video\n4. Partner semen check / backup consent\n\nProgress: 4 of 6 completed (67%).`,
    buttons: [
      { id: "careloop_view_tasks", title: "📋 My Checklist" },
      { id: "careloop_mark_done", title: "🎥 Injection Video" },
      { id: "menu_coordinator", title: "📦 Order Meds" },
    ],
    footer: (clinic) => `${clinic} • Step 6 Preparation`,
  },
  7: {
    name: "07. Ovarian Stimulation",
    body: (clinic, patient) =>
      `💉 *Ovarian Stimulation — Daily Injection Reminder*\n\nHi ${patient || "Priya"},\nIt's time for your daily stimulation injection:\n\n• *FSH 225 IU* at *8:00 PM*\n• Subcutaneous (lower abdomen)\n\nHave you taken your injection today? Tap below to confirm.`,
    buttons: [
      { id: "careloop_taken", title: "✅ Taken" },
      { id: "careloop_view_tasks", title: "⏰ Will take soon" },
      { id: "menu_coordinator", title: "❓ Need Help" },
    ],
    footer: (clinic) => `${clinic} • Step 7 Stimulation`,
  },
  8: {
    name: "08. Follicular Monitoring",
    body: (clinic, patient) =>
      `🔬 *Follicular Monitoring Scan — ${clinic}*\n\nHi ${patient || "Priya"},\nYour follicle tracking ultrasound scan is scheduled for tomorrow at *9:30 AM*.\n\n📌 *Instructions:*\n• No fasting required\n• Comfortably full bladder\n• Arrive 15 minutes early`,
    buttons: [
      { id: "careloop_confirmed", title: "✅ Confirmed" },
      { id: "careloop_upload", title: "📤 Upload Scan" },
      { id: "careloop_view_tasks", title: "📄 Instructions" },
    ],
    footer: (clinic) => `${clinic} • Step 8 Monitoring`,
  },
  9: {
    name: "09. Trigger Injection",
    body: (clinic, patient) =>
      `⏰ *CRITICAL: Trigger Injection Notice (Exact Timing Required)*\n\nHi ${patient || "Priya"},\nYour doctor has ordered your trigger injection tonight to mature your eggs:\n\n• Medication: *hCG 10,000 IU*\n• EXACT TIME: *Tonight at 9:00 PM sharp*\n\n⚠️ Egg Retrieval (OPU) is locked for exactly 36 hours later. Please confirm once taken!`,
    buttons: [
      { id: "careloop_trigger_done", title: "✅ Injection Done" },
      { id: "careloop_opu_ready", title: "⏰ I'm ready" },
      { id: "menu_coordinator", title: "🚨 Emergency Call" },
    ],
    footer: (clinic) => `${clinic} • Step 9 Trigger`,
  },
  10: {
    name: "10. OPU (Egg Retrieval)",
    body: (clinic, patient) =>
      `🏥 *OPU (Egg Retrieval) Day — ${clinic}*\n\nHi ${patient || "Priya"},\nYour egg retrieval procedure is scheduled for today at *9:00 AM*.\n\n• Strict fasting (no food/water from midnight)\n• Wear comfortable clothes, no jewelry\n• Arrive 45 minutes early\n\nTap below once you reach the clinic reception.`,
    buttons: [
      { id: "careloop_arrived", title: "📍 I've Arrived" },
      { id: "careloop_opu_ready", title: "✅ I'm Ready" },
      { id: "menu_coordinator", title: "📞 Call OT Desk" },
    ],
    footer: (clinic) => `${clinic} • Step 10 OPU`,
  },
  11: {
    name: "11. Embryology & Fertilization",
    body: (clinic, patient) =>
      `🔬 *Embryology Lab Update — Day 3 Report*\n\nHi ${patient || "Priya"},\nHere is your embryo developmental report:\n\n• Oocytes retrieved: *12*\n• Successfully fertilized (ICSI): *9*\n• Developing embryos (Day 3): *5 Grade-A blastocysts*\n\nDr. Aditi Sharma recommends freezing all high-grade blastocysts for optimal uterine receptivity.`,
    buttons: [
      { id: "careloop_report", title: "📄 Lab Report" },
      { id: "careloop_view_tasks", title: "💬 Discuss with Dr" },
      { id: "careloop_mark_done", title: "❄️ Freeze Plan" },
    ],
    footer: (clinic) => `${clinic} • Step 11 Embryology`,
  },
  12: {
    name: "12. Embryo Transfer / FET",
    body: (clinic, patient) =>
      `🌟 *Embryo Transfer Procedure — ${clinic}*\n\nHi ${patient || "Priya"},\nYour frozen embryo transfer (FET) is scheduled for today at *10:30 AM*.\n\n• Arrive 30 minutes early\n• Drink 3-4 glasses of water for a comfortably full bladder\n• Take morning progesterone as prescribed`,
    buttons: [
      { id: "careloop_arrived", title: "📍 I've Arrived" },
      { id: "careloop_confirmed", title: "📋 Transfer Guide" },
      { id: "menu_coordinator", title: "📞 Care Team" },
    ],
    footer: (clinic) => `${clinic} • Step 12 Transfer`,
  },
  13: {
    name: "13. Post-Transfer Support (2-Week Wait)",
    body: (clinic, patient) =>
      `🌸 *Post-Transfer Support (2-Week Wait) — Day 3 Check-in*\n\nHi ${patient || "Priya"},\nHow are you feeling today? Mild cramping or slight spotting is common.\n\n• Continue prescribed Progesterone & Aspirin\n• Light activities permitted; avoid heavy lifting\n\nHow are you feeling today?`,
    buttons: [
      { id: "careloop_taken", title: "✅ Meds Taken" },
      { id: "careloop_symptoms", title: "🤒 Log Symptoms" },
      { id: "careloop_view_tasks", title: "📋 Care Guide" },
    ],
    footer: (clinic) => `${clinic} • Step 13 Post-Transfer`,
  },
  14: {
    name: "14. Pregnancy Test (Beta-hCG)",
    body: (clinic, patient) =>
      `🩸 *Pregnancy Test Milestone (Beta-hCG) — Day 14*\n\nHi ${patient || "Priya"},\nToday is Day 14 post-transfer! It's time for your serum Beta-hCG blood test.\n\n• Morning fasting blood sample\n• Partner lab or clinic collection\n\nOnce you receive your report, please upload it here for clinical review.`,
    buttons: [
      { id: "careloop_upload", title: "📤 Upload Beta-hCG" },
      { id: "careloop_confirmed", title: "✅ Test Completed" },
      { id: "menu_coordinator", title: "📞 Coordinator" },
    ],
    footer: (clinic) => `${clinic} • Step 14 Pregnancy Test`,
  },
  15: {
    name: "15. Outcome & Clinical Transition",
    body: (clinic, patient) =>
      `🎉 *Congratulations! Positive Beta-hCG (256 mIU/mL)* 🌟\n\nHi ${patient || "Priya"},\nWe are overjoyed to share that your Beta-hCG result is *POSITIVE* at *256 mIU/mL*!\n\nDr. Aditi Sharma and the entire care team congratulate you.\n\nNext Steps:\n1. Continue luteal support medications\n2. Repeat Beta-hCG in 48 hours\n3. Schedule early viability ultrasound in 2 weeks`,
    buttons: [
      { id: "careloop_confirmed", title: "📅 Viability Scan" },
      { id: "careloop_view_tasks", title: "📋 Antenatal Plan" },
      { id: "menu_coordinator", title: "📞 Doctor Call" },
    ],
    footer: (clinic) => `${clinic} • Step 15 Outcome`,
  },
};

/**
 * Dispatch an authentic WhatsApp message and interactive buttons corresponding
 * to any of the 15 specification stages directly to a mobile number.
 */
export async function dispatchStageToWhatsApp(
  tenant: TenantContext,
  input: {
    stageNumber: number;
    phoneNumber: string;
    coupleId?: string;
    syncPlanStage?: boolean;
  },
): Promise<StageDispatchResult> {
  const stageNum = Math.max(1, Math.min(15, input.stageNumber));
  const spec = (STAGE_DISPATCH_SPECS[stageNum] ?? STAGE_DISPATCH_SPECS[1])!;

  const clinic = await prisma.clinic.findFirst({
    where: { id: tenant.clinicId },
    select: { name: true },
  });
  const clinicName = clinic?.name || "ABC Fertility Centre";

  const normalizedPhone = normalizeWhatsAppPhone(input.phoneNumber);

  // Find or create conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      clinicId: tenant.clinicId,
      OR: [
        { contactPhone: normalizedPhone },
        { contactPhone: `+${normalizedPhone}` },
        { contactPhone: normalizedPhone.replace(/^\+/, "") },
      ],
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        clinicId: tenant.clinicId,
        contactPhone: normalizedPhone,
        channel: "WHATSAPP",
        status: "OPEN",
      },
    });
  }

  // Resolve patient name
  let patientName = "Patient";
  if (conversation.patientId) {
    const p = await prisma.patient.findUnique({
      where: { id: conversation.patientId },
      select: { firstName: true, lastName: true },
    });
    if (p?.firstName) patientName = p.firstName;
  }

  // If syncPlanStage requested, update the couple's active care plan
  if (input.syncPlanStage !== false) {
    let coupleId = input.coupleId || conversation.coupleId;
    if (!coupleId && conversation.patientId) {
      const p = await prisma.patient.findUnique({
        where: { id: conversation.patientId },
        include: { primaryCouples: true, partnerCouples: true },
      });
      coupleId = p?.primaryCouples[0]?.id || p?.partnerCouples[0]?.id || null;
    }

    if (coupleId) {
      const plan = await prisma.carePlan.findFirst({
        where: { clinicId: tenant.clinicId, coupleId, status: "ACTIVE" },
        include: { steps: { orderBy: { sortOrder: "asc" } } },
      });
      if (plan) {
        const targetStep = plan.steps.find((s) => s.sortOrder === stageNum);
        await prisma.carePlan.update({
          where: { id: plan.id },
          data: {
            currentStageIndex: stageNum,
            currentStep: stageNum,
            currentStageName: targetStep?.name || spec.name,
          },
        });

        // Update step statuses: <= stageNum -> DONE (or CURRENT), > stageNum -> PENDING
        for (const s of plan.steps) {
          const newStatus = s.sortOrder < stageNum ? "DONE" : s.sortOrder === stageNum ? "CURRENT" : "PENDING";
          if (s.status !== newStatus) {
            await prisma.carePlanStep.update({
              where: { id: s.id },
              data: { status: newStatus },
            });
          }
        }
      }
    }
  }

  const messageText = spec.body(clinicName, patientName);
  const footerText = spec.footer(clinicName);

  let messageId: string | undefined;
  try {
    const result = await sendWhatsAppInteractiveButtons(tenant, {
      conversationId: conversation.id,
      body: messageText,
      footer: footerText,
      buttons: spec.buttons,
    });
    messageId = result.id;
  } catch (err) {
    console.log("[Stage Dispatch] interactive send fallback to text:", err instanceof Error ? err.message : err);
    const textFallback = `${messageText}\n\n${spec.buttons.map((b) => `[${b.title}]`).join("  ")}`;
    await sendWhatsAppAiSessionText(tenant, {
      conversationId: conversation.id,
      body: textFallback,
    }).catch(() => undefined);
  }

  return {
    success: true,
    stageNumber: stageNum,
    stageName: spec.name,
    recipientPhone: normalizedPhone,
    messageId,
    sentText: messageText,
    buttonsSent: spec.buttons.map((b) => b.title),
  };
}
