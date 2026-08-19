import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PERMISSIONS, prisma, roleHasPermission, type TenantContext } from "@smrkomed/database";

import { createApp } from "./app";
import { attachWhatsAppInboundToCrm } from "./integrations/providers/whatsapp/crm-capture";
import { encodeSessionToken } from "./middleware/auth";
import { getLeadSourceAdapter } from "./modules/crm/adapters";
import { LeadQualificationService } from "./modules/crm/scoring";

const PREFIX = "phase8-crm";
const app = createApp();

type Tokens = {
  admin: string;
  counselor: string;
  marketing: string;
  readonly: string;
  orgA: string;
  orgB: string;
};

let fixture: {
  tokens: Tokens;
  orgAId: string;
  orgBId: string;
  clinicAId: string;
  clinicBId: string;
  counselorId: string;
  marketingId: string;
  patientAId: string;
  leadAId: string;
  campaignAId: string;
};

async function cleanup() {
  const clinics = await prisma.clinic.findMany({
    where: { slug: { startsWith: PREFIX } },
    select: { id: true, organizationId: true },
  });
  const clinicIds = clinics.map((row) => row.id);
  const orgIds = [...new Set(clinics.map((row) => row.organizationId))];
  const users = await prisma.user.findMany({
    where: { email: { endsWith: `@${PREFIX}.demo` } },
    select: { id: true },
  });
  if (clinicIds.length > 0) {
    await prisma.notification.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.taskAssignment.deleteMany({ where: { careTask: { clinicId: { in: clinicIds } } } });
    await prisma.careTask.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.appointment.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.message.deleteMany({ where: { conversation: { clinicId: { in: clinicIds } } } });
    await prisma.conversation.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.leadActivity.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.couple.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.lead.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.campaign.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinicMembership.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.auditLog.deleteMany({ where: { clinicId: { in: clinicIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
  }
  if (orgIds.length > 0) {
    await prisma.leadActivity.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.lead.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.campaign.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.auditLog.deleteMany({ where: { organizationId: { in: orgIds } } });
    await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
  }
  if (users.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: users.map((row) => row.id) } } });
  }
}

function cookie(token: string) {
  return { Cookie: `authjs.session-token=${token}` };
}

async function json(res: Response) {
  return res.json() as Promise<Record<string, unknown>>;
}

async function tokenFor(user: { id: string; name: string; email: string }, ctx: TenantContext) {
  return encodeSessionToken(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      organizationId: ctx.organizationId,
      organizationName: ctx.organizationName,
      clinicId: ctx.clinicId,
      clinicName: ctx.clinicName,
      role: ctx.role,
    },
    "authjs.session-token",
  );
}

