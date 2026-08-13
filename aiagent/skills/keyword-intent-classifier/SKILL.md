---
name: keyword-intent-classifier
description: "Classify education keywords by search intent, persona (student/parent/teacher/school), buyer-journey stage, seasonality, and zero-click AI-answer risk, then prioritize for ROI. Trigger on 'keyword intent', 'search intent classification', or 'which keywords should we target'. Researches live SERPs to verify intent, maps each keyword to the education funnel, and returns prioritized target/authority/avoid lists."
metadata:
  version: 4.0.0
  category: SEO
---

# Keyword Intent Classifier — Education Market Edition


## Mission

Turn a raw keyword list into a persona-mapped, seasonally-timed plan that concentrates effort on terms that drive enrollments and subscriptions, funds the free-content flywheel with authority terms, and skips terms AI answers for free.

## The Education Intent Model (use all five dimensions)

### 1. Persona (classify FIRST — it changes everything)

- **Student** — "physics 0625 notes", "how to solve quadratic equations", "past papers 2025". Massive volume, zero direct wallet, feeds the funnel and retargeting-free brand exposure. Monetizes via freemium conversion or parent discovery.
- **Parent (payer)** — "best online learning platform for IGCSE", "is [brand] worth it", "bimbel online terbaik", "IGCSE tuition fees". Lower volume, highest commercial value, full YMYL trust bar.
- **Teacher** — "free quiz platform for classroom", "kahoot alternatives", "formative assessment tools". Mid volume; value = B2B seeding (teacher champions pull products into schools).
- **School decision-maker** — "LMS for schools", "school management platform Indonesia", "digital learning solution for schools Regional Market". Tiny volume, enormous deal value; often better served by LinkedIn/ABM than SEO, but must own the branded and comparison SERPs.

### 2. Search Intent (classic)

**Informational** · **Navigational** · **Commercial** (comparisons, "best", reviews, alternatives) · **Transactional** (sign up, pricing, download, book demo).

### 3. Journey Stage

**Awareness → Consideration → Decision**, mapped per persona (a student's "decision" is creating a free account; a parent's is paying; a school's is booking a demo).

### 4. Seasonality (education-specific)

- **Exam-countdown terms** — spike 8–12 weeks before Cambridge Assessment (Feb/Mar, May/Jun, Oct/Nov), GCSE (May–Jun), Board Exams (~Mar–Apr), semester finals in Indonesia (PAS, Dec & May/Jun). Content must be live and indexed 6–8 weeks before the spike — flag the publish deadline.
- **Results-day terms** — "grade thresholds", "results date", "remark/retake options": short violent spikes (Aug & Jan for Cambridge Assessment, late Aug UK).
- **Back-to-school / enrollment terms** — parent purchase intent peaks (Jul–Sep Indonesia & UK; Spring enrollment cycles).
- **Evergreen study terms** — steady all year; build durable authority.
- **Same words, shifting intent:** "igcse physics" in September = notes/course-seeking; in April = past-paper cramming. Note when a keyword's dominant intent flips seasonally.

### 5. AI Answer Risk (zero-click)

- **HIGH** — definitions, simple facts, generic how-tos ("what is photosynthesis", "when is results day") that AI answers definitively.
- **MEDIUM** — partial AI answer, but users still click for depth, downloads, or trust ("igcse physics revision tips").
- **LOW** — needs downloads (past-paper PDFs), interactivity (quizzes, video lessons), personalization (mark-scheme feedback on *your* answer), local nuance (local language/Bahasa curriculum detail), or logged-in action. **Our product surfaces are natural LOW-risk keyword targets — AI cannot substitute for a downloadable paper or graded practice.**

## Deep Research & Interactive Workflow

**Phase 1 — Verify Intent on the SERP (Mandatory).**

1. Read the loaded Product Context to ground commercial value in the real product, pricing, and funnel.
2. For ambiguous or high-value keywords, inspect the live SERP: dominant result type, AI Overview presence, ads, and which education incumbents rank (Save My Exams, PapaCambridge, Regional Market Leader, BBC Bitesize — see who owns the term before investing).
3. Note current month vs. the academic calendar of the target market.

**Phase 2 — Confirm Scope (Chatty).**
Confirm target region/language (en / id / ne), the product, and the primary conversion goal, then classify.

## Output Format

| Keyword | Persona | Intent | Journey Stage | Season/Peak | AI Risk | Commercial Value | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |

Priority logic:

- **HIGH PRIORITY** = parent/school persona + Commercial/Transactional + LOW-MED AI risk, OR student persona + LOW AI risk + strong funnel entry (downloads, practice).
- **AUTHORITY** = student informational terms with HIGH AI risk but needed for topical coverage and AI-answer brand presence.
- **SEASONAL SPRINT** = exam-countdown/results terms — high priority *with a publish deadline attached*.
- **LOW / AVOID** = HIGH AI risk + no persona wallet + no funnel role.

End with:

- **Top Targets** — with the persona and funnel role stated per term.
- **Seasonal Sprint List** — terms with publish-by dates for the next exam cycle.
- **Authority Keywords** — high-AI-risk coverage terms worth owning for citations.
- **Deprioritize** — with the reason (AI-answered, wrong persona, incumbent-locked).
- **Clustering Note** — group near-duplicate intents (e.g., "0625 past papers" / "igcse physics past papers" / "physics 0625 qp") to avoid cannibalization; subject-code variants belong on one page.

## Guardrails

- When words are ambiguous, defer to the live SERP — don't classify from the string alone.
- Commercial value is relative to *this* product's funnel; a huge generic term ("online learning") may be worthless here.
- Never recommend content targeting minors' personal data or exploiting exam anxiety with false claims.

## Related skills

- `ai-seo` — turn the prioritized list into clusters and a content plan
- `seo-content-brief-writer` — brief the high-priority targets
- `ai-search-visibility-checker` / `aeo-content-optimizer` — defend high-AI-risk authority terms
- `ads` — hand the parent/school transactional terms to paid search
