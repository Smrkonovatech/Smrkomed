import assert from "node:assert/strict";
import { test } from "node:test";

import {
  parseCompositeRegistration,
  formatRegistrationStepPrompt,
  formatRegistrationSuccessMessage,
  tryHandleRegistrationMessage,
} from "./modules/whatsapp-ai/registration";
import { generateWhatsAppAiReply } from "./modules/whatsapp-ai/generate";
import { handleMenuAction, sendMainMenu, MENU_ACTIONS } from "./modules/whatsapp-ai/menu";
import { prisma } from "@smrkomed/database";

test("Unregistered visitor can greet and ask questions freely without forced registration", async () => {
  // Case 1: Simple greeting
  const greeting = await generateWhatsAppAiReply({
    patientMessage: "hello",
    ctx: {
      clinicName: "Apex Fertility Clinic",
      clinicSlug: "apex-fertility",
      isRegistered: false,
      registrationUrl: "https://smrkomed.com/book/apex-fertility",
      patientFirstName: null,
      appointmentSummary: null,
      journeyStage: null,
      careTaskTitle: null,
      recentMessages: [],
    },
    knowledge: [],
  });

  assert.ok(/Apex Fertility/i.test(greeting.text));
  assert.ok(/how can i help/i.test(greeting.text));
  assert.ok(!/please reply with your full name|not yet registered/i.test(greeting.text));

  // Case 2: Knowledge question about treatments
  const kbReply = await generateWhatsAppAiReply({
    patientMessage: "What is IVF treatment?",
    ctx: {
      clinicName: "Apex Fertility Clinic",
      clinicSlug: "apex-fertility",
      isRegistered: false,
      registrationUrl: "https://smrkomed.com/book/apex-fertility",
      patientFirstName: null,
      appointmentSummary: null,
      journeyStage: null,
      careTaskTitle: null,
      recentMessages: [],
    },
    knowledge: [
      {
        id: "kb_1",
        title: "In Vitro Fertilization (IVF)",
        content: "IVF is a fertility procedure where eggs are retrieved and fertilized in our lab.",
        category: "TREATMENTS",
        specialty: null,
        score: 0.95,
      },
    ],
  });

  assert.ok(/IVF/i.test(kbReply.text));
  assert.ok(/fertilized/i.test(kbReply.text));
  assert.ok(!/not yet registered with/i.test(kbReply.text));
});

test("parseCompositeRegistration parses full couple details with treatment focus", () => {
  const text = "Sunita Verma, 29, Female, Partner: Amit Verma, 32, Male, Treatment: IVF";
  const parsed = parseCompositeRegistration(text);

  assert.ok(parsed);
  assert.equal(parsed.patientName, "Sunita Verma");
  assert.equal(parsed.age, 29);
  assert.equal(parsed.gender, "FEMALE");
  assert.equal(parsed.partnerName, "Amit Verma");
  assert.equal(parsed.partnerAge, 32);
  assert.equal(parsed.treatmentInterest, "IVF");
  assert.equal(parsed.isCouple, true);
});

test("parseCompositeRegistration parses labeled format with partner", () => {
  const text = `Name: Sneha Kulkarni
Age: 30
Gender: Female
Partner Name: Rohit Kulkarni
Partner Age: 33
Treatment: IUI`;

  const parsed = parseCompositeRegistration(text);
  assert.ok(parsed);
  assert.equal(parsed.patientName, "Sneha Kulkarni");
  assert.equal(parsed.age, 30);
  assert.equal(parsed.gender, "FEMALE");
  assert.equal(parsed.partnerName, "Rohit Kulkarni");
  assert.equal(parsed.partnerAge, 33);
  assert.equal(parsed.treatmentInterest, "IUI");
  assert.equal(parsed.isCouple, true);
});

