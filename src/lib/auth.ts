import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [
  Resend({
    apiKey: process.env.AUTH_RESEND_KEY,
    from: process.env.AUTH_EMAIL_FROM || "Taschenkonto <onboarding@resend.dev>",
  }),
];

// Dev-only credentials login (email + password)
if (process.env.NODE_ENV !== "production") {
  providers.push(
    Credentials({
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.hashedPassword) return null;
        const valid = await bcrypt.compare(password, user.hashedPassword);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
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
