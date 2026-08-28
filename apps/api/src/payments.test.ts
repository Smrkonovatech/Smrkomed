import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { hash } from "bcryptjs";
import { PERMISSIONS, prisma, roleHasPermission } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";

process.env["PAYMENTS_MOCK"] = "1";

const PREFIX = "payments-api";
const app = createApp();

describe("payments module", () => {
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
  let patientA: string;
  let invoiceA: string;
  let paymentGatewayId: string;

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
      data: { email: `${PREFIX}-admin-a@test.demo`, passwordHash, name: "Pay Admin A" },
    });
    const userB = await prisma.user.create({
      data: { email: `${PREFIX}-admin-b@test.demo`, passwordHash, name: "Pay Admin B" },
    });
    const reception = await prisma.user.create({
      data: { email: `${PREFIX}-reception-a@test.demo`, passwordHash, name: "Pay Reception A" },
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
        name: "Pay Admin A",
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
        name: "Pay Admin B",
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
        name: "Pay Reception A",
        email: reception.email,
        organizationId: orgA.id,
        organizationName: orgA.name,
        clinicId: clinicA.id,
        clinicName: clinicA.name,
        role: "RECEPTIONIST",
      },
      "authjs.session-token",
    );

    const patient = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        firstName: "Pay",
        lastName: "Patient",
        phone: "+91 90000 22222",
      },
    });
    patientA = patient.id;
  });

  after(async () => {
    await prisma.billingRefund.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.billingPayment.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.billingInvoiceLine.deleteMany({
      where: { invoice: { clinicId: { in: [clinicA.id, clinicB.id] } } },
    });
    await prisma.billingInvoice.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.paymentWebhookEvent.deleteMany({
      where: { OR: [{ clinicId: { in: [clinicA.id, clinicB.id] } }, { clinicId: null }] },
    });
    await prisma.paymentGatewayConnection.deleteMany({
      where: { clinicId: { in: [clinicA.id, clinicB.id] } },
    });
    await prisma.patient.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.clinicMembership.deleteMany({
      where: { clinicId: { in: [clinicA.id, clinicB.id] } },
    });
    await prisma.user.deleteMany({ where: { id: { in: [adminA, adminB, receptionistA] } } });
    await prisma.clinic.deleteMany({ where: { id: { in: [clinicA.id, clinicB.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  });

  it("maps payments permissions by role", () => {
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.PAYMENTS_GATEWAY_MANAGE), true);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.PAYMENTS_CREATE), true);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.PAYMENTS_GATEWAY_MANAGE), false);
  });

  it("connects mock razorpay without returning secrets", async () => {
    const cookie = { Cookie: `authjs.session-token=${tokenA}`, "Content-Type": "application/json" };
    const res = await app.request("/api/v1/payments/gateways/RAZORPAY/connect", {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({
        mode: "TEST",
        isDefault: true,
        credentials: {
          keyId: "mock_rzp_key",
          keySecret: "mock_rzp_secret",
          webhookSecret: "whsec_mock",
        },
      }),
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as {
      success: true;
      data: { id: string; hasCredentials: boolean; provider: string; config?: Record<string, unknown> };
    };
    paymentGatewayId = body.data.id;
    assert.equal(body.data.provider, "RAZORPAY");
    assert.equal(body.data.hasCredentials, true);
    const raw = JSON.stringify(body.data);
    assert.equal(raw.includes("mock_rzp_secret"), false);
    assert.equal(raw.includes("whsec_mock"), false);
    assert.equal(raw.includes("encryptedCredentials"), false);
  });

  it("rejects unauthorized receptionist gateway manage", async () => {
    const res = await app.request("/api/v1/payments/gateways/RAZORPAY/connect", {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenReception}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "TEST",
        credentials: { keyId: "mock_x", keySecret: "mock_y" },
      }),
    });
    assert.equal(res.status, 403);
  });

  it("enforces clinic isolation on invoices", async () => {
    const cookieA = { Cookie: `authjs.session-token=${tokenA}`, "Content-Type": "application/json" };
    const createRes = await app.request("/api/v1/payments/invoices", {
      method: "POST",
      headers: cookieA,
      body: JSON.stringify({
        patientId: patientA,
        title: "Isolation invoice",
        lines: [{ description: "Consult", quantity: 1, unitAmount: 1000 }],
      }),
    });
    assert.equal(createRes.status, 201);
    const created = (await createRes.json()) as { success: true; data: { id: string } };
    invoiceA = created.data.id;

    const cookieB = { Cookie: `authjs.session-token=${tokenB}` };
    const getRes = await app.request(`/api/v1/payments/invoices/${invoiceA}`, {
      method: "GET",
      headers: cookieB,
    });
    assert.equal(getRes.status, 404);
  });

  it("creates invoice, gateway payment, and verifies success", async () => {
    const cookie = { Cookie: `authjs.session-token=${tokenA}`, "Content-Type": "application/json" };

    const invRes = await app.request("/api/v1/payments/invoices", {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({
        patientId: patientA,
        title: "IVF cycle fee",
        lines: [{ description: "Cycle", quantity: 1, unitAmount: 10000 }],
      }),
    });
    assert.equal(invRes.status, 201);
    const inv = (await invRes.json()) as {
      success: true;
      data: { id: string; outstandingAmount: number; invoiceNumber: string };
    };
    assert.equal(inv.data.outstandingAmount, 10000);
    assert.match(inv.data.invoiceNumber, /^INV-\d{4}-\d{5}$/);

    const payRes = await app.request(`/api/v1/payments/invoices/${inv.data.id}/payments`, {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({ amount: 10000, provider: "RAZORPAY" }),
    });
    assert.equal(payRes.status, 201);
    const pay = (await payRes.json()) as {
      success: true;
      data: { id: string; status: string; gatewayOrderId: string | null };
    };
    assert.equal(pay.data.status, "PENDING");
    assert.ok(pay.data.gatewayOrderId?.startsWith("order_mock_"));

    const verifyRes = await app.request(`/api/v1/payments/payments/${pay.data.id}/verify`, {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({ gatewayPaymentId: "pay_mock_success_1" }),
    });
    assert.equal(verifyRes.status, 200);
    const verified = (await verifyRes.json()) as { success: true; data: { status: string } };
    assert.equal(verified.data.status, "SUCCESS");

    const invGet = await app.request(`/api/v1/payments/invoices/${inv.data.id}`, {
      headers: { Cookie: `authjs.session-token=${tokenA}` },
    });
    const invBody = (await invGet.json()) as {
      success: true;
      data: { status: string; paidAmount: number; outstandingAmount: number };
    };
    assert.equal(invBody.data.status, "PAID");
    assert.equal(invBody.data.paidAmount, 10000);
    assert.equal(invBody.data.outstandingAmount, 0);
  });

  it("supports partial payment and cash immediate success", async () => {
    const cookie = { Cookie: `authjs.session-token=${tokenA}`, "Content-Type": "application/json" };
    const invRes = await app.request("/api/v1/payments/invoices", {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({
        patientId: patientA,
        title: "Partial bill",
        lines: [{ description: "Labs", quantity: 1, unitAmount: 5000 }],
      }),
    });
    const inv = (await invRes.json()) as { success: true; data: { id: string } };

    const cashRes = await app.request(`/api/v1/payments/invoices/${inv.data.id}/payments`, {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({ amount: 2000, provider: "CASH" }),
    });
    assert.equal(cashRes.status, 201);
    const cash = (await cashRes.json()) as { success: true; data: { status: string } };
    assert.equal(cash.data.status, "SUCCESS");

    const invGet = await app.request(`/api/v1/payments/invoices/${inv.data.id}`, {
      headers: { Cookie: `authjs.session-token=${tokenA}` },
    });
    const invBody = (await invGet.json()) as {
      success: true;
      data: { status: string; paidAmount: number; outstandingAmount: number };
    };
    assert.equal(invBody.data.status, "PARTIALLY_PAID");
    assert.equal(invBody.data.paidAmount, 2000);
    assert.equal(invBody.data.outstandingAmount, 3000);
  });

  it("refunds a successful payment", async () => {
    const cookie = { Cookie: `authjs.session-token=${tokenA}`, "Content-Type": "application/json" };
    const invRes = await app.request("/api/v1/payments/invoices", {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({
        patientId: patientA,
        title: "Refundable",
        lines: [{ description: "Fee", quantity: 1, unitAmount: 3000 }],
      }),
    });
    const inv = (await invRes.json()) as { success: true; data: { id: string } };

    const payRes = await app.request(`/api/v1/payments/invoices/${inv.data.id}/payments`, {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({ amount: 3000, provider: "RAZORPAY" }),
    });
    const pay = (await payRes.json()) as { success: true; data: { id: string } };

    await app.request(`/api/v1/payments/payments/${pay.data.id}/verify`, {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({ gatewayPaymentId: "pay_mock_refund_target" }),
    });

    const refundRes = await app.request(`/api/v1/payments/payments/${pay.data.id}/refunds`, {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({ amount: 1000, reason: "Partial adjustment" }),
    });
    assert.equal(refundRes.status, 201);
    const refund = (await refundRes.json()) as { success: true; data: { status: string; amount: number } };
    assert.equal(refund.data.status, "SUCCESS");
    assert.equal(refund.data.amount, 1000);

    const payGet = await app.request(`/api/v1/payments/payments/${pay.data.id}`, {
      headers: { Cookie: `authjs.session-token=${tokenA}` },
    });
    const payBody = (await payGet.json()) as { success: true; data: { status: string } };
    assert.equal(payBody.data.status, "PARTIALLY_REFUNDED");
  });

  it("accepts webhook idempotently and rejects invalid signature", async () => {
    const cookie = { Cookie: `authjs.session-token=${tokenA}`, "Content-Type": "application/json" };
    const invRes = await app.request("/api/v1/payments/invoices", {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({
        patientId: patientA,
        title: "Webhook bill",
        lines: [{ description: "Fee", quantity: 1, unitAmount: 1500 }],
      }),
    });
    const inv = (await invRes.json()) as { success: true; data: { id: string } };
    const payRes = await app.request(`/api/v1/payments/invoices/${inv.data.id}/payments`, {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({ amount: 1500, provider: "RAZORPAY" }),
    });
    const pay = (await payRes.json()) as {
      success: true;
      data: { id: string; gatewayOrderId: string };
    };

    const eventId = `evt_mock_${Date.now()}`;
    const payload = JSON.stringify({
      id: eventId,
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_webhook_1",
            order_id: pay.data.gatewayOrderId,
            amount: 150000,
            status: "captured",
          },
        },
      },
    });
    const signature = createHmac("sha256", "whsec_mock").update(payload).digest("hex");

    const wh1 = await app.request("/api/v1/payments/webhooks/razorpay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-razorpay-signature": signature },
      body: payload,
    });
    assert.equal(wh1.status, 200);
    const wh1Body = (await wh1.json()) as { success: true; data: { duplicate: boolean } };
    assert.equal(wh1Body.data.duplicate, false);

    const wh2 = await app.request("/api/v1/payments/webhooks/razorpay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-razorpay-signature": signature },
      body: payload,
    });
    assert.equal(wh2.status, 200);
    const wh2Body = (await wh2.json()) as { success: true; data: { duplicate: boolean } };
    assert.equal(wh2Body.data.duplicate, true);

    const bad = await app.request("/api/v1/payments/webhooks/razorpay", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-razorpay-signature": "deadbeef" },
      body: JSON.stringify({
        id: `evt_bad_${Date.now()}`,
        event: "payment.captured",
        payload: { payment: { entity: { id: "x", order_id: pay.data.gatewayOrderId, status: "captured", amount: 1 } } },
      }),
    });
    assert.equal(bad.status, 401);

    const payGet = await app.request(`/api/v1/payments/payments/${pay.data.id}`, {
      headers: { Cookie: `authjs.session-token=${tokenA}` },
    });
    const payBody = (await payGet.json()) as { success: true; data: { status: string } };
    assert.equal(payBody.data.status, "SUCCESS");
  });

  it("blocks wrong clinic invoice payment access", async () => {
    const res = await app.request(`/api/v1/payments/invoices/${invoiceA}/payments`, {
      method: "POST",
      headers: { Cookie: `authjs.session-token=${tokenB}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 10, provider: "CASH" }),
    });
    assert.equal(res.status, 404);
    void paymentGatewayId;
  });
});
