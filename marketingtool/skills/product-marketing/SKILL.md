---
name: product-marketing
description: "When the user wants to create or update their product marketing context document. Also use when the user mentions 'product context,' 'marketing context,' 'set up context,' 'positioning,' 'who is my target audience,' 'describe my product,' 'ICP,' 'ideal customer profile,' or wants to avoid repeating foundational information across marketing tasks. Use this at the start of any new project before using other marketing skills — it creates `.agents/<productname>/product.md and .agents/<productname>/<productname>-brand-guidelines.md` that all other skills reference for product, audience, and positioning context."
metadata:
  version: 4.0.0
  category: Messaging
---

# Product Marketing Context


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

## Workflow

### Step 1: Check for Existing Context

First, check if `.agents/<productname>/product.md` and `.agents/<productname>/<productname>-brand-guidelines.md` already exist. Also check `.claude/product-marketing.md` and the legacy filename `product-marketing-context.md` (in either `.agents/` or `.claude/`) for older setups — if found anywhere other than `.agents/<productname>/product.md`, offer to move it to the canonical location.

**If it exists:**

- Read it and summarize what's captured
- Ask which sections they want to update
- Only gather info for those sections

**If it doesn't exist, offer two options:**

1. **Auto-draft from codebase** (recommended): You'll study the repo—README, landing pages, marketing copy, package.json, etc.—and draft a V1 of the context document. The user then reviews, corrects, and fills gaps. This is faster than starting from scratch.

2. **Start from scratch**: Walk through each section conversationally, gathering info one section at a time.

Most users prefer option 1. After presenting the draft, ask: "What needs correcting? What's missing?"

### Step 2: Gather Information

**If auto-drafting:**

1. Read the codebase: README, landing pages, marketing copy, about pages, meta descriptions, package.json, any existing docs
2. Draft all sections based on what you find
3. Present the draft and ask what needs correcting or is missing
4. Iterate until the user is satisfied

**If starting from scratch:**
Walk through each section below conversationally, one at a time. Don't dump all questions at once.

For each section:

1. Briefly explain what you're capturing
2. Ask relevant questions
3. Confirm accuracy
4. Move to the next

Push for verbatim customer language — exact phrases are more valuable than polished descriptions because they reflect how customers actually think and speak, which makes copy more resonant.

---

## Sections to Capture

### 1. Product Overview

- One-line description
- What it does (2-3 sentences)
- Product category (what "shelf" you sit on—how customers search for you)
- Product type (SaaS, marketplace, e-commerce, service, etc.)
- Business model and pricing

### 2. Target Audience

- Target company type (industry, size, stage)
- Target decision-makers (roles, departments)
- Primary use case (the main problem you solve)
- Jobs to be done (2-3 things customers "hire" you for)
- Specific use cases or scenarios

### 3. Personas (use the education stakeholder set, not generic B2B roles)

Education products always have a multi-stakeholder web. Capture each that applies:

- **Student (user):** grade band, curriculum, exam proximity, motivation profile, device reality; what makes them return daily.
- **Parent (payer, B2C):** aspiration, anxiety, tuition-budget context, visibility needs; what convinces them the spend beats tuition.
- **Teacher (daily gatekeeper + champion):** workload pains, curriculum pressure, tech comfort; what makes them advocate vs. quietly veto.
- **Principal / school leader (B2B decision-maker):** institutional outcomes, parent satisfaction, budget cycle, peer-school proof.
- **School owner / board / financial buyer:** ROI, fee-pass-through tolerance, multi-year commitment risk.
- **Ministry / district / regulator (where relevant):** curriculum compliance, national programs, data sovereignty.
- **Distribution partner (where relevant):** publisher/OEM economics (the Acer / Intan Pariwara pattern).

For each: what they care about, their challenge, the value we promise, and **who they trust for recommendations** (the referral web drives education buying).

### 4. Problems & Pain Points

- Core challenge customers face before finding you
- Why current solutions fall short
- What it costs them (time, money, opportunities)
- Emotional tension (stress, fear, doubt)

### 5. Competitive Landscape (education framing)

- **Direct competitors**: same lane platforms (e.g., Regional Market Leader/Secondary EdTech Incumbent for K-12 LMS Platform; Save My Exams/Seneca for Cambridge lanes; Kahoot/Quizizz for Interactive Quiz App; Cognito/SME for Exam Revision App)
- **Shadow-education competitors**: private tuition, coaching centres, bimbel — usually the REAL budget rival
- **Free alternatives**: YouTube teachers, free notes/past-paper sites, and ChatGPT/AI assistants as free tutors
- **Status quo**: textbooks-only, school-provided materials, doing nothing
- How each falls short for THIS market's families/schools (cost, structure, accuracy, feedback, curriculum fit)

### 6. Differentiation

- Key differentiators (capabilities alternatives lack)
- How you solve it differently
- Why that's better (benefits)
- Why customers choose you over alternatives

### 7. Objections & Anti-Personas

- Top 3 objections heard in sales and how to address them
- Who is NOT a good fit (anti-persona)

### 8. Switching Dynamics

The JTBD Four Forces:

