import assert from "node:assert/strict";
import { test } from "node:test";

import {
  parseDobOrAge,
  parsePhoneNumber,
  parseCompositeRegistration,
  tryHandleRegistrationMessage,
  REG_ACTIONS,
} from "./modules/whatsapp-ai/registration";
import { prisma } from "@smrkomed/database";

test("parseDobOrAge correctly parses various DOB formats and fallback age", () => {
  // DD/MM/YYYY format
  const dmy = parseDobOrAge("Priya Sharma, 14/08/1996");
  assert.equal(dmy.dateOfBirth, "1996-08-14");
  assert.ok(dmy.age && dmy.age >= 25);

  // DD-MM-YYYY format
  const dmyHyphen = parseDobOrAge("Rahul Sharma, 25-12-1993");
  assert.equal(dmyHyphen.dateOfBirth, "1993-12-25");

  // YYYY-MM-DD format
  const iso = parseDobOrAge("1995-05-20");
  assert.equal(iso.dateOfBirth, "1995-05-20");

  // Fallback 2-digit age
  const ageOnly = parseDobOrAge("29");
  assert.equal(ageOnly.age, 29);
  assert.ok(ageOnly.dateOfBirth?.endsWith("-01-01"));
});

test("parsePhoneNumber normalizes 10-digit and international phone numbers", () => {
  assert.equal(parsePhoneNumber("9876543210"), "+919876543210");
  assert.equal(parsePhoneNumber("+919876543210"), "+919876543210");
  assert.equal(parsePhoneNumber("+14155552671"), "+14155552671");
});

test("parseCompositeRegistration extracts DOB and Partner WhatsApp Number", () => {
  const result = parseCompositeRegistration(
    "Name: Ananya Roy, DOB: 1997-04-15, Female, Partner: Dev Roy, DOB: 1995-09-20, Phone: 9876500001, IVF"
  );
  assert.ok(result);
  assert.equal(result.patientName, "Ananya Roy");
  assert.equal(result.dateOfBirth, "1997-04-15");
  assert.equal(result.partnerName, "Dev Roy");
  assert.equal(result.partnerDateOfBirth, "1995-09-20");
  assert.equal(result.partnerPhone, "+919876500001");
  assert.equal(result.treatmentInterest, "IVF");
  assert.equal(result.isCouple, true);
});

