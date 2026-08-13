"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-v2.png";
import Image from "next/image";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/user";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsVerifying(true);
    try {
      const res = await requestPasswordReset(email);
      if (res.success) {
        setIsSuccess(true);
      }
    } catch (error) {
      toast.error("Failed to request password reset");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="w-full max-w-sm flex flex-col items-center gap-4 p-6 sm:p-8 border border-border bg-card rounded-2xl shadow-xl text-center mx-4 sm:mx-0">
          <div className="flex h-16 w-16 items-center justify-center mb-2 overflow-hidden">
            <Image
              src={logo}
              alt="Lumen Logo"
              alt="AiAgent Logo"
              width={64}
              height={64}
              className="object-cover dark:invert"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            We've sent a password reset link to <strong>{email}</strong>.
          </p>
          <Button variant="outline" className="w-full mt-4" asChild>
            <Link href="/login">Return to login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col items-center gap-4 p-6 sm:p-8 border border-border bg-card rounded-2xl shadow-xl mx-4 sm:mx-0"
      >
        <div className="flex h-16 w-16 items-center justify-center mb-2 overflow-hidden">
          <Image
            src={logo}
            alt="Lumen Logo"
            alt="AiAgent Logo"
            width={64}
            height={64}
            className="object-cover dark:invert"
          />
        </div>
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold tracking-tight">Forgot Password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email to receive a reset link.
          </p>
        </div>
        <div className="relative w-full">
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
            autoFocus
            required
          />
        </div>
        <Button
          type="submit"
          className="w-full bg-[#6FB941] hover:bg-[#6FB941]/90 text-white font-medium"
          disabled={isVerifying || !email}
        >
          {isVerifying ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : null}
          Send Reset Link
        </Button>
        <div className="mt-4 text-center text-sm">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors"
          >
            <ArrowLeft className="size-3" /> Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}
