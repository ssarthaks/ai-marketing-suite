import {
  BarChart3,
  BrainCircuit,
  FolderOpen,
  LayoutDashboard,
  LibraryBig,
  Magnet,
  Megaphone,
  PanelsTopLeft,
  Settings,
  Sparkles,
  Users,
  MessageSquare,
  Zap,
  Repeat,
  Swords,
  Mail,
  Share2,
  Video,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Platform",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Chats from AiAgent", href: "/chats", icon: MessageSquare },
      { title: "Campaigns", href: "/campaigns", icon: Megaphone },
      { title: "Content Library", href: "/library", icon: LibraryBig },
      { title: "Assets", href: "/assets", icon: FolderOpen },
    ],
  },
  {
    label: "AI Powered",
    items: [
      { title: "AI Studio", href: "/ai-studio", icon: Sparkles },
      {
        title: "AI Image/Video Gen (Beta)",
        href: "/ai-media-gen",
        icon: Video,
      },
      {
        title: "AI Market Intelligence",
        href: "/ai-research",
        icon: BrainCircuit,
      },
      { title: "AI Copy Strategy Audit", href: "/ai-optimizer", icon: Zap },
      {
        title: "AI Repurposing Blueprint",
        href: "/ai-repurposer",
        icon: Repeat,
      },
      {
        title: "AI Competitor Battlecards",
        href: "/ai-battlecards",
        icon: Swords,
      },
      {
        title: "AI Email Drip Generator",
        href: "/ai-email-campaigns",
        icon: Mail,
      },
      {
        title: "AI Organic Social",
        href: "/ai-social-architect",
        icon: Share2,
      },
    ],
  },
  {
    label: "Growth",
    items: [
      { title: "Landing Pages", href: "/landing-pages", icon: PanelsTopLeft },
      { title: "Lead Magnets", href: "/lead-magnets", icon: Magnet },
      { title: "Leads", href: "/leads", icon: Users },
      { title: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
];

export const SETTINGS_NAV: NavItem = {
  title: "Settings",
  href: "/settings",
  icon: Settings,
};

export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((group) => group.items),
  SETTINGS_NAV,
];

/** Longest-prefix match so nested routes highlight their section. */
export function activeNavItem(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0];
}
