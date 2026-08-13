---
name: seo-content-brief-writer
description: "Generate writer-ready SEO content briefs for education content — with syllabus mapping, persona targeting (student/parent/teacher), exam-board terminology accuracy, worked-example requirements, and AI-answer visibility baked in. Trigger on 'SEO content brief', 'writer brief', or 'brief for <keyword>'. Researches the live SERP and education incumbents, then ships a brief a writer can execute with zero follow-up questions."
metadata:
  version: 4.0.0
  category: Content
---

# SEO Content Brief Writer — Education Market Edition


## Mission

Hand a writer everything needed to produce an education page that ranks in Google, gets cited by AI engines, and survives teacher-level scrutiny — structure, syllabus mapping, terminology rules, sources, and the angle that beats Save My Exams / BBC Bitesize / Regional Market Leader for this query.

## Deep Research & Interactive Workflow

**Phase 1 — SERP & Incumbent Research (Mandatory).**

1. Read the loaded Product Context.
2. Analyze the live SERP: dominant format, top 3 pages (structure + word counts), AI Overview presence, People-Also-Ask cluster, and which education incumbents hold the positions.
3. Identify the **angle of attack** — in education this is usually one of: syllabus-code-level depth, mark-scheme precision, free access, local-curriculum/language fit, worked examples with real data, or interactive practice the SERP lacks.

**Phase 2 — Confirm Scope (Chatty).**
Confirm: target keyword, primary persona (student / parent / teacher), curriculum + syllabus year, region/language, the page's conversion goal, and the seasonal deadline. Then write the brief.

## Brief Sections

### 1. Target Keyword, Persona & Intent

- Primary keyword + verified intent; secondary keyword variants (include subject-code variants: "0625", "igcse physics" — same page, note canonical choice).
- **Primary persona** with a one-line reader portrait ("Year 11 student, 6 weeks before Paper 4, panicking about circuits") — everything downstream serves them.
- Funnel role: awareness / free-resource entry / parent conversion / teacher seeding.

### 2. Syllabus Mapping (education-specific, mandatory for study content)

- Exam board, qualification, subject code, syllabus year (e.g., "Cambridge Assessment IGCSE Physics 0625, 2026–2028 syllabus").
- The exact syllabus points / chapter references the piece must cover — writer must check the official syllabus PDF, linked in the brief.
- Command-word accuracy note: use the board's own command words (Cambridge Assessment "state/describe/explain/determine"; Edexcel differs) in headings and practice questions.

### 3. Content Structure

- Recommended **H1** (primary keyword, ≤60 chars).
- **H2 outline** (6–10 subheadings matching real PAA/SERP themes and the persona's study journey).
- H3s where depth is required; **worked-example blocks** specified explicitly (education content without worked examples loses — state how many and which difficulty levels).
- Required special blocks: Direct Answer Paragraph after H1, "Examiner tip" callouts, common-mistakes section, and (for exam-logistics pages) a dated freshness line.
- Recommended **word count** (top-competitor average +20%, adjusted for intent — paper-download pages should stay lean, guides go deep).

### 4. SEO Requirements

- Primary keyword placement (H1, first 100 words, ≥1 H2, meta).
- Secondary keywords + semantic entities: official board names, qualification names, subject codes, curriculum terms.
- Internal links: to the study-journey siblings (notes ↔ practice ↔ video), the subject pillar, and exactly one funnel/product link with honest anchor.

### 5. People Also Ask

- 5–8 real PAA questions, each answered as a direct 40–60 word paragraph (AEO-ready).

### 6. Incumbent Benchmark

- What the top pages cover, their word-count range, and their board/code depth.
- What they miss — the unique angle this brief exploits (stated as a testable claim: "No ranking page explains the Paper 6 mark distribution").

### 7. AEO & AI-Visibility Notes

- Direct Answer Paragraph placement; sections to format as tables/lists (dates, weightings, formulas); entities to define for AI comprehension.

### 8. E-E-A-T & Accuracy Requirements (education-strict)

- Named author + credentials to display (teaching/examining background); reviewer sign-off requirement — **study content must be fact-checked by a subject expert before publish**, stated as a hard gate in the brief.
- First-hand elements required: original worked examples (never copied from board papers), own diagrams, platform data where available.
- Official sources to cite: syllabus PDF, timetable page, grade-threshold documents.
- Copyright rule: paraphrase board content; excerpt only within fair use; link to official documents.

### 9. Meta Tags & Publish Plan

- Title tag (≤60 chars, keyword + benefit), meta description (≤155 chars, CTA + keyword).
- **Publish-by date** tied to the academic calendar (e.g., "must be indexed 6 weeks before the May/June session — publish by early April") and the refresh trigger ("update when 2027 syllabus releases").

## Output Format

A clean, structured brief a writer can follow with **no additional guidance** — headers, bullets, concrete checkable instructions, linked official sources. No vague directions; every instruction is testable at review.

## Guardrails

- Base structure and word count on the actual researched SERP, not assumptions.
- Never brief content that fabricates exam data, thresholds, or "examiner secrets".
- The syllabus-mapping section is non-optional for study content; if the user can't supply the board/code, ask before briefing.
- Keep the angle original and on-brand; beat incumbents, don't imitate them.

## Related skills

- `keyword-intent-classifier` — confirm persona and intent before briefing
- `competitor-gap-finder` — sharpen the angle of attack
- `aeo-content-optimizer` — optimize the draft after writing
- `eeat-content-scorer` — quality-gate the finished piece before publish
