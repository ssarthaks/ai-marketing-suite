---
name: product-research
description: "Deep research on a product, including feature inventory, pricing, user feedback, and positioning gaps. Trigger on prompts like 'do a product research for <url>' and follow up with competitors-research or marketing-plan when asked."
metadata:
  version: 4.0.0
  category: Research
---

# Product Research


## Deep Research & Interactive Workflow

**Phase 1: Deep Web Research (Mandatory First Step)**
Before answering any marketing questions or generating plans, you MUST use your web search tools (e.g., `search`, `extract`, etc.) to conduct deep research.

1. Read the loaded Product Context to understand the current product and region.
2. Start with one narrow `search` query. Add another only when the first five snippets leave a material evidence gap; use `extract` for a specific section and `reader` only when the whole page argument is necessary.
3. Execute the searches. Do not skip this step or rely solely on your internal training data.

**Phase 2: Present & Validate (Chatty & Iterative)**

1. Synthesize your research findings into a VERY BRIEF summary (maximum 2-3 short paragraphs). Do not write a massive essay.
2. Present this summary to the user.
3. Ask 2-4 focused questions to validate your findings, fill in any missing gaps, or confirm strategic direction.
4. Wait for the user's response. Do NOT generate the final output yet.

**Phase 3: Final Output Generation**
Only after the user has validated the research and answered your questions, compile the final marketing deliverable (e.g., plan, ad copy, SEO cluster). Ensure the output is highly actionable, data-backed, and explicitly tailored to the active product context.

## When to use

Use this skill when the user asks to:

- Research the product and its features
- Map pricing, packaging, and value
- Synthesize user feedback and sentiment
- Identify positioning or onboarding gaps
- Build a feature-to-benefit matrix
- "Do a product research for <url>" or similar phrasing

## Before you start

**Back-and-forth intake loop (Chatty & Iterative)**
First, perform research across multiple sources (e.g., using search engines, competitor/product URLs, internal assets) to gather information about the topic. Show the user a summary of what you have found. Only after presenting these findings, ask 2-4 focused, relevant questions to fill in any gaps or clarify goals. Wait for answers before proceeding. Summarize what you heard, confirm any assumptions, and only then continue. If the user wants to skip, proceed with clearly labeled assumptions.

Be chatty, highly interactive, and collaborative. Do not attempt to compile the final brief in one go. Instead, proceed through an interactive research feedback loop:

1. **Initial Research & Synthesis**: Perform research across multiple sources (e.g., using search engines, competitor/product URLs, internal assets) to gather information about the topic.
2. **Present Findings & Ask Questions**: Show the user a summary of your findings and ask 2-4 focused, relevant questions to get their feedback, verify details, and fill gaps (e.g., about their pricing, target segments, or SWOT assumptions).
3. **Iterative Feedback Loop**: Be chatty! Ask follow-up questions frequently as you compile and review different sections of the research. Discuss findings and assumptions with the user to ensure alignment.
4. **Final Report Compilation**: Only create and compile the final Product Research Brief (using the template below) once you have gathered, discussed, and finalized all sections with the user based on their feedback.

### Check for existing context first

First, check if `.agents/<productname>/product.md and .agents/<productname>/<productname>-brand-guidelines.md` already exists. If found anywhere other than `.agents/<productname>/product.md and .agents/<productname>/<productname>-brand-guidelines.md`, offer to move it to the canonical location.

**If it exists:**

- Read it and use it as the source of truth for product, audience, and positioning details. Use this context to avoid asking questions about information already covered.

**If it does not exist:**

- Recommend running the `product-marketing` skill first to auto-draft or create `.agents/<productname>/product.md and .agents/<productname>/<productname>-brand-guidelines.md`, or ask the minimal questions needed for the current research task.

### Confirm missing inputs only

1. Product name and URL(s)
2. Target audience segment (if multiple)
3. Depth level (quick scan vs deep research)
4. Focus areas (pricing, onboarding, feature depth, reviews)

If the user provides a URL and says "do a product research for <url>" (or the target is one of our portfolio products), proceed and only ask for missing depth level or focus areas.

## Education-Specific Research Dimensions (add these to every education product scan)

1. **Curriculum coverage audit** — which boards, grades, subjects, and syllabus years are actually covered vs. claimed; gaps by subject code. This is the education equivalent of a feature matrix and the first thing schools check.
2. **Pedagogy & efficacy evidence** — the teaching methodology (dialogue-based video, retrieval practice, mastery tracking), any efficacy studies or outcome claims, and whether claims are substantiated. Distinguish marketing claims from evidence.
3. **Stakeholder surface audit** — does the product have dedicated experiences/pages for students, parents, teachers, AND school leaders? Missing stakeholder surfaces are positioning gaps.
4. **Freshness against the exam cycle** — latest syllabus year supported, most recent past-paper session available, dead/stale seasonal content.
5. **Child-safety & compliance posture** — privacy policy quality, age gates, data practices, DPO contact; both a trust asset and a risk flag.
6. **Education evidence sources** — beyond the generic list: Google Play/App Store reviews (teachers and parents write detailed ones), help-center articles (reveal real friction), teacher-community chatter (Facebook groups, subreddits), EdTech directories (Common Sense Education, EdTech Impact), ministry/publisher announcements, school newsletters citing the product.
7. **Local-market reality checks** — payment methods offered vs. what the market uses, language quality of localized content, offline/low-bandwidth support.

