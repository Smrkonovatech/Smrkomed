import { Hono } from "hono";
import { PERMISSIONS, prisma } from "@smrkomed/database";
import { z } from "zod";

import { requirePermission } from "../../lib/authz";
import { ok } from "../../lib/http";
import { requireClinicOwned } from "../../lib/resources";
import { validate } from "../../lib/validate";
import type { AppEnv } from "../../types";
import { serializeDocument } from "../clinic-dto";

const idParam = z.object({ id: z.string().min(1) });

const createDocumentSchema = z
  .object({
    coupleId: z.string().min(1),
    name: z.string().trim().min(1).max(200),
    category: z.string().trim().max(80).optional(),
    mimeType: z.string().trim().max(120).optional(),
    sizeBytes: z.number().int().nonnegative().max(20 * 1024 * 1024).optional(),
    careTaskId: z.string().min(1).optional(),
  })
  .strict();

export const documentRoutes = new Hono<AppEnv>()
  .get("/", async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const documents = await prisma.document.findMany({
      where: { clinicId: tenant.clinicId, clinic: { organizationId: tenant.organizationId } },
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return ok(
      c,
      documents.map((row) => serializeDocument(row)),
    );
  })
  .get("/:id", validate("param", idParam), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.PATIENTS_READ);
    const { id } = c.req.valid("param");
    const document = await prisma.document.findUnique({
      where: { id },
      include: { category: { select: { name: true } } },
    });
    await requireClinicOwned(tenant, document);
    return ok(c, serializeDocument(document!));
  })
  .post("/", validate("json", createDocumentSchema), async (c) => {
    const tenant = requirePermission(c, PERMISSIONS.DOCUMENTS_WRITE);
    const body = c.req.valid("json");
    const couple = await requireClinicOwned(
      tenant,
      await prisma.couple.findUnique({ where: { id: body.coupleId } }),
    );
    if (body.careTaskId) {
      const task = await prisma.careTask.findUnique({ where: { id: body.careTaskId } });
      await requireClinicOwned(tenant, task);
    }
    let categoryId: string | undefined;
    if (body.category) {
      const key = body.category.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "other";
      const category = await prisma.documentCategory.upsert({
        where: { clinicId_key: { clinicId: couple.clinicId, key } },
        update: { name: body.category },
        create: { clinicId: couple.clinicId, key, name: body.category },
      });
      categoryId = category.id;
    }
    const document = await prisma.document.create({
      data: {
        clinicId: couple.clinicId,
        coupleId: couple.id,
        name: body.name,
        status: "DOCTOR_REVIEW",
        uploadedById: tenant.userId,
        ...(categoryId ? { categoryId } : {}),
        ...(body.mimeType === undefined ? {} : { mimeType: body.mimeType }),
        ...(body.sizeBytes === undefined ? {} : { sizeBytes: body.sizeBytes }),
        ...(body.careTaskId ? { careTaskId: body.careTaskId } : {}),
      },
      include: { category: { select: { name: true } } },
    });
    return ok(c, serializeDocument(document), 201);
  });
