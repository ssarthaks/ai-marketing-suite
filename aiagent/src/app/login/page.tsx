"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-v2.png";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsVerifying(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
        setIsVerifying(false);
      } else {
        const requestedPath = new URLSearchParams(window.location.search).get(
          "returnTo",
        );
        const safePath =
          requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
            ? requestedPath
            : "/";
        window.location.assign(safePath);
      }
    } catch (error) {
      toast.error("An error occurred verifying the credentials");
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm flex flex-col items-center gap-4 p-6 sm:p-8 border border-border bg-card rounded-2xl shadow-xl mx-4 sm:mx-0"
      >
        <div className="flex h-16 w-16 items-center justify-center mb-2 overflow-hidden">
          <Image
            src={logo}
            alt="AiAgent Logo"
            width={64}
            height={64}
            className="object-cover dark:invert"
          />
        </div>
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Sign in to AiAgent
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Please enter your credentials to continue.
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
          />
        </div>
        <div className="relative w-full">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pr-10"
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
        <div className="w-full flex justify-end mt-[-8px]">
          <Link
            href="/forgot-password"
            className="text-xs text-[#6FB941] hover:text-[#6FB941]/80 hover:underline transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <Button
          type="submit"
          className="w-full bg-[#6FB941] hover:bg-[#6FB941]/90 text-white font-medium"
          disabled={isVerifying || !email || !password}
        >
          {isVerifying ? (
            <Loader2 className="size-4 animate-spin mr-2" />
          ) : null}
          {isVerifying ? "Signing In..." : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
