import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | Marketing OS",
  description: "Account & Profile Settings",
};

export default function SettingsPage() {
  redirect("https://internal-chatbot-test.vercel.app/profile");
}