test("tryHandleRegistrationMessage completes couple registration, creates both Patients and Couple record", async () => {
  const clinic = await prisma.clinic.findFirst();
  if (!clinic) return;

  const testPhone = `+919811${Math.floor(100000 + Math.random() * 900000)}`;

  const conv = await prisma.conversation.create({
    data: {
      clinicId: clinic.id,
      channel: "WHATSAPP",
      contactPhone: testPhone,
      unmatched: true,
      status: "OPEN",
    },
  });

  const tenant = {
    clinicId: clinic.id,
    clinicName: clinic.name,
    organizationId: clinic.organizationId,
    organizationName: "Apex Health",
    userId: "test-user",
    role: "CLINIC_ADMIN" as const,
  };

  try {
    // Step 1: Initial booking inquiry initiates registration
    const initRes = await tryHandleRegistrationMessage({
      tenant,
      conversationId: conv.id,
      contactPhone: testPhone,
      messageText: "I would like to book an appointment for fertility checkup",
    });

    assert.equal(initRes.handled, true);
    assert.ok(/Patient.*Registration/i.test(initRes.responseMessage || ""));

    // Step 2: Patient sends Name & Age
    const step1Res = await tryHandleRegistrationMessage({
      tenant,
      conversationId: conv.id,
      contactPhone: testPhone,
      messageText: "Meera Patel, 29",
    });

    assert.equal(step1Res.handled, true);
    assert.ok(/Couple Registration|Partner/i.test(step1Res.responseMessage || ""));

    // Step 3: Patient provides Partner Details
    const step2Res = await tryHandleRegistrationMessage({
      tenant,
      conversationId: conv.id,
      contactPhone: testPhone,
      messageText: "Karthik Patel, 32",
    });

    assert.equal(step2Res.handled, true);
    assert.ok(/Treatment|Gender/i.test(step2Res.responseMessage || ""));

    // Step 4: Patient provides treatment interest (1 = IVF)
    const step3Res = await tryHandleRegistrationMessage({
      tenant,
      conversationId: conv.id,
      contactPhone: testPhone,
      messageText: "1",
    });

    assert.equal(step3Res.handled, true);
    assert.equal(step3Res.registered, true);
    assert.ok(step3Res.patientId);
    assert.ok(step3Res.coupleId);

    // Verify in database: Primary patient created
    const primary = await prisma.patient.findUnique({
      where: { id: step3Res.patientId },
    });
    assert.ok(primary);
    assert.equal(primary.firstName, "Meera");
    assert.equal(primary.lastName, "Patel");
    assert.equal(primary.phone, testPhone);

    // Verify Couple record
    const couple = await prisma.couple.findUnique({
      where: { id: step3Res.coupleId },
      include: { partnerPatient: true },
    });
    assert.ok(couple);
    assert.equal(couple.primaryPatientId, primary.id);
    assert.ok(couple.partnerPatient);
    assert.equal(couple.partnerPatient?.firstName, "Karthik");
    assert.equal(couple.partnerPatient?.lastName, "Patel");

    // Verify initial Treatment created
    const treatment = await prisma.treatment.findFirst({
      where: { coupleId: couple.id },
    });
    assert.ok(treatment);
    assert.equal(treatment.kind, "IVF");

    // Verify conversation was updated and unmatched cleared
    const updatedConv = await prisma.conversation.findUnique({
      where: { id: conv.id },
    });
    assert.equal(updatedConv?.patientId, primary.id);
    assert.equal(updatedConv?.coupleId, couple.id);
    assert.equal(updatedConv?.unmatched, false);
    assert.equal(updatedConv?.pendingAction, null);
  } finally {
    await prisma.treatment.deleteMany({ where: { couple: { primaryPatient: { phone: testPhone } } } }).catch(() => undefined);
    await prisma.conversation.delete({ where: { id: conv.id } }).catch(() => undefined);
    await prisma.couple.deleteMany({ where: { primaryPatient: { phone: testPhone } } }).catch(() => undefined);
    await prisma.patient.deleteMany({ where: { phone: testPhone } }).catch(() => undefined);
  }
});

test("Namma Metro Menu: handleMenuAction dispatches menu options accurately", async () => {
  const clinic = await prisma.clinic.findFirst();
  if (!clinic) return;

  const testPhone = `+919822${Math.floor(100000 + Math.random() * 900000)}`;

  const conv = await prisma.conversation.create({
    data: {
      clinicId: clinic.id,
      channel: "WHATSAPP",
      contactPhone: testPhone,
      unmatched: false,
      status: "OPEN",
    },
  });

  const tenant = {
    clinicId: clinic.id,
    clinicName: clinic.name,
    organizationId: clinic.organizationId,
    organizationName: "Apex Health",
    userId: "test-user",
    role: "CLINIC_ADMIN" as const,
  };

  try {
    // 1. Menu Trigger
    const menuRes = await handleMenuAction({
      tenant,
      conversationId: conv.id,
      contactPhone: testPhone,
      actionIdOrText: "menu",
    });
    assert.equal(menuRes.handled, true);
    assert.equal(menuRes.action, "MAIN_MENU");

    // 2. Doctor Available Slots
    const slotsRes = await handleMenuAction({
      tenant,
      conversationId: conv.id,
      contactPhone: testPhone,
      actionIdOrText: MENU_ACTIONS.DOCTOR_SLOTS,
    });
    assert.equal(slotsRes.handled, true);
    assert.equal(slotsRes.action, "DOCTOR_SLOTS");
    assert.ok(/Available Consultation Slots/i.test(slotsRes.responseText || ""));

    // 3. My Appointments (empty case)
    const apptsRes = await handleMenuAction({
      tenant,
      conversationId: conv.id,
      contactPhone: testPhone,
      actionIdOrText: MENU_ACTIONS.MY_APPOINTMENTS,
    });
    assert.equal(apptsRes.handled, true);
    assert.equal(apptsRes.action, "MY_APPOINTMENTS");
    assert.ok(/My Appointments/i.test(apptsRes.responseText || ""));

    // 4. Treatments & Services
    const servicesRes = await handleMenuAction({
      tenant,
      conversationId: conv.id,
      contactPhone: testPhone,
      actionIdOrText: MENU_ACTIONS.SERVICES,
    });
    assert.equal(servicesRes.handled, true);
    assert.equal(servicesRes.action, "SERVICES");
    assert.ok(/Fertility Treatments & Services/i.test(servicesRes.responseText || ""));

    // 5. Timings & Location
    const timingsRes = await handleMenuAction({
      tenant,
      conversationId: conv.id,
      contactPhone: testPhone,
      actionIdOrText: MENU_ACTIONS.TIMINGS,
    });
    assert.equal(timingsRes.handled, true);
    assert.equal(timingsRes.action, "TIMINGS");
    assert.ok(/OPD Working Hours|Address/i.test(timingsRes.responseText || ""));

    // 6. Care Coordinator escalation
    const coordRes = await handleMenuAction({
      tenant,
      conversationId: conv.id,
      contactPhone: testPhone,
      actionIdOrText: MENU_ACTIONS.COORDINATOR,
    });
    assert.equal(coordRes.handled, true);
    assert.equal(coordRes.action, "COORDINATOR");
    assert.ok(/Care Coordinator/i.test(coordRes.responseText || ""));

    // Verify conversation status was escalated to WAITING_STAFF
    const updated = await prisma.conversation.findUnique({
      where: { id: conv.id },
      select: { status: true, priority: true },
    });
    assert.equal(updated?.status, "WAITING_STAFF");
    assert.equal(updated?.priority, "HIGH");
  } finally {
    await prisma.conversation.delete({ where: { id: conv.id } }).catch(() => undefined);
  }
});
