---
name: aeo-content-optimizer
description: "Restructure education content to be cited in AI-generated answers from ChatGPT, Perplexity, Claude, Gemini, and Google AI Overviews — specialized for how students, parents, and teachers actually query AI. Trigger on 'optimize for AI search', 'Answer Engine Optimization', 'AEO', or 'make this content AI-citable'. Researches how each engine answers education queries, rewrites for extractability with syllabus-level precision, and scores before/after."
metadata:
  version: 4.0.0
  category: SEO
---

# AEO Content Optimizer — Education Market Edition


## Mission

Make our education pages the source AI engines cite when a student asks for revision help, a parent asks "which platform is best", or a teacher asks for classroom resources — measurably lifting citation share for queries that feed our funnel.

## Why AEO Is Different in Education

Education queries are among the highest-volume AI-assistant use cases on earth — homework help, revision planning, "explain this concept" — which means:

- **Students already live inside ChatGPT/Gemini.** They ask AI *instead of* searching. If our content isn't citable, we are invisible to the largest user segment.
- **Education is YMYL-adjacent.** Engines apply a higher trust bar to content that influences educational decisions. Author credentials (examiner experience, PhD, B.Ed), curriculum accuracy, and official-source citations materially change selection odds.
- **Syllabus precision is the moat.** Generic "photosynthesis explained" loses to Khan Academy and BBC Bitesize forever. "Photosynthesis for Cambridge Assessment IGCSE Biology 0610 syllabus point B6.1, with mark-scheme phrasing" is winnable — big sites rarely go code-level deep.
- **The buyer query ≠ the user query.** Optimize student-facing pages ("how to revise for IGCSE physics paper 6") AND parent-facing pages ("is EduPlatform worth it", "best online learning platform Regional Market", "bimbel online terbaik untuk kurikulum National Standard Curriculum") differently — see the query map below.

## Education Query → Answer-Engine Map

Classify the target query into one of these lanes before optimizing; each rewards a different format:

| Lane | Example queries | Winning format | Funnel role |
| --- | --- | --- | --- |
| Concept help (student) | "explain electrolysis igcse", "cara menghitung persamaan kuadrat" | Definition + worked example + common-mistake callout | Brand exposure, awareness |
| Exam logistics | "when is igcse physics 0625 paper 4 2026", "Board Exams exam date 2083", "grade thresholds 0620" | Table with dates/codes + freshness stamp | High-volume, trust-building, seasonal spikes |
| Resource seeking | "where to download 9701 past papers", "free International Board past papers with mark schemes" | Ranked list with direct links + what's included | Direct traffic to Exam Prep Platform / product |
| Study method | "how to get an A* in A level maths", "best revision technique for GCSE science" | Numbered step list + evidence (retrieval practice, spaced repetition) | Mid-funnel, product mention as tool |
| Purchase evaluation (parent) | "is elearning.example.com legit", "online platform vs tutor", "Regional Market Leader alternatives" | Comparison table + pricing + efficacy proof | Bottom-funnel, revenue |
| Teacher resource | "quiz platform like kahoot for revision", "formative assessment tools free" | Feature comparison + classroom use case | B2B seeding via teacher champions |

## Deep Research & Interactive Workflow

**Phase 1 — Observe the Engines (Mandatory).**

1. Read the loaded Product Context so the rewrite stays accurate to the real product, subjects, and region.
2. Fetch the live page (if a URL is given) and **run the target query through the engines' current answers** — what they cite (expect Save My Exams, Physics & Maths Tutor, BBC Bitesize, Khan Academy, PapaCambridge for Cambridge queries; Regional Market Leader/Secondary EdTech Incumbent content for Indonesian queries), what format wins, and whether any of our properties appear.
3. Classify the query lane (table above) and identify the People-Also-Ask / follow-up cluster around it.

**Phase 2 — Present & Validate (Chatty).**
Summarize the gap between the current content and what the engines reward, then ask 2–3 questions (target query + lane, priority engine, any factual constraints such as syllabus year). Wait before delivering the full rewrite.

