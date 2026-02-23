import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { checkRateLimit, recordFailedAttempt, clearRateLimit, cleanupStaleEntries } from "./rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // VULN-07 fix: Rate limit parent login attempts per email
        cleanupStaleEntries();
        const rateKey = `login:${parsed.data.email}`;
        const { allowed } = checkRateLimit(rateKey);
        if (!allowed) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) {
          recordFailedAttempt(rateKey);
          return null;
        }

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.hashedPassword
        );
        if (!valid) {
          recordFailedAttempt(rateKey);
          return null;
        }

        clearRateLimit(rateKey);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          familyId: user.familyId,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.familyId = (user as { familyId: string }).familyId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.familyId = token.familyId as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
