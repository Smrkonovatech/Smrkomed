/**
 * WhatsApp Patient & Couple Self-Registration Handler
 * Guides visitors through structured couple registration (primary + partner details + treatment focus),
 * parses composite registration replies, creates official Patient and Couple records,
 * and seamlessly presents the Namma Metro-style interactive menu.
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
  partnerAge?: number | undefined;
  partnerDateOfBirth?: string | undefined;
  partnerGender?: Gender | undefined;
  partnerPhone?: string | undefined;
  treatmentInterest?: "IVF" | "IUI" | "EVALUATION" | "GENERAL" | undefined;
  isCouple?: boolean | undefined;
};

const FOOTER_NAV = "\n\n_Reply with your details to continue, or type *HELP* to connect with our care team._";

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
 * Prompt for step-by-step couple and patient registration.
 */
export function formatRegistrationStepPrompt(draft: RegistrationDraft): string {
  if (draft.subStep === 1 || !draft.patientName) {
    return (
      `📝 *Patient & Couple Registration (Step 1/3)*\n\n` +
      `Please reply with your *Full Name* and *Age* (e.g. *Priya Sharma, 28*):` +
      `\n\n_(Your WhatsApp number will be linked as your registered mobile.)_` +
      FOOTER_NAV
    );
  }

  if (draft.subStep === 2) {
    return (
      `📝 *Couple Registration (Step 2/3)*\n\n` +
      `Thank you, *${draft.patientName}*!\n\n` +
      `Are you registering as a couple for fertility treatment?\n` +
      `• If *Yes*, please reply with your *Partner's Full Name & Age* (e.g. *Rahul Sharma, 31*).\n` +
      `• If *No* (registering individually), simply reply *'Solo'* or *'No'*.\n` +
      `_(You can also include partner Date of Birth or Gender if desired)_` +
      FOOTER_NAV
    );
  }

  return (
    `📝 *Treatment & Gender Details (Step 3/3)*\n\n` +
    `Please reply with your *Gender* (Female / Male / Other) and Partner or treatment focus:\n\n` +
    `1️⃣ IVF / ICSI (In Vitro Fertilization)\n` +
    `2️⃣ IUI (Intrauterine Insemination)\n` +
    `3️⃣ Fertility Evaluation & Checkup\n` +
    `4️⃣ General Consultation\n\n` +
    `_Example: "Female, IVF" or reply with 1, 2, 3, or 4 (or reply 'Skip')._` +
    FOOTER_NAV
  );
}

/**
 * Format confirmation message once registration completes.
 */
export function formatRegistrationSuccessMessage(options: {
  clinicName: string;
  patientName: string;
  partnerName?: string | null | undefined;
  treatmentInterest?: string | null | undefined;
}): string {
  let text = `✅ *Registration Complete!*\n\n`;
  text += `Welcome to *${options.clinicName}*, *${options.patientName}*! Your patient record has been successfully registered.\n\n`;
  if (options.partnerName) {
    text += `👫 *Couple File Registered:* ${options.patientName} & ${options.partnerName} (Couple File)\n\n`;
  }
  if (options.treatmentInterest) {
    text += `🔬 *Clinical Focus:* ${options.treatmentInterest}\n\n`;
  }
  text += `How would you like to proceed today?\n`;
  text += `1️⃣ 📅 *Book a Consultation / Appointment*\n`;
  text += `2️⃣ 📋 *Open Main Menu (Namma Metro Style)*\n`;
  text += `3️⃣ 👩‍⚕️ *Speak with a Care Coordinator*\n\n`;
  text += `_Simply reply with an option number or type what you need._`;
  return text;
}

export function parseGender(text: string): Gender {
  const lower = text.toLowerCase().trim();
  if (/\b(female|woman|lady|f)\b/i.test(lower)) return "FEMALE";
  if (/\b(male|man|m)\b/i.test(lower)) return "MALE";
  if (/\b(other|non-binary|transgender|trans)\b/i.test(lower)) return "OTHER";
  return "UNSPECIFIED";
}

export function splitFullName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] || "Patient";
  const lastName = parts.slice(1).join(" ") || "";
  return { firstName, lastName };
}

