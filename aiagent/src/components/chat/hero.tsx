import {
  Search,
  Users,
  TrendingUp,
  Lightbulb,
  Target,
  PenTool,
} from "lucide-react";
import logo from "@/assets/logo-v2.png";
export const logoSrc = logo.src;

export const SUGGESTIONS = [
  {
    icon: Search,
    title: "Research product positioning",
    prompt:
      "Conduct a comprehensive product research and positioning analysis. Identify our target customer segments, their core pain points, and how our product uniquely solves them. Map our positioning on a competitive landscape, define our value proposition for each segment, and recommend a primary positioning statement with supporting proof points.",
  },
  {
    icon: Users,
    title: "Analyze competitors",
    prompt:
      "Analyze our direct and indirect competitors across five dimensions: product features, pricing model, target audience, go-to-market motion, and brand positioning. Identify gaps and whitespace in the market we can own, highlight where competitors are weakest, and surface differentiation angles we should double down on.",
  },
  {
    icon: TrendingUp,
    title: "Optimize for AI search",
    prompt:
      "Develop a comprehensive AI SEO strategy to make our product discoverable in AI-native search engines like ChatGPT, Gemini, Perplexity, and Claude. Include tactics for structuring content so it gets cited in AI answers, recommended topic clusters and entity coverage, schema markup suggestions, and a 90-day content calendar to build AI search authority.",
  },
  {
    icon: Lightbulb,
    title: "Brainstorm marketing ideas",
    prompt:
      "Brainstorm 15–20 high-ROI marketing campaign ideas and growth experiments to acquire new users. For each idea, include the target channel, estimated effort (low/medium/high), expected impact, and a one-line hypothesis. Prioritize ideas that can be validated within two weeks and flag any that have viral or compounding potential.",
  },
  {
    icon: Target,
    title: "Plan a GTM strategy",
    prompt:
      "Build a structured go-to-market plan for our next product launch or growth phase. Include: ICP definition, channel mix with rationale (paid, organic, partnerships, community), a phased launch timeline, messaging framework per channel, success KPIs with targets, and a budget allocation recommendation. Flag key risks and mitigation strategies.",
  },
  {
    icon: PenTool,
    title: "Write ad creative copy",
    prompt:
      "Generate a full ad creative brief including 5 headline variations, 3 primary text variations, and 2 CTA options for our upcoming campaign. Write for at least two distinct audiences and two platforms (e.g. LinkedIn and Meta). For each variation, note the emotional hook or psychological trigger it leverages, and flag which combinations to A/B test first.",
  },
];

interface Props {
  onPick: (prompt: string) => void;
  greeting?: string;
  children?: React.ReactNode;
}

export function ChatHero({
  onPick,
  greeting = "How can I help you today?",
  children,
}: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <h1 className="text-center text-3xl font-semibold tracking-tight text-foreground sm:text-4xl mb-8 flex items-center justify-center gap-3">
        <img
          src={logo.src}
          alt="Logo"
          className="size-8 object-contain dark:invert"
        />
        {greeting}
      </h1>

      <div className="w-full max-w-3xl mb-8">{children}</div>

      <div className="flex flex-wrap items-center justify-center gap-2.5 w-full max-w-3xl">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            type="button"
            onClick={() => onPick(s.prompt)}
            className="group flex items-center cursor-pointer gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-2 text-left transition-all hover:-translate-y-0.5 hover:border-border hover:bg-muted/50 hover:shadow-sm active:scale-95"
          >
            <s.icon className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground shrink-0" />
            <span className="text-[13px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
              {s.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
