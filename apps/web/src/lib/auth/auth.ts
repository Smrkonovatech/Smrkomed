import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { ensureDemoWorkspace, isDemoLogin, prisma, type StaffRole } from "@smrkomed/database";
import { z } from "zod";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      organizationId: string;
      organizationName: string;
      clinicId: string;
      clinicName: string;
      role: StaffRole;
    };
  }

  interface User {
    organizationId: string;
    organizationName: string;
    clinicId: string;
    clinicName: string;
    role: StaffRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    organizationId?: string;
    organizationName?: string;
    clinicId?: string;
    clinicName?: string;
    role?: StaffRole;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const password = parsed.data.password;

        try {
          if (isDemoLogin(email, password)) {
            await ensureDemoWorkspace();
          }

          const user = await prisma.user.findUnique({
            where: { email },
            include: {
              memberships: {
                where: { status: "ACTIVE" },
                include: { clinic: { include: { organization: true } }, role: true },
                take: 1,
              },
            },
          });

          if (!user?.isActive) return null;
          const valid = await compare(password, user.passwordHash);
          const membership = user.memberships[0];
          if (!valid || !membership) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            organizationId: membership.clinic.organizationId,
            organizationName: membership.clinic.organization.name,
            clinicId: membership.clinicId,
            clinicName: membership.clinic.name,
            role: membership.role.key,
          };
        } catch (error) {
          console.error("Sign-in failed:", error instanceof Error ? error.message : "unknown");
          return null;
        }
      },
    }),
  ],
});
