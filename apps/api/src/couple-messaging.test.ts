import assert from "node:assert/strict";
import { test } from "node:test";
import { prisma } from "@smrkomed/database";

import { createApp } from "./app";
import { encodeSessionToken } from "./middleware/auth";

const app = createApp();

function cookie(token: string) {
  return { Cookie: `authjs.session-token=${token}` };
}

test("Couple & Partner WhatsApp Endpoints", async (t) => {
  // Find real couple (Manideep & Maddy)
  const couple = await prisma.couple.findFirst({
    where: {
      OR: [
        { primaryPatient: { phone: { contains: "7795559724" } } },
        { partnerPatient: { phone: { contains: "7892265880" } } },
      ],
    },
    include: {
      primaryPatient: true,
      partnerPatient: true,
      clinic: {
        include: {
          organization: true,
        },
      },
    },
  });

  assert.ok(couple, "Couple must exist in database");
  assert.ok(couple.clinic, "Clinic must exist");

  // Find active staff user with membership role for this clinic
  const membership = await prisma.clinicMembership.findFirst({
    where: { clinicId: couple.clinicId, status: "ACTIVE" },
    include: {
      user: true,
      role: true,
    },
  });

  assert.ok(membership, "Active clinic membership must exist");
  const staff = membership.user;
  const staffRole = membership.role.key; // Role.key is the StaffRole enum value
  console.log(`Using staff: ${staff.name} (${staff.email}), role: ${staffRole}`);

  const sessionToken = await encodeSessionToken(
    {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staffRole,
      clinicId: couple.clinicId,
      clinicName: couple.clinic.name,
      organizationId: couple.clinic.organizationId,
      organizationName: couple.clinic.organization?.name || "Hospex Org",
    },
    "authjs.session-token",
  );

  await t.test("1. GET /couples/:coupleId/messages returns chronological couple thread", async () => {
    const res = await app.request(`/api/v1/whatsapp-automation/couples/${couple.id}/messages`, {
      headers: cookie(sessionToken),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as any;
    assert.equal(body.data.coupleId, couple.id);
    assert.ok(Array.isArray(body.data.messages), "Messages should be an array");
    assert.ok(body.data.primaryName, "Should have primaryName");
    assert.ok(body.data.partnerName, "Should have partnerName");
    console.log(`Verified couple messages: returned ${body.data.messages.length} messages`);
  });

  await t.test("2. POST /couples/:coupleId/reply sends to both primary and partner", async () => {
    const res = await app.request(`/api/v1/whatsapp-automation/couples/${couple.id}/reply`, {
      method: "POST",
      headers: {
        ...cookie(sessionToken),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        body: "Automated test joint thread broadcast to both partners",
      }),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as any;
    assert.equal(body.data.ok, true);
    assert.equal(body.data.coupleId, couple.id);
    assert.equal(body.data.totalTargets, 2, "Both primary and partner should be targeted");
    assert.ok(Array.isArray(body.data.results), "Results must be an array");
    assert.equal(body.data.results.length, 2);

    const phones = body.data.results.map((r: any) => r.phone);
    console.log("Couple broadcast targets reached:", phones);
  });

  await t.test("3. POST /send-to-recipient sends directly to partner even if no previous conversation", async () => {
    const res = await app.request("/api/v1/whatsapp-automation/send-to-recipient", {
      method: "POST",
      headers: {
        ...cookie(sessionToken),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        patientId: couple.partnerPatientId,
        coupleId: couple.id,
        phone: couple.partnerPatient?.phone,
        body: "Direct message to partner Maddy",
      }),
    });

    assert.equal(res.status, 201);
    const body = (await res.json()) as any;
    assert.ok(body.data.conversationId, "Conversation ID must be returned");
    assert.ok(body.data.status, "Status must be returned");
    console.log("Direct send to partner resolved conversation:", body.data.conversationId);
  });
});
