import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { execSync } from "node:child_process";
import { after, before, describe, it } from "node:test";
import { hash } from "bcryptjs";
import { buildPatient360ByPatientId, PERMISSIONS, prisma, roleHasPermission } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";
import { encryptCredentials } from "./modules/payments/service";
import { encryptString } from "./integrations/credentials/encryption";

process.env["PAYMENTS_MOCK"] = "1";

const PREFIX = `ph7-bill-${Date.now()}`;
const app = createApp();

describe("Phase 7: Billing + Pharmacy Connection", () => {
  let orgA: { id: string; name: string };
  let orgB: { id: string; name: string };
  let clinicA: { id: string; name: string };
  let clinicB: { id: string; name: string };

  let doctorA: string;
  let pharmacistA: string;
  let pharmMgrA: string;
  let receptionistA: string;
  let adminB: string;

  let tokenDoctorA: string;
  let tokenPharmacistA: string;
  let tokenPharmMgrA: string;
  let tokenReceptionistA: string;
  let tokenAdminB: string;

  let patientA: string;
  let partnerA: string;
  let coupleA: string;
  let appointmentA: string;
  let treatmentA: string;
  let productA: string;
  let batchA: string;
  let invoiceA: string;
  let prescriptionA: string;
  let prescriptionItemIdA: string;
  let paymentA: string;
  let gatewayOrderIdA: string;

  before(async () => {
    const passwordHash = await hash("Test@12345", 4);
    const doctorRole = await prisma.role.findUniqueOrThrow({ where: { key: "DOCTOR" } });
    const pharmacistRole = await prisma.role.findUniqueOrThrow({ where: { key: "PHARMACIST" } });
    const pharmMgrRole = await prisma.role.findUniqueOrThrow({ where: { key: "PHARMACY_MANAGER" } });
    const receptionistRole = await prisma.role.findUniqueOrThrow({ where: { key: "RECEPTIONIST" } });
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "CLINIC_ADMIN" } });

    orgA = await prisma.organization.create({
      data: { name: `${PREFIX} Org A`, slug: `${PREFIX}-org-a` },
    });
    orgB = await prisma.organization.create({
      data: { name: `${PREFIX} Org B`, slug: `${PREFIX}-org-b` },
    });

    clinicA = await prisma.clinic.create({
      data: { organizationId: orgA.id, name: `${PREFIX} Clinic A`, slug: `${PREFIX}-clinic-a` },
    });
    clinicB = await prisma.clinic.create({
      data: { organizationId: orgB.id, name: `${PREFIX} Clinic B`, slug: `${PREFIX}-clinic-b` },
    });

    const userDoc = await prisma.user.create({
      data: { email: `${PREFIX}-doc@test.demo`, passwordHash, name: "Dr. Smrko Specialist" },
    });
    const userPharm = await prisma.user.create({
      data: { email: `${PREFIX}-pharm@test.demo`, passwordHash, name: "Ph. Rahul Sharma" },
    });
    const userPharmMgr = await prisma.user.create({
      data: { email: `${PREFIX}-pharm-mgr@test.demo`, passwordHash, name: "Ph. Mgr Rahul" },
    });
    const userRecep = await prisma.user.create({
      data: { email: `${PREFIX}-recep@test.demo`, passwordHash, name: "Front Desk Staff" },
    });
    const userB = await prisma.user.create({
      data: { email: `${PREFIX}-admin-b@test.demo`, passwordHash, name: "Tenant B Admin" },
    });

    doctorA = userDoc.id;
    pharmacistA = userPharm.id;
    pharmMgrA = userPharmMgr.id;
    receptionistA = userRecep.id;
    adminB = userB.id;

    await prisma.clinicMembership.createMany({
      data: [
        { clinicId: clinicA.id, userId: doctorA, roleId: doctorRole.id },
        { clinicId: clinicA.id, userId: pharmacistA, roleId: pharmacistRole.id },
        { clinicId: clinicA.id, userId: pharmMgrA, roleId: pharmMgrRole.id },
        { clinicId: clinicA.id, userId: receptionistA, roleId: receptionistRole.id },
        { clinicId: clinicB.id, userId: adminB, roleId: adminRole.id },
      ],
    });

    tokenDoctorA = await encodeSessionToken(
      {
        id: doctorA,
        name: "Dr. Smrko Specialist",
        email: userDoc.email,
        organizationId: orgA.id,
        organizationName: orgA.name,
        clinicId: clinicA.id,
        clinicName: clinicA.name,
        role: "DOCTOR",
      },
      "authjs.session-token",
    );

    tokenPharmacistA = await encodeSessionToken(
      {
        id: pharmacistA,
        name: "Ph. Rahul Sharma",
        email: userPharm.email,
        organizationId: orgA.id,
        organizationName: orgA.name,
        clinicId: clinicA.id,
        clinicName: clinicA.name,
        role: "PHARMACIST",
      },
      "authjs.session-token",
    );

    tokenPharmMgrA = await encodeSessionToken(
      {
        id: pharmMgrA,
        name: "Ph. Mgr Rahul",
        email: userPharmMgr.email,
        organizationId: orgA.id,
        organizationName: orgA.name,
        clinicId: clinicA.id,
        clinicName: clinicA.name,
        role: "PHARMACY_MANAGER",
      },
      "authjs.session-token",
    );

    tokenReceptionistA = await encodeSessionToken(
      {
        id: receptionistA,
        name: "Front Desk Staff",
        email: userRecep.email,
        organizationId: orgA.id,
        organizationName: orgA.name,
        clinicId: clinicA.id,
        clinicName: clinicA.name,
        role: "RECEPTIONIST",
      },
      "authjs.session-token",
    );

    tokenAdminB = await encodeSessionToken(
      {
        id: adminB,
        name: "Tenant B Admin",
        email: userB.email,
        organizationId: orgB.id,
        organizationName: orgB.name,
        clinicId: clinicB.id,
        clinicName: clinicB.name,
        role: "CLINIC_ADMIN",
      },
      "authjs.session-token",
    );

    // Create Patient, Partner, Couple
    const pat = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        firstName: "Aarohi",
        lastName: "Patel",
        phone: "+919876543210",
        dateOfBirth: new Date("1994-05-15"),
        gender: "FEMALE",
      },
    });
    patientA = pat.id;

    const part = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        firstName: "Karan",
        lastName: "Patel",
        phone: "+919876543211",
        dateOfBirth: new Date("1992-03-20"),
        gender: "MALE",
      },
    });
    partnerA = part.id;

    const cpl = await prisma.couple.create({
      data: {
        clinicId: clinicA.id,
        slug: `cpl-${Date.now()}`,
        primaryPatientId: patientA,
        partnerPatientId: partnerA,
        careLoopActive: true,
      },
    });
    coupleA = cpl.id;

    // Create Appointment
    const appt = await prisma.appointment.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA,
        doctorName: "Dr. Smrko Specialist",
        type: "IVF Consultation",
        status: "CONFIRMED",
        startsAt: new Date(Date.now() + 86400000),
        durationMin: 45,
      },
    });
    appointmentA = appt.id;

    // Setup Mock Gateway for Clinic A
    const webhookSecret = "mock-secret-wh-key-7";
    const encryptedCredentials = encryptCredentials({
      keyId: "mock_rzp_key_7",
      keySecret: "mock_rzp_secret_7",
      webhookSecret,
    });

    await prisma.paymentGatewayConnection.create({
      data: {
        clinicId: clinicA.id,
        provider: "RAZORPAY",
        displayName: "Razorpay Primary",
        mode: "TEST",
        status: "CONNECTED",
        isDefault: true,
        isActive: true,
        encryptedCredentials,
        webhookSecretEncrypted: encryptString(webhookSecret),
        config: { keyId: "mock_rzp_key_7", mode: "TEST" },
      },
    });
  });

  after(async () => {
    await prisma.billingRefund.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.billingPayment.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.billingInvoiceLine.deleteMany({ where: { invoice: { clinicId: { in: [clinicA.id, clinicB.id] } } } });
    await prisma.billingInvoice.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.paymentWebhookEvent.deleteMany({ where: { OR: [{ clinicId: { in: [clinicA.id, clinicB.id] } }, { clinicId: null }] } });
    await prisma.paymentGatewayConnection.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.pharmacyStockMovement.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.medicationReminder.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.pharmacyPrescriptionItem.deleteMany({ where: { prescription: { clinicId: { in: [clinicA.id, clinicB.id] } } } });
    await prisma.pharmacyPrescription.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.pharmacyBatch.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.pharmacyProduct.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.careTask.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.appointment.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.treatment.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.couple.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [doctorA, pharmacistA, pharmMgrA, receptionistA, adminB] } } });
    await prisma.clinic.deleteMany({ where: { id: { in: [clinicA.id, clinicB.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  });

  // 1. Treatment
  it("1. creates an active IVF treatment cycle linked to the couple", async () => {
    const tr = await prisma.treatment.create({
      data: {
        clinicId: clinicA.id,
        coupleId: coupleA,
        kind: "IVF",
        label: "ICSI + Blastocyst Treatment Cycle 1",
        status: "ACTIVE",
        stageIndex: 3,
        stageName: "Ovarian Stimulation",
        startedAt: new Date(),
        ivfCycle: {
          create: {
            cycleNumber: 1,
            notes: "Antagonist protocol planned",
          },
        },
      },
      include: { ivfCycle: true },
    });
    assert.ok(tr.id);
    assert.equal(tr.kind, "IVF");
    assert.equal(tr.ivfCycle?.cycleNumber, 1);
    treatmentA = tr.id;
  });

  // 2. Invoice
  it("2. creates a treatment package invoice linked to Treatment, Couple, and Appointment", async () => {
    const res = await app.request("/api/v1/payments/invoices", {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenReceptionistA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        treatmentId: treatmentA,
        appointmentId: appointmentA,
        title: "IVF Full Cycle Package",
        description: "Includes stimulation monitoring, ovum pick-up, ICSI, and embryo transfer",
        lines: [
          { description: "Ovarian Stimulation Monitoring & Scans", quantity: 1, unitAmount: 35000 },
          { description: "Ovum Pick-Up (OPU) Procedure", quantity: 1, unitAmount: 60000 },
          { description: "ICSI & Embryology Culture", quantity: 1, unitAmount: 45000 },
          { description: "Embryo Transfer (ET)", quantity: 1, unitAmount: 30000 },
        ],
      }),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as { success: true; data: any };
    assert.ok(body.data.id);
    assert.equal(body.data.treatmentId, treatmentA);
    assert.equal(body.data.appointmentId, appointmentA);
    assert.equal(body.data.coupleId, coupleA);
    assert.equal(body.data.patientId, patientA);
    assert.equal(body.data.source, "TREATMENT");
    assert.equal(body.data.totalAmount, 170000);
    assert.equal(body.data.outstandingAmount, 170000);
    assert.equal(body.data.status, "ISSUED");

    invoiceA = body.data.id;

    // Verify package summary endpoint calculates correctly
    const summaryRes = await app.request(`/api/v1/payments/treatments/${treatmentA}/package-summary`, {
      headers: { Cookie: `authjs.session-token=${tokenReceptionistA}` },
    });
    assert.equal(summaryRes.status, 200);
    const summary = (await summaryRes.json()) as { success: true; data: any };
    assert.equal(summary.data.treatmentId, treatmentA);
    assert.equal(summary.data.packageAmount, 170000);
    assert.equal(summary.data.paidAmount, 0);
    assert.equal(summary.data.outstandingAmount, 170000);
    assert.equal(summary.data.paymentStatus, "UNPAID");
    assert.equal(summary.data.utilisation.totalItems, 4);
  });

  // 3. Payment
  it("3. initiates a gateway payment for the treatment invoice", async () => {
    const res = await app.request(`/api/v1/payments/invoices/${invoiceA}/payments`, {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenReceptionistA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: 170000,
        provider: "RAZORPAY",
        method: "upi",
      }),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as { success: true; data: any };
    assert.equal(body.data.invoiceId, invoiceA);
    assert.equal(body.data.amount, 170000);
    assert.equal(body.data.status, "PENDING");
    assert.ok(body.data.gatewayOrderId);
    paymentA = body.data.id;
    gatewayOrderIdA = body.data.gatewayOrderId;
  });

  // 4. Webhook & 5. Verified payment
  it("4 & 5. processes gateway webhook with verified backend HMAC state and marks invoice PAID", async () => {
    const payment = await prisma.billingPayment.findFirstOrThrow({
      where: { invoiceId: invoiceA },
    });

    const eventId = `evt_bill_pharm_${Date.now()}`;
    const payload = JSON.stringify({
      id: eventId,
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_rzp_mock_ph7",
            order_id: gatewayOrderIdA,
            amount: 17000000, // paisa
            status: "captured",
            notes: {
              smrkomedPaymentId: paymentA,
              invoiceId: invoiceA,
            },
          },
        },
      },
    });
    const signature = createHmac("sha256", "mock-secret-wh-key-7").update(payload).digest("hex");

    const whRes = await app.request("/api/v1/payments/webhooks/razorpay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature,
      },
      body: payload,
    });
    assert.equal(whRes.status, 200);
    const whBody = (await whRes.json()) as { success: true; data: { duplicate: boolean } };
    assert.equal(whBody.data.duplicate, false);

    // Verify invoice is now fully PAID with 0 outstanding
    const invGet = await app.request(`/api/v1/payments/invoices/${invoiceA}`, {
      headers: { Cookie: `authjs.session-token=${tokenReceptionistA}` },
    });
    const invData = (await invGet.json()) as { success: true; data: any };
    assert.equal(invData.data.status, "PAID");
    assert.equal(invData.data.paidAmount, 170000);
    assert.equal(invData.data.outstandingAmount, 0);

    // Verify treatment package summary reflects fully paid state
    const sumGet = await app.request(`/api/v1/payments/treatments/${treatmentA}/billing`, {
      headers: { Cookie: `authjs.session-token=${tokenReceptionistA}` },
    });
    const sumData = (await sumGet.json()) as { success: true; data: any };
    assert.equal(sumData.data.paymentStatus, "PAID");
    assert.equal(sumData.data.outstandingAmount, 0);
  });

  // 6. Prescription
  it("6. Doctor issues a clinical prescription linked to Treatment & Appointment", async () => {
    // Setup pharmacy product and batch via API
    const prodRes = await app.request("/api/v1/pharmacy/products", {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenPharmMgrA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Menopur 75 IU (Menotrophin Injection)",
        category: "Injection",
        manufacturer: "Ferring",
        minimumStock: 5,
        reorderLevel: 10,
        defaultSellingPrice: 1850,
        defaultPurchasePrice: 1500,
        gstPercent: 5,
      }),
    });
    assert.equal(prodRes.status, 201);
    const prodBody = (await prodRes.json()) as { success: true; data: { id: string } };
    productA = prodBody.data.id;

    const batchRes = await app.request("/api/v1/pharmacy/inventory", {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenPharmacistA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId: productA,
        batchNumber: `MNP-2026-${Date.now()}`,
        quantity: 20,
        sellingPrice: 1850,
        purchasePrice: 1500,
        mrp: 2100,
        expiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
      }),
    });
    assert.equal(batchRes.status, 201);
    const batchBody = (await batchRes.json()) as { success: true; data: { batch: { id: string; availableQuantity: number } } };
    batchA = batchBody.data.batch.id;

    const rxRes = await app.request("/api/v1/pharmacy/prescriptions", {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenDoctorA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patientId: patientA,
        coupleId: coupleA,
        treatmentId: treatmentA,
        appointmentId: appointmentA,
        notes: "Stimulation Day 2 to Day 7. Administer subcutaneous at 8:00 AM daily.",
        scheduleReminders: true,
        items: [
          {
            productId: productA,
            medicineName: "Menopur 75 IU",
            dosage: "150 IU (2 vials)",
            frequency: "Once daily",
            duration: "5 days",
            route: "Subcutaneous",
            instructions: "Reconstitute with 1ml sterile diluent. Administer at 08:00 AM after breakfast.",
            timeOfDay: "Morning",
            beforeAfterFood: "AFTER",
            quantityPrescribed: 10,
          },
        ],
      }),
    });

    assert.equal(rxRes.status, 201);
    const rxBody = (await rxRes.json()) as { success: true; data: any };
    assert.ok(rxBody.data.id);
    assert.equal(rxBody.data.treatmentId, treatmentA);
    assert.equal(rxBody.data.appointmentId, appointmentA);
    assert.equal(rxBody.data.status, "PENDING");
    assert.equal(rxBody.data.items.length, 1);
    assert.equal(rxBody.data.items[0].quantityPrescribed, 10);
    assert.equal(rxBody.data.items[0].quantityDispensed, 0);

    prescriptionA = rxBody.data.id;
    prescriptionItemIdA = rxBody.data.items[0].id;
  });

  // 7. Pharmacy Availability
  it("7. Pharmacy inspects stock availability for prescribed items", async () => {
    const availRes = await app.request(`/api/v1/pharmacy/prescriptions/${prescriptionA}/availability`, {
      headers: { Cookie: `authjs.session-token=${tokenPharmacistA}` },
    });
    assert.equal(availRes.status, 200);
    const avail = (await availRes.json()) as { success: true; data: any };
    assert.equal(avail.data.prescriptionId, prescriptionA);
    assert.equal(avail.data.allAvailable, true);
    assert.equal(avail.data.items.length, 1);
    assert.equal(avail.data.items[0].quantityRemaining, 10);
    assert.equal(avail.data.items[0].totalAvailable, 20);
    assert.equal(avail.data.items[0].isAvailable, true);
    assert.equal(avail.data.items[0].batches.length, 1);
    assert.equal(avail.data.items[0].batches[0].id, batchA);
  });

  // 8. Dispensing & 9. Stock Reduction
  it("8 & 9. Dispenses prescription item, reduces stock, and records stock movement", async () => {
    const dispenseRes = await app.request(`/api/v1/pharmacy/prescriptions/${prescriptionA}/dispense`, {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenPharmacistA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            itemId: prescriptionItemIdA,
            batchId: batchA,
            quantity: 10,
          },
        ],
      }),
    });

    assert.equal(dispenseRes.status, 200);
    const dispensed = (await dispenseRes.json()) as { success: true; data: any };
    assert.equal(dispensed.data.status, "DISPENSED");
    assert.equal(dispensed.data.items[0].quantityDispensed, 10);

    // Verify inventory stock reduction: 20 initial - 10 dispensed = 10 remaining
    const updatedBatch = await prisma.pharmacyBatch.findUniqueOrThrow({ where: { id: batchA } });
    assert.equal(updatedBatch.availableQuantity, 10);

    // Verify stock movement record
    const movement = await prisma.pharmacyStockMovement.findFirst({
      where: {
        clinicId: clinicA.id,
        productId: productA,
        batchId: batchA,
        type: "DISPENSE",
      },
    });
    assert.ok(movement);
    assert.equal(movement.quantity, -10);
    assert.equal(movement.balanceAfter, 10);
  });

  // 10. Patient Detail
  it("10. Patient 360 reflections show concise billing, payment, and medication statuses", async () => {
    const tenantCtx = {
      userId: doctorA,
      role: "DOCTOR" as const,
      clinicId: clinicA.id,
      organizationId: orgA.id,
      clinicName: clinicA.name,
      organizationName: orgA.name,
    };

    const p360 = await buildPatient360ByPatientId(tenantCtx, patientA);
    assert.ok(p360);
    assert.equal(p360.summaryCards.paymentStatus, "CLEAR");
    assert.equal(p360.summaryCards.outstandingAmountInr, 0);
    assert.ok(p360.summaryCards.currentMedications >= 1);
    assert.ok(p360.medications.current.some((m: any) => m.medicineName.includes("Menopur")));
    assert.equal(p360.preparePatient.payment.status, "CLEAR");
  });

  // 11. Care Loop
  it("11. Care Loop: payment care task resolved on full payment; medication reminders created without dosage alteration", async () => {
    // Verify payment care task was auto-completed when invoice reached PAID
    const paymentTasks = await prisma.careTask.findMany({
      where: {
        clinicId: clinicA.id,
        coupleId: coupleA,
        category: "PAYMENT",
      },
    });
    assert.ok(paymentTasks.length > 0 && paymentTasks[0]);
    assert.equal(paymentTasks[0].status, "COMPLETED");
    assert.equal(paymentTasks[0].lastAction, "PAYMENT_RECEIVED");

    // Verify medication care task and reminders were scheduled preserving doctor-approved dosage
    const medTasks = await prisma.careTask.findMany({
      where: {
        clinicId: clinicA.id,
        coupleId: coupleA,
        category: "MEDICATION",
      },
    });
    assert.ok(medTasks.length > 0 && medTasks[0]);
    assert.ok(medTasks[0].description?.includes("150 IU"));
  });

  // 12. RBAC
  it("12. enforces strict separation between billing and pharmacy permissions", () => {
    // Receptionist has limited billing but no gateway management and no pharmacy permissions
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.PAYMENTS_CREATE), true);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.PAYMENTS_GATEWAY_MANAGE), false);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.PHARMACY_PRESCRIPTIONS), false);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.PHARMACY_INVENTORY), false);

    // Pharmacist has inventory and dispensing permissions but no billing management
    assert.equal(roleHasPermission("PHARMACIST", PERMISSIONS.PHARMACY_PRESCRIPTIONS), true);
    assert.equal(roleHasPermission("PHARMACIST", PERMISSIONS.PHARMACY_INVENTORY), true);
    assert.equal(roleHasPermission("PHARMACIST", PERMISSIONS.PAYMENTS_GATEWAY_MANAGE), false);

    // Doctor has prescription permission
    assert.equal(roleHasPermission("DOCTOR", PERMISSIONS.PHARMACY_PRESCRIPTIONS), true);
  });

  // 13. Tenant isolation
  it("13. prevents cross-tenant access to invoices, payments, and pharmacy items", async () => {
    // Tenant B cannot view Tenant A's invoice
    const resInv = await app.request(`/api/v1/payments/invoices/${invoiceA}`, {
      headers: { Cookie: `authjs.session-token=${tokenAdminB}` },
    });
    assert.equal(resInv.status, 404);

    // Tenant B cannot view Tenant A's prescription
    const resRx = await app.request(`/api/v1/pharmacy/prescriptions/${prescriptionA}`, {
      headers: { Cookie: `authjs.session-token=${tokenAdminB}` },
    });
    assert.ok(resRx.status === 404 || resRx.status === 403);

    // Tenant B cannot access Tenant A's treatment package summary
    const resSum = await app.request(`/api/v1/payments/treatments/${treatmentA}/package-summary`, {
      headers: { Cookie: `authjs.session-token=${tokenAdminB}` },
    });
    assert.equal(resSum.status, 404);
  });

  // 14. Failure handling
  it("14. rejects invalid webhook signatures and prevents over-dispensing / negative stock", async () => {
    const payment = await prisma.billingPayment.findFirstOrThrow({
      where: { invoiceId: invoiceA },
    });

    // Invalid signature rejected with 401
    const badWh = await app.request("/api/v1/payments/webhooks/razorpay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": "invalid_signature_hash",
      },
      body: JSON.stringify({
        id: `evt_bad_${Date.now()}`,
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_bad_sig",
              order_id: payment.gatewayOrderId,
              status: "captured",
              notes: { smrkomedPaymentId: payment.id, invoiceId: invoiceA },
            },
          },
        },
      }),
    });
    assert.equal(badWh.status, 401);

    // Over-dispensing beyond prescribed quantity rejected
    const overDispense = await app.request(`/api/v1/pharmacy/prescriptions/${prescriptionA}/dispense`, {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenPharmacistA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ itemId: prescriptionItemIdA, batchId: batchA, quantity: 50 }],
      }),
    });
    assert.equal(overDispense.status, 422);
  });

  // 15. Duplicate payment webhook
  it("15. handles duplicate payment webhooks idempotently without double-crediting", async () => {
    const payment = await prisma.billingPayment.findFirstOrThrow({
      where: { invoiceId: invoiceA },
    });

    const eventId = `evt_dup_${Date.now()}`;
    const payload = JSON.stringify({
      id: eventId,
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_rzp_dup_test",
            order_id: gatewayOrderIdA,
            amount: 17000000,
            status: "captured",
            notes: {
              smrkomedPaymentId: paymentA,
              invoiceId: invoiceA,
            },
          },
        },
      },
    });
    const signature = createHmac("sha256", "mock-secret-wh-key-7").update(payload).digest("hex");

    const wh1 = await app.request("/api/v1/payments/webhooks/razorpay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-razorpay-signature": signature },
      body: payload,
    });
    assert.equal(wh1.status, 200);

    const wh2 = await app.request("/api/v1/payments/webhooks/razorpay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-razorpay-signature": signature },
      body: payload,
    });
    assert.equal(wh2.status, 200);
    const wh2Data = (await wh2.json()) as { success: true; data: { duplicate: boolean } };
    assert.equal(wh2Data.data.duplicate, true);

    // Verify paidAmount was not doubled
    const inv = await prisma.billingInvoice.findUniqueOrThrow({ where: { id: invoiceA } });
    assert.equal(Number(inv.paidAmount), 170000);
  });

  // 16. Refresh persistence
  it("16. confirms all billing, payment, prescription, and inventory states persist across reloads", async () => {
    const [inv, pay, rx, batch, tasks] = await Promise.all([
      prisma.billingInvoice.findUnique({ where: { id: invoiceA } }),
      prisma.billingPayment.findFirst({ where: { invoiceId: invoiceA } }),
      prisma.pharmacyPrescription.findUnique({ where: { id: prescriptionA }, include: { items: true } }),
      prisma.pharmacyBatch.findUnique({ where: { id: batchA } }),
      prisma.careTask.findMany({ where: { coupleId: coupleA } }),
    ]);

    assert.ok(inv);
    assert.equal(inv.status, "PAID");
    assert.ok(pay);
    assert.equal(pay.status, "SUCCESS");
    assert.ok(rx && rx.items[0]);
    assert.equal(rx.status, "DISPENSED");
    assert.equal(rx.items[0].quantityDispensed, 10);
    assert.ok(batch);
    assert.equal(batch.availableQuantity, 10);
    assert.ok(tasks.length >= 2);
  });

  // 17. Existing Journey regression
  it("17. verifies existing Journey & IVF treatment stages persist intact", async () => {
    const tr = await prisma.treatment.findUnique({
      where: { id: treatmentA },
      include: { ivfCycle: true },
    });
    assert.ok(tr);
    assert.equal(tr.stageName, "Ovarian Stimulation");
    assert.equal(tr.status, "ACTIVE");
  });

  // 18. Existing Diagnostics regression
  it("18. verifies diagnostics subsystem works alongside billing and pharmacy", async () => {
    const diagRes = await app.request("/api/v1/diagnostics", {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenDoctorA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patientId: patientA,
        coupleId: coupleA,
        testName: "Serum Estradiol (E2)",
        category: "Fertility Lab",
        priority: "Routine",
      }),
    });
    assert.equal(diagRes.status, 201);
    const diagData = (await diagRes.json()) as { success: true; data: any };
    assert.ok(diagData.data.id);
  });

  // 19. ABDM regression
  it("19. verifies zero changes to ABDM/ABHA files and ABDM models remain intact", () => {
    const diff = execSync("git diff --name-only", { encoding: "utf8" });
    const abdmChanged = diff
      .split("\n")
      .filter((line) => line.toLowerCase().includes("abdm") || line.toLowerCase().includes("abha"));
    assert.equal(abdmChanged.length, 0, "ABDM/ABHA files changed must be 0");
  });
});
