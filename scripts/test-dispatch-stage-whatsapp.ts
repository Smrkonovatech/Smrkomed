import { prisma } from "@smrkomed/database";
import { encodeSessionToken } from "../apps/api/src/middleware/auth";

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "admin@abcfertility.demo" },
    include: {
      memberships: {
        include: { clinic: { include: { organization: true } }, role: true },
      },
    },
  });

  if (!user || !user.memberships[0]) {
    console.error("User or membership not found");
    return;
  }

  const m = user.memberships[0];
  const token = await encodeSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: (m.role?.key ?? "CLINIC_ADMIN") as any,
    clinicId: m.clinic.id,
    clinicName: m.clinic.name,
    organizationId: m.clinic.organizationId,
    organizationName: m.clinic.organization.name,
  });

  // Test dispatching Stage 7 (Ovarian Stimulation) to WhatsApp
  const res = await fetch("http://localhost:4000/api/v1/care-loop/dispatch-stage-whatsapp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: `authjs.session-token=${token}`,
    },
    body: JSON.stringify({
      stageNumber: process.argv[2] ? parseInt(process.argv[2], 10) : 7,
      phoneNumber: process.argv[3] || "917795559724",
      syncPlanStage: true,
    }),
  });

  const data = await res.json();
  console.log(`Dispatch HTTP ${res.status}:`, JSON.stringify(data, null, 2));
}

main().finally(() => prisma.$disconnect());
