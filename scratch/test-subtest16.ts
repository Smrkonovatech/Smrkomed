import { prisma } from "@smrkomed/database";

async function main() {
  const clinic = await prisma.clinic.findFirst();
  if (!clinic) throw new Error("no clinic");

  const tomorrow = new Date(Date.now() + 86400000 * 2);
  tomorrow.setUTCHours(11, 0, 0, 0);
  const testDoctor = `Dr. ConfirmTest ${Date.now().toString().slice(-4)}`;
  const { encodeSlotId } = await import("../apps/api/src/modules/appointments/availability");
  const validSlotId = encodeSlotId({
    startMs: tomorrow.getTime(),
    durationMin: 30,
    appointmentType: "CONSULTATION",
    doctorName: testDoctor,
  });

  const tenant = {
    userId: "system-webhook",
    role: "CLINIC_ADMIN" as const,
    clinicId: clinic.id,
    organizationId: clinic.organizationId,
    clinicName: clinic.name,
    organizationName: "",
  };

  const phone = `+9198765${Date.now().toString().slice(-5)}`;
  const conv = await prisma.conversation.create({
    data: {
      clinicId: clinic.id,
      contactPhone: phone,
      channel: "WHATSAPP",
      status: "OPEN",
    },
  });

  const { bookAppointmentFromSlot } = await import("../apps/api/src/modules/appointments/whatsapp-booking");
  const booked = await bookAppointmentFromSlot({
    tenant,
    conversationId: conv.id,
    slotId: validSlotId,
    idempotencyKey: `test_direct_${Date.now()}`,
  });

  console.log("bookAppointmentFromSlot result:", booked);
}

main().catch(console.error).finally(() => process.exit(0));
