"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  developmentLoginAction,
  loginAction,
} from "@/features/auth/actions/auth.actions";
import {
  loginSchema,
  type LoginInput,
} from "@/features/auth/schemas/auth.schema";

interface LoginFormProps {
  developmentBypassEnabled?: boolean;
}

export function LoginForm({
  developmentBypassEnabled = false,
}: LoginFormProps) {
  const [isPending, startTransition] = useTransition();
  const [developmentError, setDevelopmentError] = useState<string | null>(
    null,
  );
  const attemptedDevelopmentLogin = useRef(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginInput) {
    startTransition(async () => {
      const result = await loginAction(values);
      if (result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  const startDevelopmentLogin = useCallback(() => {
    startTransition(async () => {
      const result = await developmentLoginAction();
      if (result && !result.ok) {
        setDevelopmentError(result.error);
      }
    });
  }, []);

  useEffect(() => {
    if (
      !developmentBypassEnabled ||
      attemptedDevelopmentLogin.current
    ) {
      return;
    }
    attemptedDevelopmentLogin.current = true;
    startDevelopmentLogin();
  }, [developmentBypassEnabled, startDevelopmentLogin]);

  if (developmentBypassEnabled && !developmentError) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Development mode</CardTitle>
          <CardDescription>
            Starting your local development session…
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-primary" />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login?manual=1">Use manual login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Log in to your workspace</CardDescription>
      </CardHeader>
      <CardContent>
        {developmentError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <p>{developmentError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              disabled={isPending}
              onClick={() => {
                setDevelopmentError(null);
                startDevelopmentLogin();
              }}
            >
              Retry development login
            </Button>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@company.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Log in
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Accounts are created by your team admin in the AI Agent — the same
          credentials work here.
        </p>
      </CardContent>
    </Card>
  );
}
