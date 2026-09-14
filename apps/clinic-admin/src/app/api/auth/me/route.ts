import { auth } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api/response";

export async function GET() {
  const session = await auth();
  if (!session?.user?.organizationId || !session.user.clinicId) return unauthorized();
  return ok({
    user: session.user,
  });
}
