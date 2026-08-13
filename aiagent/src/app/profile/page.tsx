"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, KeyRound, MailWarning, BarChart } from "lucide-react";
import {
  updatePassword,
  requestPasswordReset,
  getUserUsage,
} from "@/app/actions/user";
import { getErrorMessage } from "@/lib/utils";

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState({
    total_input_tokens: 0,
    total_output_tokens: 0,
    total_cost: 0,
  });

  useEffect(() => {
    if (session?.user) {
      getUserUsage().then(setUsage).catch(console.error);
    }
  }, [session?.user]);

  if (!session?.user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  const email = session.user.email || "";
  let displayName = "You";
  if (email) {
    const parts = email.split("@")[0].split(".");
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts[1];
      displayName = `${first.charAt(0).toUpperCase() + first.slice(1)} ${last.charAt(0).toUpperCase() + last.slice(1)}`;
    } else {
      displayName = email.split("@")[0];
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 12) {
      toast.error("New password must be at least 12 characters.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(oldPassword, newPassword);
      toast.success("Password updated successfully!");
      await signOut({ callbackUrl: "/login" });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-sm font-medium">Your Profile</h1>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-6 sm:p-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 p-5 sm:p-6">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8ad15b] to-[#6FB941] text-xl font-bold text-white shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold">{displayName}</h2>
                <p className="text-sm text-muted-foreground">{email}</p>
                <div className="mt-1 inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold capitalize text-accent-foreground">
                  {session.user.role?.replace("_", " ")}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="border-b p-6">
              <div className="flex items-center gap-2">
                <BarChart className="size-5 text-muted-foreground" />
                <h3 className="text-lg font-medium">Usage Statistics</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Your cumulative AI token usage and estimated cost across all
                chats.
              </p>
            </div>
            <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Input Tokens
                </p>
                <p className="text-2xl font-bold mt-1 text-[#6FB941]">
                  {usage.total_input_tokens.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Output Tokens
                </p>
                <p className="text-2xl font-bold mt-1 text-[#6FB941]">
                  {usage.total_output_tokens.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Cost
                </p>
                <p className="text-2xl font-bold mt-1 text-[#6FB941]">
                  ${usage.total_cost.toFixed(4)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="border-b p-6">
              <div className="flex items-center gap-2">
                <KeyRound className="size-5 text-muted-foreground" />
                <h3 className="text-lg font-medium">Change Password</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Update your account password. Use a strong password with at
                least 8 characters.
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Password</label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Confirm New Password
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto bg-[#6FB941] hover:bg-[#6FB941]/90 text-white"
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <div className="rounded-xl border border-destructive/20 bg-destructive/5 text-card-foreground shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                <MailWarning className="size-5 text-destructive" />
                <h3 className="text-lg font-medium text-destructive">
                  Forgot your current password?
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                If you can't remember your current password to change it, you
                can request a reset link to be sent to your email.
              </p>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={async () => {
                  toast.promise(requestPasswordReset(email), {
                    loading: "Requesting reset link...",
                    success: "Password reset link sent to your email!",
                    error: "Failed to request password reset",
                  });
                }}
              >
                Send Reset Link
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