before(async () => {
  await cleanup();
  const roles = await Promise.all(
    (["CLINIC_ADMIN", "COUNSELOR", "MARKETING", "READ_ONLY"] as const).map((key) =>
      prisma.role.upsert({ where: { key }, update: {}, create: { key, name: key } }),
    ),
  );
  const role = Object.fromEntries(roles.map((row) => [row.key, row.id]));

  async function org(label: "a" | "b") {
    const organization = await prisma.organization.create({
      data: { name: `CRM Org ${label.toUpperCase()}`, slug: `${PREFIX}-org-${label}` },
    });
    const clinic = await prisma.clinic.create({
      data: {
        organizationId: organization.id,
        name: `CRM Clinic ${label.toUpperCase()}`,
        slug: `${PREFIX}-clinic-${label}`,
        city: "Bangalore",
      },
    });
    return { organization, clinic };
  }

  const a = await org("a");
  const b = await org("b");

  async function user(email: string, name: string, clinicId: string, roleId: string) {
    const created = await prisma.user.create({
      data: { email, name, passwordHash: "unused" },
    });
    await prisma.clinicMembership.create({
      data: { clinicId, userId: created.id, roleId, status: "ACTIVE" },
    });
    return created;
  }

  const admin = await user(`admin@${PREFIX}.demo`, "Admin A", a.clinic.id, role["CLINIC_ADMIN"]!);
  const counselor = await user(`counselor@${PREFIX}.demo`, "Counselor A", a.clinic.id, role["COUNSELOR"]!);
  const marketing = await user(`marketing@${PREFIX}.demo`, "Marketing A", a.clinic.id, role["MARKETING"]!);
  const readonly = await user(`readonly@${PREFIX}.demo`, "Readonly A", a.clinic.id, role["READ_ONLY"]!);
  const adminB = await user(`adminb@${PREFIX}.demo`, "Admin B", b.clinic.id, role["CLINIC_ADMIN"]!);

  const patient = await prisma.patient.create({
    data: { clinicId: a.clinic.id, firstName: "Existing", lastName: "Patient", phone: "9888888888", email: "existing.patient@example.test" },
  });

  const campaign = await prisma.campaign.create({
    data: {
      organizationId: a.organization.id,
      clinicId: a.clinic.id,
      name: "IVF Test Campaign",
      source: "META_ADS",
      medium: "PAID_SOCIAL",
      status: "ACTIVE",
      treatmentFocus: "IVF",
    },
  });

  const lead = await prisma.lead.create({
    data: {
      organizationId: a.organization.id,
      clinicId: a.clinic.id,
      name: "Lead Alpha",
      phone: "9000000001",
      email: "alpha@example.test",
      source: "WEBSITE",
      campaignId: campaign.id,
      assignedToId: counselor.id,
      status: "NEW",
      stage: "NEW_LEAD",
    },
  });

  const ctx = (userId: string, roleKey: TenantContext["role"], clinic = a.clinic, organization = a.organization): TenantContext => ({
    userId,
    organizationId: organization.id,
    organizationName: organization.name,
    clinicId: clinic.id,
    clinicName: clinic.name,
    role: roleKey,
  });

  fixture = {
    tokens: {
      admin: await tokenFor(admin, ctx(admin.id, "CLINIC_ADMIN")),
      counselor: await tokenFor(counselor, ctx(counselor.id, "COUNSELOR")),
      marketing: await tokenFor(marketing, ctx(marketing.id, "MARKETING")),
      readonly: await tokenFor(readonly, ctx(readonly.id, "READ_ONLY")),
      orgA: await tokenFor(admin, ctx(admin.id, "CLINIC_ADMIN")),
      orgB: await tokenFor(adminB, ctx(adminB.id, "CLINIC_ADMIN", b.clinic, b.organization)),
    },
    orgAId: a.organization.id,
    orgBId: b.organization.id,
    clinicAId: a.clinic.id,
    clinicBId: b.clinic.id,
    counselorId: counselor.id,
    marketingId: marketing.id,
    patientAId: patient.id,
    leadAId: lead.id,
    campaignAId: campaign.id,
  };
});

after(async () => {
  await cleanup();
});

test("readonly cannot create a lead", async () => {
  assert.equal(roleHasPermission("READ_ONLY", PERMISSIONS.LEADS_CREATE), false);
  const res = await app.request("/api/v1/leads", {
    method: "POST",
    headers: { ...cookie(fixture.tokens.readonly), "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Nope", source: "WALK_IN" }),
  });
  assert.equal(res.status, 403);
});

