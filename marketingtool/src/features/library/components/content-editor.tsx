"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatContentToMarkdown } from "@/lib/format";
import { updateContentAction } from "@/features/library/actions/content.actions";
import {
  updateContentSchema,
  type UpdateContentInput,
} from "@/features/library/schemas/content.schema";

interface ContentEditorProps {
  contentId: string;
  defaultValues: UpdateContentInput;
  collections: string[];
}

export function ContentEditor({
  contentId,
  defaultValues,
  collections,
}: ContentEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPreview, setIsPreview] = useState(true);

  const form = useForm<UpdateContentInput>({
    resolver: zodResolver(updateContentSchema),
    defaultValues,
  });

  function onSubmit(values: UpdateContentInput) {
    startTransition(async () => {
      const result = await updateContentAction(contentId, values);
      if (result.ok) {
        toast.success("Content saved");
        form.reset(values);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_240px]">
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
            name="collection"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Collection</FormLabel>
                <FormControl>
                  <Input
                    list="content-collections"
                    placeholder="e.g. Q3 launch"
                    {...field}
                  />
                </FormControl>
                <datalist id="content-collections">
                  {collections.map((collection) => (
                    <option key={collection} value={collection} />
                  ))}
                </datalist>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Content</FormLabel>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="preview-mode"
                    checked={isPreview}
                    onCheckedChange={setIsPreview}
                  />
                  <Label htmlFor="preview-mode">Preview</Label>
                </div>
              </div>
              <FormControl>
                {isPreview ? (
                  <div className="max-h-[60vh] overflow-y-auto rounded-lg border bg-muted/30 p-5 text-sm">
                    <MarkdownContent
                      content={formatContentToMarkdown(field.value)}
                    />
                  </div>
                ) : (
                  <Textarea
                    rows={18}
                    className="resize-y font-mono text-sm leading-relaxed"
                    {...field}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPending || !form.formState.isDirty}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
