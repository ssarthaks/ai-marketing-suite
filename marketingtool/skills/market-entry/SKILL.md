---
name: market-entry
description: "Build a strategic market entry plan for expanding into a new geographic market or new customer segment. Trigger on prompts like 'market entry', 'enter a new market', 'expand to a new country', 'launch in a new region', 'geographic expansion', or 'new market strategy'."
metadata:
  version: 4.0.0
  category: Strategy
---

# Market Entry Plan


## Deep Research & Interactive Workflow

**Phase 1: Deep Web Research (Mandatory First Step)**
Before answering any entry strategy questions, you MUST research the target market thoroughly. Do NOT rely on training knowledge alone.

1. Read the loaded Product Context to understand the current product, existing markets, and business model.
2. Start with one narrow `search` query and expand only when its snippets leave a material evidence gap. Potential evidence dimensions are:
   - Market size and growth trajectory for the target geography/segment
   - Local regulatory and compliance requirements (business registration, data privacy, payment licensing)
   - Existing competitors already operating in the target market
   - Local consumer behavior and purchasing preferences
   - Successful and failed market entry case studies in the same category
   - Partnership and distribution channel landscape (local distributors, platforms, resellers)
   - Cultural and linguistic adaptation requirements
3. Use `extract` for a specific detail from government portals, competitor sites, or reports; reserve `reader` for a whole document argument.
4. Use `redditSearch` only when local community sentiment is necessary.
5. Stop researching once the material claims are supported.

**Phase 2: Present & Validate (Chatty & Iterative)**

1. Summarize key research findings in 2–3 concise paragraphs: market attractiveness, key barriers, top competitive threats, and an initial entry mode hypothesis.
2. Ask 2–4 focused questions before building the full plan:
   - What is the target country or segment, and why is it being prioritized now?
   - What is the intended entry mode — organic, partnership/channel, or acquisition?
   - What resources (budget, team, timeline) are available for this expansion?
   - Are there any existing relationships (partners, schools, distributors) in this market already?
3. Wait for the user's response. Do NOT generate the full plan yet.

**Phase 3: Final Output Generation**
Only after user validation, compile the full Market Entry Plan using the template below. Tie every recommendation to researched data.

---

## Education Market Entry Playbook (apply BEFORE the generic frameworks)

Education markets punish generic SaaS entry plans. Layer these rules onto everything below:

1. **Curriculum alignment IS the localization.** Translation is table stakes; the real work is mapping content to the national curriculum (Curriculum Board syllabus, National Standard Curriculum, Cambridge Assessment variants) and getting it validated by local educators. An unmapped product is unsellable to schools regardless of quality. Budget curriculum mapping as a first-class workstream with subject-matter reviewers.
2. **Enter on the academic calendar.** Schools adopt at year-start (Spring Enrollment Cycle/mid-April in spring cycles; July in Indonesia; September in UK/international). Miss the window and you wait a year. Work backwards: pilots must complete a full term before the buying season; teacher training must land before year-start.
3. **The proven portfolio entry modes** (use as precedents): **local-instance model** (Regional Learning Platform — local team, local curriculum, national mission framing), **publisher acquisition/partnership** (K-12 LMS Platform — Regional Publishing Partner brings distribution + content legitimacy), **OEM/device channel** (Acer for Education bundling), **free-content beachhead** (Exam Prep Platform → Online Learning Academy funnel), **direct B2C niche entry** (Exam Revision App into UK Edexcel sciences on founder credibility).
4. **Pilot → proof → rollout is the only school motion that works.** 3–10 pilot schools, a term of usage data, a written efficacy/engagement report, then reference-selling into the network. Principals buy what neighboring principals validate.
5. **Map the real decision web:** ministry/regulator (approval or goodwill), school owner/board (budget), principal (decision), teachers (adoption or silent veto), parents (fee tolerance if school passes cost through), students (usage). An entry plan must name its play for each layer.
6. **Teacher enablement is a launch cost, not an afterthought.** Training, onboarding materials in local language, and a support channel (WhatsApp/Viber groups are the norm in SE Asia) determine whether licenses turn into usage — and renewals.
7. **Regulatory diligence specific to education:** national curriculum-content approval requirements, student-data localization rules (Indonesia PDP Law), textbook/publisher regulations, foreign-ownership limits in education services, and payment-method realities (Digital Wallets (Mobile Money) in spring cycles; GoPay/OVO/DANA + bank transfer in Indonesia).
8. **Efficacy evidence travels across borders; brand doesn't.** Lead entry messaging with outcomes data and global-scale proof ("9,000+ schools in 51 countries"), then localize the emotional narrative to national education aspirations.

