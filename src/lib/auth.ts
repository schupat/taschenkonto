import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM || "Taschenkonto <onboarding@resend.dev>",
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      // On first magic-link login, create a Family for the user
      if (user.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { familyId: true },
        });
        if (dbUser && !dbUser.familyId) {
          const family = await prisma.family.create({
            data: {
              name: "Meine Familie",
              currency: "EUR",
              timezone: "Europe/Berlin",
            },
          });
          await prisma.user.update({
            where: { id: user.id },
            data: { familyId: family.id },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // Load familyId on initial sign-in or token refresh
      if (user?.id || trigger === "signIn") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub! },
          select: { familyId: true },
        });
        token.familyId = dbUser?.familyId ?? undefined;
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
    verifyRequest: "/login?verify=true",
  },
});
