"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  useFieldArray,
  useForm,
  type Control,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateSectionAction } from "@/features/landing-pages/actions/landing-page.actions";
import {
  contactSchema,
  ctaSchema,
  faqSchema,
  featuresSchema,
  heroSchema,
  pricingSchema,
  testimonialsSchema,
  type ContactContent,
  type CtaContent,
  type FaqContent,
  type FeaturesContent,
  type HeroContent,
  type PricingContent,
  type SectionContent,
  type TestimonialsContent,
} from "@/features/landing-pages/schemas/section.schema";

interface SectionFormProps {
  sectionId: string;
  section: SectionContent;
  onSaved: () => void;
}

function useSectionSave<T extends FieldValues>(
  sectionId: string,
  onSaved: () => void
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function save(values: T) {
    startTransition(async () => {
      const result = await updateSectionAction(sectionId, values);
      if (result.ok) {
        toast.success("Section saved");
        router.refresh();
        onSaved();
      } else {
        toast.error(result.error);
      }
    });
  }

  return { save, isPending };
}

function TextField<T extends FieldValues>({
  form,
  name,
  label,
  placeholder,
  textarea,
}: {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {textarea ? (
              <Textarea rows={3} placeholder={placeholder} {...field} />
            ) : (
              <Input placeholder={placeholder} {...field} />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function SaveButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" disabled={isPending} className="w-full">
      {isPending && <Loader2 className="size-4 animate-spin" />}
      Save section
    </Button>
  );
}

function HeroForm({ sectionId, content, onSaved }: { sectionId: string; content: HeroContent; onSaved: () => void }) {
  const form = useForm<HeroContent>({
    resolver: zodResolver(heroSchema),
    defaultValues: content,
  });
  const { save, isPending } = useSectionSave<HeroContent>(sectionId, onSaved);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(save)} className="space-y-4">
        <TextField form={form} name="headline" label="Headline" />
        <TextField form={form} name="subheadline" label="Subheadline" textarea />
        <TextField form={form} name="ctaLabel" label="Button label" />
        <TextField form={form} name="ctaHref" label="Button link" placeholder="#cta or https://…" />
        <TextField form={form} name="imageUrl" label="Image URL" placeholder="Paste an asset URL" />
        <SaveButton isPending={isPending} />
      </form>
    </Form>
  );
}

function CtaForm({ sectionId, content, onSaved }: { sectionId: string; content: CtaContent; onSaved: () => void }) {
  const form = useForm<CtaContent>({
    resolver: zodResolver(ctaSchema),
    defaultValues: content,
  });
  const { save, isPending } = useSectionSave<CtaContent>(sectionId, onSaved);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(save)} className="space-y-4">
        <TextField form={form} name="headline" label="Headline" />
        <TextField form={form} name="subheadline" label="Subheadline" textarea />
        <TextField form={form} name="ctaLabel" label="Button label" />
        <TextField form={form} name="ctaHref" label="Button link" placeholder="https://…" />
        <SaveButton isPending={isPending} />
      </form>
    </Form>
  );
}

function ContactForm({ sectionId, content, onSaved }: { sectionId: string; content: ContactContent; onSaved: () => void }) {
  const form = useForm<ContactContent>({
    resolver: zodResolver(contactSchema),
    defaultValues: content,
  });
  const { save, isPending } = useSectionSave<ContactContent>(sectionId, onSaved);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(save)} className="space-y-4">
        <TextField form={form} name="heading" label="Heading" />
        <TextField form={form} name="description" label="Description" textarea />
        <TextField form={form} name="buttonLabel" label="Button label" />
        <p className="text-xs text-muted-foreground">
          This section renders an email capture form. Every signup is stored as
          a lead.
        </p>
        <SaveButton isPending={isPending} />
      </form>
    </Form>
  );
}

function ItemsHeader({
  label,
  onAdd,
  canAdd,
}: {
  label: string;
  onAdd: () => void;
  canAdd: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium">{label}</p>
      <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={!canAdd}>
        <Plus className="size-3.5" />
        Add
      </Button>
    </div>
  );
}

function RemoveButton({ onRemove, disabled }: { onRemove: () => void; disabled: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
      onClick={onRemove}
      disabled={disabled}
      aria-label="Remove item"
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}

function FeaturesForm({ sectionId, content, onSaved }: { sectionId: string; content: FeaturesContent; onSaved: () => void }) {
  const form = useForm<FeaturesContent>({
    resolver: zodResolver(featuresSchema),
    defaultValues: content,
  });
  const items = useFieldArray({ control: form.control as Control<FeaturesContent>, name: "items" });
  const { save, isPending } = useSectionSave<FeaturesContent>(sectionId, onSaved);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(save)} className="space-y-4">
        <TextField form={form} name="heading" label="Heading" />
        <ItemsHeader
          label="Features"
          canAdd={items.fields.length < 6}
          onAdd={() => items.append({ title: "", description: "" })}
        />
        {items.fields.map((field, index) => (
          <div key={field.id} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <TextField form={form} name={`items.${index}.title`} label="Title" />
                <TextField form={form} name={`items.${index}.description`} label="Description" textarea />
              </div>
              <RemoveButton onRemove={() => items.remove(index)} disabled={items.fields.length <= 1} />
            </div>
          </div>
        ))}
        <SaveButton isPending={isPending} />
      </form>
    </Form>
  );
}

