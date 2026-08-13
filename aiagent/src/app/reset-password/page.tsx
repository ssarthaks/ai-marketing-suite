"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-v2.png";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/app/actions/user";
import { getErrorMessage } from "@/lib/utils";

function ResetPasswordForm() {
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const fragmentToken = new URLSearchParams(
      window.location.hash.slice(1),
    ).get("token");
    setToken(
      fragmentToken && /^[a-f0-9]{64}$/i.test(fragmentToken)
        ? fragmentToken
        : null,
    );
    window.history.replaceState({}, "", "/reset-password");
    setTokenLoaded(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword || !token) return;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 12) {
      toast.error("Password must be at least 12 characters");
      return;
    }

    setIsVerifying(true);
    try {
      await resetPassword(token, password);
      toast.success("Password has been reset successfully!");
      router.push("/login");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Invalid or expired reset token"));
    } finally {
      setIsVerifying(false);
    }
  };

  if (!tokenLoaded) {
    return <Loader2 className="size-8 animate-spin text-muted-foreground" />;
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm flex flex-col items-center p-6 sm:p-8 border border-border bg-card rounded-2xl shadow-xl text-center mx-4 sm:mx-0">
        <h1 className="text-xl font-bold tracking-tight text-destructive">
          Invalid Link
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          The password reset token is missing from the URL.
        </p>
        <Button
          variant="outline"
          className="w-full mt-6"
          onClick={() => router.push("/login")}
        >
          Return to login
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm flex flex-col items-center p-6 sm:p-8 border border-border bg-card rounded-2xl shadow-xl mx-4 sm:mx-0"
    >
      <div className="flex h-16 w-16 items-center justify-center mb-2 overflow-hidden mx-auto">
        <Image
          src={logo}
          alt="AiAgent Logo"
          width={64}
          height={64}
          className="object-cover dark:invert"
        />
      </div>
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your new secure password.
        </p>
      </div>
      <div className="relative w-full">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full pr-10"
          autoFocus
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPassword ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </button>
      </div>
      <div className="relative w-full mt-4">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full pr-10"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </div>
      <Button
        type="submit"
        className="w-full mt-6 bg-[#6FB941] hover:bg-[#6FB941]/90 text-white font-medium"
        disabled={isVerifying || !password || !confirmPassword}
      >
        {isVerifying ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
        Reset Password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
      <ResetPasswordForm />
    </div>
  );
}