**Phase 3 — Deliver** the optimized content and scorecard.

## How AI Search Engines Select Sources

- **Google AI Overviews** — concise, structured, E-E-A-T-heavy; education queries frequently trigger Overviews, and syllabus-specific tables/FAQ schema get lifted.
- **ChatGPT (with search)** — conversational comprehensiveness; loves pages that answer the question AND anticipate the follow-up ("what's on paper 4" → "how is it graded").
- **Perplexity** — clean citations, hard data (dates, codes, thresholds, mark allocations); numbered lists and tables win.
- **Claude** — nuanced, multi-perspective explanations; strong for study-method and evaluation-lane content.
- **Gemini** — entity-rich content tied to the knowledge graph; use official entity names (Cambridge Assessment International Education, Curriculum Development Centre Regional Market, National Standard Curriculum).

## Optimization Workflow

### Step 1 — Answer Density Check

- Confirm the core answer appears in the first ~60 words after the H1.
- If not, write a **Direct Answer Paragraph (40–60 words)** that includes the exam board, subject code, and year where relevant — specificity is what makes education answers citable.

### Step 2 — Structure Optimization

- Convert prose into extractable formats: syllabus-point tables, exam-date tables, step-by-step worked examples, "Examiner tip" callout blocks.
- Add H2/H3s mirroring real student/parent PAA phrasing ("How many marks is Paper 6?", "Is IGCSE harder than GCSE?").
- Give every section a clear topic sentence.

### Step 3 — Citation Readiness

- Bold key terms, define exam jargon (grade threshold, mark scheme, spec point) on first use.
- Add specific numbers engines can attribute: paper weightings, mark allocations, session dates, syllabus codes.
- Add a TL;DR block near the top; for exam-logistics pages, add a "Last verified for the [May/June 2026] session" freshness line.

### Step 4 — Entity Optimization

- Name official entities precisely (Cambridge Assessment, Edexcel, Pearson, National Curriculum Board, Kemendikbud) and connect them explicitly to the topic.
- Link the concept to its syllabus location ("covered in Topic 4 of the 0625 syllabus") — this is the entity depth big generic sites skip.

### Step 5 — Trust & Freshness

- Surface educator credentials (e.g., "reviewed by a Cambridge-trained examiner", founder PhD), last-updated date tied to the current syllabus year, and citations to official board documents (syllabus PDFs, timetables) — the strongest trust signals in this niche.

## Output Format

1. **Query Lane & Engine Diagnosis** — which lane, what currently gets cited, and why.
2. **Direct Answer Paragraph** — the 40–60 word answer to place after the H1 (board/code/year included where relevant).
3. **Restructured Content** — the full optimized version, ready to publish.
4. **Before/After Comparison** — 2–3 specific sections that changed and why each raises citation odds.
5. **AEO Scorecard** — original vs. optimized, 1–10 on Answer Positioning, Structure, Factual Density, Entity/Syllabus Clarity, Trust & Freshness.
6. **Engine Notes** — one line per priority engine on how this rewrite helps.
7. **Follow-up Cluster** — 3–5 companion questions to answer on-page or in sibling pages to own the whole conversation thread.

## Guardrails

- Never invent exam dates, grade thresholds, syllabus points, statistics, or citations — wrong exam information damages student outcomes and brand trust irreparably. Verify against official board sources or mark as "needs verification".
- Do not reproduce copyrighted exam-board content verbatim beyond fair-use excerpts; summarize and link.
- Preserve the product's real positioning and brand voice from the loaded context.
- Don't over-fragment good explanations; students need coherent teaching prose — optimize for the learner first, the machine second.

## Related skills

- `ai-search-visibility-checker` — score AEO readiness before/after this rewrite
- `schema-markup-generator` — add Course/Quiz/FAQ structured data engines reward
- `seo-content-brief-writer` — bake AEO requirements in before writing
- `eeat-content-scorer` — validate the education trust signals engines weigh