- **Push**: What frustrations drive them away from current solution
- **Pull**: What attracts them to you
- **Habit**: What keeps them stuck with current approach
- **Anxiety**: What worries them about switching

### 9. Customer Language

- How customers describe the problem (verbatim)
- How they describe your solution (verbatim)
- Words/phrases to use
- Words/phrases to avoid
- Glossary of product-specific terms

### 10. Brand Voice

- Tone (professional, casual, playful, etc.)
- Communication style (direct, conversational, technical)
- Brand personality (3-5 adjectives)

### 11. Proof Points

- Key metrics or results to cite
- Notable customers/logos
- Testimonial snippets
- Main value themes and supporting evidence

### 12. Education-Specific Context (mandatory for every portfolio product)

- **Curriculum & exam mapping:** board(s), qualification(s), subject codes, syllabus years covered
- **Academic calendar:** the market's exam sessions, enrollment windows, results days — the seasonal skeleton every campaign hangs on
- **Efficacy & trust proof:** outcome data, school counts, credential assets, ministry/publisher/OEM partnerships
- **Compliance posture:** child-data rules that constrain marketing (COPPA / UK AADC / PDPA / Indonesia PDP), consent norms for student imagery/testimonials
- **Payment & pricing reality:** local rails (Digital Wallets (Mobile Money), GoPay/OVO/DANA, cards), tuition-benchmark pricing context

### 13. Goals

- Primary business goal
- Key conversion action per persona (student signup ≠ parent payment ≠ pilot booked)
- Current metrics (if known)

---

## Step 3: Create the Document

After gathering information, create `.agents/<productname>/product.md` with this structure (the brand guidelines file is created and managed separately by admins):

```markdown
# Product Marketing Context

_Last updated: [date]_

## Product Overview

**One-liner:**
**What it does:**
**Product category:**
**Product type:**
**Business model:**

## Target Audience

**Target companies:**
**Decision-makers:**
**Primary use case:**
**Jobs to be done:**

- **Use cases:**
-

## Personas

| Persona | Cares about | Challenge | Value we promise |
| ------- | ----------- | --------- | ---------------- |
|         |             |           |                  |

## Problems & Pain Points

**Core problem:**
**Why alternatives fall short:**

- **What it costs them:**
  **Emotional tension:**

## Competitive Landscape

**Direct:** [Competitor] — falls short because...
**Secondary:** [Approach] — falls short because...
**Indirect:** [Alternative] — falls short because...

## Differentiation

## **Key differentiators:**

**How we do it differently:**
**Why that's better:**
**Why customers choose us:**

## Objections

| Objection | Response |
| --------- | -------- |
|           |          |

**Anti-persona:**

## Switching Dynamics

**Push:**
**Pull:**
**Habit:**
**Anxiety:**

## Customer Language

**How they describe the problem:**

- "[verbatim]"
  **How they describe us:**
- "[verbatim]"
  **Words to use:**
  **Words to avoid:**
  **Glossary:**
  | Term | Meaning |
  |------|---------|
  | | |

## Brand Voice

**Tone:**
**Style:**
**Personality:**

## Proof Points

**Metrics:**
**Customers:**
**Testimonials:**

> "[quote]" — [who]
> **Value themes:**
> | Theme | Proof |
> |-------|-------|
> | | |

## Goals

**Business goal:**
**Conversion action:**
**Current metrics:**
```

---

## Step 4: Confirm and Save

- Show the completed document
- Ask if anything needs adjustment
- Save to `.agents/<productname>/product.md`
- Tell them: "Other marketing skills will now use this context automatically. Run `/product-marketing` anytime to update it."

---

## Tips

- **Be specific**: Ask "What's the #1 frustration that brings them to you?" not "What problem do they solve?"
- **Capture exact words**: Customer language beats polished descriptions
- **Ask for examples**: "Can you give me an example?" unlocks better answers
- **Validate as you go**: Summarize each section and confirm before moving on
- **Skip what doesn't apply**: Not every product needs all sections — but the Education-Specific Context section (curriculum, calendar, proof, compliance) is never skippable for portfolio products
- **Anchor on education stakeholders**: personas and customer language must come from Students, Parents, Teachers, and School Leaders — and highlight the product's signature mechanics (dialogue-based/interactive video lessons, testpaper builder, mark-scheme feedback, curriculum alignment such as Curriculum Board or National Standard Curriculum)

---

## Guardrails

- This is the foundational skill: when `.agents/<productname>/product.md` is missing, run this FIRST so every other skill has context.
- Capture verbatim customer language over polished paraphrase — exact words make downstream copy resonate.
- Never invent personas, proof points, or competitors; draft from the repo/research, then have the user confirm.
- Save only to the canonical `.agents/<productname>/product.md`; migrate older files to that location.

## Related Skills

- `product-research` — deep evidence on features, pricing, and sentiment to fill this context
- `competitors-research` / `competitor-gap-finder` — populate the competitive-landscape section
- `brand-positioning` / `brand-strategy` — sharpen differentiation and voice
- `creative-copylines` — turn the captured language into on-brand copy
- `marketing-plan` — the orchestrator that consumes this context for full-funnel strategy
