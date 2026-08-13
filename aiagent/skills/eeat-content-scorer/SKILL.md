---
name: eeat-content-scorer
description: "Score education content against Google's E-E-A-T guidelines (Experience, Expertise, Authoritativeness, Trustworthiness) with the elevated YMYL bar that applies to educational decisions — plus a curriculum-accuracy check no generic scorer runs. Trigger on 'E-E-A-T score', 'content quality check', or 'is this good enough to publish'. Researches the education niche's authority bar, scores each dimension with evidence, and returns a PUBLISH/REVISE/REWRITE verdict with fixes."
metadata:
  version: 4.0.0
  category: Content
---

# E-E-A-T Content Scorer — Education Market Edition


## Mission

Decide whether a piece of education content is accurate, trustworthy, and competitive enough to earn rankings and parent/teacher trust — and tell the author exactly what to fix to clear the education bar, which is higher than the generic content bar.

## Why the Bar Is Higher in Education

- **Education is explicitly YMYL-adjacent.** Google's quality-rater guidelines treat content affecting "education decisions" as requiring elevated trust. Parent-facing pages (choosing a platform, homeschool decisions, exam-path advice) are fully YMYL: score them strictly.
- **A factual error is a student's lost marks.** Wrong formula, outdated spec point, wrong exam date — the cost of error is borne by a child's exam result. Accuracy failures here are existential, not cosmetic.
- **The audience includes professional skeptics.** Teachers detect shallow or wrong content instantly and warn their networks. One wrong mark-scheme claim can burn a whole school's trust.
- **Incumbent authority is real.** BBC Bitesize, Save My Exams, Khan Academy set the authority baseline; our content must demonstrate credentials and precision they can't easily match (examiner-level feedback, code-level syllabus alignment, local-curriculum depth).

## Deep Research & Interactive Workflow

**Phase 1 — Calibrate to the Niche (Mandatory).**

1. Read the loaded Product Context to know the brand's real authority assets, named experts, and credentials.
2. Check what currently ranks for this topic and how authoritative those sources are — E-E-A-T is graded relative to the competitive set.
3. Classify the content: **Student revision content** (high accuracy bar), **Parent decision content** (full YMYL bar), **Teacher resource content** (professional credibility bar), or **Exam logistics content** (freshness + official-source bar).

**Phase 2 — Confirm Context (Chatty).**
Ask 1–3 questions only if needed: stated author and credentials, publishing domain, target query/persona. Then score.

## Scoring Criteria

Rate 1–10 per dimension, citing concrete evidence from the text:

### Experience (First-Hand)

- Does the author show direct classroom, examining, or platform experience — real student examples, real mark-scheme extracts analyzed, screenshots of actual lessons, data from our own learner base?
- 1–3: No evidence, could be written by anyone · 4–6: Implied but not demonstrated · 7–10: Unmistakable practitioner voice with specifics (e.g., "in 12 years of marking Paper 4, the most-dropped mark is…").

### Expertise (Knowledge Depth)

- Correct board-specific terminology (Cambridge Assessment vs Edexcel command words differ); goes to syllabus-point level; explains *why* examiners award or withhold marks, not just *what* the answer is.
- 1–3: Anyone-with-Google level · 4–6: Solid but generic across boards · 7–10: Board-precise depth that teaches even a teacher something.

### Authoritativeness (Credibility Signals)

- Named author with education credentials (PhD, B.Ed, examiner history); institutional proof (schools served, ministry partnerships, Acer/publisher partnerships); citations to official board documents; recognition in the education niche.
- 1–3: Anonymous / no signals · 4–6: Some credentials, weak external validation · 7–10: Clear authority with verifiable credentials and institutional proof.

### Trustworthiness (Accuracy + Transparency) — weight heaviest

- **Curriculum accuracy check (education-specific):** verify claims against the current official syllabus/spec; flag any outdated syllabus-year content, wrong dates, wrong weightings, or invented "examiner tips".
- Claims backed by evidence; honest about limitations (e.g., "thresholds vary by session"); clear contact/editorial standards; no dark-pattern urgency aimed at anxious parents; child-data promises consistent with the privacy policy.
- 1–3: Unverified, opaque, or contains a curriculum error · 4–6: Mostly accurate, missing trust signals · 7–10: Fully cited against official sources, transparent, current syllabus year stated.

## Output Format

| Dimension | Score | Evidence-Based Assessment |
| --- | --- | --- |
| Experience | X/10 | Cite the passage (or its absence) |
| Expertise | X/10 | |
| Authoritativeness | X/10 | |
| Trustworthiness | X/10 | Include the curriculum-accuracy result |
| **Overall E-E-A-T** | **X/10** | Content class + how it shifts the bar |

Then provide:

- **Curriculum Accuracy Flags** — every claim that needs verification against official sources, listed explicitly (this section is mandatory even when empty: state "no flags found").
- **Top 3 Weaknesses** — specific fixes (exact sentence/section + what to add, e.g., "add examiner credential to byline", "cite the 0625 syllabus PDF for the paper weighting claim").
- **Top 3 Strengths** — what to preserve.
- **Authority Asset Check** — portfolio credentials the page *should* be using but isn't (founder credentials, school counts, efficacy data, official partnerships).
- **Helpful Content Check** — people-first or search-engine-first? Flag AI-filler or unoriginal-rehash risk; education SERPs are saturated with rehash, so originality (own data, own worked examples) is the differentiator.
- **Verdict** — **PUBLISH** / **REVISE** / **REWRITE**, with the single most important reason. Any unresolved curriculum-accuracy flag forces at minimum REVISE.

## Guardrails

- Score what the text demonstrates, not intentions — be specific, not generous.
- Never invent credentials or sources on the author's behalf; flag missing trust signals instead.
- Parent-facing decision content defaults to the strict YMYL threshold — say so in the verdict.
- Do not let strong writing mask weak accuracy; accuracy dominates style in education.

## Related skills

- `seo-content-brief-writer` — build E-E-A-T requirements in before writing
- `aeo-content-optimizer` — trust signals also drive AI-answer citation
- `competitor-gap-finder` — find the depth gaps dragging the score down
- `market-communication` — align public claims with brand and compliance standards
