/**
 * DEMO / DEVELOPMENT knowledge seed packs for WhatsAppKnowledgeArticle.
 * Never represent as verified medical advice.
 */

import { prisma } from "@smrkomed/database";

type SeedArticle = {
  title: string;
  category: string;
  specialty: string;
  keywords: string;
  content: string;
};

const DEMO_BANNER =
  "\n\n---\nDEMO / DEVELOPMENT CONTENT — not verified medical advice. Do not use as clinical instruction.";

function pack1Smrkomed(): SeedArticle[] {
  const topics: Array<[string, string, string]> = [
    ["What is SmrkoMed", "Platform", "SmrkoMed is a fertility-clinic SaaS platform for clinic operations, Care Loop, WhatsApp, appointments, and documents."],
    ["Platform overview", "Platform", "SmrkoMed helps clinics manage patients, couples, journeys, WhatsApp communication, pharmacy, and billing in one workspace."],
    ["Clinic management", "Platform", "Clinic admins manage staff, roles, WhatsApp connection, knowledge base, and communication safety settings."],
    ["Care Loop", "Platform", "Care Loop tracks patient journey stages and tasks so the clinic can follow up on operational next steps."],
    ["WhatsApp communication", "Platform", "Clinics connect Meta WhatsApp Cloud API to message patients with templates inside the customer-care window and automation flows."],
    ["Appointments", "Platform", "Appointments can be booked, confirmed, and used in WhatsApp reminders. Staff see schedules in the clinic calendar."],
    ["Documents", "Platform", "Patient documents can be stored and, when files are available, shared over WhatsApp from the inbox."],
    ["AI", "Platform", "Smrko AI assists with operational answers from the clinic knowledge base. It is not a doctor and never diagnoses or prescribes."],
    ["Onboarding", "Platform", "Onboarding typically includes connecting WhatsApp, syncing templates, seeding knowledge, and activating reminder flows."],
    ["Support", "Platform", "For product support, contact your SmrkoMed administrator. For clinical questions, patients should speak with clinic staff."],
  ];
  return topics.map(([title, category, content]) => ({
    title: `[DEMO] ${title}`,
    category,
    specialty: "SMRKOMED",
    keywords: `smrkomed,${title.toLowerCase()},platform,demo`,
    content: content + DEMO_BANNER,
  }));
}

function pack2Fertility(): SeedArticle[] {
  const topics: Array<[string, string]> = [
    ["Fertility consultation", "A fertility consultation reviews history and next diagnostic or treatment steps with your clinician. Smrko AI cannot interpret results."],
    ["IVF", "IVF (in vitro fertilisation) is a treatment pathway managed by your clinic team. Ask your doctor for personalised guidance — this is DEMO content only."],
    ["IUI", "IUI is an intrauterine insemination procedure scheduled by your clinic. Timing and preparation are clinician-directed."],
    ["FET", "FET (frozen embryo transfer) is scheduled by your clinic. Medication and timing instructions come only from your care team."],
    ["Fertility testing", "Fertility testing may include labs and imaging ordered by your doctor. Smrko AI does not invent or interpret test results."],
    ["Semen analysis", "Semen analysis is a lab test ordered and explained by your clinician. Contact the clinic for collection instructions."],
    ["Follicular monitoring", "Follicular monitoring uses ultrasound/labs during treatment. Your clinic will message you about visit times."],
    ["Embryo transfer", "Embryo transfer timing is set by your clinic. Follow only staff or doctor instructions."],
    ["Appointment preparation", "Bring ID, prior reports, and arrive as instructed by reception. Confirm fasting or medication holds only with staff."],
    ["Common patient questions", "For symptoms, medication changes, or urgent concerns, contact clinic staff or emergency services. Smrko AI will escalate clinical questions."],
  ];
  return topics.map(([title, content]) => ({
    title: `[DEMO] ${title}`,
    category: "Fertility",
    specialty: "FERTILITY",
    keywords: `fertility,ivf,iui,${title.toLowerCase()},demo`,
    content: content + DEMO_BANNER,
  }));
}

function pack3Hospital(): SeedArticle[] {
  const topics: Array<[string, string]> = [
    ["OPD", "OPD (outpatient) visits are scheduled through reception. Arrive with ID and prior reports when requested."],
    ["Appointments", "Book or reschedule appointments via the clinic desk or patient portal if enabled. WhatsApp reminders may be sent for confirmed visits."],
    ["Registration", "New patients complete registration with ID and contact details before the first visit."],
    ["Departments", "Ask reception which department handles your visit. Smrko AI only shares published clinic information."],
    ["Billing", "Billing queries are handled by the accounts desk. AI cannot process payments or invent invoice amounts."],
    ["Pharmacy", "Pharmacy dispensing follows your prescription. Never change doses based on chat — ask a pharmacist or doctor."],
    ["Reports", "Lab and imaging reports are released per clinic policy. Ask staff how to collect or view them."],
    ["Insurance", "Insurance coverage varies by policy. The insurance desk can confirm eligibility — DEMO content only."],
    ["Claims", "Claims submission is handled by clinic insurance staff with required documents."],
    ["General FAQs", "For directions, hours, and non-clinical FAQs, use published clinic knowledge or call reception. For medical concerns, request staff."],
  ];
  return topics.map(([title, content]) => ({
    title: `[DEMO] ${title}`,
    category: "Hospital",
    specialty: "HOSPITAL",
    keywords: `hospital,clinic,opd,${title.toLowerCase()},demo`,
    content: content + DEMO_BANNER,
  }));
}

export async function seedDemoKnowledgePacks(clinicId: string, updatedById?: string | null) {
  const articles = [...pack1Smrkomed(), ...pack2Fertility(), ...pack3Hospital()];
  let created = 0;
  let skipped = 0;
  for (const a of articles) {
    const existing = await prisma.whatsAppKnowledgeArticle.findFirst({
      where: { clinicId, title: a.title },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.whatsAppKnowledgeArticle.create({
      data: {
        clinicId,
        title: a.title,
        category: a.category,
        specialty: a.specialty,
        keywords: a.keywords,
        content: a.content,
        status: "PUBLISHED",
        ...(updatedById ? { updatedById } : {}),
      },
    });
    created += 1;
  }
  return { created, skipped, total: articles.length, label: "DEMO / DEVELOPMENT CONTENT" };
}
