---
name: schema-markup-generator
description: "Generate valid, Rich-Results-passing JSON-LD structured data specialized for education sites — Course, LearningResource, Quiz, VideoObject with learning metadata, EducationalOrganization, FAQ, plus all standard types. Trigger on 'schema markup', 'JSON-LD', or 'add structured data to <url>'. Detects the right type(s), applies education properties (educationalLevel, teaches, educationalAlignment), nests with @graph, and ships a validation checklist."
metadata:
  version: 4.0.0
  category: SEO
---

# Schema Markup Generator — Education Market Edition


## Mission

Produce copy-paste-ready, spec-compliant JSON-LD that unlocks education rich results (Course carousels, FAQ, Video, Organization panels) and feeds clean entity data about our curricula, subjects, and products to AI answer engines — with zero fabricated values.

## Education Schema Playbook (the types that matter for us, in priority order)

### 1. `Course` + `hasCourseInstance` — subscription subjects & structured programs

For pages selling or describing a subject offering (e.g., Online Learning Academy IGCSE Physics course, EduPlatform subject packages). Required: `name`, `description`, `provider` (Organization). Recommended: `offers` (price, currency — enables course rich results), `hasCourseInstance` with `courseMode: "online"`, `courseWorkload`, `educationalLevel` (e.g., "IGCSE"), `teaches`, `inLanguage`, `availableLanguage`. Google's Course carousel requires ≥3 courses on a list page OR Course markup per detail page.

### 2. `LearningResource` — notes, revision guides, past-paper pages

The most under-used education type; ideal for our free content. Properties: `learningResourceType` ("past paper", "revision notes", "worked example"), `educationalLevel`, `teaches`, `assesses`, `educationalAlignment` (link to the syllabus/framework: e.g., alignmentType "educationalSubject", targetName "Cambridge Assessment IGCSE Physics 0625"), `isAccessibleForFree: true` (a differentiator vs. paywalled competitors), `inLanguage`.

### 3. `Quiz` — practice and quiz pages (Interactive Quiz App, practice sets)

`Quiz` with `about`, `educationalLevel`, `hasPart` → `Question`/`Answer` pairs (only for questions actually shown on-page; don't leak answer banks).

### 4. `VideoObject` with education extensions — video lessons & solved papers

Standard required (`name`, `thumbnailUrl`, `uploadDate`) plus `duration`, `educationalLevel`, `teaches`, `learningResourceType: "video lesson"`. For solved-paper walkthroughs, connect to the paper via `about`. Enables video rich results and Key Moments (`hasPart` → `Clip` with `startOffset`).

### 5. `EducationalOrganization` / `Organization` — site-wide entity

Use `EducationalOrganization` (or `Organization` for the platform company) with `logo`, `sameAs` (socials, app-store listings, Wikipedia/Wikidata if present), `contactPoint`, `foundingDate`, `founder` (founder credentials are a real E-E-A-T asset — Person with `alumniOf`, `honorificPrefix`). Keep ONE canonical `@id` reused across all pages.

### 6. `FAQPage` — exam-logistics and parent-decision pages

Real on-page Q&As only ("When is the 0625 June 2026 exam?", "Is K-12 LMS Platform free for schools?"). Powerful for AI-answer extraction even where Google limits FAQ rich-result display.

### 7. Supporting types

- **`Event`** — webinars, parent info sessions, exam-prep bootcamps (`startDate`, `eventAttendanceMode`, `offers`).
- **`Article`/`BlogPosting`** — knowledge-hub posts (author `Person` with education credentials).
- **`BreadcrumbList`** — critical for deep curriculum hierarchies (board → subject → year → paper).
- **`SoftwareApplication`** — app-download pages (`applicationCategory: "EducationalApplication"`, `aggregateRating` from real store data).
- **`Product`** — only when a page sells a non-course item; prefer Course for subjects.
- **`LocalBusiness`** — physical tuition/partner centres (pair with `gbp-post-generator`).

## Deep Research & Interactive Workflow

**Phase 1 — Inspect First.**

1. Read the loaded Product Context so Organization, brand, and URL fields are accurate.
2. If a URL is supplied, fetch the live page and extract real content (headings, author, dates, prices, FAQ pairs, video data).
3. Detect the true page type(s) using the playbook above — most education pages need a 2–3-type `@graph` (e.g., LearningResource + BreadcrumbList + Organization).

**Phase 2 — Confirm Gaps (Chatty).**
If required properties are missing (author, price, dates, video duration), ask rather than invent. Confirm the canonical URL, curriculum labels, and whether content is free (`isAccessibleForFree`).

**Phase 3 — Generate** the JSON-LD plus validation report.

## Rules

1. Output **only valid JSON-LD** inside a `<script type="application/ld+json">` tag.
2. Schema.org vocabulary exclusively; correct types and ISO 8601 dates.
3. Nest with `@graph` and stable absolute `@id` cross-references; one canonical Organization `@id` site-wide.
4. Include **all REQUIRED** properties per Google's documentation for the targeted rich result; add RECOMMENDED properties wherever real data exists.
5. **Never invent data** — no fabricated prices, ratings, dates, or credentials; omit and list as "needs input".
6. Education labels must match official terminology exactly ("Cambridge IGCSE", "Edexcel GCSE (9–1)", "National Standard Curriculum") — these are the entity strings engines reconcile.

## Output Format

1. **The JSON-LD code block** — complete, valid, ready to paste into the page `<head>`.
2. **Validation Checklist** — `Property | Required? | Status (present / missing-needs-input)`.
3. **Expected Rich Result** — what this enables (Course carousel, FAQ, Video, Breadcrumb, Organization panel) and eligibility caveats.
4. **Entity Note** — which education entities (board, qualification, subject code) this markup asserts, and how it strengthens AI-engine comprehension.
5. **Testing Note** — validate in Google's Rich Results Test and Schema.org validator before deploy.

## Guardrails

- Mismatched markup (schema not reflecting visible content) risks manual actions — only mark up what's on the page.
- Never mark up ratings/reviews that aren't genuinely collected and displayed.
- Don't mark up copyrighted exam-board PDFs as our own creative work; `LearningResource` describes our page, `publisher` stays honest.
- No student personal data in any markup.

## Related skills

- `seo-site-auditor` — confirm the page is crawlable and indexable first
- `aeo-content-optimizer` — pair structured data with extractable content
- `gbp-post-generator` — LocalBusiness consistency for physical centres
- `ai-search-visibility-checker` — measure the AI-citation lift