test("clinic admin can create, assign, move stage, note, and follow up", async () => {
  const created = await app.request("/api/v1/leads", {
    method: "POST",
    headers: { ...cookie(fixture.tokens.admin), "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Walk-in Demo", phone: "9000000099", source: "WALK_IN", treatmentInterest: "IVF" }),
  });
  assert.equal(created.status, 201);
  const lead = (await json(created))["data"] as { id: string; organizationId: string; clinicId: string; stage: string; status: string };
  assert.equal(lead.organizationId, fixture.orgAId);
  assert.equal(lead.clinicId, fixture.clinicAId);
  assert.equal(lead.stage, "NEW_LEAD");
  assert.equal(lead.status, "NEW");

  const assign = await app.request(`/api/v1/leads/${lead.id}/assign`, {
    method: "POST",
    headers: { ...cookie(fixture.tokens.admin), "Content-Type": "application/json" },
    body: JSON.stringify({ assignedToId: fixture.counselorId }),
  });
  assert.equal(assign.status, 200);

  const stage = await app.request(`/api/v1/leads/${lead.id}/stage`, {
    method: "POST",
    headers: { ...cookie(fixture.tokens.admin), "Content-Type": "application/json" },
    body: JSON.stringify({ stage: "CONTACTED" }),
  });
  assert.equal(stage.status, 200);

  const note = await app.request(`/api/v1/leads/${lead.id}/activities`, {
    method: "POST",
    headers: { ...cookie(fixture.tokens.admin), "Content-Type": "application/json" },
    body: JSON.stringify({ type: "NOTE_ADDED", description: "Couple is interested in IVF after September 10." }),
  });
  assert.equal(note.status, 201);

  const task = await app.request(`/api/v1/leads/${lead.id}/tasks`, {
    method: "POST",
    headers: { ...cookie(fixture.tokens.admin), "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Call patient", dueDate: new Date(Date.now() + 86_400_000).toISOString() }),
  });
  assert.equal(task.status, 201);

  const logs = await prisma.auditLog.findMany({ where: { entityId: lead.id } });
  assert.equal(logs.some((row) => row.action === "lead.create"), true);
  assert.equal(logs.some((row) => row.action === "lead.assign"), true);
  assert.equal(logs.some((row) => row.action === "lead.stage"), true);
});

test("duplicate lead is not created silently", async () => {
  const res = await app.request("/api/v1/leads", {
    method: "POST",
    headers: { ...cookie(fixture.tokens.admin), "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Dup", phone: "9000000001", source: "PHONE" }),
  });
  assert.equal(res.status, 409);
  const body = await json(res);
  const error = body["error"] as { code: string; message: string };
  assert.equal(error.code, "DUPLICATE_LEAD");
  assert.match(error.message, /existing lead/i);
});

test("clinic A cannot read clinic B campaign or lead", async () => {
  const foreignLead = await prisma.lead.create({
    data: {
      organizationId: fixture.orgBId,
      clinicId: fixture.clinicBId,
      name: "Secret B",
      source: "WEBSITE",
    },
  });
  const foreignCampaign = await prisma.campaign.create({
    data: { organizationId: fixture.orgBId, clinicId: fixture.clinicBId, name: "B Campaign", source: "WEBSITE" },
  });
  const leadRes = await app.request(`/api/v1/leads/${foreignLead.id}`, { headers: cookie(fixture.tokens.orgA) });
  assert.equal(leadRes.status, 403);
  const campaignRes = await app.request(`/api/v1/campaigns/${foreignCampaign.id}`, { headers: cookie(fixture.tokens.orgA) });
  assert.equal(campaignRes.status === 403 || campaignRes.status === 404, true);
});

test("create lead rejects organizationId override", async () => {
  const res = await app.request("/api/v1/leads", {
    method: "POST",
    headers: { ...cookie(fixture.tokens.admin), "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Hijack", source: "WALK_IN", organizationId: fixture.orgBId }),
  });
  assert.equal(res.status, 422);
});

test("counselor cannot update an unassigned lead", async () => {
  const created = await prisma.lead.create({
    data: {
      organizationId: fixture.orgAId,
      clinicId: fixture.clinicAId,
      name: "Unassigned",
      source: "PHONE",
      status: "NEW",
      stage: "NEW_LEAD",
    },
  });
  const res = await app.request(`/api/v1/leads/${created.id}/stage`, {
    method: "POST",
    headers: { ...cookie(fixture.tokens.counselor), "Content-Type": "application/json" },
    body: JSON.stringify({ stage: "CONTACTED" }),
  });
  assert.equal(res.status, 403);
});

