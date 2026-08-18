import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import type { StaffRole } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db";
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
      clinicId: string;
      clinicName: string;
      role: StaffRole;
    };
  }

  interface User {
    clinicId: string;
    clinicName: string;
    role: StaffRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
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
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              where: { status: "ACTIVE" },
              include: { clinic: true, role: true },
              take: 1,
            },
          },
        });

        if (!user || !user.isActive) return null;

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        const membership = user.memberships[0];
        if (!membership) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          clinicId: membership.clinicId,
          clinicName: membership.clinic.name,
          role: membership.role.key,
        };
      },
    }),
  ],
});
