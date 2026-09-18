import { Hono } from "hono";
import { hash } from "bcryptjs";
import { z } from "zod";
import { PERMISSIONS, prisma } from "@smrkomed/database";

import { requirePermission, tenantOf } from "../../lib/authz";
import { ok, fail } from "../../lib/http";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";


const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  title: true,
  isActive: true,
} as const;

const createStaffSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum([
    "DOCTOR",
    "CARE_COORDINATOR",
    "NURSE",
    "RECEPTIONIST",
    "COUNSELOR",
    "CLINIC_ADMIN",
    "PHARMACY_MANAGER",
    "PHARMACIST",
    "PHARMACY_STAFF",
    "LAB_TECHNICIAN",
    "EMBRYOLOGIST",
    "BILLING_STAFF",
    "MARKETING",
    "READ_ONLY",
  ]),
  title: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  department: z.string().max(100).optional(),
  registrationNumber: z.string().max(100).optional(),
  qualifications: z.string().max(500).optional(),
  yearsExperience: z.union([z.number(), z.string()]).optional(),
  languages: z.string().max(200).optional(),
  clinicId: z.string().optional(),
  locationId: z.string().optional(),
  location: z.string().optional(),
});

export const userRoutes = new Hono<AppEnv>()
  .get("/me", async (c) => {
    const tenant = tenantOf(c);
    const user = await prisma.user.findUnique({
      where: { id: tenant.userId },
      select: userSelect,
    });
    return ok(c, {
      id: user?.id ?? tenant.userId,
      email: user?.email ?? "",
      name: user?.name ?? user?.email ?? "Clinic staff",
      phone: user?.phone ?? null,
      title: user?.title ?? null,
      isActive: user?.isActive ?? false,
      organizationId: tenant.organizationId,
      organizationName: tenant.organizationName,
      clinicId: tenant.clinicId,
      clinicName: tenant.clinicName,
      role: tenant.role,
    });
  })
  .get("/staff", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const requestedClinic = c.req.query("clinicId") || c.req.header("x-clinic-id");
    const targetClinicId =
      requestedClinic === "cmt0exo9n000vl804rbaabh32" || requestedClinic === "blr"
        ? "cmt0exo9n000vl804rbaabh32"
        : (requestedClinic || tenant.clinicId);

    try {
      const [memberships, profileRules] = await Promise.all([
        prisma.clinicMembership.findMany({
          where: {
            clinicId: targetClinicId,
            status: "ACTIVE",
            user: { isActive: true },
          },
          select: {
            createdAt: true,
            role: { select: { key: true, name: true } },
            user: { select: { id: true, name: true, title: true, email: true, phone: true, initials: true, isActive: true } },
          },
          orderBy: { createdAt: "asc" },
        }),
        prisma.automationRule.findMany({
          where: {
            clinicId: targetClinicId,
            trigger: "DOCTOR_PROFILE",
          },
        }),
      ]);

      const profileMap = new Map<string, any>();
      for (const rule of profileRules) {
        if (rule.name) profileMap.set(rule.name, rule.config);
      }

      const staff = memberships
        .filter((row) => row.role?.key && row.user?.id)
        .map((row) => {
          const profile = profileMap.get(row.user.id) || profileMap.get(`doc_${row.user.id}`);
          return {
            id: row.user.id,
            name: row.user.name || row.user.email,
            initials: row.user.initials || row.user.name.split(" ").map((p: string) => p[0] ?? "").join("").slice(0, 2).toUpperCase(),
            title: row.user.title,
            email: row.user.email,
            phone: row.user.phone,
            isActive: row.user.isActive,
            role: row.role.key,
            roleName: row.role.name,
            joinedAt: row.createdAt,
            department: profile?.department || (row.role.key === "DOCTOR" ? "Reproductive Medicine" : undefined),
            registrationNumber: profile?.registrationNumber || undefined,
            qualifications: profile?.qualificationsText || (Array.isArray(profile?.qualifications) ? profile.qualifications.map((q: any) => q.degree).join(", ") : undefined),
            yearsExperience: profile?.yearsExperience ? Number(profile.yearsExperience) : undefined,
          };
        });
      const roleCounts = staff.reduce<Record<string, number>>((acc, row) => {
        acc[row.role] = (acc[row.role] ?? 0) + 1;
        return acc;
      }, {});
      console.info("STAFF_LIST", {
        clinicId: tenant.clinicId,
        userId: tenant.userId,
        status: "ok",
        staffCount: staff.length,
        roleCounts,
      });
      return ok(c, staff);
    } catch (error) {
      console.error("STAFF_LIST_FAILED", {
        clinicId: tenant.clinicId,
        userId: tenant.userId,
        status: "error",
        errorCode: error instanceof Error ? error.name : "unknown",
        message: error instanceof Error ? error.message : "unknown",
      });
      throw error;
    }
  })
  .post("/staff", validate("json", createStaffSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.USERS_MANAGE);
    const body = c.req.valid("json");
    const email = body.email.toLowerCase().trim();

    // Check email is not already taken
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return fail(c, 409, "EMAIL_TAKEN", "An account with this email already exists.");
    }

    // Find the role
    const role = await prisma.role.findUnique({ where: { key: body.role as any } });
    if (!role) {
      return fail(c, 400, "ROLE_NOT_FOUND", `Role ${body.role} does not exist. Run demo setup first.`);
    }

    const passwordHash = await hash(body.password, 10);
    const initials = body.name
      .split(" ")
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const requestedClinic = body.clinicId || body.locationId || c.req.header("x-clinic-id");
    const targetClinicId =
      requestedClinic === "cmt0exo9n000vl804rbaabh32" ||
      requestedClinic === "blr" ||
      body.location?.toLowerCase?.().includes("bangalore")
        ? "cmt0exo9n000vl804rbaabh32"
        : (requestedClinic || tenant.clinicId);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: body.name,
          initials,
          title: body.title ?? null,
          phone: body.phone ?? null,
          isActive: true,
        },
        select: userSelect,
      });

      // Add to clinic
      await tx.clinicMembership.create({
        data: {
          clinicId: targetClinicId,
          userId: user.id,
          roleId: role.id,
          status: "ACTIVE",
        },
      });

      return user;
    });

    if (body.role === "DOCTOR" || body.department || body.registrationNumber || body.qualifications) {
      const qualificationsText = typeof body.qualifications === "string" ? body.qualifications : undefined;
      const profileData = {
        displayName: body.name,
        department: body.department || "Reproductive Medicine",
        registrationNumber: body.registrationNumber || undefined,
        qualificationsText,
        yearsExperience: body.yearsExperience ? Number(body.yearsExperience) : 10,
        languages: body.languages ? body.languages.split(",").map((s: string) => s.trim()) : ["English", "Hindi"],
        primarySpecialty: body.title || "Reproductive Medicine",
      };
      await prisma.automationRule.create({
        data: {
          clinicId: targetClinicId,
          trigger: "DOCTOR_PROFILE",
          name: result.id,
          config: profileData,
        },
      }).catch((e) => console.warn("Failed to persist doctor profile config:", e));
    }

    console.info("STAFF_CREATED", {
      clinicId: targetClinicId,
      createdBy: tenant.userId,
      newUserId: result.id,
      role: body.role,
    });

    return ok(c, {
      id: result.id,
      email: result.email,
      name: result.name,
      title: result.title,
      phone: result.phone,
      role: body.role,
      isActive: true,
      department: body.department || (body.role === "DOCTOR" ? "Reproductive Medicine" : undefined),
      registrationNumber: body.registrationNumber || undefined,
      qualifications: body.qualifications || undefined,
      yearsExperience: body.yearsExperience ? Number(body.yearsExperience) : undefined,
    }, 201);
  })
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.USERS_MANAGE);
    const memberships = await prisma.clinicMembership.findMany({
      where: { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } },
      select: {
        status: true,
        role: { select: { key: true, name: true } },
        user: { select: userSelect },
      },
      orderBy: { createdAt: "asc" },
    });
    return ok(c, memberships);
  });

