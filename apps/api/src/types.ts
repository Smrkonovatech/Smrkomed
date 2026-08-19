import type { StaffRole, TenantContext } from "@smrkomed/database";

export type AuthClaims = {
  id: string;
  name?: string | null;
  email?: string | null;
  organizationId: string;
  organizationName: string;
  clinicId: string;
  clinicName: string;
  role: StaffRole;
};

export type AppEnv = {
  Variables: {
    claims: AuthClaims;
    tenant: TenantContext;
  };
};
