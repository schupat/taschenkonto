import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { Resend as ResendClient } from "resend";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [
  Resend({
    apiKey: process.env.AUTH_RESEND_KEY,
    from: process.env.AUTH_EMAIL_FROM || "Taschenkonto <onboarding@resend.dev>",
    async sendVerificationRequest({ identifier: email, url, provider }) {
      // Fix the URL host if AUTH_URL is set (next-auth beta may use internal Docker host)
      let magicUrl = url;
      const rawAuthUrl = (process.env.AUTH_URL ?? "").replace(/^["']|["']$/g, "").trim();
      if (rawAuthUrl) {
        try {
          const authBase = new URL(rawAuthUrl);
          const linkUrl = new URL(url);
          linkUrl.protocol = authBase.protocol;
          linkUrl.host = authBase.host;
          magicUrl = linkUrl.toString();
        } catch {
          console.error("[auth] Invalid AUTH_URL, magic link URL not rewritten:", rawAuthUrl);
        }
      }

      const resend = new ResendClient(process.env.AUTH_RESEND_KEY);
      await resend.emails.send({
        from: provider.from!,
        to: email,
        subject: "Anmelden bei Taschenkonto",
        html: `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <tr><td style="padding:32px 32px 0;text-align:center">
          <span style="font-size:36px">🏦</span>
          <h1 style="margin:16px 0 4px;font-size:22px;font-weight:700;color:#111827">Anmelden bei Taschenkonto</h1>
          <p style="margin:0;font-size:14px;color:#6b7280">Klicke auf den Button, um dich anzumelden.</p>
        </td></tr>
        <tr><td style="padding:28px 32px;text-align:center">
          <a href="${magicUrl}" style="display:inline-block;padding:12px 28px;background:#4f46e5;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px">Jetzt anmelden</a>
        </td></tr>
        <tr><td style="padding:0 32px 28px;text-align:center;border-top:1px solid #f3f4f6">
          <p style="margin:20px 0 8px;font-size:12px;color:#9ca3af">Oder kopiere diesen Link in deinen Browser:</p>
          <p style="margin:0;font-size:11px;color:#6b7280;word-break:break-all">${magicUrl}</p>
          <p style="margin:20px 0 0;font-size:11px;color:#d1d5db">Falls du diese E-Mail nicht angefordert hast, kannst du sie ignorieren.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      });
    },
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
