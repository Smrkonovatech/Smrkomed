import { prisma } from "@smrkomed/database";
import { createApp } from "../apps/api/src/app";
import { encodeSessionToken } from "../apps/api/src/middleware/auth";

async function main() {
  const app = createApp();

  const memberships = await prisma.clinicMembership.findMany({
    include: { user: true, clinic: { include: { organization: true } }, role: true },
    take: 5,
  });

  console.log(`Found ${memberships.length} memberships`);

  for (const m of memberships) {
    const user = m.user;
    const clinic = m.clinic;
    const roleKey = m.role?.key ?? "CLINIC_ADMIN";
    console.log(`\n=== Testing for User: ${user.name} (${user.email}) | Role: ${roleKey} | Clinic: ${clinic.name} (${clinic.id}) ===`);

    const token = await encodeSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: roleKey as any,
      clinicId: clinic.id,
      clinicName: clinic.name,
      organizationId: clinic.organizationId,
      organizationName: clinic.organization.name,
    });

    const endpoints = [
      "/api/v1/couples",
      "/api/v1/care-tasks",
      "/api/v1/appointments",
      "/api/v1/documents",
      "/api/v1/activity",
      "/api/v1/users/staff",
    ];

    for (const ep of endpoints) {
      const res = await app.fetch(
        new Request(`http://localhost:4000${ep}`, {
          headers: {
            cookie: `authjs.session-token=${token}`,
          },
        }),
      );
      const status = res.status;
      const text = await res.text();
      if (status >= 400) {
        console.error(`FAILED ${ep} -> status ${status}:`, text);
      } else {
        console.log(`OK ${ep} -> status ${status} (body length: ${text.length})`);
      }
    }
  }
}

main()
  .catch((e) => console.error("FATAL:", e))
  .finally(() => prisma.$disconnect());
