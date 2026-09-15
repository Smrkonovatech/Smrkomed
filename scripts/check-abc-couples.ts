import { prisma } from "@smrkomed/database";
import { encodeSessionToken } from "../apps/api/src/middleware/auth";

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: ["admin@abcfertility.demo", "doctor@abcfertility.demo"] } },
    include: {
      memberships: {
        include: { clinic: { include: { organization: true } }, role: true },
      },
    },
  });

  for (const user of users) {
    const m = user.memberships[0];
    if (!m) continue;
    console.log(`User: ${user.name} (${user.email}) -> Clinic: ${m.clinic.name} (${m.clinic.id})`);

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

    const res = await fetch(`http://localhost:4000/api/v1/couples`, {
      headers: { cookie: `authjs.session-token=${token}` },
    });
    const data = await res.json();
    console.log(`Couples HTTP ${res.status}:`, data);
  }
}

main().finally(() => prisma.$disconnect());
