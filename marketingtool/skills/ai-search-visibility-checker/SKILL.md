---
name: ai-search-visibility-checker
description: "Audit how likely education content is to be selected and cited by AI answer engines (ChatGPT, Perplexity, Claude, Gemini, Google AI Overviews) and score AEO readiness against the education sites that dominate AI citations. Trigger on 'AI search visibility', 'AEO readiness audit', or 'will AI cite this page'. Researches how engines currently answer student/parent/teacher queries, scores five weighted criteria plus curriculum accuracy, and returns fixes plus a rewritten opener."
metadata:
  version: 4.0.0
  category: SEO
---

# AI Search Visibility Checker — Education Market Edition


## Mission

Predict whether an answer engine would cite this page when a student, parent, or teacher asks the target query, quantify the readiness gap against the education sites that actually win citations, and prescribe the highest-leverage fixes.

## The Education Citation Landscape (know who you're up against)

Before scoring, know the incumbents AI engines habitually cite per query lane — the page must beat *these*, not an abstract standard:

| Query lane | Typical cited incumbents |
| --- | --- |
| Cambridge/IGCSE revision & notes | Save My Exams, Physics & Maths Tutor, Znotes, BBC Bitesize, Seneca |
| Past papers & exam logistics | PapaCambridge, GCE Guide, XtremePapers, official cambridgeinternational.org |
| General concept explanations | Khan Academy, BBC Bitesize, Wikipedia, university .edu pages |
| Indonesia K-12 (Bahasa) | Regional Market Leader blog, Secondary EdTech Incumbent, Legacy EdTech Player legacy content, Kompas/detik education |
| National Board Exams | Local news portals, kullabs-style notes sites, Facebook-first content (weak — a real gap for us) |
| UK GCSE sciences | BBC Bitesize, Cognito, Save My Exams, Primrose Kitten, freesciencelessons |
| Parent evaluation queries | Reddit threads, Trustpilot, Mumsnet (UK), local parent Facebook groups (surfaced via news/blog roundups) |

**Strategic implication:** lanes where incumbents are weak (National Board Exams, National Standard Curriculum-specific Bahasa content, syllabus-code-level Cambridge detail, Edexcel mark-scheme-precise feedback) are our winnable AI real estate. Flag these opportunities in every audit.

## Deep Research & Interactive Workflow

**Phase 1 — Observe the Engines (Mandatory).**

1. Read the loaded Product Context so scoring reflects the real product, claims, and authority.
2. Fetch the live page and **observe how AI engines currently answer the target query** — who they cite (map to the incumbent table above), the winning format, and whether our page or a sister property already appears.
3. Identify the persona behind the query (student / parent / teacher / school admin) — citation-worthiness is judged against what *that* persona needs.

**Phase 2 — Confirm Target (Chatty).**
Confirm the target query, persona, and priority engine if unclear, then score.

## Evaluation Criteria (weighted)

### 1. Answer Positioning — 25%

Is the core answer in the first ~100 words, in a clear 40–60 word direct-answer paragraph that names the board/code/year where relevant? · Score 1–10.

### 2. Structural Clarity — 20%

H2/H3s matching real student/parent PAA phrasing; data in tables (dates, marks, weightings); worked examples and definitions clearly marked. · Score 1–10.

### 3. Factual & Syllabus Density — 20%

Specific exam data (codes, sessions, thresholds, mark allocations), syllabus-point references, claims backed by official board sources; original insight vs. rehashed generic explanation. · Score 1–10.

### 4. Curriculum Accuracy — 15% *(education-specific criterion)*

Content verified against the current syllabus year; correct board terminology (Cambridge Assessment vs Edexcel command words differ); no outdated spec content. **A single detectable curriculum error should cap the overall verdict at MEDIUM** — engines demote and users distrust inaccurate education sources. · Score 1–10.

### 5. Entity Coverage — 10%

Official entities named and connected (exam board, qualification, subject code, curriculum name); relationships explicit. · Score 1–10.

### 6. Trust & Freshness — 10%

Educator credentials (examiner experience, PhD, teaching background), last-verified-for-session date, citations to official syllabus/timetable documents, working links. · Score 1–10.

## Output Format

**AI Visibility Scorecard:**

| Criterion | Weight | Score | Evidence-based note |
| --- | --- | --- | --- |
| Answer Positioning | 25% | X/10 | |
| Structural Clarity | 20% | X/10 | |
| Factual & Syllabus Density | 20% | X/10 | |
| Curriculum Accuracy | 15% | X/10 | |
| Entity Coverage | 10% | X/10 | |
| Trust & Freshness | 10% | X/10 | |
| **Weighted Total** | 100% | **X/10** | |

**Verdict:**

- 8–10: **HIGH VISIBILITY** — likely to be cited for this query lane.
- 5–7: **MEDIUM** — may be cited, but the incumbents above will usually be preferred.
- 1–4: **LOW** — AI will not select this content.

**Then provide:**

- **Incumbent Analysis** — who is currently cited for this query, and the one thing they do that this page must match or beat.
- **Top 3 Fixes** — ranked by impact, each specific and shippable.
- **Rewritten Opening Paragraph** — an opener that would score 9+/10 on Answer Positioning for the target query and persona.
- **Winnable-Lane Note** — whether this query sits in a weak-incumbent lane (Regional Market, National Standard Curriculum/Bahasa, code-level Cambridge, Edexcel-precise) and, if so, the cluster of sibling queries worth attacking next.
- **Seasonal Note** — when this query's volume peaks on the academic calendar and the deadline for the fix to matter this cycle.

## Guardrails

- Score against the live page and observed engine behavior, not assumptions; flag anything you couldn't fetch.
- Never invent exam data, dates, or citations to inflate a score — recommend adding real, verifiable ones.
- Curriculum accuracy overrides everything: flag suspected syllabus errors even when not asked.
- A high score means citation-worthy for the persona, not keyword-stuffed.

## Related skills

- `aeo-content-optimizer` — execute the rewrite this audit calls for
- `schema-markup-generator` — add Course/Quiz/FAQ structured data that boosts extractability
- `eeat-content-scorer` — deepen the education trust signals engines weigh
- `seo-content-brief-writer` — bake AI-visibility requirements in before writing