function TestimonialsForm({ sectionId, content, onSaved }: { sectionId: string; content: TestimonialsContent; onSaved: () => void }) {
  const form = useForm<TestimonialsContent>({
    resolver: zodResolver(testimonialsSchema),
    defaultValues: content,
  });
  const items = useFieldArray({ control: form.control as Control<TestimonialsContent>, name: "items" });
  const { save, isPending } = useSectionSave<TestimonialsContent>(sectionId, onSaved);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(save)} className="space-y-4">
        <TextField form={form} name="heading" label="Heading" />
        <ItemsHeader
          label="Testimonials"
          canAdd={items.fields.length < 6}
          onAdd={() => items.append({ quote: "", author: "", role: "" })}
        />
        {items.fields.map((field, index) => (
          <div key={field.id} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <TextField form={form} name={`items.${index}.quote`} label="Quote" textarea />
                <TextField form={form} name={`items.${index}.author`} label="Author" />
                <TextField form={form} name={`items.${index}.role`} label="Role / company" />
              </div>
              <RemoveButton onRemove={() => items.remove(index)} disabled={items.fields.length <= 1} />
            </div>
          </div>
        ))}
        <SaveButton isPending={isPending} />
      </form>
    </Form>
  );
}

function FaqForm({ sectionId, content, onSaved }: { sectionId: string; content: FaqContent; onSaved: () => void }) {
  const form = useForm<FaqContent>({
    resolver: zodResolver(faqSchema),
    defaultValues: content,
  });
  const items = useFieldArray({ control: form.control as Control<FaqContent>, name: "items" });
  const { save, isPending } = useSectionSave<FaqContent>(sectionId, onSaved);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(save)} className="space-y-4">
        <TextField form={form} name="heading" label="Heading" />
        <ItemsHeader
          label="Questions"
          canAdd={items.fields.length < 10}
          onAdd={() => items.append({ question: "", answer: "" })}
        />
        {items.fields.map((field, index) => (
          <div key={field.id} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <TextField form={form} name={`items.${index}.question`} label="Question" />
                <TextField form={form} name={`items.${index}.answer`} label="Answer" textarea />
              </div>
              <RemoveButton onRemove={() => items.remove(index)} disabled={items.fields.length <= 1} />
            </div>
          </div>
        ))}
        <SaveButton isPending={isPending} />
      </form>
    </Form>
  );
}

function PricingForm({ sectionId, content, onSaved }: { sectionId: string; content: PricingContent; onSaved: () => void }) {
  const form = useForm<PricingContent>({
    resolver: zodResolver(pricingSchema),
    defaultValues: content,
  });
  const plans = useFieldArray({ control: form.control as Control<PricingContent>, name: "plans" });
  const { save, isPending } = useSectionSave<PricingContent>(sectionId, onSaved);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(save)} className="space-y-4">
        <TextField form={form} name="heading" label="Heading" />
        <ItemsHeader
          label="Plans"
          canAdd={plans.fields.length < 4}
          onAdd={() =>
            plans.append({
              name: "",
              price: "",
              period: "/month",
              features: "",
              ctaLabel: "",
              highlighted: false,
            })
          }
        />
        {plans.fields.map((field, index) => (
          <div key={field.id} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <TextField form={form} name={`plans.${index}.name`} label="Name" />
                  <TextField form={form} name={`plans.${index}.price`} label="Price" placeholder="$49" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <TextField form={form} name={`plans.${index}.period`} label="Period" placeholder="/month" />
                  <TextField form={form} name={`plans.${index}.ctaLabel`} label="Button label" />
                </div>
                <TextField
                  form={form}
                  name={`plans.${index}.features`}
                  label="Features (one per line)"
                  textarea
                />
                <FormField
                  control={form.control}
                  name={`plans.${index}.highlighted`}
                  render={({ field: checkboxField }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={checkboxField.value}
                          onCheckedChange={checkboxField.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        Highlight this plan
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <RemoveButton onRemove={() => plans.remove(index)} disabled={plans.fields.length <= 1} />
            </div>
          </div>
        ))}
        <SaveButton isPending={isPending} />
      </form>
    </Form>
  );
}

export function SectionForm({ sectionId, section, onSaved }: SectionFormProps) {
  switch (section.type) {
    case "HERO":
      return <HeroForm sectionId={sectionId} content={section.content} onSaved={onSaved} />;
    case "FEATURES":
      return <FeaturesForm sectionId={sectionId} content={section.content} onSaved={onSaved} />;
    case "TESTIMONIALS":
      return <TestimonialsForm sectionId={sectionId} content={section.content} onSaved={onSaved} />;
    case "FAQ":
      return <FaqForm sectionId={sectionId} content={section.content} onSaved={onSaved} />;
    case "CTA":
      return <CtaForm sectionId={sectionId} content={section.content} onSaved={onSaved} />;
    case "PRICING":
      return <PricingForm sectionId={sectionId} content={section.content} onSaved={onSaved} />;
    case "CONTACT":
      return <ContactForm sectionId={sectionId} content={section.content} onSaved={onSaved} />;
  }
}
