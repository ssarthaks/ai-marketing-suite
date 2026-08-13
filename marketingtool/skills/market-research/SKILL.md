---
name: market-research
description: "Conduct comprehensive market research to size a market, understand consumer behavior, map competitive dynamics, and surface actionable opportunities. Trigger on prompts like 'do market research', 'how big is the market', 'market analysis', 'TAM SAM SOM', 'market landscape', or 'market opportunity'."
metadata:
  version: 4.0.0
  category: Research
---

# Market Research


## Education Market Data Sources (use these BEFORE generic industry reports)

Education markets have authoritative public data most researchers never touch. Pull from these first:

| Source | What it gives you |
| --- | --- |
| UNESCO Institute for Statistics (UIS) | Enrollment by level/country, out-of-school rates, teacher counts |
| World Bank EdStats / Open Data | Education spend as %GDP, private-school enrollment share, internet penetration |
| HolonIQ | EdTech market sizing, funding flows, regional forecasts (cite year + scope) |
| National EMIS: Regional Market Ministry Educational Census Reports | Schools, students, teachers per district/grade in regional markets — the bottom-up sizing backbone |
| Indonesia Kemendikbud / Dapodik statistics + BPS | School and student counts by province/jenjang (SD/SMP/SMA/SMK), private vs negeri split |
| UK DfE statistics + Ofqual/JCQ | GCSE/A-Level entries by subject and board — sizes Exam Revision App's exact market |
| Cambridge International school directory | Count of Cambridge schools per country — direct SAM proxy for Cambridge Assessment products |
| GSMA / DataReportal | Smartphone + connectivity penetration (device access gates the SAM in NP/ID) |
| App Annie/data.ai, Google Play stats | Competitor installs and engagement as demand signals |

**Education-specific sizing methodology:**

- **B2C bottom-up:** students in target grades × % in addressable school types × % with device/connectivity × realistic paid-conversion % × ARPU (local willingness-to-pay, not Western benchmarks). Parent willingness-to-pay benchmarks: compare against local private-tuition spend (the real substitute budget line), not software prices.
- **B2B bottom-up:** number of addressable schools × avg students/school × per-student annual license × realistic penetration ramp (school sales cycles are 6–18 months; ministries longer).
- **Segment the enrollment pyramid:** exam grades (Board Exams, IGCSE, A-Level, Grade 12) monetize 3–5× better than lower grades — size them separately.
- **Count the shadow-education market:** private tuition/bimbel/coaching-center spend is the truest measure of willingness-to-pay for exam outcomes; cite it whenever available.

**Education-specific substitutes to weigh in Five Forces:** free YouTube teachers, tuition/coaching centers, past-paper piracy networks (Telegram/Facebook groups), peer WhatsApp groups, and increasingly **ChatGPT/Gemini as a free tutor** — the newest and fastest-growing substitute; always assess it explicitly.

## Deep Research & Interactive Workflow

**Phase 1: Deep Web Research (Mandatory First Step)**
Before answering any market questions, you MUST use your web search and scraping tools to gather live data. Do NOT rely on training knowledge alone.

1. Read the loaded Product Context to anchor the research in the user's actual product and geography.
2. Start with one narrow `search` query and expand only when its snippets leave a material evidence gap. Potential evidence dimensions are:
   - Market size data (industry reports, analyst estimates, government statistics)
   - Consumer behavior and demand signals (Reddit threads, community forums, search trends)
   - Competitive landscape (who is selling what, at what price, to whom)
   - Regulatory or structural market factors (licensing, barriers to entry, compliance requirements)
   - Macro trends (PESTEL signals: technology shifts, demographic changes, policy environment)
3. Use `extract` for a requested field or section from key reports; reserve `reader` for a whole-page argument.
4. Use `redditSearch` only when consumer or practitioner sentiment is necessary.
5. If the user provides URLs, call `extract` or `reader` only when their contents are needed to answer the request.

**Phase 2: Present & Validate (Chatty & Iterative)**

1. Synthesize findings into a concise 2–3 paragraph briefing covering: estimated market size, dominant segments, key players, and one or two surprising signals.
2. Ask 2–4 focused clarifying questions before producing the full report. Examples:
   - Which specific geography or segment is the priority?
   - Is this research for a new product launch, investor deck, or internal strategy?
   - What is the core hypothesis you want validated or challenged?
   - Are there specific competitors or alternative solutions you want profiled?
