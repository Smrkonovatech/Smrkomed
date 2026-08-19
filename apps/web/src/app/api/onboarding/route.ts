import { NextRequest } from "next/server";

import { conflict, created, serverError, validationError } from "@/lib/api/response";
import { onboardingSchema } from "@/lib/validations/onboarding";
import { provisionWorkspace } from "@/server/services/onboarding";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const workspace = await provisionWorkspace(parsed.data);
    return created({
      email: workspace.user.email,
      clinicId: workspace.clinic.id,
      clinicSlug: workspace.clinic.slug,
      organizationId: workspace.organization.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create workspace.";
    if (message.includes("already exists")) return conflict(message);
    console.error("Onboarding failed:", message);
    return serverError("Could not create the clinic workspace. Try again.");
  }
}
