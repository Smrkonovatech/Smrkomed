import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { hash } from "bcryptjs";
import { PERMISSIONS, prisma, roleHasPermission } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";

const PREFIX = "insurance-api";
const app = createApp();

describe("insurance module", () => {
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
  let providerA: string;
  let policyA: string;
  let claimA: string;

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
      data: { email: `${PREFIX}-admin-a@test.demo`, passwordHash, name: "Ins Admin A" },
    });
    const userB = await prisma.user.create({
      data: { email: `${PREFIX}-admin-b@test.demo`, passwordHash, name: "Ins Admin B" },
    });
    const reception = await prisma.user.create({
      data: { email: `${PREFIX}-reception-a@test.demo`, passwordHash, name: "Ins Reception A" },
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
        name: "Ins Admin A",
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
        name: "Ins Admin B",
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
        name: "Ins Reception A",
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
        firstName: "Demo",
        lastName: "Insured",
        phone: "+91 90000 11111",
      },
    });
    patientA = patient.id;
  });

  after(async () => {
    await prisma.insuranceClaimEvent.deleteMany({
      where: { clinicId: { in: [clinicA.id, clinicB.id] } },
    });
    await prisma.insurancePayment.deleteMany({
      where: { clinicId: { in: [clinicA.id, clinicB.id] } },
    });
    await prisma.insuranceQuery.deleteMany({
      where: { clinicId: { in: [clinicA.id, clinicB.id] } },
    });
    await prisma.insuranceClaimDocument.deleteMany({
      where: { claim: { clinicId: { in: [clinicA.id, clinicB.id] } } },
    });
    await prisma.insuranceClaim.deleteMany({
      where: { clinicId: { in: [clinicA.id, clinicB.id] } },
    });
    await prisma.insurancePolicy.deleteMany({
      where: { clinicId: { in: [clinicA.id, clinicB.id] } },
    });
    await prisma.insuranceTpa.deleteMany({
      where: { clinicId: { in: [clinicA.id, clinicB.id] } },
    });
    await prisma.insuranceProvider.deleteMany({
      where: { clinicId: { in: [clinicA.id, clinicB.id] } },
    });
    await prisma.careTask.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.clinicMembership.deleteMany({
      where: { clinicId: { in: [clinicA.id, clinicB.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [adminA, adminB, receptionistA] } },
    });
    await prisma.clinic.deleteMany({ where: { id: { in: [clinicA.id, clinicB.id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } });
  });

  it("maps insurance permissions by role", () => {
    assert.equal(roleHasPermission("CLINIC_ADMIN", PERMISSIONS.INSURANCE_VIEW), true);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.INSURANCE_VIEW), true);
    assert.equal(roleHasPermission("RECEPTIONIST", PERMISSIONS.INSURANCE_CLAIMS_CREATE), false);
    assert.equal(roleHasPermission("PHARMACIST", PERMISSIONS.INSURANCE_VIEW), false);
  });

  it("creates provider, policy, claim, preauth, query, and payment", async () => {
    const cookie = { Cookie: `authjs.session-token=${tokenA}`, "Content-Type": "application/json" };

    const providerRes = await app.request("/api/v1/insurance/providers", {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({ name: "Star Health Demo Test", isActive: true }),
    });
    assert.equal(providerRes.status, 201);
    const providerBody = (await providerRes.json()) as { success: true; data: { id: string } };
    providerA = providerBody.data.id;

    const policyRes = await app.request("/api/v1/insurance/policies", {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({
        patientId: patientA,
        providerId: providerA,
        policyName: "Family Optima Demo",
        policyNumber: `${PREFIX}-POL-001`,
        sumInsured: 500000,
        availableCoverage: 450000,
        status: "ACTIVE",
        eligibilityStatus: "PENDING",
        cashlessStatus: "Verification Required",
      }),
    });
    assert.equal(policyRes.status, 201);
    const policyBody = (await policyRes.json()) as { success: true; data: { id: string } };
    policyA = policyBody.data.id;

    const claimRes = await app.request("/api/v1/insurance/claims", {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({
        patientId: patientA,
        policyId: policyA,
        treatmentLabel: "IVF",
        amountRequested: 185000,
        assignedCoordinatorId: adminA,
        submitPreauth: false,
      }),
    });
    assert.equal(claimRes.status, 201);
    const claimBody = (await claimRes.json()) as {
      success: true;
      data: { id: string; claimNumber: string; status: string };
    };
    claimA = claimBody.data.id;
    assert.match(claimBody.data.claimNumber, /^SMR-\d{4}-\d+$/);
    assert.equal(claimBody.data.status, "DRAFT");

    const preauthRes = await app.request(`/api/v1/insurance/claims/${claimA}/preauth`, {
      method: "POST",
      headers: cookie,
    });
    assert.equal(preauthRes.status, 200);
    const preauthBody = (await preauthRes.json()) as {
      success: true;
      data: { status: string };
    };
    assert.equal(preauthBody.data.status, "UNDER_REVIEW");

    const queryRes = await app.request(`/api/v1/insurance/claims/${claimA}/queries`, {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({
        message: "Please provide the latest treatment estimate.",
        assignedToId: adminA,
      }),
    });
    assert.equal(queryRes.status, 201);
    const queryBody = (await queryRes.json()) as {
      success: true;
      data: { id: string; careTaskId: string | null; status: string };
    };
    assert.equal(queryBody.data.status, "OPEN");
    assert.ok(queryBody.data.careTaskId);

    await app.request(`/api/v1/insurance/claims/${claimA}`, {
      method: "PATCH",
      headers: cookie,
      body: JSON.stringify({
        status: "PAYMENT_PENDING",
        amountApproved: 150000,
        patientResponsibility: 35000,
      }),
    });

    const payRes = await app.request(`/api/v1/insurance/claims/${claimA}/payments`, {
      method: "POST",
      headers: cookie,
      body: JSON.stringify({
        amount: 150000,
        paymentMethod: "NEFT",
        reference: "DEMO-UTR-001",
      }),
    });
    assert.equal(payRes.status, 201);

    const detailRes = await app.request(`/api/v1/insurance/claims/${claimA}`, {
      headers: { Cookie: `authjs.session-token=${tokenA}` },
    });
    assert.equal(detailRes.status, 200);
    const detail = (await detailRes.json()) as {
      success: true;
      data: { status: string; amountPaid: number; events: unknown[] };
    };
    assert.equal(detail.data.status, "PAID");
    assert.equal(detail.data.amountPaid, 150000);
    assert.ok(detail.data.events.length >= 1);
  });

  it("blocks receptionist from creating claims", async () => {
    const res = await app.request("/api/v1/insurance/claims", {
      method: "POST",
      headers: {
        Cookie: `authjs.session-token=${tokenReception}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patientId: patientA,
        policyId: policyA,
        amountRequested: 1000,
      }),
    });
    assert.equal(res.status, 403);
  });

  it("isolates insurance data across clinics", async () => {
    const listB = await app.request("/api/v1/insurance/claims", {
      headers: { Cookie: `authjs.session-token=${tokenB}` },
    });
    assert.equal(listB.status, 200);
    const bodyB = (await listB.json()) as { success: true; data: { items: Array<{ id: string }> } };
    assert.equal(
      bodyB.data.items.some((item) => item.id === claimA),
      false,
    );

    const cross = await app.request(`/api/v1/insurance/claims/${claimA}`, {
      headers: { Cookie: `authjs.session-token=${tokenB}` },
    });
    assert.ok(cross.status === 403 || cross.status === 404);
  });
});
