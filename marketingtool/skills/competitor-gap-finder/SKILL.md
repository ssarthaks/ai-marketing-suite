---
name: competitor-gap-finder
description: "Compare your education content against the pages outranking you to find syllabus-coverage gaps, missing entities, uncovered sub-topics, and depth deficits — benchmarked against the EdTech sites that dominate education SERPs. Trigger on 'competitor content gap', 'semantic gaps', or 'why does <competitor> outrank us'. Fetches live competitor pages, builds a subject × level × resource coverage grid, and returns a prioritized gap-closing plan."
metadata:
  version: 4.0.0
  category: Research
---

# Competitor Gap Finder — Education Market Edition


## Mission

Identify exactly what top-ranking education pages cover that ours does not — syllabus coverage, entities, sub-topics, depth, structure, and proof — and prioritize the gaps that actually move rankings and enrollments.

## Know the Competitive Set (per product lane)

When the user names only a keyword, benchmark against the real category leaders, not random SERP noise:

| Lane | Primary content competitors |
| --- | --- |
| Cambridge IGCSE/A-Level notes & revision | Save My Exams, Physics & Maths Tutor (PMT), Znotes, Seneca, BBC Bitesize |
| Past-paper repositories | PapaCambridge, GCE Guide, XtremePapers, Dynamic Papers, official board sites |
| UK GCSE sciences (Exam Revision App lane) | Save My Exams, Cognito, freesciencelessons, Primrose Kitten, MyGCSEScience |
| Indonesia K-12 (K-12 LMS Platform lane) | Regional Market Leader (blog + app SEO), Secondary EdTech Incumbent, Kelas Pintar, Legacy EdTech Player legacy pages, Colearn |
| Regional Market (Regional Education lane) | Competitor EdTech, Competitor Study Portal, Regional EdTech App, local notes blogs — generally weak content, strong local-language reach |
| Teacher quiz/gamification (Interactive Quiz App lane) | Kahoot!, Quizizz (Wayground), Blooket, Gimkit, Baamboozle content hubs |
| Homeschool decision content (Online Learning Academy lane) | Wolsey Hall Oxford, CenturyTech blogs, homeschool association sites, expat parenting blogs |

## Education-Specific Gap Types (check ALL of these, not just semantic gaps)

1. **Syllabus coverage gaps** — subjects, subject codes, levels, or syllabus years the competitor covers and we don't (e.g., they have 0610 Biology notes for the 2026 syllabus; we stop at 2024). Build the coverage grid below.
2. **Resource-type gaps** — for the same topic, do they offer more formats: notes + past papers + videos + quizzes + flashcards + mark-scheme walkthroughs? Students pick the one-stop shop.
3. **Session freshness gaps** — latest exam session's papers/thresholds/timetables published faster than us.
4. **Language & localization gaps** — Bahasa Indonesia, local language, or local-curriculum terminology they serve and we don't (or vice versa — our winnable edge).
5. **Persona gaps** — they serve the student but ignore the parent (or teacher) query cluster around the same topic; a persona page we can own.
6. **Trust/proof gaps** — examiner credentials, efficacy data, review counts, school logos, "used by X schools" proof they display.
7. **Access-model gaps** — what they paywall vs. give free; free-with-registration walls create win opportunities for genuinely free content (Exam Prep Platform' whole thesis).
8. **Classic semantic gaps** — missing concepts, entities, FAQs, data points, worked examples (standard analysis below).

## Deep Research & Interactive Workflow

**Phase 1 — Gather Both Sides (Mandatory).**

1. Read the loaded Product Context so recommendations stay on-brand and accurate.
2. Fetch the live content of our page and the competitor page(s). If only a keyword is given, search the SERP and pull the top 2–3 ranking pages (cross-check against the lane table above).
3. Extract real headings, entities, syllabus references, resource types, and word counts from each.

**Phase 2 — Confirm Target (Chatty).**
Confirm the target keyword/intent, the persona (student / parent / teacher), and which competitor matters most, then run the comparison.

## Analysis Steps

### Step 1 — Coverage Grid (education first)

Build a **subject × level × resource-type grid** for us vs. the competitor:

| Subject (code) | Level | Notes | Past papers | Videos | Quizzes/Practice | Mark schemes | Us | Them |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

### Step 2 — Entity Extraction

Extract all named entities from each page (concepts, syllabus points, exam terms, tools, people, data points). Build parallel lists: OUR entities vs. THEIR entities.

### Step 3 — Gap Identification

What appears in their content but not ours: concepts/frameworks, exam data (dates, thresholds, weightings), worked examples, FAQ/PAA questions answered, downloadable resources, teacher-facing materials.

### Step 4 — Depth & Proof Comparison

For shared topics: where are they more detailed, where do they show worked examples/screenshots/mark-scheme extracts we don't, where is their explanation more authoritative (examiner voice, citations to official specs)?

### Step 5 — Structure, Intent & Format Fit

Compare H2/H3 structures; note sections they have that we lack; check whether they match the SERP's dominant format (revision-note page, paper-download hub, video lesson, quiz) better than us, and who wins the AI Overview / featured snippet.

## Output Format

**Coverage Grid** — the subject × level × resource matrix with gaps highlighted.

**Gap Report:**

| Gap Type | What's Missing | Persona Affected | Where to Add It | Impact |
| --- | --- | --- | --- | --- |

Impact = **HIGH** (directly affects ranking/enrollment) · **MEDIUM** (comprehensiveness) · **LOW** (nice to have).

**Summary:**

- Total gaps: X · High-impact: X · Syllabus-coverage gaps: X
- **Action Plan** — prioritized edit/build sequence; syllabus-year and session-freshness gaps first when an exam session is approaching.
- **Defensive Note** — what we cover that they don't (protect and amplify: e.g., genuinely free access, local-curriculum alignment, interactive video, examiner-precise feedback).
- **Winnable-Lane Note** — gaps sitting in weak-incumbent lanes (local language content, National Standard Curriculum-aligned Bahasa content, code-level Cambridge depth) worth over-investing in.

## Guardrails

- Close gaps that serve the learner — never bloat word count for its own sake.
- Don't copy the competitor; identify the gap, then advise a stronger, original, on-brand treatment.
- Only report entities/data actually present in the fetched pages.
- Never recommend republishing copyrighted board content the competitor may be infringing; flag it as their legal risk instead.

## Related skills

- `competitors-research` — broaden from a single page to full competitive intelligence
- `seo-content-brief-writer` — turn the gaps into a writer-ready brief
- `eeat-content-scorer` — verify the upgraded page clears the education authority bar
- `keyword-intent-classifier` — confirm both pages target the same persona and intent
