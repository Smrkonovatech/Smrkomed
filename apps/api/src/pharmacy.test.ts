import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { hash } from "bcryptjs";
import { PERMISSIONS, prisma, roleHasPermission } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";

const PREFIX = "pharmacy-api";
const app = createApp();

describe("pharmacy module", () => {
  let orgA: { id: string; name: string };
  let orgB: { id: string; name: string };
  let clinicA: { id: string; name: string };
  let clinicB: { id: string; name: string };
  let adminA: string;
  let adminB: string;
  let receptionistA: string;
  let tokenA: string;
  let tokenB: string;
  let tokenReception: string;
  let productA: string;
  let batchA: string;

  before(async () => {
    const passwordHash = await hash("Test@12345", 4);
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { key: "CLINIC_ADMIN" } });
    const receptionRole = await prisma.role.findUniqueOrThrow({ where: { key: "RECEPTIONIST" } });

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

    const userA = await prisma.user.create({
      data: { email: `${PREFIX}-admin-a@test.demo`, passwordHash, name: "Admin A" },
    });
    const userB = await prisma.user.create({
      data: { email: `${PREFIX}-admin-b@test.demo`, passwordHash, name: "Admin B" },
    });
    const reception = await prisma.user.create({
      data: { email: `${PREFIX}-reception-a@test.demo`, passwordHash, name: "Reception A" },
    });
    adminA = userA.id;
    adminB = userB.id;
    receptionistA = reception.id;

    await prisma.clinicMembership.createMany({
      data: [
        { clinicId: clinicA.id, userId: adminA, roleId: adminRole.id },
        { clinicId: clinicB.id, userId: adminB, roleId: adminRole.id },
        { clinicId: clinicA.id, userId: receptionistA, roleId: receptionRole.id },
      ],
    });

    tokenA = await encodeSessionToken(
      {
        id: adminA,
        name: "Admin A",
        email: userA.email,
        organizationId: orgA.id,
        organizationName: orgA.name,
        clinicId: clinicA.id,
        clinicName: clinicA.name,
        role: "CLINIC_ADMIN",
      },
      "authjs.session-token",
    );
    tokenB = await encodeSessionToken(
      {
        id: adminB,
        name: "Admin B",
        email: userB.email,
        organizationId: orgB.id,
        organizationName: orgB.name,
        clinicId: clinicB.id,
        clinicName: clinicB.name,
        role: "CLINIC_ADMIN",
      },
      "authjs.session-token",
    );
    tokenReception = await encodeSessionToken(
      {
        id: receptionistA,
        name: "Reception A",
        email: reception.email,
        organizationId: orgA.id,
        organizationName: orgA.name,
        clinicId: clinicA.id,
        clinicName: clinicA.name,
        role: "RECEPTIONIST",
      },
      "authjs.session-token",
    );
  });

  after(async () => {
    const clinicIds = [clinicA.id, clinicB.id];
    await prisma.medicationReminder.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.pharmacyPrescriptionItem.deleteMany({
      where: { prescription: { clinicId: { in: clinicIds } } },
    });
    await prisma.pharmacyPrescription.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.careTask.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.pharmacySaleItem.deleteMany({ where: { sale: { clinicId: { in: clinicIds } } } });
    await prisma.pharmacySale.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.pharmacyStockMovement.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.pharmacyBatch.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.pharmacyProduct.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.pharmacySetting.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `${PREFIX}-` } } });
  });

  it("grants pharmacy permissions to clinic admin but not receptionist", () => {
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.PHARMACY_VIEW), true);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.PHARMACY_VIEW), false);
    assert.equal(roleHasPermission("PHARMACIST", PERMISSIONS.PHARMACY_SALES), true);
  });

  it("creates product and batch, then sells stock with movement history", async () => {
    const cookie = { Cookie: `authjs.session-token=${tokenA}` };

    const createProduct = await app.request("/api/v1/pharmacy/products", {
      method: "POST",
      headers: { ...cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Paracetamol 500mg Test",
        category: "Analgesic",
        manufacturer: "TestCo",
        minimumStock: 10,
        reorderLevel: 20,
        defaultSellingPrice: 25,
        defaultPurchasePrice: 12,
        gstPercent: 5,
      }),
    });
    assert.equal(createProduct.status, 201);
    const productBody = (await createProduct.json()) as { success: true; data: { id: string } };
    productA = productBody.data.id;

    const addStock = await app.request("/api/v1/pharmacy/inventory", {
      method: "POST",
      headers: { ...cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: productA,
        batchNumber: "TEST-BATCH-001",
        quantity: 100,
        sellingPrice: 25,
        purchasePrice: 12,
        mrp: 30,
        expiryDate: new Date(Date.now() + 400 * 86_400_000).toISOString(),
      }),
    });
    assert.equal(addStock.status, 201);
    const batchBody = (await addStock.json()) as {
      success: true;
      data: { batch: { id: string; availableQuantity: number } };
    };
    batchA = batchBody.data.batch.id;
    assert.equal(batchBody.data.batch.availableQuantity, 100);

    const sale = await app.request("/api/v1/pharmacy/sales", {
      method: "POST",
      headers: { ...cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentMethod: "UPI",
        items: [{ productId: productA, batchId: batchA, quantity: 10 }],
      }),
    });
    assert.equal(sale.status, 201);
    const saleBody = (await sale.json()) as { success: true; data: { invoiceNumber: string; totalAmount: number } };
    assert.match(saleBody.data.invoiceNumber, /^PHARM-/);
    assert.ok(saleBody.data.totalAmount > 0);

    const inventory = await app.request(`/api/v1/pharmacy/inventory?productId=${productA}`, {
      headers: cookie,
    });
    assert.equal(inventory.status, 200);
    const invBody = (await inventory.json()) as {
      success: true;
      data: { items: Array<{ id: string; availableQuantity: number }> };
    };
    const batch = invBody.data.items.find((i) => i.id === batchA);
    assert.equal(batch?.availableQuantity, 90);

    const movements = await app.request(`/api/v1/pharmacy/inventory/movements?productId=${productA}`, {
      headers: cookie,
    });
    assert.equal(movements.status, 200);
    const movBody = (await movements.json()) as {
      success: true;
      data: { items: Array<{ type: string; quantity: number }> };
    };
    assert.ok(movBody.data.items.some((m) => m.type === "PURCHASE" && m.quantity === 100));
    assert.ok(movBody.data.items.some((m) => m.type === "SALE" && m.quantity === -10));
  });

  it("rejects oversell and expired batch sale", async () => {
    const cookie = { Cookie: `authjs.session-token=${tokenA}`, "Content-Type": "application/json" };

    const oversell = await app.request("/api/v1/pharmacy/sales", {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({
        items: [{ productId: productA, batchId: batchA, quantity: 9999 }],
      }),
    });
    assert.equal(oversell.status, 422);

    const expiredStock = await app.request("/api/v1/pharmacy/inventory", {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({
        productId: productA,
        batchNumber: "EXPIRED-001",
        quantity: 20,
        sellingPrice: 25,
        expiryDate: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      }),
    });
    assert.equal(expiredStock.status, 201);
    const expiredBody = (await expiredStock.json()) as {
      success: true;
      data: { batch: { id: string } };
    };

    const sellExpired = await app.request("/api/v1/pharmacy/sales", {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({
        items: [{ productId: productA, batchId: expiredBody.data.batch.id, quantity: 1 }],
      }),
    });
    assert.equal(sellExpired.status, 422);
  });

  it("isolates pharmacy data across clinics", async () => {
    const listB = await app.request("/api/v1/pharmacy/products", {
      headers: { Cookie: `authjs.session-token=${tokenB}` },
    });
    assert.equal(listB.status, 200);
    const bodyB = (await listB.json()) as { success: true; data: { items: Array<{ id: string }> } };
    assert.equal(
      bodyB.data.items.some((p) => p.id === productA),
      false,
    );

    const detailB = await app.request(`/api/v1/pharmacy/products/${productA}`, {
      headers: { Cookie: `authjs.session-token=${tokenB}` },
    });
    assert.equal(detailB.status, 404);

    const listA = await app.request("/api/v1/pharmacy/products", {
      headers: { Cookie: `authjs.session-token=${tokenA}` },
    });
    const bodyA = (await listA.json()) as { success: true; data: { items: Array<{ id: string }> } };
    assert.ok(bodyA.data.items.some((p) => p.id === productA));
  });

  it("blocks users without pharmacy permission", async () => {
    const res = await app.request("/api/v1/pharmacy/dashboard", {
      headers: { Cookie: `authjs.session-token=${tokenReception}` },
    });
    assert.equal(res.status, 403);
  });

  it("creates prescription, medication schedule, and patient medications view", async () => {
    const patient = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        firstName: "Stage6",
        lastName: "Patient",
        phone: "+919999990006",
      },
    });

    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(8, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 2);

    const rxRes = await app.request("/api/v1/pharmacy/prescriptions", {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patientId: patient.id,
        doctorName: "Dr Test",
        items: [
          {
            productId: productA,
            medicineName: "Folic Acid Demo",
            dosage: "1 tablet",
            frequency: "Once daily",
            duration: "3 days",
            route: "Oral",
            timeOfDay: "8:00 AM",
            beforeAfterFood: "AFTER",
            instructions: "Continue until next consultation.",
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            quantityPrescribed: 3,
          },
        ],
      }),
    });
    const rxText = await rxRes.text();
    assert.equal(rxRes.status, 201, rxText);
    const rxBody = JSON.parse(rxText) as {
      success: true;
      data: { id: string; items: Array<{ id: string; careTaskId?: string | null }> };
    };
    const prescriptionId = rxBody.data.id;

    const meds = await app.request(`/api/v1/pharmacy/patients/${patient.id}/medications`, {
      headers: { Cookie: `authjs.session-token=${tokenA}` },
    });
    assert.equal(meds.status, 200);
    const medsBody = (await meds.json()) as {
      success: true;
      data: {
        current: Array<{ medicineName: string }>;
        schedule: Array<{ id: string; adherenceStatus: string }>;
      };
    };
    assert.ok(medsBody.data.current.some((m) => m.medicineName.includes("Folic")));
    assert.ok(medsBody.data.schedule.length >= 1);

    const reminders = await prisma.medicationReminder.findMany({
      where: { clinicId: clinicA.id, patientId: patient.id },
    });
    assert.ok(reminders.length >= 1);
    assert.ok(reminders.every((r) => r.demoMode === true));

    const careTasks = await prisma.careTask.findMany({
      where: { clinicId: clinicA.id, category: "MEDICATION" },
    });
    assert.ok(careTasks.length >= 1);

    const dash = await app.request("/api/v1/pharmacy/dashboard", {
      headers: { Cookie: `authjs.session-token=${tokenA}` },
    });
    assert.equal(dash.status, 200);
    const dashBody = (await dash.json()) as {
      success: true;
      data: { totals: { pendingDispensing: number; expired: number } };
    };
    assert.ok(dashBody.data.totals.pendingDispensing >= 1);

    const dispense = await app.request(`/api/v1/pharmacy/prescriptions/${prescriptionId}/dispense`, {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ itemId: rxBody.data.items[0]!.id, batchId: batchA, quantity: 3 }],
      }),
    });
    assert.equal(dispense.status, 200, await dispense.text());

    const dup = await app.request(`/api/v1/pharmacy/prescriptions/${prescriptionId}/dispense`, {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ itemId: rxBody.data.items[0]!.id, batchId: batchA, quantity: 1 }],
      }),
    });
    assert.equal(dup.status, 422);

    const crossClinic = await app.request(`/api/v1/pharmacy/patients/${patient.id}/medications`, {
      headers: { Cookie: `authjs.session-token=${tokenB}` },
    });
    assert.equal(crossClinic.status, 404);
  });
});