## Market Entry Frameworks

### Ansoff Matrix — Growth Vector Selection

Position the entry in the correct quadrant to confirm the strategic logic:

- **Market Development (existing product → new geography):** Most common for SaaS/EdTech expansion. Lowest product risk; execution risk is in localization and distribution.
- **Diversification (new product → new market):** Highest risk; usually avoid unless the market demands a distinct product variant.
- **Market Penetration (existing product → existing market):** Not an entry; this is growth within current territory.
- **Product Development (new product → existing market):** Adjacent innovation, not entry.

### CAGE Distance Framework

Assess how "far" the new market is from the home market across four dimensions:

- **Cultural distance:** Language, values, religion, social norms, education culture
- **Administrative distance:** Colonial ties, trade agreements, regulatory similarity, currency
- **Geographic distance:** Physical distance, logistics, time zones, infrastructure
- **Economic distance:** Income levels, price sensitivity, willingness to pay, payment infrastructure

### Market Entry Mode Selection

| Mode               | Best When                                       | Risk    | Speed   | Control |
| ------------------ | ----------------------------------------------- | ------- | ------- | ------- |
| Organic (direct)   | Strong brand signal, digital-first product      | Low–Med | Slow    | High    |
| Local Partnership  | Established distributor / school network exists | Low     | Fast    | Med     |
| Channel / Reseller | B2B product; schools/institutions as buyers     | Low     | Med     | Med     |
| Joint Venture      | Regulatory requirement; local brand critical    | Med     | Med     | Low     |
| Acquisition        | Need speed + local user base                    | High    | Fastest | High    |
| Licensing          | IP monetization without operational presence    | Low     | Fast    | Low     |

### Risk Matrix (Entry-Specific)

| Risk Category        | Examples                          | Probability | Impact | Mitigation |
| -------------------- | --------------------------------- | ----------- | ------ | ---------- |
| Regulatory           | Payment licensing, data residency |             |        |            |
| Competitive response | Price war, incumbent bundling     |             |        |            |
| Localization failure | Language, curriculum mismatch     |             |        |            |
| Distribution failure | Partner doesn't deliver           |             |        |            |
| Unit economics       | CAC too high for local pricing    |             |        |            |

---

## Intake Questions

Ask these BEFORE generating the full plan:

1. What is the target market — which country, region, or customer segment?
2. What is the core hypothesis for why this market will work? (e.g., "The target market has high exam anxiety and no quality digital prep")
3. What entry mode is preferred or already in consideration?
4. What budget and team headcount is available for the first 6 months?
5. Are there existing partnerships, pilot schools, or customer relationships in this market already?
6. What does "success" look like at the 6-month and 12-month marks?

---

## Output Format

### Market Entry Plan: [Product] → [Target Market] — [Date]

---

#### 1. Executive Summary

- **Target Market:** [Country/Segment]
- **Entry Mode Recommended:** [Mode + 1-line rationale]
- **Market Attractiveness Score:** [High/Med/Low] — [2-sentence justification]
- **Biggest Risk:** [Risk + mitigation]
- **Success Metric at 6 months:** [Specific KPI]
- **Success Metric at 12 months:** [Specific KPI]

---

#### 2. Market Attractiveness Assessment

| Dimension                  | Score (1–5) | Evidence       |
| -------------------------- | ----------- | -------------- |
| Market Size                |             | [Sourced data] |
| Growth Rate                |             |                |
| Competitive Intensity      |             |                |
| Regulatory Friendliness    |             |                |
| Cultural Fit               |             |                |
| Infrastructure Readiness   |             |                |
| **Overall Attractiveness** | **/5**      |                |

---

#### 3. CAGE Distance Analysis

| Dimension      | Distance     | Key Factors | Implication |
| -------------- | ------------ | ----------- | ----------- |
| Cultural       | Low/Med/High |             |             |
| Administrative |              |             |             |
| Geographic     |              |             |             |
| Economic       |              |             |             |

---

#### 4. Entry Mode Recommendation

**Recommended Mode:** [Mode]

**Rationale:** [2–3 sentences backed by research]

**Alternatives Considered:**

- [Mode B]: Rejected because [reason]
- [Mode C]: Rejected because [reason]

---

#### 5. Localization Requirements

