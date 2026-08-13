"use client";

import type { UseFormReturn } from "react-hook-form";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TONES } from "@/lib/constants";
import type { BrandProfileInput } from "@/features/settings/schemas/settings.schema";

interface BrandProfileFieldsProps {
  form: UseFormReturn<BrandProfileInput>;
  onSubmit: (values: BrandProfileInput) => void;
  children: React.ReactNode;
}

export function BrandProfileFields({
  form,
  onSubmit,
  children,
}: BrandProfileFieldsProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="brandName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand name</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Inc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Industry</FormLabel>
                <FormControl>
                  <Input placeholder="SaaS, e-commerce, education…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder="https://acme.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brandDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What does your company do?</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="One or two sentences about your product and customers"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The AI uses this to ground every piece of content it writes.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brandVoice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand voice</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="e.g. Confident but never salesy. Short sentences. No jargon."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="defaultTone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default tone</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue placeholder="Pick a tone" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TONES.map((tone) => (
                    <SelectItem key={tone} value={tone} className="capitalize">
                      {tone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {children}
      </form>
    </Form>
  );
}
