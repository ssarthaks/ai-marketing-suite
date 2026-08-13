"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-v2.png";
import { setupPassword } from "@/app/actions/user";
import Image from "next/image";

export default function SetupPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 12) {
      toast.error("Password must be at least 12 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      await setupPassword(password);
      toast.success("Password updated successfully!");
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      toast.error("An error occurred updating the password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col items-center gap-4 p-6 sm:p-8 border border-border bg-card rounded-2xl shadow-xl mx-4 sm:mx-0"
      >
        <Image
          src={logo}
          alt="AiAgent Logo"
          width={64}
          height={64}
          className="object-cover dark:invert"
        />
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome to AiAgent
          </h1>
          <h3 className="text-md mt-2 font-semibold tracking-tight">
            Your first step to AI-powered productivity
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Please configure your new secure password to continue.
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

        <div className="relative w-full">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full pr-10"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-[#6FB941] hover:bg-[#6FB941]/90 text-white font-medium"
          disabled={isSubmitting || !password || !confirmPassword}
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : null}
          Update Password
        </Button>
      </form>
    </div>
  );
}
