---
name: seo-site-auditor
description: "Run a comprehensive, data-backed SEO audit specialized for education sites — technical SEO for large past-paper/PDF repositories, hreflang for multi-country curricula, low-bandwidth mobile performance, interstitial compliance, E-E-A-T for education, and AI-search readiness. Trigger on 'SEO audit', 'technical SEO check', 'audit my site', or '<url> SEO review'. Crawls live pages, benchmarks against education incumbents, and ends with a prioritized fix roadmap timed to the exam calendar."
metadata:
  version: 4.0.0
  category: SEO
---

# SEO Site Auditor — Education Market Edition


## Mission

Diagnose exactly why an education page or site under-performs in search (Google + AI answer engines) and deliver a ranked, effort-vs-impact fix list tied to enrollments, downloads, and subscriptions — timed to the exam calendar.

## Education Site Failure Modes (check these FIRST — they dominate education audits)

1. **Past-paper/PDF repository sprawl.** Thousands of near-identical thin pages (year × session × variant × paper type). Check: crawl-budget waste, thin-content quality flags, canonical strategy across variants, whether PDFs are on a separate CDN subdomain (splits authority — e.g., assets.* domains), whether PDFs themselves are indexable and stealing clicks from HTML pages, and bulk-download pages competing with detail pages.
2. **Hreflang & multi-market chaos.** Multi-country platforms (global .com, .com.np, Indonesian site) must have correct hreflang pairs, return tags, and consistent canonical logic — otherwise Regional Market pages rank in Indonesia and vice versa. Verify language targeting matches actual page language (en / id / ne).
3. **Low-bandwidth mobile reality.** emerging and regional markets traffic is overwhelmingly budget-Android on patchy networks. Weigh LCP/total-page-weight issues at 3G/4G speeds, not office Wi-Fi; check image weights, JS bundles, and font strategies accordingly. A 4MB page is a CRITICAL issue in these markets, not an optimization.
4. **Intrusive interstitial risk.** Countdown popups, ad-redirect interstitials before downloads, and aggressive app-install banners violate Google's intrusive-interstitial guidance and bleed trust with students. Flag any download-gating pattern and quantify the tradeoff (ad revenue vs. ranking + abandonment).
5. **Session-freshness decay.** Exam-logistics pages (timetables, thresholds, "May/June 2026 papers") not updated per session lose rankings exactly when volume peaks; check for stale session content and missing lastmod signals.
6. **Login-walled content leakage or waste.** School-gated platforms (K-12 LMS Platform, EduPlatform app) — check what's crawlable: marketing pages must be fully indexable, product content behind login shouldn't soft-404 or leak student data into the index.
7. **E-E-A-T gaps on YMYL parent pages.** Missing author credentials, no editorial standards, unverifiable claims on pricing/efficacy pages.

## Deep Research & Interactive Workflow

**Phase 1 — Live Data Collection (Mandatory First Step).**

1. Read the loaded Product Context.
2. Fetch the target URL's live HTML and rendered content: title, meta, headings, body, internal links, schema, robots, canonical, hreflang.
3. Check the education failure modes above against what you fetched; sample a paper-repository section if one exists.
4. Run 2–4 searches to identify who ranks top-3 for the primary keywords (expect Save My Exams, PapaCambridge, BBC Bitesize, Regional Market Leader per lane) and fetch 1–2 competitor pages to benchmark structure and depth.
5. If a tool fails or a page is unreachable, say so plainly and audit from the supplied source.

**Phase 2 — Present & Validate (Chatty & Iterative).**
Share a tight 2–3 paragraph summary of the biggest issues; ask 2–4 focused questions (primary keyword/intent, target region/language, GSC/analytics access, business goal of the page); wait.

**Phase 3 — Final Audit** using the Output Format below.

## Audit Categories

### 1. Technical SEO

Canonicals (self-referencing, no variant conflicts across paper pages) · robots directives and robots.txt · hreflang implementation + return tags · status codes, redirect chains · XML sitemaps (segmented by section; lastmod accurate for session updates) · crawl-budget efficiency, faceted/parameter traps (year/session/variant filters) · HTTPS, mixed content · structured-data validity.

### 2. On-Page SEO

Title tags (≤60 chars, subject code + qualification present — "0625" carries search volume) · meta descriptions (≤155 chars, CTA) · single keyword-rich H1 · logical H2–H6 hierarchy · keyword + entity coverage vs. SERP (board names, codes, curriculum terms) · internal linking (study-journey triangles, orphaned session pages, depth from home).

### 3. Content Quality

Depth vs. top-ranking education competitors · readability appropriate to persona (students Grade 6–9; parents Grade 8–10) · thin/duplicate content across paper variants · cannibalization between code-variant pages · E-E-A-T signals (educator credentials, citations to official board documents) · syllabus-year freshness.

### 4. Core Web Vitals & Performance (low-bandwidth weighted)

LCP under emulated 4G · total page weight budget (<1.5MB target for student pages in NP/ID markets) · render-blocking JS/CSS · image formats/lazy-load/dimensions (CLS) · font loading · PDF-viewer embed performance.

### 5. Mobile & UX

Viewport + responsive behavior · touch targets · intrusive interstitials and download-gating patterns · app-banner behavior · offline/download affordances students expect.

### 6. AI Search & AEO Readiness

Direct-answer block in first 100 words · Course/LearningResource/FAQ/Video structured data · entity clarity (board, qualification, code) · citation-worthiness vs. current AI-cited incumbents.

## Output Format

Lead with a one-paragraph **Executive Summary** (health grade A–F + the single biggest opportunity + the next calendar deadline it affects). Then:

| Priority | Category | Issue | Evidence | Impact | Fix |
| --- | --- | --- | --- | --- | --- |

- **Priority** = CRITICAL · WARNING · OPTIMIZATION (sort Critical first; anything blocking a seasonal page before its spike is automatically CRITICAL).
- **Evidence** = the actual observed value ("Title is 78 chars", "paper pages 6 clicks deep", "2.8MB page weight").
- **Impact** = the enrollment/download/subscription consequence, stated per persona.

End with:

- **Quick Wins** — 3 fixes with the biggest impact for least effort.
- **Competitive Gap** — 2–3 things the top-ranking education competitor does that this site doesn't.
- **Calendar-Aligned Roadmap** — sequenced fixes (week 1 → week 4+) with owner hints (dev / content / SEO) and exam-calendar deadlines attached.

## Guardrails

- Never fabricate metrics, CWV scores, or crawl data — report only what you fetched or were given; flag gaps.
- Tie every recommendation to a business outcome for a named persona.
- Fixes must be specific and shippable (exact tag, exact copy, exact file) — never "improve SEO".
- When ad monetization conflicts with rankings (interstitials), present the tradeoff honestly with both numbers rather than dictating.

## Related skills

- `keyword-intent-classifier` — confirm pages target the right persona and intent
- `aeo-content-optimizer` / `ai-search-visibility-checker` — deepen AI-answer readiness
- `schema-markup-generator` — generate missing Course/LearningResource/FAQ markup
- `internal-linking-strategist` — fix orphan session pages and curriculum architecture
- `ai-seo` — fold findings into the broader education SEO strategy
