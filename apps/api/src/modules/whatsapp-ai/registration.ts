/**
 * WhatsApp Patient Self-Registration Handler
 * Detects unregistered / unmatched WhatsApp contacts, guides them to register,
 * parses registration replies, and creates official Patient / Couple records.
 */

import { Prisma, type Gender } from "@prisma/client";
import type { TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { sendWhatsAppAiSessionText } from "../../integrations/providers/whatsapp/messaging";

export type RegistrationDraft = {
  kind: "REGISTRATION";
  subStep: 1 | 2 | 3;
  patientName?: string | undefined;
  age?: number | undefined;
  dateOfBirth?: string | undefined;
  gender?: Gender | undefined;
  partnerName?: string | undefined;
};

const FOOTER_NAV = "\n\n_Reply with your details to register, or type *HELP* to connect with our care team._";

/**
 * Format a welcome message explaining that the user is not yet registered
 * and prompting them for registration details or directing to the online booking link.
 */
export function formatUnregisteredWelcomePrompt(options: {
  clinicName: string;
  clinicSlug?: string | null;
  queryAnswer?: string | null;
}): string {
  const { clinicName, clinicSlug, queryAnswer } = options;

  let text = "";
  if (queryAnswer?.trim()) {
    text += `✦ *${clinicName}*\n\n${queryAnswer.trim()}\n\n---\n\n`;
  } else {
    text += `👋 *Welcome to ${clinicName}!*\n\n`;
  }

  text += `We noticed that this phone number is not yet registered in our patient records. To help you book appointments and access our care services, please register your profile with us.\n\n`;
  text += `📝 *Quick Registration — please reply with:* \n`;
  text += `1️⃣ *Full Name*\n`;
  text += `2️⃣ *Age* or *Date of Birth* (e.g. 29 or 1996-05-12)\n`;
  text += `3️⃣ *Gender* (Female / Male / Other)\n`;
  text += `4️⃣ *Partner's Name* _(optional, for couples)_\n`;

  if (clinicSlug) {
    text += `\n🌐 *Or register & book online in 1 minute:*\n`;
    text += `https://smrkomed.com/book/${clinicSlug}\n`;
  }

  text += FOOTER_NAV;
  return text;
}

/**
 * Prompt for step-by-step registration.
 */
export function formatRegistrationStepPrompt(draft: RegistrationDraft): string {
  if (draft.subStep === 1 || !draft.patientName) {
    return (
      `📝 *Patient Registration (Step 1/3)*\n\n` +
      `Please reply with your *Full Name*:` +
      `\n\n_(Your WhatsApp number will be linked automatically as your registered mobile.)_` +
      FOOTER_NAV
    );
  }

  if (draft.subStep === 2 || (!draft.age && !draft.dateOfBirth)) {
    return (
      `📝 *Patient Registration (Step 2/3)*\n\n` +
      `Thank you, *${draft.patientName}*!\n` +
      `Please reply with your *Age* or *Date of Birth* (e.g. 28, or 1996-08-14):` +
      FOOTER_NAV
    );
  }

  return (
    `📝 *Patient Registration (Step 3/3)*\n\n` +
    `Please reply with your *Gender* (Female / Male / Other):\n\n` +
    `_(If seeking fertility care as a couple, you may also include your partner's name, e.g. "Female, Partner: Rahul")_` +
    FOOTER_NAV
  );
}

/**
 * Format confirmation message once registration completes.
 */
export function formatRegistrationSuccessMessage(options: {
  clinicName: string;
  patientName: string;
  partnerName?: string | null;
}): string {
  let text = `✅ *Registration Complete!*\n\n`;
  text += `Welcome to *${options.clinicName}*, *${options.patientName}*! Your patient record has been successfully registered.\n\n`;
  if (options.partnerName) {
    text += `Partner record created: *${options.partnerName}* (Couple File)\n\n`;
  }
  text += `How would you like to proceed today?\n`;
  text += `1️⃣ 📅 *Book a Consultation / Appointment*\n`;
  text += `2️⃣ 💬 *Ask about Treatments & Services*\n`;
  text += `3️⃣ 👩‍⚕️ *Speak with a Care Coordinator*\n\n`;
  text += `_Simply reply with an option number or type what you need._`;
  return text;
}

function parseGender(text: string): Gender {
  const lower = text.toLowerCase().trim();
  if (/\b(female|woman|lady|f)\b/i.test(lower)) return "FEMALE";
  if (/\b(male|man|m)\b/i.test(lower)) return "MALE";
  if (/\b(other|non-binary|transgender|trans)\b/i.test(lower)) return "OTHER";
  return "UNSPECIFIED";
}

function splitFullName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] || "Patient";
  const lastName = parts.slice(1).join(" ") || "";
  return { firstName, lastName };
}

