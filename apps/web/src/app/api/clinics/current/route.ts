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
      organizationId: clinic.organizationId,
      organizationName: clinic.organization.name,
      branches: clinic.branches,
      counts: clinic._count,
    },
    user: session.user,
  });
}
