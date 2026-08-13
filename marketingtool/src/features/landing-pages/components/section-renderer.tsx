import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { LeadCaptureForm } from "@/features/leads/components/lead-capture-form";
import type {
  CtaContent,
  FaqContent,
  FeaturesContent,
  HeroContent,
  PricingContent,
  SectionContent,
  TestimonialsContent,
  ContactContent,
} from "@/features/landing-pages/schemas/section.schema";

/**
 * Pure section presentation, shared by the editor preview and the
 * published page so the two can never drift apart.
 */

function Hero({ content }: { content: HeroContent }) {
  return (
    <section className="px-6 py-20 text-center sm:py-28">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          {content.headline}
        </h1>
        {content.subheadline && (
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {content.subheadline}
          </p>
        )}
        {content.ctaLabel && (
          <div>
            <a
              href={content.ctaHref || "#"}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              {content.ctaLabel}
            </a>
          </div>
        )}
        {content.imageUrl && (
          <div className="pt-6">
            <img
              src={content.imageUrl}
              alt=""
              className="mx-auto max-h-[420px] w-full max-w-4xl rounded-xl border object-cover shadow-lg"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function Features({ content }: { content: FeaturesContent }) {
  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        {content.heading && (
          <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight">
            {content.heading}
          </h2>
        )}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {content.items.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Check className="size-4 text-primary" />
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              {item.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials({ content }: { content: TestimonialsContent }) {
  return (
    <section className="bg-muted/40 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        {content.heading && (
          <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight">
            {content.heading}
          </h2>
        )}
        <div
          className={cn(
            "grid gap-6",
            content.items.length > 1 && "sm:grid-cols-2",
            content.items.length > 2 && "lg:grid-cols-3"
          )}
        >
          {content.items.map((item, index) => (
            <figure
              key={index}
              className="rounded-xl border bg-card p-6 shadow-sm"
            >
              <blockquote className="text-sm leading-relaxed">
                “{item.quote}”
              </blockquote>
              <figcaption className="mt-4">
                <p className="text-sm font-semibold">{item.author}</p>
                {item.role && (
                  <p className="text-xs text-muted-foreground">{item.role}</p>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq({ content }: { content: FaqContent }) {
  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl">
        {content.heading && (
          <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight">
            {content.heading}
          </h2>
        )}
        <dl className="divide-y">
          {content.items.map((item, index) => (
            <div key={index} className="py-5">
              <dt className="font-medium">{item.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Cta({ content }: { content: CtaContent }) {
  return (
    <section id="cta" className="px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl rounded-2xl bg-primary px-8 py-14 text-center text-primary-foreground">
        <h2 className="text-3xl font-semibold tracking-tight text-balance">
          {content.headline}
        </h2>
        {content.subheadline && (
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
            {content.subheadline}
          </p>
        )}
        <a
          href={content.ctaHref || "#"}
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-background px-8 text-sm font-medium text-foreground shadow transition-opacity hover:opacity-90"
        >
          {content.ctaLabel}
        </a>
      </div>
    </section>
  );
}

function Pricing({ content }: { content: PricingContent }) {
  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        {content.heading && (
          <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight">
            {content.heading}
          </h2>
        )}
        <div
          className={cn(
            "grid gap-6",
            content.plans.length > 1 && "sm:grid-cols-2",
            content.plans.length > 2 && "lg:grid-cols-3",
            content.plans.length > 3 && "lg:grid-cols-4"
          )}
        >
          {content.plans.map((plan, index) => (
            <div
              key={index}
              className={cn(
                "flex flex-col rounded-xl border bg-card p-6 shadow-sm",
                plan.highlighted && "border-primary ring-1 ring-primary"
              )}
            >
              <h3 className="font-semibold">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-muted-foreground">
                    {plan.period}
                  </span>
                )}
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features
                  .split("\n")
                  .map((feature) => feature.trim())
                  .filter(Boolean)
                  .map((feature, featureIndex) => (
                    <li
                      key={featureIndex}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
              </ul>
              {plan.ctaLabel && (
                <a
                  href="#cta"
                  className={cn(
                    "mt-6 inline-flex h-10 items-center justify-center rounded-lg px-6 text-sm font-medium transition-colors",
                    plan.highlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border bg-background hover:bg-muted"
                  )}
                >
                  {plan.ctaLabel}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact({
  content,
  landingPageId,
  interactive,
}: {
  content: ContactContent;
  landingPageId?: string;
  interactive: boolean;
}) {
  return (
    <section className="bg-muted/40 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        {content.heading && (
          <h2 className="text-3xl font-semibold tracking-tight">
            {content.heading}
          </h2>
        )}
        {content.description && (
          <p className="text-muted-foreground">{content.description}</p>
        )}
        <div className="pt-2">
          <LeadCaptureForm
            landingPageId={landingPageId}
            buttonLabel={content.buttonLabel || "Notify me"}
            interactive={interactive}
          />
        </div>
      </div>
    </section>
  );
}

interface SectionRendererProps {
  section: SectionContent;
  landingPageId?: string;
  interactive?: boolean;
}

export function SectionRenderer({
  section,
  landingPageId,
  interactive = true,
}: SectionRendererProps) {
  switch (section.type) {
    case "HERO":
      return <Hero content={section.content} />;
    case "FEATURES":
      return <Features content={section.content} />;
    case "TESTIMONIALS":
      return <Testimonials content={section.content} />;
    case "FAQ":
      return <Faq content={section.content} />;
    case "CTA":
      return <Cta content={section.content} />;
    case "PRICING":
      return <Pricing content={section.content} />;
    case "CONTACT":
      return (
        <Contact
          content={section.content}
          landingPageId={landingPageId}
          interactive={interactive}
        />
      );
  }
}
