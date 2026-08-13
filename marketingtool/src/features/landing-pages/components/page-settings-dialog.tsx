"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateLandingPageSettingsAction } from "@/features/landing-pages/actions/landing-page.actions";
import {
  landingPageSettingsSchema,
  type LandingPageSettingsInput,
} from "@/features/landing-pages/schemas/landing-page.schema";
import type { LandingPageEditorData } from "@/features/landing-pages/server/landing-pages.service";

export function PageSettingsDialog({
  page,
  children,
}: {
  page: LandingPageEditorData;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<LandingPageSettingsInput>({
    resolver: zodResolver(landingPageSettingsSchema),
    defaultValues: {
      title: page.title,
      slug: page.slug,
      description: page.description ?? "",
      seoTitle: page.seoTitle ?? "",
      seoDescription: page.seoDescription ?? "",
    },
  });

  function onSubmit(values: LandingPageSettingsInput) {
    startTransition(async () => {
      const result = await updateLandingPageSettingsAction(page.id, values);
      if (result.ok) {
        toast.success("Page settings saved");
        setOpen(false);
        router.refresh();
      } else {
        if (result.fieldErrors?.slug) {
          form.setError("slug", { message: result.fieldErrors.slug[0] });
        }
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Page settings</DialogTitle>
          <DialogDescription>
            URL, title, and how the page appears in search results.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    Published at /p/{field.value || "…"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="seoTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO title</FormLabel>
                  <FormControl>
                    <Input placeholder={page.title} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="seoDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save settings
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
