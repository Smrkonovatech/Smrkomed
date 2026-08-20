import { NextResponse } from "next/server";
import {
  PERMISSIONS,
  TenantAccessError,
  prisma,
  writeTenantAuditLog,
} from "@smrkomed/database";
import { z } from "zod";

import { requirePermission } from "@/server/authz";

export const runtime = "nodejs";

const createSchema = z.object({
  coupleId: z.string().min(1),
  summary: z.string().trim().min(20).max(20_000),
  reasonForVisit: z.string().trim().max(500).optional(),
  nextSteps: z.string().trim().max(2000).optional(),
  consultationDate: z.string().datetime().optional(),
});

export async function GET(request: Request) {
  try {
    const tenant = await requirePermission(PERMISSIONS.PATIENTS_READ);
    const { searchParams } = new URL(request.url);
    const coupleId = searchParams.get("coupleId");
    if (!coupleId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION", message: "coupleId is required." } },
        { status: 400 },
      );
    }

    const couple = await prisma.couple.findFirst({
      where: {
        id: coupleId,
        clinicId: tenant.clinicId,
        clinic: { organizationId: tenant.organizationId },
      },
      select: { id: true },
    });
    if (!couple) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Couple not found." } },
        { status: 404 },
      );
    }

    const notes = await prisma.consultationNote.findMany({
      where: { clinicId: tenant.clinicId, coupleId },
      orderBy: { consultationDate: "desc" },
      take: 20,
      include: { createdBy: { select: { name: true } } },
    });

    return NextResponse.json({
      success: true,
      data: notes.map((note) => ({
        id: note.id,
        consultationDate: note.consultationDate.toISOString(),
        summary: note.summary,
        reasonForVisit: note.reasonForVisit,
        nextSteps: note.nextSteps,
        author: note.createdBy?.name ?? "Staff",
        createdAt: note.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: error.message } },
        { status: error.message === "Unauthorized" ? 401 : 403 },
      );
    }
    console.error("Consultation notes list error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER", message: "Unable to load consultation notes." } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await requirePermission(PERMISSIONS.PATIENTS_WRITE);
    const body = createSchema.parse(await request.json());

    const couple = await prisma.couple.findFirst({
      where: {
        id: body.coupleId,
        clinicId: tenant.clinicId,
        clinic: { organizationId: tenant.organizationId },
      },
      select: { id: true },
    });
    if (!couple) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Couple not found." } },
        { status: 404 },
      );
    }

    const note = await prisma.consultationNote.create({
      data: {
        clinicId: tenant.clinicId,
        coupleId: couple.id,
        createdById: tenant.userId,
        summary: body.summary,
        consultationDate: body.consultationDate ? new Date(body.consultationDate) : new Date(),
        ...(body.reasonForVisit ? { reasonForVisit: body.reasonForVisit } : {}),
        ...(body.nextSteps ? { nextSteps: body.nextSteps } : {}),
      },
    });

    await writeTenantAuditLog(tenant, {
      action: "consultation_note.create",
      entityType: "ConsultationNote",
      entityId: note.id,
      metadata: { coupleId: couple.id },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: note.id,
          consultationDate: note.consultationDate.toISOString(),
          summary: note.summary,
          reasonForVisit: note.reasonForVisit,
          nextSteps: note.nextSteps,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: error.message } },
        { status: error.message === "Unauthorized" ? 401 : 403 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION", message: "Invalid consultation note." } },
        { status: 400 },
      );
    }
    console.error("Consultation note save error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER", message: "Unable to save consultation summary." } },
      { status: 500 },
    );
  }
}