3. Wait for the user's response. Do NOT generate the full report yet.

**Phase 3: Final Output Generation**
Only after user validation, compile the full Market Research Report using the template below. Every data point must be sourced from Phase 1 research — no fabricated figures.

---

## Market Research Frameworks

Apply the following frameworks in your analysis:

### TAM / SAM / SOM Sizing

- **TAM (Total Addressable Market):** The full global or national revenue opportunity if 100% market share were achieved.
- **SAM (Serviceable Addressable Market):** The slice of TAM your product can realistically serve given geography, pricing, and product scope.
- **SOM (Serviceable Obtainable Market):** The realistic near-term share you can capture in 12–36 months given current resources and competition.
- Use both **top-down** (industry report → % share) and **bottom-up** (unit × price × addressable customers) approaches. Present both; reconcile if they diverge.

### PESTEL Analysis

Evaluate macro forces shaping the market:

- **Political:** Regulations, government EdTech/digital policies, subsidies, trade barriers
- **Economic:** GDP growth, disposable income, currency risk, internet/mobile penetration costs
- **Social:** Demographics, urbanization, education attainment, digital literacy, cultural attitudes
- **Technological:** Device penetration, 5G/connectivity, AI adoption, platform shifts
- **Environmental:** Sustainability mandates, ESG considerations
- **Legal:** Data privacy laws (PDPA, GDPR equivalents), consumer protection, IP

### Porter's Five Forces

Assess competitive intensity:

1. **Threat of New Entrants:** Capital requirements, brand moats, switching costs, regulations
2. **Bargaining Power of Suppliers:** Content creators, technology vendors, payment processors
3. **Bargaining Power of Buyers:** Price sensitivity, availability of free alternatives, brand loyalty
4. **Threat of Substitutes:** Free YouTube, tuition centers, peer learning, piracy
5. **Competitive Rivalry:** Number and strength of direct competitors, differentiation, price wars

### Jobs-to-be-Done (JTBD)

Frame consumer demand as functional, emotional, and social jobs:

- **Functional Job:** What task are they trying to accomplish? (e.g., "pass my A-Level exams")
- **Emotional Job:** How do they want to feel? (e.g., "confident, not anxious")
- **Social Job:** How do they want to be perceived? (e.g., "top student in class")
  Use this to identify underserved jobs that existing solutions fail to address.

### Consumer Segmentation (education-specific lenses)

Identify 3–4 distinct market segments using education-native dimensions:

- **School type:** private English-medium / government-public / international / religious / homeschool — each has different budgets, decision-makers, and curricula
- **Grade band & exam proximity:** exam-year students (Board Exams, IGCSE, A-Level, Grade 12) vs. lower grades — spend concentrates violently in exam years
- **Payer profile:** aspirational middle-class parents (largest ARPU pool in NP/ID), expat/international families, fee-stressed households, school budget holders
- **Geography tier:** capital metro vs. secondary cities vs. rural (device access, English proficiency, and payment methods diverge sharply)
- Psychographics (exam anxiety level, aspiration targets — foreign university, government exams), media habits (TikTok/YouTube for students, Facebook for parents in SE Asia), and willingness to pay benchmarked against local tuition-center spend

---

## Intake Questions

Ask these BEFORE generating the full report:

1. What is the specific market or sub-market you want researched? (e.g., "K-12 EdTech in emerging markets", "online tutoring in Southeast Asia")
2. What decision is this research informing? (product launch, investment, partnerships, marketing strategy)
3. Which geography is the priority focus? (country, city tier, urban vs rural)
4. Do you have any specific hypotheses or beliefs about this market you want us to validate or challenge?
5. Are there specific competitors or category players you definitely want included?

---

## Output Format

### Market Research Report: [Market Name] — [Geography] — [Date]

---

#### 1. Executive Summary

- **Market Verdict:** [1-sentence opportunity statement]
- **Market Size:** TAM / SAM / SOM with methodology note
- **Key Opportunity:** Top 1–2 white-space insights
- **Primary Risk:** Top 1–2 structural risks
- **Recommended Next Step:** What to do with this research