| Area                   | Current State | Required Adaptation | Priority     | Owner |
| ---------------------- | ------------- | ------------------- | ------------ | ----- |
| Language / Translation |               |                     | High/Med/Low |       |
| Curriculum Alignment   |               |                     |              |       |
| Pricing & Currency     |               |                     |              |       |
| Payment Methods        |               |                     |              |       |
| Customer Support       |               |                     |              |       |
| Legal / Compliance     |               |                     |              |       |
| Brand / Creative       |               |                     |              |       |

---

#### 6. Competitive Landscape in Target Market

| Competitor | Entry Mode Used | Current Share | Positioning | Key Weakness |
| ---------- | --------------- | ------------- | ----------- | ------------ |
| [Name]     |                 |               |             |              |

**White-space identified:** [Where no strong incumbent exists]

---

#### 7. Partnership & Channel Strategy

| Partner Type       | Examples in Target Market | Value Delivered | Approach |
| ------------------ | ------------------------- | --------------- | -------- |
| School Networks    |                           |                 |          |
| Local Distributors |                           |                 |          |
| Influencers / KOLs |                           |                 |          |
| Government / NGO   |                           |                 |          |
| Media / PR         |                           |                 |          |

---

#### 8. Go-to-Market Phased Roadmap

**Phase 1 — Foundation (Month 1–2):**

- [ ] Regulatory and legal setup complete
- [ ] Localization: language, pricing, payment
- [ ] 3–5 pilot partners signed
- [ ] Landing page + support system live
- **Target metric:** [e.g., 50 beta users / 2 pilot schools]

**Phase 2 — Traction (Month 3–4):**

- [ ] Paid acquisition begins (small budget test)
- [ ] Partnership pipeline at [X] active deals
- [ ] First revenue milestone hit
- [ ] Customer feedback loop established
- **Target metric:** [e.g., 500 active users / $5k MRR]

**Phase 3 — Scale (Month 5–6):**

- [ ] Winning channels identified from Phase 2
- [ ] Budget scaled to top 1–2 channels
- [ ] Referral / word-of-mouth engine activated
- [ ] Expansion hiring if required
- **Target metric:** [e.g., 2,000 active users / $20k MRR]

---

#### 9. Budget Allocation (6-Month)

| Category                 | Budget Allocation | % of Total | Notes |
| ------------------------ | ----------------- | ---------- | ----- |
| Localization & Legal     |                   |            |       |
| Paid Acquisition         |                   |            |       |
| Partnership Development  |                   |            |       |
| Events / School Outreach |                   |            |       |
| Content & PR             |                   |            |       |
| Ops / Tooling            |                   |            |       |
| **Total**                |                   | 100%       |       |

---

#### 10. Risk Register

| Risk                     | Probability | Impact | Mitigation | Early Warning Signal |
| ------------------------ | ----------- | ------ | ---------- | -------------------- |
| Regulatory delay         | Med         | High   |            |                      |
| Localization misfire     | Low         | High   |            |                      |
| Incumbent price war      | Med         | Med    |            |                      |
| Partner underperformance | High        | Med    |            |                      |

---

## Self-Evaluation Criteria (Evals)

Before submitting the plan, verify:

- **[ ] Entry mode justified:** The recommended mode is backed by researched data, not guesswork.
- **[ ] CAGE assessed:** All four distance dimensions are addressed with specific evidence.
- **[ ] Localization checklist complete:** Language, pricing, payment, and legal covered.
- **[ ] Phase 1 is 30-day executable:** Month 1–2 tasks are specific enough for a team to action tomorrow.
- **[ ] Risk register is honest:** Risks are not downplayed; mitigations are actionable.
- **[ ] Competitor gap exists:** At least one clear white-space or competitive weakness is identified.
- **[ ] Metrics are specific:** KPIs are numeric and time-bound — no vague "grow user base" targets.

---

## Related Skills

- **`market-research`** — Conduct full market research before this entry plan if not already done
- **`competitors-research`** — Deep competitor profiling for the target market
- **`marketing-plan`** — Build the full marketing execution plan for the entry phase
- **`product-marketing`** — Define positioning and messaging for the new market
- **`edtech-marketing`** — If entering an education market, use this specialized skill

## References

- **[Market Entry Frameworks](references/market-entry-framework.md)**: Ansoff Matrix, CAGE Distance, Entry Mode decision tree
- _The New Business Road Test_ by John Mullins — Market attractiveness assessment
- _Playing to Win_ by Roger Martin & A.G. Lafley — Strategy cascade for market entry
