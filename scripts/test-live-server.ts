import { prisma } from "@smrkomed/database";
import { encodeSessionToken } from "../apps/api/src/middleware/auth";

async function main() {
  const m = await prisma.clinicMembership.findFirst({
    where: { status: "ACTIVE" },
    include: { user: true, clinic: { include: { organization: true } }, role: true },
  });

  if (!m) {
    console.error("No active membership found");
    return;
  }

  const token = await encodeSessionToken({
    id: m.user.id,
    email: m.user.email,
    name: m.user.name,
    role: (m.role?.key ?? "CLINIC_ADMIN") as any,
    clinicId: m.clinic.id,
    clinicName: m.clinic.name,
    organizationId: m.clinic.organizationId,
    organizationName: m.clinic.organization.name,
  });

  console.log("Testing live server at http://localhost:4000 ...");

  for (const ep of ["/api/v1/couples", "/api/v1/care-tasks", "/api/v1/appointments", "/api/v1/documents", "/api/v1/activity", "/api/v1/users/staff"]) {
    try {
      const res = await fetch(`http://localhost:4000${ep}`, {
        headers: {
          cookie: `authjs.session-token=${token}`,
        },
      });
      const data = await res.json();
      console.log(`${ep} -> HTTP ${res.status}:`, res.ok ? `OK (${Array.isArray(data.data) ? data.data.length + " items" : "success"})` : data);
    } catch (e: any) {
      console.error(`${ep} -> Fetch error:`, e.message);
    }
  }
}

main().finally(() => prisma.$disconnect());