test("lost requires a reason and reopen restores open", async () => {
  const res = await app.request(`/api/v1/leads/${fixture.leadAId}/lost`, {
    method: "POST",
    headers: { ...cookie(fixture.tokens.admin), "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "Timing" }),
  });
  assert.equal(res.status, 200);
  const lost = (await json(res))["data"] as { status: string; stage: string };
  assert.equal(lost.status, "LOST");
  const reopen = await app.request(`/api/v1/leads/${fixture.leadAId}/reopen`, {
    method: "POST",
    headers: cookie(fixture.tokens.admin),
  });
  assert.equal(reopen.status, 200);
  const opened = (await json(reopen))["data"] as { status: string };
  assert.equal(opened.status, "OPEN");
});

test("conversion detects an existing patient", async () => {
  const lead = await prisma.lead.create({
    data: {
      organizationId: fixture.orgAId,
      clinicId: fixture.clinicAId,
      name: "Existing Patient",
      phone: "9888888888",
      email: "existing.patient@example.test",
      source: "WALK_IN",
    },
  });
  const res = await app.request(`/api/v1/leads/${lead.id}/convert`, {
    method: "POST",
    headers: { ...cookie(fixture.tokens.admin), "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 409);
  const body = await json(res);
  assert.equal((body["error"] as { code: string }).code, "EXISTING_PATIENT");
});

test("conversion creates a patient and keeps the lead", async () => {
  const created = await app.request("/api/v1/leads", {
    method: "POST",
    headers: { ...cookie(fixture.tokens.admin), "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Convert Me", phone: "9000000777", email: "convert.me@example.test", source: "WALK_IN", createAnyway: true }),
  });
  const lead = (await json(created))["data"] as { id: string };
  const res = await app.request(`/api/v1/leads/${lead.id}/convert`, {
    method: "POST",
    headers: { ...cookie(fixture.tokens.admin), "Content-Type": "application/json" },
    body: JSON.stringify({ createCouple: true }),
  });
  assert.equal(res.status, 200);
  const data = (await json(res))["data"] as { status: string; patientId: string; id: string };
  assert.equal(data.status, "CONVERTED");
  assert.equal(Boolean(data.patientId), true);
  const still = await prisma.lead.findUnique({ where: { id: data.id } });
  assert.equal(still?.status, "CONVERTED");
});

test("campaign is isolated and attributed", async () => {
  const created = await app.request("/api/v1/campaigns", {
    method: "POST",
    headers: { ...cookie(fixture.tokens.marketing), "Content-Type": "application/json" },
    body: JSON.stringify({ name: "IUI Campaign", source: "WEBSITE", medium: "ORGANIC", treatmentFocus: "IUI" }),
  });
  assert.equal(created.status, 201);
  const campaign = (await json(created))["data"] as { id: string; status: string };
  assert.equal(campaign.status, "DRAFT");
  const lead = await app.request("/api/v1/leads", {
    method: "POST",
    headers: { ...cookie(fixture.tokens.admin), "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Campaign Lead", phone: "9000000666", source: "WEBSITE", campaignId: campaign.id, createAnyway: true }),
  });
  assert.equal(lead.status, 201);
  const summary = await app.request("/api/v1/crm/summary", { headers: cookie(fixture.tokens.admin) });
  assert.equal(summary.status, 200);
  const foreign = await app.request(`/api/v1/campaigns/${campaign.id}`, { headers: cookie(fixture.tokens.orgB) });
  assert.equal(foreign.status === 403 || foreign.status === 404, true);
});

test("public ingest binds clinic slug and ignores tenant override", async () => {
  const valid = await app.request("/api/v1/public/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicSlug: `${PREFIX}-clinic-a`,
      name: "Public Form",
      phone: "9111111000",
      organizationId: fixture.orgBId,
    }),
  });
  assert.equal(valid.status, 422);

  const okRes = await app.request("/api/v1/public/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicSlug: `${PREFIX}-clinic-a`,
      name: "Public Form",
      phone: "9111111000",
      utmSource: "google",
      utmCampaign: "ivf",
    }),
  });
  assert.equal(okRes.status, 201);
  const data = (await json(okRes))["data"] as { id: string; source: string };
  const stored = await prisma.lead.findUnique({ where: { id: data.id } });
  assert.equal(stored?.organizationId, fixture.orgAId);
  assert.equal(stored?.clinicId, fixture.clinicAId);
  assert.equal(stored?.source, "WEBSITE");
  assert.equal(stored?.utmSource, "google");

  const missing = await app.request("/api/v1/public/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clinicSlug: `${PREFIX}-clinic-a`, phone: "9111111001" }),
  });
  assert.equal(missing.status, 422);

  const unknown = await app.request("/api/v1/public/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clinicSlug: "does-not-exist-clinic", name: "Ghost", phone: "9111111002" }),
  });
  assert.equal(unknown.status, 404);

  const shortPhone = await app.request("/api/v1/public/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clinicSlug: `${PREFIX}-clinic-a`, name: "Tiny", phone: "12" }),
  });
  assert.equal(shortPhone.status, 422);
});

