import {
  BarChart3,
  BookOpen,
  FolderOpen,
  HelpCircle,
  LayoutDashboard,
  LibraryBig,
  Magnet,
  Megaphone,
  MessageSquare,
  PanelsTopLeft,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface PageGuideFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface PageGuide {
  key: string;
  badge: string;
  title: string;
  subtitle: string;
  overview: string;
  features: PageGuideFeature[];
  proTip?: string;
}

export const PAGE_GUIDES: Record<string, PageGuide> = {
  dashboard: {
    key: "dashboard",
    badge: "Workspace Hub",
    title: "Welcome to Your Marketing Dashboard",
    subtitle:
      "Your central command center for performance metrics and campaign activity.",
    overview:
      "The Dashboard gives you a real-time overview of your marketing operations, content creation velocity, lead acquisition, and active campaigns in one unified view.",
    features: [
      {
        icon: LayoutDashboard,
        title: "Performance Summary Cards",
        description:
          "Track key stats including total AI generations, token usage, page views, and total captured leads.",
      },
      {
        icon: BarChart3,
        title: "Growth Trend Visualizations",
        description:
          "Monitor 30-day charts for content creation volume and incoming subscriber lead trends.",
      },
      {
        icon: Megaphone,
        title: "Active Campaigns Tracker",
        description:
          "Review active marketing campaigns, budgets, end dates, and target audiences at a glance.",
      },
      {
        icon: Sparkles,
        title: "Quick Action Shortcuts",
        description:
          "Jump straight into AI Studio, create landing pages, build lead magnets, or draft new copy with 1-click.",
      },
    ],
    proTip:
      "Press ⌘K (or Ctrl+K) anywhere in the app to open the global Command Palette to search your workspace or jump to any page.",
  },

  chats: {
    key: "chats",
    badge: "AI Assistant",
    title: "Chats from AiAgent — AI Marketing Assistant",
    subtitle:
      "Collaborate with an AI strategist trained on proven growth frameworks.",
    overview:
      "AiAgent is your dedicated AI marketing strategist. Chat naturally to brainstorm marketing angles, structure campaign launch plans, refine positioning, and generate multi-channel copy.",
    features: [
      {
        icon: MessageSquare,
        title: "Conversational Strategy Sessions",
        description:
          "Ask AiAgent anything about positioning, audience targeting, launch timelines, or copywriting frameworks.",
      },
      {
        icon: Sparkles,
        title: "DeepSeek Flash & Pro Models",
        description:
          "Choose between high-speed Flash for rapid drafting or reasoning-focused Pro models for complex analysis.",
      },
      {
        icon: HelpCircle,
        title: "Product & Project Aware",
        description:
          "AiAgent automatically recognizes your active project workspace and applies your target audience guidelines.",
      },
      {
        icon: FolderOpen,
        title: "File & Spec Attachments",
        description:
          "Upload documents, PDFs, or specs into the chat for AiAgent to analyze and turn into campaign assets.",
      },
    ],
    proTip:
      "Click any prompt suggestion chip on a new chat screen to immediately launch high-converting marketing workflows.",
  },

  campaigns: {
    key: "campaigns",
    badge: "Campaign Management",
    title: "Welcome to Campaigns",
    subtitle:
      "Plan, execute, and monitor your multi-channel marketing campaigns.",
    overview:
      "Campaigns align your messaging, AI generations, landing pages, and lead magnets under structured goals, budgets, and timelines.",
    features: [
      {
        icon: Megaphone,
        title: "Structured Strategy Setup",
        description:
          "Define campaign titles, objectives, target demographics, product focus, and start/end dates.",
      },
      {
        icon: BookOpen,
        title: "Status Filtering",
        description:
          "Organize campaigns into Draft, Active, Paused, or Completed statuses to keep your team focused.",
      },
      {
        icon: Users,
        title: "Target Persona Alignment",
        description:
          "Specify audience age ranges and pain points so AI tools tailor copy specifically to your target buyers.",
      },
      {
        icon: BarChart3,
        title: "Asset & Lead Attribution",
        description:
          "Connect landing pages and lead magnets directly to campaigns to track generated leads.",
      },
    ],
    proTip:
      "When creating a campaign, select a specific project workspace to automatically feed project parameters into all AI copy prompts.",
  },

  "ai-studio": {
    key: "ai-studio",
    badge: "Standalone Assets",
    title: "Welcome to AI Studio",
    subtitle: "Generate one focused marketing asset at a time.",
    overview:
      "AI Studio creates one standalone blog, landing-page, paid-ad, SEO, CTA, video, or press asset. Research, copy audits, repurposing blueprints, competitor battlecards, email drips, and organic social campaigns each stay in their dedicated tool.",
    features: [
      {
        icon: Sparkles,
        title: "One Explicit Deliverable",
        description:
          "Choose a single allowed asset type and receive only that deliverable—never a hidden multi-channel bundle.",
      },
      {
        icon: Settings,
        title: "Custom Brand Voice & Tone",
        description:
          "Choose between Professional, Casual, Urgent, Bold, or Friendly tones to match your brand identity.",
      },
      {
        icon: LibraryBig,
        title: "Isolated Vault Storage",
        description:
          "Studio saves real generated content under its own collection so specialist outputs are not mislabeled as Studio work.",
      },
      {
        icon: BookOpen,
        title: "Audience & Product Inputs",
        description:
          "Inject custom target audience context and product benefits for hyper-relevant copywriting outputs.",
      },
    ],
    proTip:
      "Use the matching specialist page whenever your request is research, an audit, a repurposing plan, a battlecard, an email sequence, or organic social.",
  },

  library: {
    key: "library",
    badge: "Content Vault",
    title: "Welcome to Content Library",
    subtitle:
      "Your organized vault of all AI-generated content and saved copy drafts.",
    overview:
      "The Content Library stores every piece of copy generated in your workspace so you can easily review, edit, star favorites, duplicate, and export them.",
    features: [
      {
        icon: LibraryBig,
        title: "Centralized Content Vault",
        description:
          "Browse through all historical AI generations, ad copy variations, and saved marketing drafts.",
      },
      {
        icon: Sparkles,
        title: "Starred Favorites",
        description:
          "Star high-performing copy snippets to keep them pinned at the top for quick access.",
      },
      {
        icon: BookOpen,
        title: "Duplicate & Iterate",
        description:
          "Duplicate existing copy variations and quickly tweak details for new channels or target segments.",
      },
      {
        icon: HelpCircle,
        title: "Search & Type Filters",
        description:
          "Filter content by format (Ad Copy, Email, Social Post, Headline) or search key phrases.",
      },
    ],
    proTip:
      "Use the Duplicate action on winning copy snippets to quickly create variants for A/B testing across ad networks.",
  },

  assets: {
    key: "assets",
    badge: "Media Repository",
    title: "Welcome to Asset Manager",
    subtitle:
      "Centralized media storage for images, logos, and creative resources.",
    overview:
      "Upload and manage images, graphics, logos, and brand media files to use across your landing pages, lead magnets, and campaign creatives.",
    features: [
      {
        icon: FolderOpen,
        title: "Media Asset Repository",
        description:
          "Store high-resolution brand assets, hero images, product graphics, and logo files.",
      },
      {
        icon: Sparkles,
        title: "Drag & Drop Upload",
        description:
          "Quickly upload new image files directly from your computer into your workspace repository.",
      },
      {
        icon: HelpCircle,
        title: "Direct URL Copying",
        description:
          "Instantly copy public media URLs to embed into landing pages, lead magnets, or ad platforms.",
      },
      {
        icon: BookOpen,
        title: "Folder Organization",
        description:
          "Group media files into visual folders to keep your creative assets neatly structured.",
      },
    ],
    proTip:
      "Upload SVG logos and PNG graphics here so you can seamlessly embed them when building custom landing pages.",
  },

  "landing-pages": {
    key: "landing-pages",
    badge: "Page Builder",
    title: "Welcome to Landing Pages",
    subtitle: "Build and publish high-converting, no-code landing pages.",
    overview:
      "Create modular landing pages with responsive sections such as Hero banners, Feature grids, Testimonials, FAQ accordions, and Lead capture forms.",
    features: [
      {
        icon: PanelsTopLeft,
        title: "Modular Visual Section Builder",
        description:
          "Add, reorder, edit, and remove sections with live side-by-side design preview.",
      },
      {
        icon: BookOpen,
        title: "Instant Public Publishing",
        description:
          "Publish pages to custom `/p/[slug]` URLs with 1-click live publishing and unpublishing.",
      },
      {
        icon: Users,
        title: "Built-in Lead Capture",
        description:
          "Collect visitor leads directly from embedded opt-in forms straight into your Leads database.",
      },
      {
        icon: BarChart3,
        title: "Page Performance Stats",
        description:
          "Track total page views, lead counts, and calculated conversion percentages for every page.",
      },
    ],
    proTip:
      "Link your landing page to a campaign so all incoming leads are automatically attributed to that campaign.",
  },

  "lead-magnets": {
    key: "lead-magnets",
    badge: "Lead Generation",
    title: "Welcome to Lead Magnets",
    subtitle: "Turn visitors into subscribers with gated content offers.",
    overview:
      "Design gated downloadable offers like PDF checklists, guides, and ebooks that trade valuable content for visitor email addresses.",
    features: [
      {
        icon: Magnet,
        title: "Gated Opt-In Offers",
        description:
          "Create custom opt-in pages at `/m/[slug]` tailored to specific audience pain points.",
      },
      {
        icon: BookOpen,
        title: "Instant Resource Delivery",
        description:
          "Provide instant access or download links once visitors submit their contact details.",
      },
      {
        icon: Users,
        title: "Lead Capture Tracking",
        description:
          "Track total email signups and see which lead magnets drive the highest opt-in rate.",
      },
      {
        icon: Sparkles,
        title: "Shareable Public Links",
        description:
          "Copy your lead magnet's public URL to share on social media or run paid ad campaigns.",
      },
    ],
    proTip:
      "Checklists and templates usually get 2-3x higher conversion rates than general email newsletter signups!",
  },

  leads: {
    key: "leads",
    badge: "Contacts & Opt-ins",
    title: "Welcome to Leads Database",
    subtitle: "Manage all subscribers and leads captured across your pages.",
    overview:
      "View a complete list of every contact captured via your Landing Pages and Lead Magnets with source attribution and sign-up dates.",
    features: [
      {
        icon: Users,
        title: "Centralized Subscriber Roster",
        description:
          "View subscriber email addresses, names, and exact registration timestamps.",
      },
      {
        icon: Magnet,
        title: "Source & Asset Attribution",
        description:
          "See exactly which landing page or lead magnet generated each individual lead.",
      },
      {
        icon: BookOpen,
        title: "CSV List Export",
        description:
          "Export your subscriber contacts for email marketing tools or CRM platforms.",
      },
      {
        icon: HelpCircle,
        title: "Search & Filtering",
        description:
          "Search contacts by email address or filter leads by acquisition channel.",
      },
    ],
    proTip:
      "Check your conversion source column to see which lead magnets generate your most engaged contacts.",
  },

  analytics: {
    key: "analytics",
    badge: "Growth Insights",
    title: "Welcome to Marketing Analytics",
    subtitle:
      "Deep-dive into conversion trends, page performance, and content stats.",
    overview:
      "Gain data-driven insights into content generation volume, token usage, pageview counts, conversion channels, and lead growth velocity over time.",
    features: [
      {
        icon: BarChart3,
        title: "Growth & Generation Graphs",
        description:
          "Track 30-day visual charts for AI content generation volume and lead capture trends.",
      },
      {
        icon: Sparkles,
        title: "Content Type Breakdown",
        description:
          "See which copy formats (Ads, Emails, Social Posts, Headlines) you create most frequently.",
      },
      {
        icon: PanelsTopLeft,
        title: "Landing Page Leaderboard",
        description:
          "Compare page view counts, lead totals, and conversion rates across all published pages.",
      },
      {
        icon: HelpCircle,
        title: "Token Usage Monitoring",
        description:
          "Keep track of total AI model tokens consumed across your workspace.",
      },
    ],
    proTip:
      "Review your page conversion leaderboard weekly to double down on pages converting above 5%!",
  },

  settings: {
    key: "settings",
    badge: "Workspace Config",
    title: "Welcome to Settings",
    subtitle:
      "Customize your workspace brand profile, target audience, and defaults.",
    overview:
      "Configure your brand identity, target demographic, default tone of voice, and company URL to train AI Studio tools.",
    features: [
      {
        icon: Settings,
        title: "Brand Profile Setup",
        description:
          "Define your brand name, website URL, industry sector, and core company value proposition.",
      },
      {
        icon: Sparkles,
        title: "Default Brand Voice",
        description:
          "Choose your preferred AI writing style (Professional, Bold, Authoritative, Friendly).",
      },
      {
        icon: Users,
        title: "Target Demographics",
        description:
          "Input audience details so generated ad copy resonates with your ideal customers.",
      },
      {
        icon: HelpCircle,
        title: "Project Parameters",
        description:
          "Manage workspace details, environment parameters, and project keys.",
      },
    ],
    proTip:
      "Filling out a comprehensive Brand Description gives AI Studio 50% better context for copy generation.",
  },
};

export function getPageGuideForPathname(pathname: string): PageGuide | null {
  const parts = pathname.split("/").filter(Boolean);
  // pathname format: /[section] or /[section]/...
  if (parts.length < 1) return PAGE_GUIDES["dashboard"];

  const section = parts[0];

  if (section === "dashboard") return PAGE_GUIDES["dashboard"];
  if (section === "chats" || section === "chat") return PAGE_GUIDES["chats"];
  if (section === "campaigns") return PAGE_GUIDES["campaigns"];
  if (section === "ai-studio") return PAGE_GUIDES["ai-studio"];
  if (section === "library") return PAGE_GUIDES["library"];
  if (section === "assets") return PAGE_GUIDES["assets"];
  if (section === "landing-pages") return PAGE_GUIDES["landing-pages"];
  if (section === "lead-magnets") return PAGE_GUIDES["lead-magnets"];
  if (section === "leads") return PAGE_GUIDES["leads"];
  if (section === "analytics") return PAGE_GUIDES["analytics"];
  if (section === "settings") return PAGE_GUIDES["settings"];

  return null;
}
