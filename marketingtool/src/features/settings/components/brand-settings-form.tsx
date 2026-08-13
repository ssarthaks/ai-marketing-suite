"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { updateBrandSettingsAction } from "@/features/settings/actions/settings.actions";
import {
  brandProfileSchema,
  type BrandProfileInput,
} from "@/features/settings/schemas/settings.schema";
import { BrandProfileFields } from "./brand-profile-fields";

export function BrandSettingsForm({
  defaultValues,
}: {
  defaultValues: BrandProfileInput;
}) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<BrandProfileInput>({
    resolver: zodResolver(brandProfileSchema),
    defaultValues,
  });

  function onSubmit(values: BrandProfileInput) {
    startTransition(async () => {
      const result = await updateBrandSettingsAction(values);
      if (result.ok) {
        toast.success("Brand settings saved");
        form.reset(values);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <BrandProfileFields form={form} onSubmit={onSubmit}>
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isPending || !form.formState.isDirty}
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </BrandProfileFields>
  );
}