test("tryHandleRegistrationMessage handles interactive buttons, captures DOB and Partner WhatsApp, and creates separate partner Conversation", async () => {
  const clinic = await prisma.clinic.findFirst();
  if (!clinic) return;

  const testPrimaryPhone = `+919833${Math.floor(100000 + Math.random() * 900000)}`;
  const testPartnerPhone = `+919844${Math.floor(100000 + Math.random() * 900000)}`;

  const conv = await prisma.conversation.create({
    data: {
      clinicId: clinic.id,
      channel: "WHATSAPP",
      contactPhone: testPrimaryPhone,
      unmatched: true,
      status: "OPEN",
    },
  });

  const tenant = {
    clinicId: clinic.id,
    clinicName: clinic.name,
    organizationId: clinic.organizationId,
    organizationName: "Test Health",
    userId: "test-user-reg-dob",
    role: "CLINIC_ADMIN" as const,
  };

  try {
    // 1. Initial trigger: patient initiates registration
    const initRes = await tryHandleRegistrationMessage({
      tenant,
      conversationId: conv.id,
      contactPhone: testPrimaryPhone,
      messageText: "register",
    });
    assert.equal(initRes.handled, true);
    assert.ok(/Patient.*Registration/i.test(initRes.responseMessage || ""));

    // 2. Step 1: Patient provides Name and full DOB
    const step1Res = await tryHandleRegistrationMessage({
      tenant,
      conversationId: conv.id,
      contactPhone: testPrimaryPhone,
      messageText: "Priya Sharma, 14/08/1996",
    });
    assert.equal(step1Res.handled, true);
    assert.ok(/Couple Registration|Partner/i.test(step1Res.responseMessage || ""));

    // 3. Step 2a: Patient taps the interactive button for Couple: "reg_couple_yes"
    const step2aRes = await tryHandleRegistrationMessage({
      tenant,
      conversationId: conv.id,
      contactPhone: testPrimaryPhone,
      messageText: REG_ACTIONS.COUPLE_YES,
    });
    assert.equal(step2aRes.handled, true);
    assert.ok(/Partner Details|Partner/i.test(step2aRes.responseMessage || ""));

    // 4. Step 2b: Patient provides Partner Name, DOB, and Mobile Number
    const step2bRes = await tryHandleRegistrationMessage({
      tenant,
      conversationId: conv.id,
      contactPhone: testPrimaryPhone,
      messageText: `Rahul Sharma, 12/05/1994, ${testPartnerPhone}`,
    });
    assert.equal(step2bRes.handled, true);
    assert.ok(/Treatment|Gender/i.test(step2bRes.responseMessage || ""));

    // 5. Step 3: Patient taps the interactive button for IVF: "reg_focus_ivf"
    const step3Res = await tryHandleRegistrationMessage({
      tenant,
      conversationId: conv.id,
      contactPhone: testPrimaryPhone,
      messageText: REG_ACTIONS.FOCUS_IVF,
    });
    assert.equal(step3Res.handled, true);
    assert.equal(step3Res.registered, true);
    assert.ok(step3Res.patientId);
    assert.ok(step3Res.coupleId);

    // Verify Primary Patient in DB
    const primary = await prisma.patient.findUnique({
      where: { id: step3Res.patientId },
    });
    assert.ok(primary);
    assert.equal(primary.firstName, "Priya");
    assert.equal(primary.lastName, "Sharma");
    assert.equal(primary.phone, testPrimaryPhone);
    assert.equal(primary.whatsappNumber, testPrimaryPhone);
    assert.ok(primary.dateOfBirth);
    assert.equal(primary.dateOfBirth.getUTCFullYear(), 1996);
    assert.equal(primary.dateOfBirth.getUTCMonth(), 7); // 0-indexed: August = 7
    assert.equal(primary.dateOfBirth.getUTCDate(), 14);

    // Verify Couple and Partner Patient in DB
    const couple = await prisma.couple.findUnique({
      where: { id: step3Res.coupleId },
      include: { partnerPatient: true },
    });
    assert.ok(couple);
    assert.ok(couple.partnerPatient);
    assert.equal(couple.partnerPatient.firstName, "Rahul");
    assert.equal(couple.partnerPatient.lastName, "Sharma");
    // Partner's phone and WhatsApp number MUST be populated!
    assert.equal(couple.partnerPatient.phone, testPartnerPhone);
    assert.equal(couple.partnerPatient.whatsappNumber, testPartnerPhone);
    // Partner's exact Date of Birth MUST be populated!
    assert.ok(couple.partnerPatient.dateOfBirth);
    assert.equal(couple.partnerPatient.dateOfBirth.getUTCFullYear(), 1994);
    assert.equal(couple.partnerPatient.dateOfBirth.getUTCMonth(), 4); // May = 4
    assert.equal(couple.partnerPatient.dateOfBirth.getUTCDate(), 12);

    // Verify separate partner Conversation was created for direct future reminders!
    const partnerConv = await prisma.conversation.findFirst({
      where: {
        clinicId: clinic.id,
        contactPhone: testPartnerPhone,
      },
    });
    assert.ok(partnerConv, "Partner should have a dedicated Conversation record");
    assert.equal(partnerConv.patientId, couple.partnerPatient.id);
    assert.equal(partnerConv.coupleId, couple.id);
    assert.equal(partnerConv.unmatched, false);
  } finally {
    await prisma.conversation.deleteMany({ where: { contactPhone: { in: [testPrimaryPhone, testPartnerPhone] } } }).catch(() => undefined);
    await prisma.treatment.deleteMany({ where: { couple: { primaryPatient: { phone: testPrimaryPhone } } } }).catch(() => undefined);
    await prisma.couple.deleteMany({ where: { primaryPatient: { phone: testPrimaryPhone } } }).catch(() => undefined);
    await prisma.patient.deleteMany({ where: { phone: { in: [testPrimaryPhone, testPartnerPhone] } } }).catch(() => undefined);
  }
});
