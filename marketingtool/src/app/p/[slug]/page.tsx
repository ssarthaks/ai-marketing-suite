import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";

import { db } from "@/server/db";
import { getPublishedLandingPage } from "@/features/landing-pages/server/landing-pages.service";
import { SectionRenderer } from "@/features/landing-pages/components/section-renderer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublishedLandingPage(slug);
  if (!page) return { title: "Page not found" };
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.description || undefined,
  };
}

export default async function PublicLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPublishedLandingPage(slug);
  if (!page) notFound();

  // Count the view after the response streams — never blocks the visitor.
  after(async () => {
    try {
      await db.landingPage.update({
        where: { id: page.id },
        data: { views: { increment: 1 } },
      });
    } catch (error) {
      console.error("[landing-page] view increment failed", error);
    }
  });

  return (
    <main className="min-h-svh bg-background">
      {page.sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          landingPageId={page.id}
        />
      ))}
      <footer className="border-t px-6 py-8 text-center text-xs text-muted-foreground">
        Built with Marketing OS
      </footer>
    </main>
  );
}
