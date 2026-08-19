import type { NextAuthConfig } from "next-auth";
import type { StaffRole } from "@smrkomed/database";

const authSecret =
  process.env["AUTH_SECRET"] ??
  process.env["NEXTAUTH_SECRET"] ??
  "smrkomed-demo-auth-secret-replace-in-production-32";

export const authConfig = {
  trustHost: true,
  secret: authSecret,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.clinicId = user.clinicId;
        token.clinicName = user.clinicName;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && token.organizationId && token.organizationName && token.clinicId && token.clinicName && token.role) {
        session.user.id = token.id;
        session.user.email = token.email ?? "";
        session.user.name = token.name ?? "";
        session.user.organizationId = token.organizationId;
        session.user.organizationName = token.organizationName;
        session.user.clinicId = token.clinicId;
        session.user.clinicName = token.clinicName;
        session.user.role = token.role as StaffRole;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