---

#### 2. Market Sizing (TAM / SAM / SOM)

| Metric | Estimate | Methodology                                 | Source    |
| ------ | -------- | ------------------------------------------- | --------- |
| TAM    | $X       | Top-down: [industry report × %]             | [Source]  |
| SAM    | $X       | Geography + product fit filter              | [Derived] |
| SOM    | $X       | Bottom-up: [unit × price × realistic reach] | [Derived] |
| CAGR   | X%       | Market growth rate                          | [Source]  |

**Methodology Notes:** [Brief explanation of assumptions and caveats]

---

#### 3. Market Segmentation

| Segment     | Size Estimate | Key Characteristics | Underserved Needs | Priority     |
| ----------- | ------------- | ------------------- | ----------------- | ------------ |
| [Segment 1] |               |                     |                   | High/Med/Low |
| [Segment 2] |               |                     |                   |              |
| [Segment 3] |               |                     |                   |              |

---

#### 4. Consumer Behavior & JTBD

**Top 3 Jobs-to-be-Done:**

1. **Functional:** [Job] → Current solution: [X] → Gap: [Y]
2. **Emotional:** [Job] → Current solution: [X] → Gap: [Y]
3. **Social:** [Job] → Current solution: [X] → Gap: [Y]

**Key Consumer Insights from Research:**

- [Insight 1 with evidence]
- [Insight 2 with evidence]
- [Insight 3 with evidence]

---

#### 5. PESTEL Overview

| Factor        | Key Signal | Impact Level | Implication |
| ------------- | ---------- | ------------ | ----------- |
| Political     |            | High/Med/Low |             |
| Economic      |            |              |             |
| Social        |            |              |             |
| Technological |            |              |             |
| Environmental |            |              |             |
| Legal         |            |              |             |

---

#### 6. Competitive Landscape (Porter's Five Forces)

**Force Summary:**

| Force          | Intensity    | Key Drivers |
| -------------- | ------------ | ----------- |
| New Entrants   | High/Med/Low |             |
| Supplier Power |              |             |
| Buyer Power    |              |             |
| Substitutes    |              |             |
| Rivalry        |              |             |

**Top Competitors:**

| Competitor | Positioning | Price Point | Strengths | Weaknesses |
| ---------- | ----------- | ----------- | --------- | ---------- |
| [Name]     |             |             |           |            |

---

#### 7. Market Gaps & Opportunities

| Opportunity | Evidence          | Effort to Capture | Revenue Potential |
| ----------- | ----------------- | ----------------- | ----------------- |
| [Gap 1]     | [Researched data] | Low/Med/High      | Low/Med/High      |
| [Gap 2]     |                   |                   |                   |

---

#### 8. Strategic Recommendations

**If entering this market:**

1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

**Risks to Monitor:**

- [Risk 1]: Mitigation → [Action]
- [Risk 2]: Mitigation → [Action]

---

## Self-Evaluation Criteria (Evals)

Before submitting the report, verify:

- **[ ] Data-backed:** Every market size figure cites a source or explains its derivation methodology.
- **[ ] Specific geography:** Analysis is specific to the requested region, not generic global data.
- **[ ] JTBD framing:** At least 2 consumer jobs are identified with gap analysis.
- **[ ] Actionable gaps:** Opportunities section names specific, executable steps — not vague "white space."
- **[ ] Porter's depth:** Competitive rivalry section names actual competitors with evidence-backed claims.
- **[ ] No fabricated data:** All statistics were retrieved from research in Phase 1 — no training-data hallucination.

---

## Related Skills

- **`competitors-research`** — Deep competitor profiling beyond landscape overview
- **`market-entry`** — Turn research into an actionable entry plan
- **`product-marketing`** — Translate market insights into positioning and messaging
- **`marketing-plan`** — Build the full go-to-market strategy using this research as foundation
- **`edtech-marketing`** — If the market is in the education/EdTech space

## References

- **[Market Sizing Frameworks](references/market-sizing-framework.md)**: TAM/SAM/SOM calculation methodology, bottom-up and top-down approaches.
- _Competitive Strategy_ by Michael E. Porter — Porter's Five Forces
- _Competing Against Luck_ by Clayton Christensen — Jobs-to-be-Done theory
