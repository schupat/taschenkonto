import LoginForm from "./LoginForm";

export default function LoginPage() {
  // "Just enter your email, we'll set everything up" is only true while
  // registration is open — see ALLOWED_EMAILS in src/lib/email-allowlist.ts.
  const openRegistration = !process.env.ALLOWED_EMAILS?.trim();
  return <LoginForm openRegistration={openRegistration} />;
}
