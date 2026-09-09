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
    [
      "What is SmrkoMed",
      "Platform",
      "SmrkoMed is an intelligent healthcare and fertility operating system designed specifically for reproductive medicine clinics, IVF centers, and modern hospitals. It bridges patients, couples, fertility specialists, and clinic coordinators into a seamless 24/7 digital care desk.",
    ],
    [
      "What SmrkoMed Does",
      "Platform",
      "SmrkoMed automates patient care and clinic operations: 1) Interactive WhatsApp Self-Service: view doctor availability, browse specialists, and book or reschedule consultation slots natively in WhatsApp. 2) Sarvam AI Voice Assistant: automated phone calls in natural Indian languages for instant bookings and reminders. 3) 24/7 Care Loop: tracks couple fertility journeys (IVF, ICSI, IUI, follicular scans, and medications) with proactive alerts. 4) Couple-centric medical files and clinic operations.",
    ],
    [
      "Why SmrkoMed",
      "Platform",
      "Why choose SmrkoMed? 1) Zero App Downloads: everything works effortlessly on WhatsApp and phone calls without extra apps. 2) 24/7 Instant Access: patients get immediate answers to clinic queries, doctor availability, and slot booking at any time. 3) Empathetic Couple Support: continuous guidance throughout fertility treatment with instant escalation to clinical care coordinators.",
    ],
    [
      "Platform overview",
      "Platform",
      "SmrkoMed helps clinics manage patients, couples, journeys, WhatsApp communication, AI voice phone calls, pharmacy, and billing in one unified workspace.",
    ],
    [
      "WhatsApp communication & booking",
      "Platform",
      "Clinics use SmrkoMed's WhatsApp self-service to provide interactive appointment booking with native dropdowns for doctors, dates, and slots, automated reminders, and instant digital care support.",
    ],
    [
      "AI Voice Phone Assistant",
      "Platform",
      "SmrkoMed features a voice AI assistant powered by Sarvam AI that dials patients or receives calls in Indian languages (English, Hindi, Kannada, Tamil, etc.) to schedule appointments and answer clinic questions.",
    ],
    [
      "Care Loop & Patient Journeys",
      "Platform",
      "Care Loop tracks couple fertility journey stages (IVF stimulation, ICSI, IUI cycle monitoring, egg retrieval, embryo transfer) and sends automated medication schedules and scan reminders.",
    ],
    [
      "AI and Safety",
      "Platform",
      "Smrko AI provides instant operational assistance, clinic timings, specialist profiles, and guided appointment bookings. It is a care assistant, not a doctor, and connects patients with human coordinators for clinical questions.",
    ],
    [
      "Support & Coordinator Help",
      "Platform",
      "Patients can connect with a clinical care coordinator anytime directly through WhatsApp or phone call for personal medical assistance, couple counseling, and doctor guidance.",
    ],
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
      await prisma.whatsAppKnowledgeArticle.update({
        where: { id: existing.id },
        data: {
          category: a.category,
          specialty: a.specialty,
          keywords: a.keywords,
          content: a.content,
          status: "PUBLISHED",
          ...(updatedById ? { updatedById } : {}),
        },
      });
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
  return { created, updated: skipped, total: articles.length, label: "DEMO / DEVELOPMENT CONTENT" };
}
