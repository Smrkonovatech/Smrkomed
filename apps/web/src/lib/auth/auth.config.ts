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
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
      const isOnboarding = pathname.startsWith("/onboarding");
      const isPublicPage = pathname.startsWith("/book/");
      const isPublicApi =
        pathname.startsWith("/api/auth") ||
        pathname === "/api/health" ||
        pathname.startsWith("/api/whatsapp/webhook") ||
        pathname === "/api/onboarding" ||
        pathname === "/api/leads/ingest";

      if (isPublicApi || isPublicPage || isOnboarding) return true;
      if (isAuthPage) return true;
      return isLoggedIn;
    },
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
      if (
        token.id &&
        token.organizationId &&
        token.organizationName &&
        token.clinicId &&
        token.clinicName &&
        token.role
      ) {
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
