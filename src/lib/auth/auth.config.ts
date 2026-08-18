import type { NextAuthConfig } from "next-auth";
import type { StaffRole } from "@prisma/client";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isLogin = pathname.startsWith("/login");
      const isPublicApi =
        pathname.startsWith("/api/auth") ||
        pathname === "/api/health" ||
        pathname.startsWith("/api/whatsapp/webhook");

      if (isPublicApi) return true;
      if (isLogin) return true;
      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.clinicId = user.clinicId;
        token.clinicName = user.clinicName;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && token.clinicId && token.role && token.clinicName) {
        session.user.id = token.id;
        session.user.email = token.email ?? "";
        session.user.name = token.name ?? "";
        session.user.clinicId = token.clinicId;
        session.user.clinicName = token.clinicName;
        session.user.role = token.role as StaffRole;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
