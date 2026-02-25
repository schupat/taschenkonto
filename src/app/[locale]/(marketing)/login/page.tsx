import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  let session = null;
  try {
    session = await auth();
  } catch {
    // Stale JWT cookie with mismatched secret — ignore and show login form
  }

  if (session) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
