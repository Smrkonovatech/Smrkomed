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

const createTaskAction = z.object({
  type: z.literal("createTask"),
  payload: z.object({
    coupleId: z.string().min(1),
    title: z.string().trim().min(1).max(200),
    category: z.string().trim().max(80).optional(),
    description: z.string().trim().max(1000).optional(),
    dueDate: z.string().optional(),
  }),
});

/**
 * Confirmation-based AI actions.
 * Flow: AI proposes → UI confirms → this endpoint mutates with session auth.
 */
export async function POST(request: Request) {
  try {
    const tenant = await requirePermission(PERMISSIONS.CARE_TASKS_WRITE);
    const body = createTaskAction.parse(await request.json());

    const couple = await prisma.couple.findFirst({
      where: {
        id: body.payload.coupleId,
        clinicId: tenant.clinicId,
        clinic: { organizationId: tenant.organizationId },
      },
      select: { id: true, slug: true },
    });
    if (!couple) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Couple not found in this clinic." } },
        { status: 404 },
      );
    }

    const dueDate = body.payload.dueDate
      ? new Date(`${body.payload.dueDate}T00:00:00`)
      : undefined;

    const task = await prisma.careTask.create({
      data: {
        clinicId: tenant.clinicId,
        coupleId: couple.id,
        title: body.payload.title,
        category: body.payload.category ?? "Follow-up",
        status: "WAITING",
        createdById: tenant.userId,
        ...(body.payload.description ? { description: body.payload.description } : {}),
        ...(dueDate && !Number.isNaN(dueDate.getTime()) ? { dueDate } : {}),
      },
    });

    await writeTenantAuditLog(tenant, {
      action: "ai.action.create_task",
      entityType: "CareTask",
      entityId: task.id,
      metadata: { source: "smrko_ai", coupleId: couple.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: task.id,
        title: task.title,
        coupleId: couple.id,
        coupleSlug: couple.slug,
        status: task.status,
      },
    });
  } catch (error) {
    if (error instanceof TenantAccessError) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: error.message } },
        { status: error.message === "Unauthorized" ? 401 : 403 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION", message: "Invalid AI action." } },
        { status: 400 },
      );
    }
    console.error("AI action error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER", message: "Unable to complete that action. Please try again." },
      },
      { status: 500 },
    );
  }
}
