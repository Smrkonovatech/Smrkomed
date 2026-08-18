export { auth, handlers, signIn, signOut } from "./auth";

import { auth } from "./auth";
import { unauthorized, forbidden, type SessionClinicContext } from "@/lib/api/response";
import { roleHasPermission, type PermissionKey } from "@/lib/permissions/rbac";

export async function requireSession(): Promise<SessionClinicContext | Response> {
  const session = await auth();
  if (!session?.user?.id || !session.user.clinicId) {
    return unauthorized();
  }
  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    clinicId: session.user.clinicId,
    role: session.user.role,
  };
}

export async function requirePermission(permission: PermissionKey) {
  const ctx = await requireSession();
  if (ctx instanceof Response) return ctx;
  if (!roleHasPermission(ctx.role, permission)) {
    return forbidden(`Missing permission: ${permission}`);
  }
  return ctx;
}
