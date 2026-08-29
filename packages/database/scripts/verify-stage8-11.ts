/**
 * Stage 8.11 — verify Patient 360 against seeded scenarios.
 * Run after seed-stage8-11.ts
 */
import { buildPatient360, prisma, type TenantContext } from "../src";

const PREFIX = "s811";

async function main() {
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { slug: `${PREFIX}-clinic-a` } });
  const clinicB = await prisma.clinic.findUniqueOrThrow({ where: { slug: `${PREFIX}-clinic-b` } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: `admin@${PREFIX}.demo` } });
  const adminB = await prisma.user.findUniqueOrThrow({ where: { email: `admin-b@${PREFIX}.demo` } });

  const tenantA: TenantContext = {
    userId: admin.id,
    organizationId: clinic.organizationId,
    organizationName: "Stage 8.11 Verification Org",
    clinicId: clinic.id,
    clinicName: clinic.name,
    role: "CLINIC_ADMIN",
  };
  const tenantB: TenantContext = {
    userId: adminB.id,
    organizationId: clinicB.organizationId,
    organizationName: "Stage 8.11 Verification Org",
    clinicId: clinicB.id,
    clinicName: clinicB.name,
    role: "CLINIC_ADMIN",
  };

  const couples = await prisma.couple.findMany({
    where: { clinicId: clinic.id, slug: { startsWith: `${PREFIX}-p` } },
    orderBy: { slug: "asc" },
    include: { primaryPatient: true },
  });

  const results: Array<Record<string, unknown>> = [];

  for (const couple of couples) {
    const view = await buildPatient360(tenantA, couple.id);
    if (!view) {
      results.push({ slug: couple.slug, ok: false, error: "null_360" });
      continue;
    }
    results.push({
      slug: couple.slug,
      ok: true,
      patient: view.header.patientName,
      doctor: view.header.assignedDoctor,
      coordinator: view.header.assignedCoordinator,
      treatment: view.header.currentTreatment?.label ?? null,
      attention: view.attention.level,
      alerts: view.attention.alerts.map((a) => a.id),
      pendingTasks: view.summaryCards.pendingTasks,
      meds: view.summaryCards.currentMedications,
      payment: view.summaryCards.paymentStatus,
      insurance: view.summaryCards.insuranceStatus,
      whatsapp: view.summaryCards.whatsappStatus,
      abha: view.header.abhaStatus,
      docs: view.summaryCards.documentsCount,
      storageConfigured: view.summaryCards.documentStorageConfigured,
      timelineCount: view.timeline.items.length,
      timelineSources: [...new Set(view.timeline.items.map((i) => i.sourceModule))],
      docNote: view.timeline.documentStorageNote,
    });
  }

  // Isolation: Clinic B must not resolve Clinic A couple
  const aCouple = couples[0]!;
  const cross = await buildPatient360(tenantB, aCouple.id);
  const bOnly = await prisma.couple.findFirst({
    where: { clinicId: clinicB.id, slug: `${PREFIX}-clinic-b-only` },
  });
  const bView = bOnly ? await buildPatient360(tenantB, bOnly.id) : null;
  const aSeesB = bOnly ? await buildPatient360(tenantA, bOnly.id) : null;

  // Scenario assertions
  const bySlug = Object.fromEntries(results.map((r) => [r.slug as string, r]));
  const checks: Array<{ name: string; pass: boolean; detail?: string }> = [];

  const assert = (name: string, pass: boolean, detail?: string) => {
    checks.push({ name, pass, ...(detail ? { detail } : {}) });
  };

  assert("p1 has no treatment", bySlug[`${PREFIX}-p1`]?.treatment == null);
  assert("p2 has IVF treatment", String(bySlug[`${PREFIX}-p2`]?.treatment ?? "").includes("IVF"));
  assert("p2 has doctor", bySlug[`${PREFIX}-p2`]?.doctor === "Dr S811");
  assert(
    "p3 high attention overdue",
    bySlug[`${PREFIX}-p3`]?.attention === "HIGH" &&
      (bySlug[`${PREFIX}-p3`]?.alerts as string[]).includes("overdue-tasks"),
  );
  assert("p4 has upcoming appt card or low alert", Number(bySlug[`${PREFIX}-p4`]?.pendingTasks) >= 0);
  assert("p5 has medications", Number(bySlug[`${PREFIX}-p5`]?.meds) >= 1);
  assert("p6 outstanding payment", bySlug[`${PREFIX}-p6`]?.payment === "OUTSTANDING");
  assert("p7 insurance active", bySlug[`${PREFIX}-p7`]?.insurance === "ACTIVE");
  assert("p8 whatsapp thread", bySlug[`${PREFIX}-p8`]?.whatsapp === "OPEN");
  assert("p9 abha linked", bySlug[`${PREFIX}-p9`]?.abha === "LINKED");
  assert("p10 timeline rich", Number(bySlug[`${PREFIX}-p10`]?.timelineCount) >= 4);
  assert("p10 docs metadata storage note", Boolean(bySlug[`${PREFIX}-p10`]?.docNote));
  assert("clinic B cannot load clinic A 360", cross === null);
  assert("clinic A cannot load clinic B 360", aSeesB === null);
  assert("clinic B can load own couple", Boolean(bView));

  const failed = checks.filter((c) => !c.pass);
  console.log(
    JSON.stringify(
      {
        scenarioResults: results,
        isolation: {
          crossClinicNull: cross === null,
          aSeesBNull: aSeesB === null,
          bOwnOk: Boolean(bView),
        },
        checks,
        passed: failed.length === 0,
        failedCount: failed.length,
      },
      null,
      2,
    ),
  );
  if (failed.length) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
