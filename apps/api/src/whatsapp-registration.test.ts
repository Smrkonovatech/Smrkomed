import assert from "node:assert/strict";
import { test } from "node:test";

import {
  parseCompositeRegistration,
  formatUnregisteredWelcomePrompt,
  formatRegistrationStepPrompt,
  formatRegistrationSuccessMessage,
} from "./modules/whatsapp-ai/registration";
import { generateWhatsAppAiReply } from "./modules/whatsapp-ai/generate";

test("parseCompositeRegistration extracts comma-separated details", () => {
  const res = parseCompositeRegistration("Priya Sharma, 28, Female");
  assert.ok(res);
  assert.equal(res?.patientName, "Priya Sharma");
  assert.equal(res?.age, 28);
  assert.equal(res?.gender, "FEMALE");
  assert.equal(res?.subStep, 3);
});

test("parseCompositeRegistration extracts labeled multi-line details", () => {
  const text = `Name: Aarti Mehta
Age: 29
Gender: Female
Partner: Rohan Mehta`;
  const res = parseCompositeRegistration(text);
  assert.ok(res);
  assert.equal(res?.patientName, "Aarti Mehta");
  assert.equal(res?.age, 29);
  assert.equal(res?.gender, "FEMALE");
  assert.equal(res?.partnerName, "Rohan Mehta");
});

test("parseCompositeRegistration extracts date of birth and partner in comma format", () => {
  const res = parseCompositeRegistration("Kavita Rao, 1994-05-12, Female, Partner: Vikram Rao");
  assert.ok(res);
  assert.equal(res?.patientName, "Kavita Rao");
  assert.equal(res?.dateOfBirth, "1994-05-12");
  assert.equal(res?.gender, "FEMALE");
  assert.equal(res?.partnerName, "Vikram Rao");
});

test("parseCompositeRegistration returns null for ordinary messages", () => {
  assert.equal(parseCompositeRegistration("Hello, what are your clinic timings?"), null);
  assert.equal(parseCompositeRegistration("Hi doc"), null);
});

test("formatUnregisteredWelcomePrompt contains clinic name, unregistered notice, and booking link", () => {
  const text = formatUnregisteredWelcomePrompt({
    clinicName: "Apex Fertility Clinic",
    clinicSlug: "apex-fertility",
    queryAnswer: "We are open Monday to Saturday from 9 AM to 6 PM.",
  });

  assert.ok(text.includes("Apex Fertility Clinic"));
  assert.ok(/not yet registered/i.test(text));
  assert.ok(/Quick Registration/i.test(text));
  assert.ok(text.includes("https://smrkomed.com/book/apex-fertility"));
  assert.ok(text.includes("We are open Monday to Saturday"));
});

test("formatRegistrationStepPrompt formats step prompts correctly", () => {
  const step1 = formatRegistrationStepPrompt({ kind: "REGISTRATION", subStep: 1 });
  assert.ok(/Full Name/i.test(step1));

  const step2 = formatRegistrationStepPrompt({ kind: "REGISTRATION", subStep: 2, patientName: "Priya Sharma" });
  assert.ok(/Priya/i.test(step2));
  assert.ok(/age|date of birth/i.test(step2));

  const step3 = formatRegistrationStepPrompt({ kind: "REGISTRATION", subStep: 3, patientName: "Priya Sharma", age: 28 });
  assert.ok(/gender/i.test(step3));
  assert.ok(/partner/i.test(step3));
});

test("formatRegistrationSuccessMessage formats confirmation with quick actions", () => {
  const msg = formatRegistrationSuccessMessage({
    clinicName: "Apex Fertility Clinic",
    patientName: "Priya Sharma",
    partnerName: "Vikram Sharma",
  });

  assert.ok(/Registration Complete/i.test(msg));
  assert.ok(msg.includes("Priya Sharma"));
  assert.ok(msg.includes("Vikram Sharma"));
  assert.ok(/Book.*Consultation/i.test(msg));
  assert.ok(/Care Coordinator/i.test(msg));
});

