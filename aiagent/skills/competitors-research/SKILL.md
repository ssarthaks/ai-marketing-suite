---
name: competitors-research
description: "Use when the user needs competitor profiles or competitive intelligence from competitor URLs. Trigger on prompts like 'do research for market competitors'. Produces structured profiles with positioning, pricing, feature themes, and channel signals. For comparison pages or alternatives, use competitors."
metadata:
  version: 4.0.0
  category: Research
---

# Competitors Research


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

### Confirm only what is missing

1. Competitor URLs (required)
2. Depth level (quick scan vs deep profile)
3. Focus areas (pricing, positioning, SEO, feature depth)
4. Any specific comparisons to highlight

If the user says "do research for market competitors" without URLs, propose the competitive set for the active product's lane from this map (verify each is still active before profiling — EdTech competitors die and pivot frequently, e.g., Legacy EdTech Player shut down in 2024):

## The Education Competitive Map (starting sets per lane)

| Product lane | Direct competitors | Indirect / substitute competitors |
| --- | --- | --- |
| EduPlatform Regional | Competitor EdTech, Competitor Study Portal, Regional EdTech App, Competitor Notes Hub, local notes apps | Physical tuition/coaching centers (the real rival), YouTube channels in regional marketsi, Curriculum Board-approved publishers, ChatGPT |
| K-12 LMS Platform | Regional Market Leader, Secondary EdTech Incumbent, Kelas Pintar, Colearn, Pijar Belajar | Bimbel chains (Ganesha Operation, Nurul Fikri), free Kemendikbud resources, YouTube, ChatGPT |
| EduPlatform global / Cambridge lane | Save My Exams, Seneca, Znotes, Physics & Maths Tutor, Cambridge-endorsed publishers (Hodder, CUP) | Tutoring platforms (MyTutor), school-adopted LMSs (Google Classroom, Canvas), ChatGPT |
| Interactive Quiz App | Kahoot!, Quizizz (Wayground), Blooket, Gimkit, Baamboozle | Teacher-made worksheets, Google Forms quizzes |
| Online Learning Academy | Wolsey Hall Oxford, CenturyTech, InterHigh/King's InterHigh, local homeschool co-ops | Private online tutors, self-assembled free-resource stacks |
| Exam Prep Platform | PapaCambridge, GCE Guide, XtremePapers, Dynamic Papers | Official board sites, Telegram/Facebook paper-sharing groups |
| Exam Revision App | Save My Exams, Cognito, Primrose Kitten, MyGCSEScience, Tassomai | Private tutors (~£30–50/hr benchmark), BBC Bitesize, ChatGPT |

**Always profile at least one substitute** (tuition centre, free stack, or AI assistant) alongside direct rivals — in education the substitute usually holds the budget.

## Education-Specific Profiling Dimensions (add to every profile)

- **Curriculum & syllabus coverage** — boards, grades, subjects, syllabus years (the education feature matrix)
- **Pricing vs local tuition benchmark** — is the competitor priced against software or against tuition?
- **B2B motion** — do they sell to schools/ministries? Pilots, distributor deals, government programs (e.g., competitor ministry partnerships)
- **Teacher & parent surfaces** — dashboards, reports, training offerings
- **Efficacy claims & proof** — what outcomes they claim and how substantiated
- **Seasonal campaign patterns** — what they run at exam season and back-to-school (check their ad libraries and social feeds)
- **App-store health** — installs, rating trend, review complaints (a goldmine for their weaknesses)

## Workflow

### Step 1: Scope and plan

- Decide quick scan or deep profile
- Define the primary comparison dimensions
- Create a list of pages to review per competitor

### Step 2: Collect data

Pull from each competitor site:

- Homepage, pricing, features, integrations, customers, about
- Review sources if available (Google Play / App Store reviews first for education; then G2, Capterra, EdTech Impact, Common Sense Education)
- Changelog or release notes (if public)

### Step 3: Save raw inputs

Persist raw data for traceability. Use this structure in the project root:

```
competitor-profiles/
  raw/
    <competitor-slug>/
      <YYYY-MM-DD>/
        scrapes/
        reviews/
        notes/
  <competitor-slug>.md
  _summary.md
```

### Step 4: Synthesize profiles

Each profile should include:

- Positioning and ICP signals
- Core capabilities and feature themes
- Pricing and packaging
- Proof points and customer signals
- Weaknesses and gaps (with evidence)
- Channel and content strategy signals

### Step 5: Cross-competitor summary

If multiple competitors are profiled, create `_summary.md` with:

- Landscape overview
- Side-by-side comparison table
- Positioning map or segment clusters
- Key gaps and opportunities

## Output format

One markdown file per competitor and an optional summary file.

## Guardrails

- Avoid unverified claims; label inferences clearly.
- Do not misrepresent competitor features.

## Related skills

- `product-marketing` to align competitive insights with positioning
- `competitor-gap-finder` to turn a single rival page into a content-gap action list
- `brand-positioning` to convert competitive white space into a positioning statement
- `marketing-plan` to roll findings into the roadmap

## References

- **[EdTech Competitor Analysis Framework](references/competitor-analysis-framework.md)**: Comprehensive profiles of direct, indirect, and adjacent competitors per market — including local notes apps, quiz platforms, YouTube channels, physical tuition centers, and curriculum-approved publishers.
