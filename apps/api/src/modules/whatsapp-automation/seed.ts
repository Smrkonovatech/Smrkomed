import type { Prisma } from "@smrkomed/database";
import { prisma } from "@smrkomed/database";

import { LIBRARY_FLOWS } from "./library";

/** Idempotent: ensure recommended clinic flow library rows exist (always DRAFT / inactive). */
export async function ensureClinicFlowLibrary(clinicId: string, createdById?: string | null) {
  const existing = await prisma.whatsAppFlow.findMany({
    where: { clinicId, isLibrary: true },
    select: { libraryKey: true },
  });
  const have = new Set(existing.map((r) => r.libraryKey).filter(Boolean));
  const created: string[] = [];
  for (const item of LIBRARY_FLOWS) {
    if (have.has(item.libraryKey)) continue;
    await prisma.whatsAppFlow.create({
      data: {
        clinicId,
        name: item.name,
        description: item.description,
        status: "DRAFT",
        triggerType: item.triggerType,
        definition: item.definition as unknown as Prisma.InputJsonValue,
        isLibrary: true,
        libraryKey: item.libraryKey,
        ...(createdById ? { createdById } : {}),
      },
    });
    created.push(item.libraryKey);
  }
  return { created, totalLibrary: LIBRARY_FLOWS.length };
}
