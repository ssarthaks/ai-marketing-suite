---
name: internal-linking-strategist
description: "Design internal-linking architecture for education sites — subject → level → topic → resource hub-and-spoke, past-paper repository linking, study-journey cross-links, and free-content-to-product funnel links. Trigger on 'internal linking strategy', 'topical authority map', or 'fix our site architecture'. Crawls the page inventory, maps curriculum-shaped pillars and clusters, rescues orphans, and ships exact link + anchor recommendations."
metadata:
  version: 4.0.0
  category: SEO
---

# Internal Linking Strategist — Education Market Edition


## Mission

Concentrate authority on the pages that should rank, make every important page reachable, and shape the site the way a curriculum is shaped — so search engines read topical expertise and students flow naturally from free content to the product.

## The Education Site Architecture Model

Education sites have a *natural* hub-and-spoke shape — mirror the curriculum hierarchy instead of inventing abstract clusters:

```text
Home
└── Curriculum / Board hub          (e.g., /igcse/, /alevels/, /board-exams/, /standard-curriculum/)
    └── Subject hub (PILLAR)        (e.g., /igcse/physics-0625/ — targets "IGCSE physics 0625")
        ├── Topic/chapter notes     (spokes: "electricity notes igcse 0625")
        ├── Past-paper pages        (spokes: year → session → paper variant)
        ├── Video-lesson pages      (spokes)
        ├── Quiz/practice pages     (spokes)
        └── Exam-logistics pages    (syllabus, timetable, grade thresholds)
```

**Education-specific linking rules on top of the classic model:**

1. **The study-journey triangle.** Every notes page ↔ its practice/quiz page ↔ its video page must interlink ("Revise it → Practice it → Watch it"). This mirrors how students actually study and triples session depth.
2. **Past-paper repository linking.** Year/session/variant pages are thin by nature — they MUST link up to the subject pillar, sideways to the same paper's mark scheme + examiner report + threshold page, and forward to the next session. Never leave a paper page as a dead end.
3. **Seasonal hub scaffolding.** Timetable, results-date, and new-session pages spike hard on the academic calendar; link them prominently from subject pillars *before* the spike (site-wide banner or pillar callout during the window).
4. **Funnel links (free → product).** Every high-traffic free page (past papers, notes) needs exactly one contextual, honest product link ("Want this paper solved on video? → Online Learning Academy") — the monetization thesis of Exam Prep Platform. Track these as **Money-Page-Boost** links.
5. **Persona bridges.** Student pages should link to one parent/teacher-facing page where natural ("Parents: how to support IGCSE revision") — this is how the payer discovers us via the user.
6. **Grade-progression links.** Link subject content across levels (IGCSE Physics → AS Physics) — retains students across academic years and builds cross-level authority.

## Deep Research & Interactive Workflow

**Phase 1 — Understand the Site (Mandatory).**

1. Read the loaded Product Context for real topics, priority pages, and conversion goals.
2. If given a domain, fetch the sitemap / crawl key sections; infer the page inventory, current link patterns, and curriculum hierarchy.
3. For each page, capture topic, target term (include subject codes — they're head terms in this niche), and role (curriculum hub / subject pillar / spoke / seasonal / money page).

**Phase 2 — Confirm Priorities (Chatty).**
Confirm the money pages / conversion targets, which subjects and levels matter most commercially, and any upcoming seasonal window, then build the map.

## Analysis Steps

### Step 1 — Map the Curriculum Hierarchy

Identify (or propose) the board → subject → topic → resource-type tree; flag pages that don't fit cleanly.

### Step 2 — Identify Pillars & Clusters

Assign each subject hub as a pillar targeting its head term ("IGCSE Biology 0610"); group notes/papers/videos/quizzes as its spokes; each spoke must link back to its pillar.

### Step 3 — Build the Study-Journey Triangles & Sideways Links

Wire notes ↔ practice ↔ video per topic, and paper ↔ mark scheme ↔ examiner report ↔ thresholds per session. Limit cross-cluster links to 1–2 genuinely natural bridges per page.

### Step 4 — Anchor Text Strategy

Use precise education anchors: include subject code and session where relevant ("0610 May/June 2026 Paper 4 mark scheme" beats "click here" and beats vague "biology past paper"). Mix branded, keyword-rich, and natural-phrase anchors; avoid repeating exact-match.

### Step 5 — Orphan, Depth & Funnel Detection

- Flag orphans (typical in paper repositories where new sessions get uploaded but never linked) and assign each to a cluster.
- Flag pages >3 clicks from home; paper pages are often 5+ clicks deep — recommend pillar shortcuts.
- Flag high-traffic free pages missing their one funnel link, and money pages under-linked relative to value.

## Output Format

**Curriculum Cluster Map:**

| Curriculum Hub | Subject Pillar | Spokes (by resource type) | Seasonal Pages | Money Page |
| --- | --- | --- | --- | --- |

**Link Recommendations:**

| Source Page | Target Page | Anchor Text | Link Type |
| --- | --- | --- | --- |

Link Types: Pillar→Spoke · Spoke→Pillar · Study-Journey-Triangle · Session-Sideways · Seasonal-Scaffold · Persona-Bridge · Grade-Progression · Orphan-Rescue · **Money-Page-Boost**.

**Priority Actions** — top 5 links to add immediately with the reason (authority, seasonal deadline, or funnel revenue).

## Guardrails

- Link for the student's study journey first; relevance drives the SEO benefit.
- Don't over-optimize anchors or over-link; keep in-content links purposeful.
- Only recommend links between pages that genuinely exist in the crawled/supplied inventory.
- Funnel links must be honest and contextual — no bait links from free content that disappoint students.

## Related skills

- `content-strategy` / `ai-seo` — define the clusters this structure supports
- `seo-site-auditor` — detect orphan pages, crawl-depth, and PDF-repository issues
- `competitor-gap-finder` — find missing cluster pages worth creating before linking
- `keyword-intent-classifier` — verify which pages deserve authority concentration
