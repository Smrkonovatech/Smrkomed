/**
 * WhatsApp Patient & Couple Self-Registration Handler
 * Guides visitors through structured couple registration (primary + partner details + treatment focus),
 * parses composite registration replies, collects exact DOB and partner WhatsApp numbers,
 * creates official Patient and Couple records, and seamlessly presents the Namma Metro-style interactive menu.
 */

import { Prisma, type Gender } from "@prisma/client";
import type { TenantContext } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import {
  sendWhatsAppAiSessionText,
  sendWhatsAppInteractiveButtons,
} from "../../integrations/providers/whatsapp/messaging";

export const REG_ACTIONS = {
  COUPLE_YES: "reg_couple_yes",
  COUPLE_SOLO: "reg_couple_solo",
  PARTNER_PHONE_SKIP: "reg_partner_phone_skip",
  FOCUS_IVF: "reg_focus_ivf",
  FOCUS_IUI: "reg_focus_iui",
  FOCUS_EVAL: "reg_focus_eval",
  FOCUS_GEN: "reg_focus_gen",
} as const;

export type RegistrationDraft = {
  kind: "REGISTRATION";
  subStep: 1 | 2 | 3 | 4;
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
 * Helper to parse either a full Date of Birth or an Age number.
 */
export function parseDobOrAge(text: string): {
  dateOfBirth?: string | undefined;
  age?: number | undefined;
} {
  const clean = text.trim();

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = clean.match(/\b(19\d{2}|20[0-2]\d)[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (isoMatch) {
    const yr = parseInt(isoMatch[1]!, 10);
    const mo = parseInt(isoMatch[2]!, 10);
    const da = parseInt(isoMatch[3]!, 10);
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      const pad = (n: number) => n.toString().padStart(2, "0");
      const dobStr = `${yr}-${pad(mo)}-${pad(da)}`;
      const approxAge = new Date().getFullYear() - yr;
      return { dateOfBirth: dobStr, age: approxAge > 0 ? approxAge : undefined };
    }
  }

  // 2. Day-Month-Year format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = clean.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](19\d{2}|20[0-2]\d)\b/);
  if (dmyMatch) {
    const da = parseInt(dmyMatch[1]!, 10);
    const mo = parseInt(dmyMatch[2]!, 10);
    const yr = parseInt(dmyMatch[3]!, 10);
    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      const pad = (n: number) => n.toString().padStart(2, "0");
      const dobStr = `${yr}-${pad(mo)}-${pad(da)}`;
      const approxAge = new Date().getFullYear() - yr;
      return { dateOfBirth: dobStr, age: approxAge > 0 ? approxAge : undefined };
    }
  }

  // 3. Standalone Age: 2 digits (between 10 and 110)
  const ageMatch = clean.match(/(?:^|\b|\s)(?:age[:=-]?\s*)?(\d{1,2})(?:\s*years?|\s*yrs?)?(?:$|\b|\s)/i);
  if (ageMatch) {
    const num = parseInt(ageMatch[1]!, 10);
    if (num >= 10 && num <= 110) {
      const yr = new Date().getFullYear() - num;
      return { age: num, dateOfBirth: `${yr}-01-01` };
    }
  }

  return {};
}

/**
 * Helper to extract phone number (10 digits Indian or international format) from text.
 */
export function parsePhoneNumber(text: string): string | undefined {
  // 1. Look for explicit international format: +[country code][10-15 digits]
  const intlMatch = text.match(/\+(\d{10,15})\b/);
  if (intlMatch) {
    return `+${intlMatch[1]}`;
  }

  // 2. Look for Indian mobile (+91 or 91 or without prefix, 10 digits starting with 6-9)
  const inMatch = text.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
  if (inMatch) {
    return `+91${inMatch[1]}`;
  }

  // 3. Fallback: if text itself is just digits (clean)
  const clean = text.replace(/[^0-9+]/g, "");
  if (/^\+91\d{10}$/.test(clean)) return clean;
  if (/^91\d{10}$/.test(clean)) return `+${clean}`;
  if (/^[6-9]\d{9}$/.test(clean)) return `+91${clean}`;
  if (/^\+\d{10,15}$/.test(clean)) return clean;

  return undefined;
}

/**
 * Prompt for step-by-step couple and patient registration.
 */
export function formatRegistrationStepPrompt(draft: RegistrationDraft): string {
  if (draft.subStep === 1 || !draft.patientName) {
    return (
      `📝 *Patient & Couple Registration (Step 1/3)*\n\n` +
      `Please reply with your *Full Name* and *Age or Date of Birth* (e.g. *Priya Sharma, 28* or *Priya Sharma, 14/08/1996*):` +
      `\n\n_(Your WhatsApp number will be linked as your registered mobile.)_` +
      FOOTER_NAV
    );
  }

  if (draft.subStep === 2) {
    if (draft.isCouple && !draft.partnerName) {
      return (
        `📝 *Couple Registration (Step 2/3) — Partner Details*\n\n` +
        `Please reply with your *Partner's Full Name, Age/DOB, and Mobile Number*:\n` +
        `_Example: "Rahul Sharma, 31, 9876543210" or "Rahul Sharma, 12/05/1994"_\n\n` +
        `_(Their number will be used to send partner-specific reminders and IVF instructions)_` +
        FOOTER_NAV
      );
    }
    return (
      `📝 *Couple Registration (Step 2/3)*\n\n` +
      `Thank you, *${draft.patientName}*!\n\n` +
      `Are you registering as a couple for fertility treatment?\n` +
      `• If *Yes*, tap *Yes, Couple* or reply with your *Partner's Full Name & Age* (e.g. *Rahul Sharma, 31*).\n` +
      `• If *No* (registering individually), tap *Solo* or reply *'Solo'*.\n` +
      `_(You can also include partner Date of Birth, Mobile, or Gender)_` +
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
    `_Tap an option or reply 1, 2, 3, or 4 (or reply 'Female, IVF')._` +
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
  text += `2️⃣ 📋 *Open Main Menu*\n`;
  text += `3️⃣ 👩‍⚕️ *Speak with a Care Coordinator*\n\n`;
  text += `_Tap an option from the menu below, or type what you need._`;
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
 * e.g. "Name: Priya Sharma, DOB: 1996-05-12, Gender: Female, Partner: Rahul Sharma, 31, 9876543210, IVF"
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
  partnerPhone?: string | undefined;
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
  const partnerMatch = clean.match(/(?:partner|husband|wife|spouse)(?:\s*name)?\s*[:=-]?\s*([a-zA-Z\s'.]+?)(?=(?:,\s*|;|\n|\s+(?:age|dob|gender|treatment|phone))|$)/i);
  const partnerAgeMatch = clean.match(/partner\s*age\s*[:=-]?\s*(\d{1,2})/i);
  const partnerDobMatch = clean.match(/partner\s*(?:dob|date\s*of\s*birth)\s*[:=-]?\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i);
  const partnerPhoneMatch = clean.match(/(?:partner\s*)?(?:phone|mobile|wa|whatsapp)\s*[:=-]?\s*(\+?\d{10,14})/i);

  if (nameMatch || (ageMatch && genderMatch)) {
    const rawName = nameMatch ? nameMatch[1]?.trim() : undefined;
    const ageNum = ageMatch ? parseInt(ageMatch[1]!, 10) : undefined;
    const gender = genderMatch ? parseGender(genderMatch[1]!) : undefined;
    const partner = partnerMatch ? partnerMatch[1]?.trim() : undefined;
    const partnerAge = partnerAgeMatch ? parseInt(partnerAgeMatch[1]!, 10) : undefined;
    let dob = dobMatch ? dobMatch[1]?.trim() : undefined;
    let partnerDob = partnerDobMatch ? partnerDobMatch[1]?.trim() : undefined;
    if (!partnerDob && partner) {
      const partnerIndex = clean.search(/(?:partner|husband|wife|spouse)/i);
      if (partnerIndex !== -1) {
        const afterPartner = clean.slice(partnerIndex);
        const secondDob = afterPartner.match(/(?:dob|date\s*of\s*birth)\s*[:=-]?\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})/i);
        if (secondDob) {
          partnerDob = secondDob[1]?.trim();
        }
      }
    }
    const partnerPhone = partnerPhoneMatch ? parsePhoneNumber(partnerPhoneMatch[1]!) : undefined;

    const out: {
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
      subStep?: 1 | 2 | 3 | undefined;
    } = {
      subStep: 3,
    };
    if (rawName) out.patientName = rawName;
    if (ageNum && ageNum >= 10 && ageNum <= 110) out.age = ageNum;
    if (dob) {
      const parsedDob = parseDobOrAge(dob);
      out.dateOfBirth = parsedDob.dateOfBirth || dob;
      if (!out.age && parsedDob.age) out.age = parsedDob.age;
    }
    if (gender) out.gender = gender;
    if (partner) {
      out.partnerName = partner;
      out.isCouple = true;
    }
    if (partnerAge) out.partnerAge = partnerAge;
    if (partnerDob) {
      const parsedPDob = parseDobOrAge(partnerDob);
      out.partnerDateOfBirth = parsedPDob.dateOfBirth || partnerDob;
      if (!out.partnerAge && parsedPDob.age) out.partnerAge = parsedPDob.age;
    }
    if (partnerPhone) out.partnerPhone = partnerPhone;
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
      let partnerDateOfBirth: string | undefined;
      let partnerGender: Gender | undefined;
      let partnerPhone: string | undefined;

      for (let i = 1; i < commaParts.length; i++) {
        const part = commaParts[i]!;

        // Check for partner phone
        const pPhone = parsePhoneNumber(part);
        if (pPhone && !partnerPhone && partnerName) {
          partnerPhone = pPhone;
          continue;
        }

        // Check for partner prefix
        if (/^(?:partner|spouse|husband|wife)\s*[:=-]?\s*/i.test(part)) {
          const partnerRaw = part.replace(/^(?:partner|spouse|husband|wife)\s*[:=-]?\s*/i, "").trim();
          const pDobAge = parseDobOrAge(partnerRaw);
          if (pDobAge.dateOfBirth) partnerDateOfBirth = pDobAge.dateOfBirth;
          if (pDobAge.age) partnerAge = pDobAge.age;

          // Strip numbers/dates out of partnerRaw to get clean name
          const pNameClean = partnerRaw
            .replace(/\b(19\d{2}|20[0-2]\d)[-/.](\d{1,2})[-/.](\d{1,2})\b/g, "")
            .replace(/\b(\d{1,2})[-/.](\d{1,2})[-/.](19\d{2}|20[0-2]\d)\b/g, "")
            .replace(/\b\d{1,2}\b/g, "")
            .trim();
          partnerName = pNameClean || partnerRaw;
          continue;
        }

        const dobOrAge = parseDobOrAge(part);
        if (dobOrAge.dateOfBirth && !dateOfBirth) {
          dateOfBirth = dobOrAge.dateOfBirth;
          if (!age && dobOrAge.age) age = dobOrAge.age;
          continue;
        }
        if (dobOrAge.age && !age) {
          age = dobOrAge.age;
          continue;
        } else if (dobOrAge.age && !partnerAge && partnerName) {
          partnerAge = dobOrAge.age;
          if (dobOrAge.dateOfBirth) partnerDateOfBirth = dobOrAge.dateOfBirth;
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
          partnerDateOfBirth,
          partnerGender,
          partnerPhone,
          treatmentInterest,
          isCouple: Boolean(partnerName),
          subStep: 3,
        };
      }
    }
  }

  return null;
}

export function isCommandOrGreeting(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (lower.startsWith("reg_")) return false;
  return (
    /^(hi+|hello|hey+|restart|cancel|reset|back|human|help|menu|book|appointment|register|status)$/i.test(lower) ||
    /\b(book\s*appointment|book\s*consultation|book\s*appt|main\s*menu|more\s*services)\b/i.test(lower) ||
    lower.startsWith("menu_") ||
    lower.startsWith("btn_") ||
    lower.startsWith("appt_")
  );
}

export function isValidPersonName(text: string): boolean {
  const clean = text.trim();
  if (clean.length < 2 || clean.length > 50) return false;
  if (/^\d+$/.test(clean)) return false;
  if (clean.toLowerCase().startsWith("reg_")) return false;
  if (isCommandOrGreeting(clean)) return false;
  if (
    /\b(book|appointment|consultation|schedule|doctor|slots?|menu|help|register|registration|cancel|restart|reset|start|hi|hello|hey|test|clinic|dr|solo|skip|yes|no)\b/i.test(clean) ||
    clean.toLowerCase().startsWith("menu_") ||
    clean.toLowerCase().startsWith("btn_") ||
    clean.toLowerCase().startsWith("appt_")
  ) {
    return false;
  }
  return /^[a-zA-Z\s'.\-]+$/.test(clean);
}

/**
 * Dispatches WhatsApp interactive buttons with graceful fallback to session text.
 */
async function safeSendStepPrompt(
  tenant: TenantContext,
  conversationId: string,
  options: {
    fallbackText: string;
    interactive?: {
      body: string;
      buttons: Array<{ id: string; title: string }>;
      footer?: string;
    };
  },
): Promise<void> {
  if (options.interactive && options.interactive.buttons.length >= 1 && options.interactive.buttons.length <= 3) {
    try {
      await sendWhatsAppInteractiveButtons(tenant, {
        conversationId,
        body: options.interactive.body,
        buttons: options.interactive.buttons,
        ...(options.interactive.footer ? { footer: options.interactive.footer } : {}),
      });
      return;
    } catch {
      // Gracefully fall back to standard text
    }
  }
  await sendWhatsAppAiSessionText(tenant, {
    conversationId,
    body: options.fallbackText,
  }).catch(() => undefined);
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

  // When user triggers registration or booking, ALWAYS start fresh at Step 1
  if ((isRegisterTrigger || isBookingTrigger) && !composite) {
    const draft: RegistrationDraft = { kind: "REGISTRATION", subStep: 1 };
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        pendingAction: draft,
        pendingActionExpiresAt: new Date(Date.now() + 60 * 60_000), // 1 hour TTL
      },
    });
    const prompt = isBookingTrigger
      ? `👋 Welcome to *${clinicName}*!\n\nTo schedule your consultation and create your clinic file, clinic guidelines require completing your registration first (3 quick steps) 📝\n\n${formatRegistrationStepPrompt(draft)}`
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
    if (pending.subStep === 1) {
      // Step 1: User provides Full Name and Age / DOB
      const dobOrAge = parseDobOrAge(clean);
      const nameParts = clean.split(/,|\n/).map((p) => p.trim());
      let possibleName = nameParts[0]!;

      // Check if last token is age or dob e.g. "Priya Sharma, 28"
      const tokens = possibleName.split(/\s+/);
      if (tokens.length >= 2) {
        const lastToken = tokens[tokens.length - 1]!;
        const tokenDobAge = parseDobOrAge(lastToken);
        if (tokenDobAge.age || tokenDobAge.dateOfBirth) {
          possibleName = tokens.slice(0, -1).join(" ");
        }
      }

      if (!isValidPersonName(possibleName)) {
        const prompt = `Please share your actual *Full Name* and *Age or Date of Birth* (e.g. "Priya Sharma, 28" or "Priya Sharma, 14/08/1996") to continue registration:`;
        await sendWhatsAppAiSessionText(input.tenant, {
          conversationId: conversation.id,
          body: prompt,
        }).catch(() => undefined);
        return { handled: true, responseMessage: prompt };
      }

      draftData.patientName = possibleName;
      if (dobOrAge.age) draftData.age = dobOrAge.age;
      if (dobOrAge.dateOfBirth) draftData.dateOfBirth = dobOrAge.dateOfBirth;
      draftData.subStep = 2;
    } else if (pending.subStep === 2) {
      // Step 2: Couple / Partner Details
      const lower = clean.toLowerCase();

      // Check if user tapped Solo or replied Solo / No
      if (
        clean === REG_ACTIONS.COUPLE_SOLO ||
        lower === "solo" ||
        lower === "no" ||
        lower === "none" ||
        lower === "single" ||
        lower === "individual" ||
        lower === "skip" ||
        clean === "2"
      ) {
        draftData.isCouple = false;
        draftData.partnerName = undefined;
        draftData.subStep = 3;
      }
      // Check if user tapped Yes or replied Yes / Couple
      else if (
        (clean === REG_ACTIONS.COUPLE_YES || lower === "yes" || lower === "couple" || clean === "1") &&
        !draftData.partnerName
      ) {
        draftData.isCouple = true;
        const updatedDraft: RegistrationDraft = {
          ...draftData,
          kind: "REGISTRATION",
          subStep: 2,
          isCouple: true,
        };
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            pendingAction: updatedDraft,
            pendingActionExpiresAt: new Date(Date.now() + 60 * 60_000),
          },
        });
        const prompt = formatRegistrationStepPrompt(updatedDraft);
        await safeSendStepPrompt(input.tenant, conversation.id, {
          fallbackText: prompt,
          interactive: {
            body: `📝 *Couple Registration (Step 2/3) — Partner Details*\n\nPlease reply with your *Partner's Full Name, Age/DOB, and Mobile Number*:\n_Example: "Rahul Sharma, 31, 9876543210"_`,
            buttons: [{ id: REG_ACTIONS.PARTNER_PHONE_SKIP, title: "⏭️ Skip Partner Phone" }],
            footer: "Reply with partner details or tap Skip Phone",
          },
        });
        return { handled: true, responseMessage: prompt };
      }
      // User replied with partner details
      else {
        // If user tapped Skip Phone button while in partner details prompt
        if (clean === REG_ACTIONS.PARTNER_PHONE_SKIP) {
          const prompt = `Please reply with your Partner's *Name & Age* (e.g. "Rahul Sharma, 31"):`;
          await sendWhatsAppAiSessionText(input.tenant, {
            conversationId: conversation.id,
            body: prompt,
          }).catch(() => undefined);
          return { handled: true, responseMessage: prompt };
        }

        // Extract partner phone if present
        const pPhone = parsePhoneNumber(clean);
        // Extract partner DOB or age
        const pDobOrAge = parseDobOrAge(clean);

        // Extract partner name
        const partnerParts = clean
          .replace(/^(?:yes|partner|spouse|husband|wife)\s*[:=-]?\s*/i, "")
          .split(/,|\n/)
          .map((p) => p.trim());
        let pName = partnerParts[0]!;

        const pTokens = pName.split(/\s+/);
        if (pTokens.length >= 2) {
          const lastPart = pTokens[pTokens.length - 1]!;
          const tokenDobAge = parseDobOrAge(lastPart);
          if (tokenDobAge.age || tokenDobAge.dateOfBirth) {
            pName = pTokens.slice(0, -1).join(" ");
          }
        }

        // Strip phone from name if matched
        if (pPhone) {
          pName = pName.replace(pPhone, "").replace(/\+?\d{10,14}/, "").trim();
        }

        if (!isValidPersonName(pName)) {
          const prompt = `Please reply with your Partner's *Name & Age* (e.g. "Rahul Sharma, 31" or "Rahul Sharma, 31, 9876543210"), or reply *"Solo"* if attending individually:`;
          await sendWhatsAppAiSessionText(input.tenant, {
            conversationId: conversation.id,
            body: prompt,
          }).catch(() => undefined);
          return { handled: true, responseMessage: prompt };
        }

        draftData.isCouple = true;
        draftData.partnerName = pName;
        if (pPhone) draftData.partnerPhone = pPhone;
        if (pDobOrAge.age) draftData.partnerAge = pDobOrAge.age;
        if (pDobOrAge.dateOfBirth) draftData.partnerDateOfBirth = pDobOrAge.dateOfBirth;
        draftData.subStep = 3;
      }
    } else if (pending.subStep === 3) {
      // Step 3: Treatment focus & gender
      const lower = clean.toLowerCase();
      if (clean === REG_ACTIONS.FOCUS_IVF || clean === "1" || /\b(ivf|icsi)\b/i.test(lower)) {
        draftData.treatmentInterest = "IVF";
      } else if (clean === REG_ACTIONS.FOCUS_IUI || clean === "2" || /\biui\b/i.test(lower)) {
        draftData.treatmentInterest = "IUI";
      } else if (clean === REG_ACTIONS.FOCUS_EVAL || clean === "3" || /\b(evaluat|checkup|assessment)\b/i.test(lower)) {
        draftData.treatmentInterest = "EVALUATION";
      } else if (clean === REG_ACTIONS.FOCUS_GEN || clean === "4" || /\b(consult|general)\b/i.test(lower)) {
        draftData.treatmentInterest = "GENERAL";
      } else {
        draftData.treatmentInterest = "GENERAL";
      }

      const g = parseGender(clean);
      if (g !== "UNSPECIFIED") draftData.gender = g;
      draftData.subStep = 4; // Ready to finalize!
    }
  }

  // Advance intermediate steps
  if (draftData.patientName && isValidPersonName(draftData.patientName)) {
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
      await safeSendStepPrompt(input.tenant, conversation.id, {
        fallbackText: prompt,
        interactive: {
          body: `✅ Thank you, *${draftData.patientName}*!\n\nAre you registering as a couple for fertility treatment?`,
          buttons: [
            { id: REG_ACTIONS.COUPLE_YES, title: "👫 Yes, Couple" },
            { id: REG_ACTIONS.COUPLE_SOLO, title: "👤 Solo" },
          ],
          footer: "Select an option to proceed",
        },
      });
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
        partnerPhone: draftData.partnerPhone,
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
      await safeSendStepPrompt(input.tenant, conversation.id, {
        fallbackText: prompt,
        interactive: {
          body: `📋 *Clinical Focus (Step 3/3)*\n\nPlease select your primary treatment interest:`,
          buttons: [
            { id: REG_ACTIONS.FOCUS_IVF, title: "🧬 IVF / ICSI" },
            { id: REG_ACTIONS.FOCUS_IUI, title: "💉 IUI" },
            { id: REG_ACTIONS.FOCUS_EVAL, title: "🏥 Evaluation" },
          ],
          footer: "Select an option or reply with your choice",
        },
      });
      return { handled: true, responseMessage: prompt };
    }

    // Guard: Do NOT finalize unless composite or completed all steps (subStep === 4)
    if (!composite && draftData.subStep !== 4) {
      return { handled: false };
    }

    // Guard: Must have a valid patient name before DB creation
    if (!draftData.patientName || !isValidPersonName(draftData.patientName)) {
      return { handled: false };
    }

    // Finalize registration!
    const { firstName, lastName } = splitFullName(draftData.patientName);
    const normalizedPhone = input.contactPhone.replace(/\s+/g, "");

    // Calculate exact date of birth or approximate from age
    let dob: Date | null = null;
    if (draftData.dateOfBirth) {
      const parsed = new Date(draftData.dateOfBirth.includes("T") ? draftData.dateOfBirth : `${draftData.dateOfBirth}T00:00:00.000Z`);
      if (!Number.isNaN(parsed.getTime())) dob = parsed;
    } else if (draftData.age) {
      const yr = new Date().getFullYear() - draftData.age;
      dob = new Date(`${yr}-01-01T00:00:00.000Z`);
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
          draftData.partnerDateOfBirth.includes("T") ? draftData.partnerDateOfBirth : `${draftData.partnerDateOfBirth}T00:00:00.000Z`,
        );
        if (!Number.isNaN(parsed.getTime())) partnerDob = parsed;
      } else if (draftData.partnerAge) {
        const yr = new Date().getFullYear() - draftData.partnerAge;
        partnerDob = new Date(`${yr}-01-01T00:00:00.000Z`);
      }

      const partnerGender = draftData.partnerGender ?? (primaryGender === "FEMALE" ? "MALE" : "FEMALE");
      const partnerPhoneNorm = draftData.partnerPhone ? draftData.partnerPhone.replace(/\s+/g, "") : null;

      const partner = await prisma.patient.create({
        data: {
          clinicId: input.tenant.clinicId,
          firstName: pName.firstName,
          lastName: pName.lastName,
          phone: partnerPhoneNorm,
          whatsappNumber: partnerPhoneNorm,
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

      // If partner provided a WhatsApp number, register/update their dedicated conversation thread
      if (partnerPhoneNorm && coupleId) {
        const existingPartnerConv = await prisma.conversation.findFirst({
          where: {
            clinicId: input.tenant.clinicId,
            contactPhone: partnerPhoneNorm,
          },
        });
        if (existingPartnerConv) {
          await prisma.conversation.update({
            where: { id: existingPartnerConv.id },
            data: {
              patientId: partner.id,
              coupleId,
              unmatched: false,
            },
          }).catch(() => undefined);
        } else {
          await prisma.conversation.create({
            data: {
              clinicId: input.tenant.clinicId,
              patientId: partner.id,
              coupleId,
              contactPhone: partnerPhoneNorm,
              channel: "WHATSAPP",
              status: "OPEN",
              unmatched: false,
            },
          }).catch(() => undefined);
        }
      }
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
