import { hash } from "bcryptjs";
import type { ModuleKey, StaffRole, SubscriptionPlanKey } from "@smrkomed/database";
import { PERMISSIONS, ROLE_DEFS, ROLE_PERMISSIONS, prisma, writeAuditLog } from "@smrkomed/database";
import { TRIAL_DAYS } from "@/lib/saas/catalog";
import { slugify, uniqueSlug } from "@/lib/saas/slug";
import type { onboardingSchema } from "@/lib/validations/onboarding";
import type { z } from "zod";

type OnboardingInput = z.infer<typeof onboardingSchema>;

async function ensureRoles() {
  const permissionRows = await Promise.all(
    Object.entries(PERMISSIONS).map(async ([, key]) =>
      prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, name: key },
      }),
    ),
  );
  const byKey = Object.fromEntries(permissionRows.map((row) => [row.key, row]));

  for (const def of ROLE_DEFS) {
    const role = await prisma.role.upsert({
      where: { key: def.key },
      update: { name: def.name, description: def.description },
      create: { key: def.key, name: def.name, description: def.description },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const keys = ROLE_PERMISSIONS[def.key];
    await prisma.rolePermission.createMany({
      data: keys.map((key) => ({ roleId: role.id, permissionId: byKey[key]!.id })),
    });
  }

  return prisma.role.findMany();
}

export async function provisionWorkspace(input: OnboardingInput) {
  const email = input.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const roles = await ensureRoles();
  const roleByKey = Object.fromEntries(roles.map((role) => [role.key, role]));
  const adminRole = roleByKey["CLINIC_ADMIN"];
  if (!adminRole) throw new Error("Clinic admin role is missing.");

  const passwordHash = await hash(input.password, 12);
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const orgSlug = uniqueSlug(
    input.organizationName,
    new Set(
      (await prisma.organization.findMany({ select: { slug: true } })).flatMap((row) =>
        row.slug ? [row.slug] : [],
      ),
    ),
  );
  const clinicSlug = uniqueSlug(
    `${input.clinicName}-${input.city}`,
    new Set((await prisma.clinic.findMany({ select: { slug: true } })).map((row) => row.slug)),
  );

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: input.name,
        phone: input.phone,
        initials: input.name
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        title: "Clinic Administrator",
      },
    });

    const organization = await tx.organization.create({
      data: {
        name: input.organizationName,
        slug: orgSlug,
        ownerUserId: user.id,
        trialEndsAt,
        onboardingCompletedAt: new Date(),
      },
    });

    await tx.subscription.create({
      data: {
        organizationId: organization.id,
        plan: input.plan as SubscriptionPlanKey,
        status: "TRIALING",
        trialEndsAt,
      },
    });

    await tx.organizationModule.createMany({
      data: input.modules.map((module) => ({
        organizationId: organization.id,
        module: module as ModuleKey,
        enabled: true,
      })),
    });

    const clinic = await tx.clinic.create({
      data: {
        organizationId: organization.id,
        name: input.clinicName,
        slug: clinicSlug,
        city: input.city,
        address: input.address,
        phone: input.clinicPhone,
        email: input.clinicEmail || email,
        website: input.website?.trim() ? input.website.trim() : null,
      },
    });

    await tx.clinicMembership.create({
      data: {
        clinicId: clinic.id,
        userId: user.id,
        roleId: adminRole.id,
        status: "ACTIVE",
      },
    });

    await tx.clinicBranch.createMany({
      data: (input.locations.length > 0
        ? input.locations
        : [{ name: input.clinicName, city: input.city }]
      ).map((location) => ({
        clinicId: clinic.id,
        name: location.name,
        city: location.city,
      })),
    });

    if (input.invites.length > 0) {
      await tx.staffInvite.createMany({
        data: input.invites.map((invite, index) => ({
          organizationId: organization.id,
          clinicId: clinic.id,
          email: `${slugify(invite.name)}.${index}.${Date.now()}@pending.smrkomed`,
          name: invite.name,
          role: invite.role as StaffRole,
          status: "INVITED",
        })),
      });
    }

    return { user, organization, clinic };
  });

  await writeAuditLog({
    organizationId: result.organization.id,
    clinicId: result.clinic.id,
    actorId: result.user.id,
    action: "workspace.provisioned",
    entityType: "Organization",
    entityId: result.organization.id,
  });

  return result;
}
