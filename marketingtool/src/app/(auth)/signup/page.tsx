import { redirect } from "next/navigation";

/**
 * Self-signup is disabled: accounts are created by the AI Agent admin and
 * work here automatically (shared credentials + SSO).
 */
export default function SignupPage() {
  redirect("/login");
}