## Workflow

### Step 1: Map the product surface

- Core features, modules, and platform technology
- Primary user journeys and user segments
- Integrations, distribution channels, and ecosystem
- Pricing tiers, limits, and packages

### Step 2: Collect evidence

Use available sources:

- Product website, docs, and help center
- Pricing pages, app stores, and changelog
- Public reviews, awards, and community feedback
- Internal assets provided by the user (tickets, transcripts, surveys)

### Step 3: Synthesize insights

Generate a comprehensive Product Research Brief using the exact structure and markdown tables detailed in the Outputs section.

## Outputs

When generating a Product Research Brief, you must follow this exact 13-section layout with markdown tables and GitHub-style alerts:

# Product Research Brief: [Product Name]

**URL:** [Website URL]  
**Date:** [Current Date]  
**Research Depth:** [e.g., Deep scan / Quick scan]

---

## 1. Company Overview

Provide a table containing:

- **Product**
- **Parent Company**
- **HQ**
- **Founded**
- **Co-founder / Leadership**
- **Mission**
- **Tagline**
- **Tech Stack**
- **App Domain**
- **Global Domain**

Include an `> [!IMPORTANT]` block highlighting key facts (e.g. global adoption, curriculum mappings, etc.).

---

## 2. Core Market Analysis Frameworks

Once the data is collected, these strategic models help contextualize findings within your industry:

- **SWOT Analysis**: Evaluates internal (Strengths, Weaknesses) and external (Opportunities, Threats) factors to guide overall business strategy.
- **Porter's Five Forces**: Analyzes industry attractiveness and competitive dynamics — in education, always include tuition centres, free content, and AI assistants under substitutes.
- **STP Model**: Segments the market (by school type, grade band, payer profile), Targets the most valuable segments (exam-year students, fee-paying schools), and Positions the product for them.

---

## 3. Feature Inventory

Provide tables and descriptions of:

- **Core Features**: Table with columns `Feature | Description | Primary Benefit`.
- **Platform Technology**: Table with columns `Technology | Purpose`.
- **Pedagogy / Core Approach**: Brief paragraph outlining the platform's core teaching/learning methodology.

---

## 4. Content Catalog (or Product Offerings)

Provide a table mapping offerings (e.g., Grades, Subjects, Categories) across segments.
Include a summary paragraph highlighting the total catalog count.

---

## 5. Pricing & Packaging

Provide a table detailing:

- **Tier | Price Range | Notes**
  List payment methods, subscription durations, and include a `> [!NOTE]` block highlighting monetization insights.

---

## 6. Target User Segments

Provide a table of segments:

- **Segment | Value Proposition | Dedicated Page**
  List additional footprints/stakeholder pages.

---

## 7. Awards & Recognition

Provide a table of awards:

- **Award | Year | Body**
  Include a `> [!TIP]` block highlighting trust signals and optimization opportunities.

---

## 8. Distribution Channels

Provide tables and lists of:

- **Distribution Channels**: Table of `Channel | Link/Info`.
- **Social Media Presence**: Table of `Platform | Handle/Link`.
- **Contact Info**: List of emails, phone numbers, live chat widget info.

---

## 9. User Sentiment Summary

Provide a table of positive signals vs. drawbacks/gaps:

- **Theme | Signal** (using 📗 for praise and 📙 for concerns/gaps).

---

## 10. Positioning Gap Analysis

Briefly list Strengths being communicated.
Provide a table of positioning gaps:

- **Gap | Impact | Recommendation**

---

## 11. Marketing Implications & Opportunities

List high-ROI marketing opportunities (e.g., pricing optimization, social proof overhauls, taglines, referral programs, SEO keywords, campaigns, live channels) as a numbered list.

---

## 12. Technical Observations

Provide a table containing:

- **Aspect | Status** (e.g., Framework, SEO optimization, Schema markup, responsiveness).

---

## 13. Summary

Conclude with a high-level summary of growth blockers (e.g. marketing vs product gaps) and recommended next steps.

## Guardrails

- Do not invent product details; cite sources and website content where possible.
- If the request is ICP or positioning creation, use `product-marketing`.

## Related skills

- `product-marketing` for positioning context
- `competitors-research` / `competitor-gap-finder` to benchmark findings against rivals
- `market-research` to size the opportunity the product addresses
- `marketing-plan` for plan-level synthesis

## References

- **[Research Sources Framework](references/research-sources-framework.md)**: market-specific data sources, app stores, review sites, social-listening keywords, and competitor databases for education product research across our markets (Regional Market, Indonesia, SE Asia, UK, global Cambridge).