/**
 * Parse one-shot composite registration text:
 * e.g. "Name: Priya Sharma, Age: 29, Gender: Female, Partner: Rahul Sharma"
 * or "Priya Sharma, 29, Female"
 * or "1. Priya Sharma 2. 29 3. Female"
 */
export function parseCompositeRegistration(text: string): {
  patientName?: string | undefined;
  age?: number | undefined;
  dateOfBirth?: string | undefined;
  gender?: Gender | undefined;
  partnerName?: string | undefined;
  subStep?: 1 | 2 | 3 | undefined;
} | null {
  const clean = text.trim();

  // Pattern 1: Explicit labeled fields
  const nameMatch = clean.match(/(?:name|patient\s*name|full\s*name)\s*[:=-]\s*([a-zA-Z\s'.]+?)(?=(?:,\s*|;|\n|\s+(?:age|dob|gender|partner|phone))|$)/i);
  const ageMatch = clean.match(/(?:age)\s*[:=-]?\s*(\d{1,2})(?:\s*years?|\s*yrs?)?/i);
  const dobMatch = clean.match(/(?:dob|date\s*of\s*birth)\s*[:=-]?\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i);
  const genderMatch = clean.match(/(?:gender|sex)\s*[:=-]?\s*(female|male|other|f|m)/i);
  const partnerMatch = clean.match(/(?:partner|husband|wife|spouse)(?:\s*name)?\s*[:=-]?\s*([a-zA-Z\s'.]+?)(?=(?:,\s*|;|\n|$))/i);

  if (nameMatch || (ageMatch && genderMatch)) {
    const rawName = nameMatch ? nameMatch[1]?.trim() : undefined;
    const ageNum = ageMatch ? parseInt(ageMatch[1]!, 10) : undefined;
    const dob = dobMatch ? dobMatch[1]?.trim() : undefined;
    const gender = genderMatch ? parseGender(genderMatch[1]!) : undefined;
    const partner = partnerMatch ? partnerMatch[1]?.trim() : undefined;

    const out: {
      patientName?: string | undefined;
      age?: number | undefined;
      dateOfBirth?: string | undefined;
      gender?: Gender | undefined;
      partnerName?: string | undefined;
      subStep?: 1 | 2 | 3 | undefined;
    } = {
      subStep: 3,
    };
    if (rawName) out.patientName = rawName;
    if (ageNum && ageNum >= 10 && ageNum <= 110) out.age = ageNum;
    if (dob) out.dateOfBirth = dob;
    if (gender) out.gender = gender;
    if (partner) out.partnerName = partner;

    return out;
  }

  // Pattern 2: Comma or newline separated: "Priya Sharma, 28, Female"
  const commaParts = clean.split(/,|\n/).map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const possibleName = commaParts[0]!;
    // If first item looks like a name (2+ words, no numbers)
    if (/^[a-zA-Z\s'.]{3,40}$/.test(possibleName) && !isCommandOrGreeting(possibleName)) {
      let age: number | undefined;
      let dateOfBirth: string | undefined;
      let gender: Gender | undefined;
      let partnerName: string | undefined;

      for (let i = 1; i < commaParts.length; i++) {
        const part = commaParts[i]!;
        const num = parseInt(part.replace(/\D/g, ""), 10);
        if (num >= 10 && num <= 110 && !age) {
          age = num;
          continue;
        }
        if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(part) && !dateOfBirth) {
          dateOfBirth = part;
          continue;
        }
        const g = parseGender(part);
        if (g !== "UNSPECIFIED" && !gender) {
          gender = g;
          continue;
        }
        const partnerClean = part.replace(/^(?:partner|spouse|husband|wife)\s*[:=-]?\s*/i, "").trim();
        if (/^[a-zA-Z\s'.]{3,40}$/.test(partnerClean) && !partnerName) {
          partnerName = partnerClean;
        }
      }

      if (age || dateOfBirth || gender) {
        const out: {
          patientName?: string | undefined;
          age?: number | undefined;
          dateOfBirth?: string | undefined;
          gender?: Gender | undefined;
          partnerName?: string | undefined;
          subStep?: 1 | 2 | 3 | undefined;
        } = {
          patientName: possibleName,
          gender: gender ?? "UNSPECIFIED",
          subStep: 3,
        };
        if (age !== undefined) out.age = age;
        if (dateOfBirth !== undefined) out.dateOfBirth = dateOfBirth;
        if (partnerName !== undefined) out.partnerName = partnerName;
        return out;
      }
    }
  }

  return null;
}

function isCommandOrGreeting(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return /^(hi+|hello|hey+|restart|cancel|reset|back|human|help|menu|book|appointment|register|status)$/i.test(lower);
}

export type RegistrationResult = {
  handled: boolean;
  registered?: boolean;
  responseMessage?: string;
  patientId?: string;
};

/**
 * Handle in-chat registration message for an unregistered/unmatched contact.
 * Returns handled=true if the message advanced or completed registration.
 */
export async function tryHandleRegistrationMessage(input: {
  tenant: TenantContext;
  conversationId: string;
  contactPhone: string;
  messageText: string;
}): Promise<RegistrationResult> {
  const clean = input.messageText.trim();
  if (!clean || clean.length < 2) return { handled: false };

  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, clinicId: input.tenant.clinicId },
    select: { id: true, patientId: true, unmatched: true, pendingAction: true },
  });
  if (!conversation) return { handled: false };

  // If already matched/registered, do not hijack normal chat
  if (conversation.patientId && !conversation.unmatched) {
    return { handled: false };
  }

  const clinic = await prisma.clinic.findFirst({
    where: { id: input.tenant.clinicId },
    select: { name: true, slug: true },
  });
  const clinicName = clinic?.name ?? input.tenant.clinicName ?? "SmrkoMed";

  // Check existing pending action draft
  const pending = conversation.pendingAction as RegistrationDraft | null;
  const inDraft = pending?.kind === "REGISTRATION";

  // Try parsing composite registration (e.g. "Priya Sharma, 29, Female")
  const composite = parseCompositeRegistration(clean);

  // If user says "register" or "i want to register" or "new patient"
  const isRegisterTrigger =
    /\b(register|sign\s*up|new\s*patient|create\s*(my\s*)?account|registration)\b/i.test(clean) &&
    !clean.includes("how");

  if (isRegisterTrigger && !composite && !inDraft) {
    const draft: RegistrationDraft = { kind: "REGISTRATION", subStep: 1 };
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        pendingAction: draft,
        pendingActionExpiresAt: new Date(Date.now() + 60 * 60_000), // 1 hour TTL
      },
    });
    const prompt = formatRegistrationStepPrompt(draft);
    await sendWhatsAppAiSessionText(input.tenant, {
      conversationId: conversation.id,
      body: prompt,
    }).catch(() => undefined);
    return { handled: true, responseMessage: prompt };
  }

  // Combine draft data if active
  const draftData: Partial<RegistrationDraft> = inDraft ? { ...pending } : {};
  if (composite) {
    Object.assign(draftData, composite);
  } else if (inDraft) {
    // Step-by-step resolution
    if (pending.subStep === 1 && !draftData.patientName) {
      if (!isCommandOrGreeting(clean) && clean.length >= 2 && !/^\d+$/.test(clean)) {
        draftData.patientName = clean;
        draftData.subStep = 2;
      }
    } else if (pending.subStep === 2 && !draftData.age && !draftData.dateOfBirth) {
      const num = parseInt(clean.replace(/\D/g, ""), 10);
      if (num >= 10 && num <= 110) {
        draftData.age = num;
        draftData.subStep = 3;
      } else if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(clean)) {
        draftData.dateOfBirth = clean;
        draftData.subStep = 3;
      }
    } else if (pending.subStep === 3 && !draftData.gender) {
      const g = parseGender(clean);
      draftData.gender = g !== "UNSPECIFIED" ? g : "FEMALE";
      if (clean.toLowerCase() !== "skip" && clean.toLowerCase() !== "no" && !/^(female|male|other)$/i.test(clean)) {
        // Maybe partner name was included
        const pMatch = clean.match(/(?:partner\s*[:=-]?\s*([a-zA-Z\s'.]+)|and\s+([a-zA-Z\s'.]+))/i);
        if (pMatch) {
          draftData.partnerName = (pMatch[1] || pMatch[2])?.trim();
        }
      }
    }
  }

  // Check if we have enough to complete registration (Name is required, age/dob and gender default if omitted)
  if (draftData.patientName && draftData.patientName.length >= 2) {
    const isStep2Or3 = draftData.subStep === 2 || draftData.subStep === 3;
    const hasAgeOrDob = Boolean(draftData.age || draftData.dateOfBirth);
    const hasGender = Boolean(draftData.gender);

    // If step 1 just finished and we still need step 2
    if (draftData.subStep === 2 && !hasAgeOrDob && !composite) {
      const updatedDraft: RegistrationDraft = {
        kind: "REGISTRATION",
        subStep: 2,
        patientName: draftData.patientName,
      };
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          pendingAction: updatedDraft,
          pendingActionExpiresAt: new Date(Date.now() + 60 * 60_000),
        },
      });
      const prompt = formatRegistrationStepPrompt(updatedDraft);
      await sendWhatsAppAiSessionText(input.tenant, {
        conversationId: conversation.id,
        body: prompt,
      }).catch(() => undefined);
      return { handled: true, responseMessage: prompt };
    }

    // If step 2 finished and we still need gender
    if (draftData.subStep === 3 && !hasGender && !composite) {
      const updatedDraft: RegistrationDraft = {
        kind: "REGISTRATION",
        subStep: 3,
        patientName: draftData.patientName,
        age: draftData.age,
        dateOfBirth: draftData.dateOfBirth,
      };
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          pendingAction: updatedDraft,
          pendingActionExpiresAt: new Date(Date.now() + 60 * 60_000),
        },
      });
      const prompt = formatRegistrationStepPrompt(updatedDraft);
      await sendWhatsAppAiSessionText(input.tenant, {
        conversationId: conversation.id,
        body: prompt,
      }).catch(() => undefined);
      return { handled: true, responseMessage: prompt };
    }

    // Finalize registration!
    const { firstName, lastName } = splitFullName(draftData.patientName);
    const normalizedPhone = input.contactPhone.replace(/\s+/g, "");

    // Calculate approximate date of birth if only age provided
    let dob: Date | null = null;
    if (draftData.dateOfBirth) {
      const parsed = new Date(draftData.dateOfBirth.includes("T") ? draftData.dateOfBirth : `${draftData.dateOfBirth}T00:00:00`);
      if (!Number.isNaN(parsed.getTime())) dob = parsed;
    } else if (draftData.age) {
      const yr = new Date().getFullYear() - draftData.age;
      dob = new Date(`${yr}-01-01T00:00:00`);
    }

    const patient = await prisma.patient.create({
      data: {
        clinicId: input.tenant.clinicId,
        firstName,
        lastName,
        phone: normalizedPhone,
        whatsappNumber: normalizedPhone,
        dateOfBirth: dob,
        gender: draftData.gender ?? "UNSPECIFIED",
        preferredLanguage: "en",
        status: "ACTIVE",
      },
    });

    let coupleId: string | null = null;
    let partnerCreatedName: string | null = null;
    if (draftData.partnerName?.trim()) {
      const pName = splitFullName(draftData.partnerName);
      partnerCreatedName = `${pName.firstName} ${pName.lastName}`.trim();
      const partner = await prisma.patient.create({
        data: {
          clinicId: input.tenant.clinicId,
          firstName: pName.firstName,
          lastName: pName.lastName,
          gender: draftData.gender === "FEMALE" ? "MALE" : "FEMALE",
          preferredLanguage: "en",
          status: "ACTIVE",
        },
      });
      const couple = await prisma.couple.create({
        data: {
          clinicId: input.tenant.clinicId,
          slug: `c-${patient.id.slice(-8)}-${Date.now().toString(36)}`,
          primaryPatientId: patient.id,
          partnerPatientId: partner.id,
        },
      });
      coupleId = couple.id;
    } else {
      // Auto-create individual fertility couple record
      try {
        const couple = await prisma.couple.create({
          data: {
            clinicId: input.tenant.clinicId,
            slug: `c-${patient.id.slice(-8)}-${Date.now().toString(36)}`,
            primaryPatientId: patient.id,
          },
        });
        coupleId = couple.id;
      } catch {
        /* non-blocking */
      }
    }

    // Link conversation to patient & clear pending action
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        patientId: patient.id,
        coupleId,
        unmatched: false,
        pendingAction: Prisma.DbNull,
        pendingActionExpiresAt: null,
      },
    });

    // Link and convert CRM lead if existing
    await prisma.lead.updateMany({
      where: {
        clinicId: input.tenant.clinicId,
        OR: [{ conversationId: conversation.id }, { phone: normalizedPhone }],
      },
      data: {
        patientId: patient.id,
        status: "CONVERTED",
        stage: "ACTIVE_PATIENT",
      },
    }).catch(() => undefined);

    // Fire PATIENT_CREATED trigger
    void import("../whatsapp-automation/triggers")
      .then(({ dispatchWhatsAppTrigger }) =>
        dispatchWhatsAppTrigger({
          tenant: input.tenant,
          triggerType: "PATIENT_CREATED",
          triggerEventId: patient.id,
          patientId: patient.id,
          coupleId,
          vars: {
            patient_name: `${patient.firstName} ${patient.lastName}`.trim(),
            patient_first_name: patient.firstName,
            clinic_name: clinicName,
          },
        }),
      )
      .catch(() => undefined);

    const successMessage = formatRegistrationSuccessMessage({
      clinicName,
      patientName: `${patient.firstName} ${patient.lastName}`.trim(),
      partnerName: partnerCreatedName,
    });

    await sendWhatsAppAiSessionText(input.tenant, {
      conversationId: conversation.id,
      body: successMessage,
    }).catch(() => undefined);

    return {
      handled: true,
      registered: true,
      patientId: patient.id,
      responseMessage: successMessage,
    };
  }

  return { handled: false };
}
