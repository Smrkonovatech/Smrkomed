import { hash } from "bcryptjs";
import type { StaffRole } from "@prisma/client";

import { prisma } from "./client";
import { PERMISSIONS, ROLE_DEFS, ROLE_PERMISSIONS } from "./permissions";

export const DEMO_PASSWORD = "Demo@12345";

const DEMO_STAFF: Array<{
  email: string;
  name: string;
  initials: string;
  title: string;
  role: StaffRole;
}> = [
  {
    email: "admin@abcfertility.demo",
    name: "Clinic Admin",
    initials: "CA",
    title: "Clinic Administrator",
    role: "CLINIC_ADMIN",
  },
  {
    email: "ananya@abcfertility.demo",
    name: "Dr. Ananya Rao",
    initials: "AR",
    title: "Fertility Specialist",
    role: "DOCTOR",
  },
  {
    email: "ravi@abcfertility.demo",
    name: "Dr. Ravi Menon",
    initials: "RM",
    title: "Reproductive Endocrinologist",
    role: "DOCTOR",
  },
  {
    email: "meera@abcfertility.demo",
    name: "Meera Iyer",
    initials: "MI",
    title: "Care Coordinator",
    role: "CARE_COORDINATOR",
  },
  {
    email: "nisha@abcfertility.demo",
    name: "Nisha Fernandes",
    initials: "NF",
    title: "Front Desk",
    role: "RECEPTIONIST",
  },
];

const DEMO_EMAILS = new Set(DEMO_STAFF.map((person) => person.email));

export function isDemoLogin(email: string, password: string) {
  return password === DEMO_PASSWORD && DEMO_EMAILS.has(email.toLowerCase());
}

async function ensureRoles() {
  const permissionRows = await Promise.all(
    Object.values(PERMISSIONS).map((key) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, name: key },
      }),
    ),
  );
  const byKey = Object.fromEntries(permissionRows.map((row) => [row.key, row.id]));

  for (const def of ROLE_DEFS) {
    const role = await prisma.role.upsert({
      where: { key: def.key },
      update: { name: def.name, description: def.description },
      create: { key: def.key, name: def.name, description: def.description },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: ROLE_PERMISSIONS[def.key].map((key) => ({
        roleId: role.id,
        permissionId: byKey[key]!,
      })),
    });
  }

  return prisma.role.findMany();
}

/** Creates the ABC Fertility demo clinic and staff in PostgreSQL. Does not create patients. */
export async function ensureDemoWorkspace() {
  const roles = await ensureRoles();
  const roleByKey = Object.fromEntries(roles.map((role) => [role.key, role]));
  const passwordHash = await hash(DEMO_PASSWORD, 12);

  let organization = await prisma.organization.findFirst({
    where: { slug: "abc-fertility-group" },
  });
  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: "ABC Fertility Group",
        slug: "abc-fertility-group",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        onboardingCompletedAt: new Date(),
      },
    });
  }

  const clinic = await prisma.clinic.upsert({
    where: { slug: "abc-fertility-bangalore" },
    create: {
      organizationId: organization.id,
      name: "ABC Fertility Centre",
      slug: "abc-fertility-bangalore",
      city: "Bangalore",
      address: "12 Lavelle Road, Bangalore 560001",
      phone: "+91 80 4000 1200",
      email: "hello@abcfertility.demo",
      timezone: "Asia/Kolkata",
    },
    update: {
      organizationId: organization.id,
      name: "ABC Fertility Centre",
      city: "Bangalore",
    },
  });

  for (const person of DEMO_STAFF) {
    const role = roleByKey[person.role];
    if (!role) continue;
    const user = await prisma.user.upsert({
      where: { email: person.email },
      create: {
        email: person.email,
        passwordHash,
        name: person.name,
        initials: person.initials,
        title: person.title,
        isActive: true,
      },
      update: {
        passwordHash,
        name: person.name,
        initials: person.initials,
        title: person.title,
        isActive: true,
      },
    });
    await prisma.clinicMembership.upsert({
      where: { clinicId_userId: { clinicId: clinic.id, userId: user.id } },
      create: {
        clinicId: clinic.id,
        userId: user.id,
        roleId: role.id,
        status: "ACTIVE",
      },
      update: {
        roleId: role.id,
        status: "ACTIVE",
      },
    });
  }

  return { organization, clinic };
}
