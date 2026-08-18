import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ok, unauthorized, notFound } from "@/lib/api/response";

export async function GET() {
  const session = await auth();
  if (!session?.user?.clinicId) return unauthorized();

  const clinic = await prisma.clinic.findUnique({
    where: { id: session.user.clinicId },
    include: {
      branches: true,
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

  return ok({
    clinic: {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      city: clinic.city,
      branches: clinic.branches,
      counts: clinic._count,
    },
    user: session.user,
  });
}
