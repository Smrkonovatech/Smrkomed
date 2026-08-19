export { auth, handlers, signIn, signOut } from "./auth";

import { auth } from "./auth";
import { unauthorized, forbidden, type SessionClinicContext } from "@/lib/api/response";
import { roleHasPermission, type PermissionKey } from "@/lib/permissions/rbac";

export async function requireSession(): Promise<SessionClinicContext | Response> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.organizationId || !user.clinicId || !user.role) {
    return unauthorized();
  }
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    organizationId: user.organizationId,
    organizationName: user.organizationName,
    clinicId: user.clinicId,
    clinicName: user.clinicName,
    role: user.role,
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