/**
 * Parse one-shot composite registration text:
 * e.g. "Name: Priya Sharma, Age: 29, Gender: Female, Partner: Rahul Sharma"
 * or "Priya Sharma, 28, Female, Partner: Rahul Sharma, 31, Male, Treatment: IVF"
 * or "Sunita Verma, 29, Female"
 */
export function parseCompositeRegistration(text: string): {
  patientName?: string | undefined;
  age?: number | undefined;
  dateOfBirth?: string | undefined;
  gender?: Gender | undefined;
  partnerName?: string | undefined;
  partnerAge?: number | undefined;
  partnerDateOfBirth?: string | undefined;
  partnerGender?: Gender | undefined;
  treatmentInterest?: "IVF" | "IUI" | "EVALUATION" | "GENERAL" | undefined;
  isCouple?: boolean | undefined;
  subStep?: 1 | 2 | 3 | undefined;
} | null {
  const clean = text.trim();

  // Extract treatment interest if mentioned
  let treatmentInterest: "IVF" | "IUI" | "EVALUATION" | "GENERAL" | undefined;
  if (/\b(ivf|icsi)\b/i.test(clean)) treatmentInterest = "IVF";
  else if (/\biui\b/i.test(clean)) treatmentInterest = "IUI";
  else if (/\b(evaluat(ion)?|checkup|assessment|second\s*opinion)\b/i.test(clean)) treatmentInterest = "EVALUATION";
  else if (/\b(consult(ation)?|general)\b/i.test(clean)) treatmentInterest = "GENERAL";

  // Pattern 1: Explicit labeled fields
  const nameMatch = clean.match(/(?:name|patient\s*name|full\s*name)\s*[:=-]\s*([a-zA-Z\s'.]+?)(?=(?:,\s*|;|\n|\s+(?:age|dob|gender|partner|phone|treatment))|$)/i);
  const ageMatch = clean.match(/(?:^|\b|\n)(?:primary\s*)?age\s*[:=-]?\s*(\d{1,2})(?:\s*years?|\s*yrs?)?/i);
  const dobMatch = clean.match(/(?:dob|date\s*of\s*birth)\s*[:=-]?\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i);
  const genderMatch = clean.match(/(?:gender|sex)\s*[:=-]?\s*(female|male|other|f|m)/i);
  const partnerMatch = clean.match(/(?:partner|husband|wife|spouse)(?:\s*name)?\s*[:=-]?\s*([a-zA-Z\s'.]+?)(?=(?:,\s*|;|\n|\s+(?:age|dob|gender|treatment))|$)/i);
  const partnerAgeMatch = clean.match(/partner\s*age\s*[:=-]?\s*(\d{1,2})/i);

  if (nameMatch || (ageMatch && genderMatch)) {
    const rawName = nameMatch ? nameMatch[1]?.trim() : undefined;
    const ageNum = ageMatch ? parseInt(ageMatch[1]!, 10) : undefined;
    const dob = dobMatch ? dobMatch[1]?.trim() : undefined;
    const gender = genderMatch ? parseGender(genderMatch[1]!) : undefined;
    const partner = partnerMatch ? partnerMatch[1]?.trim() : undefined;
    const partnerAge = partnerAgeMatch ? parseInt(partnerAgeMatch[1]!, 10) : undefined;

    const out: {
      patientName?: string | undefined;
      age?: number | undefined;
      dateOfBirth?: string | undefined;
      gender?: Gender | undefined;
      partnerName?: string | undefined;
      partnerAge?: number | undefined;
      treatmentInterest?: "IVF" | "IUI" | "EVALUATION" | "GENERAL" | undefined;
      isCouple?: boolean | undefined;
      subStep?: 1 | 2 | 3 | undefined;
    } = {
      subStep: 3,
    };
    if (rawName) out.patientName = rawName;
    if (ageNum && ageNum >= 10 && ageNum <= 110) out.age = ageNum;
    if (dob) out.dateOfBirth = dob;
    if (gender) out.gender = gender;
    if (partner) {
      out.partnerName = partner;
      out.isCouple = true;
    }
    if (partnerAge) out.partnerAge = partnerAge;
    if (treatmentInterest) out.treatmentInterest = treatmentInterest;

    return out;
  }

  // Pattern 2: Comma or newline separated: e.g. "Priya Sharma, 28, Female, Partner: Rahul Sharma, 31"
  const commaParts = clean.split(/,|\n/).map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const possibleName = commaParts[0]!;
    if (/^[a-zA-Z\s'.]{3,40}$/.test(possibleName) && !isCommandOrGreeting(possibleName)) {
      let age: number | undefined;
      let dateOfBirth: string | undefined;
      let gender: Gender | undefined;
      let partnerName: string | undefined;
      let partnerAge: number | undefined;
      let partnerGender: Gender | undefined;

      for (let i = 1; i < commaParts.length; i++) {
        const part = commaParts[i]!;

        // Check for partner prefix
        if (/^(?:partner|spouse|husband|wife)\s*[:=-]?\s*/i.test(part)) {
          const partnerRaw = part.replace(/^(?:partner|spouse|husband|wife)\s*[:=-]?\s*/i, "").trim();
          const pParts = partnerRaw.split(/\s+/);
          if (pParts.length >= 2) {
            // Check if last part is age e.g. "Rahul Sharma 31"
            const lastPart = pParts[pParts.length - 1]!;
            const num = parseInt(lastPart, 10);
            if (num >= 10 && num <= 110) {
              partnerAge = num;
              partnerName = pParts.slice(0, -1).join(" ");
            } else {
              partnerName = partnerRaw;
            }
          } else {
            partnerName = partnerRaw;
          }
          continue;
        }

        const num = parseInt(part.replace(/\D/g, ""), 10);
        if (num >= 10 && num <= 110) {
          if (!age) {
            age = num;
          } else if (!partnerAge && partnerName) {
            partnerAge = num;
          }
          continue;
        }

        if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(part)) {
          if (!dateOfBirth) dateOfBirth = part;
          continue;
        }

        const g = parseGender(part);
        if (g !== "UNSPECIFIED") {
          if (!gender) gender = g;
          else if (!partnerGender) partnerGender = g;
          continue;
        }

        if (/^[a-zA-Z\s'.]{3,40}$/.test(part) && !partnerName && !part.match(/ivf|iui|general|evaluat/i)) {
          partnerName = part;
        }
      }

      const hasGender = Boolean(gender && gender !== "UNSPECIFIED");
      const isFullComposite = Boolean(partnerName || treatmentInterest || (hasGender && (age || dateOfBirth)));

      if (isFullComposite) {
        return {
          patientName: possibleName,
          age,
          dateOfBirth,
          gender: gender ?? "UNSPECIFIED",
          partnerName,
          partnerAge,
          partnerGender,
          treatmentInterest,
          isCouple: Boolean(partnerName),
          subStep: 3,
        };
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
  registered?: boolean | undefined;
  responseMessage?: string | undefined;
  patientId?: string | undefined;
  coupleId?: string | undefined;
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
  if (!clean) return { handled: false };

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

  // Try parsing composite registration (e.g. "Priya Sharma, 28, Female, Partner: Rahul Sharma, 31, IVF")
  const composite = parseCompositeRegistration(clean);

  // If user says "register" or "i want to register" or "new patient"
  const isRegisterTrigger =
    /\b(register|sign\s*up|new\s*patient|create\s*(my\s*)?account|registration|couple\s*registration)\b/i.test(clean) &&
    !clean.includes("how");

  // Or if unregistered user asks to book an appointment
  const isBookingTrigger =
    /\b(book\s*appointment|book\s*consultation|book|appointment|consultation|schedule|doctor)\b/i.test(clean) ||
    clean.startsWith("appt_") ||
    clean === "btn_book_wa" ||
    clean === "btn_ai_call" ||
    clean === "menu_book_appt";

  if ((isRegisterTrigger || isBookingTrigger) && !composite && !inDraft) {
    const draft: RegistrationDraft = { kind: "REGISTRATION", subStep: 1 };
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        pendingAction: draft,
        pendingActionExpiresAt: new Date(Date.now() + 60 * 60_000), // 1 hour TTL
      },
    });
    const prompt = isBookingTrigger
      ? `👋 Welcome to *${clinicName}*!\n\nTo schedule your consultation and create your clinic file, let's complete a quick patient registration. 📝\n\n${formatRegistrationStepPrompt(draft)}`
      : formatRegistrationStepPrompt(draft);

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
      // Step 1: User provides Full Name and Age (e.g. "Priya Sharma, 28" or "Priya Sharma")
      const parts = clean.split(/,|\n/).map((p) => p.trim());
      const possibleName = parts[0]!;
      if (!isCommandOrGreeting(possibleName) && possibleName.length >= 2 && !/^\d+$/.test(possibleName)) {
        draftData.patientName = possibleName;
        // Check if age was also in step 1
        if (parts.length > 1) {
          const num = parseInt(parts[1]!.replace(/\D/g, ""), 10);
          if (num >= 10 && num <= 110) draftData.age = num;
        } else {
          // Check trailing number e.g. "Priya Sharma 28"
          const nameTokens = possibleName.split(/\s+/);
          const lastToken = nameTokens[nameTokens.length - 1]!;
          const num = parseInt(lastToken, 10);
          if (num >= 10 && num <= 110 && nameTokens.length >= 2) {
            draftData.age = num;
            draftData.patientName = nameTokens.slice(0, -1).join(" ");
          }
        }
        draftData.subStep = 2;
      }
    } else if (pending.subStep === 2) {
      // Step 2: Couple / Partner Details
      const lower = clean.toLowerCase();
      if (lower === "solo" || lower === "no" || lower === "skip" || lower === "none" || lower === "single") {
        draftData.isCouple = false;
        draftData.subStep = 3;
      } else {
        draftData.isCouple = true;
        // Parse partner name & age (e.g. "Rahul Sharma, 31" or "Rahul Sharma")
        const partnerParts = clean.replace(/^(?:yes|partner|spouse|husband|wife)\s*[:=-]?\s*/i, "").split(/,|\n/).map((p) => p.trim());
        const pName = partnerParts[0]!;
        if (pName && !isCommandOrGreeting(pName) && pName.length >= 2) {
          draftData.partnerName = pName;
          if (partnerParts.length > 1) {
            const num = parseInt(partnerParts[1]!.replace(/\D/g, ""), 10);
            if (num >= 10 && num <= 110) draftData.partnerAge = num;
          } else {
            const pTokens = pName.split(/\s+/);
            const lastPart = pTokens[pTokens.length - 1]!;
            const num = parseInt(lastPart, 10);
            if (num >= 10 && num <= 110 && pTokens.length >= 2) {
              draftData.partnerAge = num;
              draftData.partnerName = pTokens.slice(0, -1).join(" ");
            }
          }
        }
        draftData.subStep = 3;
      }
    } else if (pending.subStep === 3) {
      // Step 3: Treatment focus & gender
      const lower = clean.toLowerCase();
      if (clean === "1" || /\b(ivf|icsi)\b/i.test(lower)) {
        draftData.treatmentInterest = "IVF";
      } else if (clean === "2" || /\biui\b/i.test(lower)) {
        draftData.treatmentInterest = "IUI";
      } else if (clean === "3" || /\b(evaluat|checkup|assessment)\b/i.test(lower)) {
        draftData.treatmentInterest = "EVALUATION";
      } else if (clean === "4" || /\b(consult|general)\b/i.test(lower)) {
        draftData.treatmentInterest = "GENERAL";
      }

      const g = parseGender(clean);
      if (g !== "UNSPECIFIED") draftData.gender = g;
    }
  }

  // Advance intermediate steps
  if (draftData.patientName && draftData.patientName.length >= 2) {
    if (draftData.subStep === 2 && !composite && inDraft && pending.subStep === 1) {
      const updatedDraft: RegistrationDraft = {
        kind: "REGISTRATION",
        subStep: 2,
        patientName: draftData.patientName,
        age: draftData.age,
        dateOfBirth: draftData.dateOfBirth,
        gender: draftData.gender,
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

    if (draftData.subStep === 3 && !composite && inDraft && pending.subStep === 2) {
      const updatedDraft: RegistrationDraft = {
        kind: "REGISTRATION",
        subStep: 3,
        patientName: draftData.patientName,
        age: draftData.age,
        dateOfBirth: draftData.dateOfBirth,
        gender: draftData.gender,
        partnerName: draftData.partnerName,
        partnerAge: draftData.partnerAge,
        partnerDateOfBirth: draftData.partnerDateOfBirth,
        isCouple: draftData.isCouple,
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

    const primaryGender = draftData.gender && draftData.gender !== "UNSPECIFIED" ? draftData.gender : "FEMALE";

    const patient = await prisma.patient.create({
      data: {
        clinicId: input.tenant.clinicId,
        firstName,
        lastName,
        phone: normalizedPhone,
        whatsappNumber: normalizedPhone,
        dateOfBirth: dob,
        gender: primaryGender,
        preferredLanguage: "en",
        status: "ACTIVE",
      },
    });

    let coupleId: string | null = null;
    let partnerCreatedName: string | null = null;

    if (draftData.partnerName?.trim() && draftData.isCouple !== false) {
      const pName = splitFullName(draftData.partnerName);
      partnerCreatedName = `${pName.firstName} ${pName.lastName}`.trim();

      let partnerDob: Date | null = null;
      if (draftData.partnerDateOfBirth) {
        const parsed = new Date(
          draftData.partnerDateOfBirth.includes("T") ? draftData.partnerDateOfBirth : `${draftData.partnerDateOfBirth}T00:00:00`,
        );
        if (!Number.isNaN(parsed.getTime())) partnerDob = parsed;
      } else if (draftData.partnerAge) {
        const yr = new Date().getFullYear() - draftData.partnerAge;
        partnerDob = new Date(`${yr}-01-01T00:00:00`);
      }

      const partnerGender = draftData.partnerGender ?? (primaryGender === "FEMALE" ? "MALE" : "FEMALE");
      const partner = await prisma.patient.create({
        data: {
          clinicId: input.tenant.clinicId,
          firstName: pName.firstName,
          lastName: pName.lastName,
          phone: draftData.partnerPhone || null,
          gender: partnerGender,
          dateOfBirth: partnerDob,
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
          status: "ACTIVE",
        },
      });
      coupleId = couple.id;
    } else {
      // Individual fertility couple record
      try {
        const couple = await prisma.couple.create({
          data: {
            clinicId: input.tenant.clinicId,
            slug: `c-${patient.id.slice(-8)}-${Date.now().toString(36)}`,
            primaryPatientId: patient.id,
            status: "ACTIVE",
          },
        });
        coupleId = couple.id;
      } catch {
        /* non-blocking */
      }
    }

    // If treatment focus was chosen and couple exists, create initial Treatment record
    if (coupleId && draftData.treatmentInterest) {
      const treatmentKind =
        draftData.treatmentInterest === "IVF"
          ? "IVF"
          : draftData.treatmentInterest === "IUI"
          ? "IUI"
          : "EVALUATION";
      const treatmentLabel =
        draftData.treatmentInterest === "IVF"
          ? "IVF / ICSI Treatment"
          : draftData.treatmentInterest === "IUI"
          ? "IUI Treatment"
          : "Fertility Evaluation";

      await prisma.treatment
        .create({
          data: {
            clinicId: input.tenant.clinicId,
            coupleId,
            kind: treatmentKind,
            label: treatmentLabel,
            status: "ACTIVE",
          },
        })
        .catch(() => undefined);
    }

    // Link conversation to patient & couple, clear pending action
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
    await prisma.lead
      .updateMany({
        where: {
          clinicId: input.tenant.clinicId,
          OR: [{ conversationId: conversation.id }, { phone: normalizedPhone }],
        },
        data: {
          patientId: patient.id,
          status: "CONVERTED",
          stage: "ACTIVE_PATIENT",
        },
      })
      .catch(() => undefined);

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
      treatmentInterest: draftData.treatmentInterest,
    });

    await sendWhatsAppAiSessionText(input.tenant, {
      conversationId: conversation.id,
      body: successMessage,
    }).catch(() => undefined);

    // Also send the Namma Metro Main Menu right after registration
    void import("./menu")
      .then(({ sendMainMenu }) =>
        sendMainMenu(input.tenant, conversation.id, {
          customHeader: `🏥 Welcome to ${clinicName}!`,
          customBody: `Your patient registration is complete! You can now use the menu below to view available doctor slots, book your consultation, or explore our services:`,
        }),
      )
      .catch(() => undefined);

    return {
      handled: true,
      registered: true,
      patientId: patient.id,
      coupleId: coupleId ?? undefined,
      responseMessage: successMessage,
    };
  }

  return { handled: false };
}