test("generateWhatsAppAiReply adapts greeting and answers for unregistered contacts", async () => {
  const result = await generateWhatsAppAiReply({
    patientMessage: "hi",
    ctx: {
      clinicName: "Apex Fertility",
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

  assert.ok(/Apex Fertility/i.test(result.text));
  assert.ok(/not yet registered|register your profile/i.test(result.text));
  assert.ok(/Full Name/i.test(result.text));
  assert.ok(/https:\/\/smrkomed\.com\/book\/apex-fertility/i.test(result.text));
});

test("tryHandleRegistrationMessage completes registration, creates Patient/Couple, and updates Conversation", async () => {
  const { prisma } = await import("@smrkomed/database");
  const { tryHandleRegistrationMessage } = await import("./modules/whatsapp-ai/registration");

  const clinic = await prisma.clinic.findFirst();
  if (!clinic) return; // Skip if database is not seeded

  const tenant = {
    clinicId: clinic.id,
    organizationId: clinic.organizationId,
    organizationName: "Test Org",
    userId: "test-user-reg",
    clinicName: clinic.name,
    role: "CLINIC_ADMIN" as const,
  };

  const testPhone = `+9198765${Math.floor(10000 + Math.random() * 90000)}`;

  // Create an unmatched conversation representing an unregistered contact
  const conv = await prisma.conversation.create({
    data: {
      clinicId: clinic.id,
      channel: "WHATSAPP",
      contactPhone: testPhone,
      unmatched: true,
      status: "OPEN",
    },
  });

  try {
    const res = await tryHandleRegistrationMessage({
      tenant,
      conversationId: conv.id,
      contactPhone: testPhone,
      messageText: "Ananya Iyer, 27, Female, Partner: Karthik Iyer",
    });

    assert.equal(res.handled, true);
    assert.equal(res.registered, true);
    assert.ok(res.patientId);
    assert.ok(/Registration Complete/i.test(res.responseMessage || ""));

    // Verify patient in DB
    const patient = await prisma.patient.findUnique({
      where: { id: res.patientId! },
    });
    assert.ok(patient);
    assert.equal(patient?.firstName, "Ananya");
    assert.equal(patient?.lastName, "Iyer");
    assert.equal(patient?.gender, "FEMALE");
    assert.equal(patient?.phone, testPhone);
    assert.equal(patient?.status, "ACTIVE");

    // Verify conversation updated
    const updatedConv = await prisma.conversation.findUnique({
      where: { id: conv.id },
    });
    assert.equal(updatedConv?.unmatched, false);
    assert.equal(updatedConv?.patientId, res.patientId);
    assert.ok(updatedConv?.coupleId);
    assert.equal(updatedConv?.pendingAction, null);
  } finally {
    // Cleanup
    await prisma.conversation.delete({ where: { id: conv.id } }).catch(() => undefined);
    const createdPatient = await prisma.patient.findFirst({ where: { phone: testPhone } });
    if (createdPatient) {
      await prisma.couple.deleteMany({ where: { primaryPatientId: createdPatient.id } }).catch(() => undefined);
      await prisma.patient.delete({ where: { id: createdPatient.id } }).catch(() => undefined);
    }
  }
});

test("handleInboundWhatsAppAutomation routes unregistered contact to registration AI and does not trigger ghost appointment flow", async () => {
  const { prisma } = await import("@smrkomed/database");
  const { handleInboundWhatsAppAutomation } = await import("./modules/whatsapp-automation/inbound-dispatch");

  const clinic = await prisma.clinic.findFirst();
  if (!clinic) return;

  const testPhone = `+9198765${Math.floor(10000 + Math.random() * 90000)}`;

  const conv = await prisma.conversation.create({
    data: {
      clinicId: clinic.id,
      channel: "WHATSAPP",
      contactPhone: testPhone,
      unmatched: true,
      status: "OPEN",
    },
  });

  try {
    const result = await handleInboundWhatsAppAutomation({
      clinicId: clinic.id,
      conversationId: conv.id,
      contactPhone: testPhone,
      unmatched: true,
      patientId: null,
      messageId: `msg_${Date.now()}`,
      providerMessageId: `pmsg_${Date.now()}`,
      messageType: "text",
      messageText: "Appointment",
      skipAi: true,
    });

    // Dispatched must be null for unregistered contacts — no ghost flow triggered!
    assert.equal(result.dispatched, null);
    assert.equal(result.ai.reason, "already_ran_in_webhook");
  } finally {
    await prisma.conversation.delete({ where: { id: conv.id } }).catch(() => undefined);
  }
});

