import { z } from "zod";
import { SectionType } from "@prisma/client";

const shortText = z.string().trim().max(200);
const mediumText = z.string().trim().max(600);
const url = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      value === "" ||
      value.startsWith("#") ||
      value.startsWith("/") ||
      /^https?:\/\//.test(value),
    "Use a full URL (https://…), a path (/…), or an anchor (#…)"
  );

export const heroSchema = z.object({
  headline: shortText.min(1, "Headline is required"),
  subheadline: mediumText,
  ctaLabel: shortText,
  ctaHref: url,
  imageUrl: url,
});

export const featuresSchema = z.object({
  heading: shortText,
  items: z
    .array(
      z.object({
        title: shortText.min(1, "Title is required"),
        description: mediumText,
      })
    )
    .min(1, "Add at least one feature")
    .max(6, "Maximum 6 features"),
});

export const testimonialsSchema = z.object({
  heading: shortText,
  items: z
    .array(
      z.object({
        quote: mediumText.min(1, "Quote is required"),
        author: shortText.min(1, "Author is required"),
        role: shortText,
      })
    )
    .min(1, "Add at least one testimonial")
    .max(6, "Maximum 6 testimonials"),
});

export const faqSchema = z.object({
  heading: shortText,
  items: z
    .array(
      z.object({
        question: shortText.min(1, "Question is required"),
        answer: mediumText.min(1, "Answer is required"),
      })
    )
    .min(1, "Add at least one question")
    .max(10, "Maximum 10 questions"),
});

export const ctaSchema = z.object({
  headline: shortText.min(1, "Headline is required"),
  subheadline: mediumText,
  ctaLabel: shortText.min(1, "Button label is required"),
  ctaHref: url,
});

export const pricingSchema = z.object({
  heading: shortText,
  plans: z
    .array(
      z.object({
        name: shortText.min(1, "Plan name is required"),
        price: shortText.min(1, "Price is required"),
        period: shortText,
        features: z.string().trim().max(1000),
        ctaLabel: shortText,
        highlighted: z.boolean(),
      })
    )
    .min(1, "Add at least one plan")
    .max(4, "Maximum 4 plans"),
});

export const contactSchema = z.object({
  heading: shortText,
  description: mediumText,
  buttonLabel: shortText,
});

export const SECTION_SCHEMAS = {
  HERO: heroSchema,
  FEATURES: featuresSchema,
  TESTIMONIALS: testimonialsSchema,
  FAQ: faqSchema,
  CTA: ctaSchema,
  PRICING: pricingSchema,
  CONTACT: contactSchema,
} as const satisfies Record<SectionType, z.ZodTypeAny>;

export type HeroContent = z.infer<typeof heroSchema>;
export type FeaturesContent = z.infer<typeof featuresSchema>;
export type TestimonialsContent = z.infer<typeof testimonialsSchema>;
export type FaqContent = z.infer<typeof faqSchema>;
export type CtaContent = z.infer<typeof ctaSchema>;
export type PricingContent = z.infer<typeof pricingSchema>;
export type ContactContent = z.infer<typeof contactSchema>;

export type SectionContent =
  | { type: "HERO"; content: HeroContent }
  | { type: "FEATURES"; content: FeaturesContent }
  | { type: "TESTIMONIALS"; content: TestimonialsContent }
  | { type: "FAQ"; content: FaqContent }
  | { type: "CTA"; content: CtaContent }
  | { type: "PRICING"; content: PricingContent }
  | { type: "CONTACT"; content: ContactContent };

export const DEFAULT_SECTION_CONTENT: Record<SectionType, unknown> = {
  HERO: {
    headline: "A headline that sells the outcome",
    subheadline:
      "One sentence that explains what you offer and why it matters.",
    ctaLabel: "Get started",
    ctaHref: "#cta",
    imageUrl: "",
  } satisfies HeroContent,
  FEATURES: {
    heading: "Everything you need",
    items: [
      { title: "Benefit one", description: "Explain the outcome it delivers." },
      { title: "Benefit two", description: "Explain the outcome it delivers." },
      {
        title: "Benefit three",
        description: "Explain the outcome it delivers.",
      },
    ],
  } satisfies FeaturesContent,
  TESTIMONIALS: {
    heading: "Loved by customers",
    items: [
      {
        quote: "This changed how our team works.",
        author: "Customer name",
        role: "Role, Company",
      },
    ],
  } satisfies TestimonialsContent,
  FAQ: {
    heading: "Frequently asked questions",
    items: [
      {
        question: "How does it work?",
        answer: "Answer the question clearly and briefly.",
      },
    ],
  } satisfies FaqContent,
  CTA: {
    headline: "Ready to get started?",
    subheadline: "Join today — it takes less than a minute.",
    ctaLabel: "Get started",
    ctaHref: "",
  } satisfies CtaContent,
  PRICING: {
    heading: "Simple pricing",
    plans: [
      {
        name: "Starter",
        price: "$19",
        period: "/month",
        features: "Feature one\nFeature two\nFeature three",
        ctaLabel: "Choose Starter",
        highlighted: false,
      },
      {
        name: "Pro",
        price: "$49",
        period: "/month",
        features: "Everything in Starter\nFeature four\nFeature five",
        ctaLabel: "Choose Pro",
        highlighted: true,
      },
    ],
  } satisfies PricingContent,
  CONTACT: {
    heading: "Stay in the loop",
    description: "Leave your email and we'll get back to you.",
    buttonLabel: "Notify me",
  } satisfies ContactContent,
};

/** Parse stored JSON into typed section content; falls back to defaults if corrupt. */
export function parseSectionContent(
  type: SectionType,
  raw: unknown
): SectionContent {
  const schema = SECTION_SCHEMAS[type];
  const parsed = schema.safeParse(raw);
  const content = parsed.success
    ? parsed.data
    : SECTION_SCHEMAS[type].parse(DEFAULT_SECTION_CONTENT[type]);
  return { type, content } as SectionContent;
}
