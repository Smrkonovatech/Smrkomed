import { auth } from "@/lib/auth";
import { prisma } from "@smrkomed/database";
import { ok, unauthorized, notFound, forbidden } from "@/lib/api/response";

export async function GET() {
  const session = await auth();
  if (!session?.user?.clinicId || !session.user.organizationId) return unauthorized();

  const clinic = await prisma.clinic.findFirst({
    where: {
      id: session.user.clinicId,
      organizationId: session.user.organizationId,
    },
    include: {
      branches: true,
      organization: { select: { id: true, name: true, slug: true } },
      _count: {
        select: {
          patients: true,
          couples: true,
          careTasks: true,
          escalations: true,
        },
      },
    },
  });

  if (!clinic) return notFound("Clinic not found");
  if (clinic.organizationId !== session.user.organizationId) {
    return forbidden("You cannot access another organization.");
  }

  return ok({
    clinic: {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      city: clinic.city,
      address: clinic.address,
      phone: clinic.phone,
      email: clinic.email,
      website: clinic.website,
      timezone: clinic.timezone,
      organizationId: clinic.organizationId,
      organizationName: clinic.organization.name,
      branches: clinic.branches,
      counts: clinic._count,
    },
    user: session.user,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.clinicId || !session.user.organizationId) return unauthorized();

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (typeof body["name"] === "string" && body["name"].trim()) data["name"] = body["name"].trim();
  if (body["city"] !== undefined) data["city"] = typeof body["city"] === "string" ? body["city"].trim() || null : null;
  if (body["address"] !== undefined) data["address"] = typeof body["address"] === "string" ? body["address"].trim() || null : null;
  if (body["phone"] !== undefined) data["phone"] = typeof body["phone"] === "string" ? body["phone"].trim() || null : null;
  if (body["email"] !== undefined) data["email"] = typeof body["email"] === "string" ? body["email"].trim() || null : null;
  if (body["website"] !== undefined) data["website"] = typeof body["website"] === "string" ? body["website"].trim() || null : null;
  if (typeof body["timezone"] === "string" && body["timezone"].trim()) data["timezone"] = body["timezone"].trim();

  const updated = await prisma.clinic.update({
    where: { id: session.user.clinicId },
    data,
    include: {
      branches: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  });

  if (typeof body["hours"] === "string") {
    const primaryBranch = updated.branches?.[0] || await prisma.clinicBranch.findFirst({
      where: { clinicId: session.user.clinicId },
      orderBy: { createdAt: "asc" },
    });
    if (primaryBranch) {
      await prisma.clinicBranch.update({
        where: { id: primaryBranch.id },
        data: { hours: body["hours"].trim() || null },
      });
    }
  }

  return ok({ clinic: updated });
}

