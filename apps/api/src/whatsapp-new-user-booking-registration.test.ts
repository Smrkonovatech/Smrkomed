import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@smrkomed/database";
import { handleInboundWhatsAppAutomation } from "./modules/whatsapp-automation/inbound-dispatch";
import { handleMenuAction } from "./modules/whatsapp-ai/menu";
import { tryHandleRegistrationMessage } from "./modules/whatsapp-ai/registration";

test("New user asking to book appointment or register is always guided to registration", async (t) => {
  const clinic = await prisma.clinic.findFirst();
  if (!clinic) throw new Error("No clinic found");

  const tenant = {
    clinicId: clinic.id,
    clinicName: clinic.name,
    organizationId: clinic.organizationId,
    organizationName: "Hospex Org",
    userId: "test_user",
    role: "CLINIC_ADMIN" as const,
  };

  await t.test("1. Unmatched user sending 'book appointment' triggers Step 1 registration prompt", async () => {
    const phone = `+9199991${Math.floor(10000 + Math.random() * 90000)}`;
    const conv = await prisma.conversation.create({
      data: {
        clinicId: clinic.id,
        channel: "WHATSAPP",
        contactPhone: phone,
        unmatched: true,
        patientId: null,
        status: "OPEN",
      },
    });

    try {
      const res = await handleInboundWhatsAppAutomation({
        clinicId: clinic.id,
        conversationId: conv.id,
        contactPhone: phone,
        unmatched: true,
        patientId: null,
        messageId: `msg_${Date.now()}_1`,
        providerMessageId: `pmsg_${Date.now()}_1`,
        messageType: "text",
        messageText: "book appointment",
        timestampIso: new Date().toISOString(),
        skipAi: false,
      });

      assert.equal(res.registration?.handled, true);
      assert.ok(res.registration?.responseMessage?.includes("Step 1/3"));
      assert.ok(res.registration?.responseMessage?.includes("registration first"));

      // Verify conversation pendingAction set to draft step 1
      const updated = await prisma.conversation.findUnique({ where: { id: conv.id } });
      assert.equal((updated?.pendingAction as any)?.kind, "REGISTRATION");
      assert.equal((updated?.pendingAction as any)?.subStep, 1);
    } finally {
      await prisma.conversation.delete({ where: { id: conv.id } }).catch(() => undefined);
    }
  });

  await t.test("2. Unmatched user sending 'I want to book an appointment' triggers Step 1 registration prompt", async () => {
    const phone = `+9199992${Math.floor(10000 + Math.random() * 90000)}`;
    const conv = await prisma.conversation.create({
      data: {
        clinicId: clinic.id,
        channel: "WHATSAPP",
        contactPhone: phone,
        unmatched: true,
        patientId: null,
        status: "OPEN",
      },
    });

    try {
      const res = await handleInboundWhatsAppAutomation({
        clinicId: clinic.id,
        conversationId: conv.id,
        contactPhone: phone,
        unmatched: true,
        patientId: null,
        messageId: `msg_${Date.now()}_2`,
        providerMessageId: `pmsg_${Date.now()}_2`,
        messageType: "text",
        messageText: "I want to book an appointment with doctor",
        timestampIso: new Date().toISOString(),
        skipAi: false,
      });

      assert.equal(res.registration?.handled, true);
      assert.ok(res.registration?.responseMessage?.includes("Step 1/3"));
      assert.ok(res.registration?.responseMessage?.includes("registration first"));
    } finally {
      await prisma.conversation.delete({ where: { id: conv.id } }).catch(() => undefined);
    }
  });

  await t.test("3. User with existing Patient record but NO couple profile is prompted to register when booking", async () => {
    const phone = `+9199993${Math.floor(10000 + Math.random() * 90000)}`;
    const patient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: "Test",
        lastName: "Incomplete",
        phone,
        whatsappNumber: phone,
        gender: "FEMALE",
        status: "ACTIVE",
      },
    });

    const conv = await prisma.conversation.create({
      data: {
        clinicId: clinic.id,
        channel: "WHATSAPP",
        contactPhone: phone,
        unmatched: false,
        patientId: patient.id,
        coupleId: null,
        status: "OPEN",
      },
    });

    try {
      const res = await handleInboundWhatsAppAutomation({
        clinicId: clinic.id,
        conversationId: conv.id,
        contactPhone: phone,
        unmatched: false,
        patientId: patient.id,
        messageId: `msg_${Date.now()}_3`,
        providerMessageId: `pmsg_${Date.now()}_3`,
        messageType: "text",
        messageText: "book appointment",
        timestampIso: new Date().toISOString(),
        skipAi: false,
      });

      assert.equal(res.registration?.handled, true);
      assert.ok(res.registration?.responseMessage?.includes("Step 1/3"));
      assert.ok(res.registration?.responseMessage?.includes("registration first"));
    } finally {
      await prisma.conversation.delete({ where: { id: conv.id } }).catch(() => undefined);
      await prisma.patient.delete({ where: { id: patient.id } }).catch(() => undefined);
    }
  });

  await t.test("4. User tapping menu_register or saying 'Couple Registration' starts Step 1 even if patientId exists", async () => {
    const phone = `+9199994${Math.floor(10000 + Math.random() * 90000)}`;
    const patient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: "Existing",
        lastName: "User",
        phone,
        whatsappNumber: phone,
        gender: "FEMALE",
        status: "ACTIVE",
      },
    });

    const conv = await prisma.conversation.create({
      data: {
        clinicId: clinic.id,
        channel: "WHATSAPP",
        contactPhone: phone,
        unmatched: false,
        patientId: patient.id,
        coupleId: null,
        status: "OPEN",
      },
    });

    try {
      const res = await handleMenuAction({
        tenant,
        conversationId: conv.id,
        contactPhone: phone,
        actionIdOrText: "menu_register",
      });

      assert.equal(res.handled, true);
      assert.equal(res.action, "REGISTER");
      assert.ok(res.responseText?.includes("Step 1/3"));

      const updated = await prisma.conversation.findUnique({ where: { id: conv.id } });
      assert.equal((updated?.pendingAction as any)?.kind, "REGISTRATION");
      assert.equal((updated?.pendingAction as any)?.subStep, 1);
    } finally {
      await prisma.conversation.delete({ where: { id: conv.id } }).catch(() => undefined);
      await prisma.patient.delete({ where: { id: patient.id } }).catch(() => undefined);
    }
  });

  await t.test("5. Fully registered couple user booking consultation proceeds to doctor/slot selection", async () => {
    const phone = `+9199995${Math.floor(10000 + Math.random() * 90000)}`;
    const patient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        firstName: "Anjali",
        lastName: "Verma",
        phone,
        whatsappNumber: phone,
        gender: "FEMALE",
        status: "ACTIVE",
      },
    });

    const couple = await prisma.couple.create({
      data: {
        clinicId: clinic.id,
        slug: `c-test-${Date.now()}`,
        primaryPatientId: patient.id,
        status: "ACTIVE",
      },
    });

    const conv = await prisma.conversation.create({
      data: {
        clinicId: clinic.id,
        channel: "WHATSAPP",
        contactPhone: phone,
        unmatched: false,
        patientId: patient.id,
        coupleId: couple.id,
        status: "OPEN",
      },
    });

    try {
      const res = await handleMenuAction({
        tenant,
        conversationId: conv.id,
        contactPhone: phone,
        actionIdOrText: "menu_book_appt",
      });

      assert.equal(res.handled, true);
      // For fully registered couple, does not intercept as REGISTRATION_START
      assert.notEqual(res.action, "REGISTRATION_START");
    } finally {
      await prisma.conversation.delete({ where: { id: conv.id } }).catch(() => undefined);
      await prisma.couple.delete({ where: { id: couple.id } }).catch(() => undefined);
      await prisma.patient.delete({ where: { id: patient.id } }).catch(() => undefined);
    }
  });
});
