export const TONES = [
  "professional",
  "friendly",
  "bold",
  "witty",
  "inspirational",
  "casual",
  "authoritative",
  "empathetic",
] as const;

export type Tone = (typeof TONES)[number];

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  BLOG_POST: "Blog Post",
  INSTAGRAM_POST: "Instagram Post",
  FACEBOOK_POST: "Facebook Post",
  LINKEDIN_POST: "LinkedIn Post",
  EMAIL: "Email",
  GOOGLE_ADS: "Google Ads",
  META_ADS: "Meta Ads",
  LANDING_PAGE_COPY: "Landing Page Copy",
  CTA: "Call to Action",
  SEO_META: "SEO Meta",
  KEYWORDS: "Keywords",
  NEWSLETTER: "Newsletter",
  TWEET_THREAD: "Tweet Thread",
  YOUTUBE_SCRIPT: "YouTube Script",
  PRESS_RELEASE: "Press Release",
};

export const SECTION_TYPE_LABELS: Record<string, string> = {
  HERO: "Hero",
  FEATURES: "Features",
  TESTIMONIALS: "Testimonials",
  FAQ: "FAQ",
  CTA: "Call to Action",
  PRICING: "Pricing",
  CONTACT: "Contact",
};

export const LEAD_MAGNET_TYPE_LABELS: Record<string, string> = {
  CHECKLIST: "Checklist",
  STUDY_PLAN: "Study Plan",
  PDF: "PDF",
  QUIZ: "Quiz",
  GUIDE: "Guide",
  RESOURCE: "Resource",
};

export const DEMO_PROJECTS = [
  { id: "demo-saas", name: "Demo SaaS (Acme Suite)", badge: "Demo SaaS" },
  { id: "demo-edtech", name: "Demo EdTech (EduSpark)", badge: "Demo EdTech" },
  { id: "demo-ecommerce", name: "Demo E-Commerce (ArtisanCraft)", badge: "Demo E-Commerce" },
] as const;

export const EDTECH_PROJECTS = DEMO_PROJECTS;