test("unknown WhatsApp contact creates a CRM lead not a patient", async () => {
  const conversation = await prisma.conversation.create({
    data: { clinicId: fixture.clinicAId, contactPhone: "919000001111", unmatched: true, channel: "WHATSAPP" },
  });
  const patientsBefore = await prisma.patient.count({ where: { clinicId: fixture.clinicAId } });
  await attachWhatsAppInboundToCrm({
    clinicId: fixture.clinicAId,
    organizationId: fixture.orgAId,
    conversationId: conversation.id,
    phone: "919000001111",
    patientId: null,
    preview: "Hello from WhatsApp",
  });
  const lead = await prisma.lead.findFirst({ where: { clinicId: fixture.clinicAId, phone: "919000001111" } });
  assert.equal(Boolean(lead), true);
  assert.equal(lead?.source, "WHATSAPP");
  const patientsAfter = await prisma.patient.count({ where: { clinicId: fixture.clinicAId } });
  assert.equal(patientsAfter, patientsBefore);
  const activity = await prisma.leadActivity.findFirst({ where: { leadId: lead!.id, type: "WHATSAPP_RECEIVED" } });
  assert.equal(Boolean(activity), true);

  const clinicBConversation = await prisma.conversation.create({
    data: { clinicId: fixture.clinicBId, contactPhone: "919000001111", unmatched: true, channel: "WHATSAPP" },
  });
  await attachWhatsAppInboundToCrm({
    clinicId: fixture.clinicBId,
    organizationId: fixture.orgBId,
    conversationId: clinicBConversation.id,
    phone: "919000001111",
    patientId: null,
    preview: "wrong clinic",
  });
  const cross = await prisma.conversation.findUnique({ where: { id: clinicBConversation.id } });
  assert.notEqual(cross?.leadId, lead?.id);
});

test("existing WhatsApp lead receives activity instead of a duplicate lead", async () => {
  const existing = await prisma.lead.findFirst({ where: { clinicId: fixture.clinicAId, phone: "919000001111" } });
  assert.equal(Boolean(existing), true);
  const conversation = await prisma.conversation.create({
    data: { clinicId: fixture.clinicAId, contactPhone: "919000001111", unmatched: true, channel: "WHATSAPP" },
  });
  await attachWhatsAppInboundToCrm({
    clinicId: fixture.clinicAId,
    organizationId: fixture.orgAId,
    conversationId: conversation.id,
    phone: "919000001111",
    patientId: null,
    preview: "second message",
  });
  const count = await prisma.lead.count({ where: { clinicId: fixture.clinicAId, phone: "919000001111" } });
  assert.equal(count, 1);
});

test("Meta and Google lead adapters are not implemented", async () => {
  assert.throws(() => getLeadSourceAdapter("META_ADS").ingest({}), /not implemented/i);
  const res = await app.request("/api/v1/public/leads/adapters/GOOGLE_ADS", { method: "POST" });
  assert.equal(res.status, 501);
  const suggestion = await LeadQualificationService.suggest("x");
  assert.equal(suggestion.implemented, false);
});

test("search and pipeline are server-side", async () => {
  const search = await app.request("/api/v1/leads?search=Lead%20Alpha&page=1&pageSize=10", {
    headers: cookie(fixture.tokens.admin),
  });
  assert.equal(search.status, 200);
  const body = (await json(search))["data"] as { items: Array<{ name: string }>; total: number };
  assert.equal(body.items.some((row) => row.name === "Lead Alpha"), true);
  const pipeline = await app.request("/api/v1/crm/pipeline?page=1&pageSize=5", { headers: cookie(fixture.tokens.admin) });
  assert.equal(pipeline.status, 200);
});
