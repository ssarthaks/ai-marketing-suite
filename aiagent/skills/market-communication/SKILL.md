---
name: market-communication
description: "Build a comprehensive market communication strategy: messaging architecture, stakeholder message maps, PR strategy, crisis communication protocol, and channel-specific communication plans. Trigger on 'communication strategy', 'messaging framework', 'stakeholder communication', 'message map', 'PR strategy', 'press release', 'media relations', 'brand communication', or 'public relations'."
metadata:
  version: 4.0.0
  category: Messaging
---

# Market Communication Strategy


## Deep Research & Interactive Workflow

**Phase 1: Deep Web Research (Mandatory First Step)**
Before building any communication strategy, conduct thorough research on the brand, its market, and communication benchmarks.

1. Read the loaded Product Context to understand the brand, product, audience, and existing positioning.
2. Start with one narrow `search` query and expand only when its snippets leave a material evidence gap. Potential evidence dimensions are:
   - How competitors in the same category communicate (tone, key messages, proof points, channel presence)
   - Brand communication best practices in the EdTech / education sector
   - Press coverage and media mentions of the product or similar products
   - What audiences are saying about the brand (Reddit, social, app store reviews)
   - Communication case studies from category-adjacent brands that have communicated a similar transformation effectively
   - Regulatory considerations for marketing claims in the education sector
3. Use `search` for competitor communications, press releases, and industry communication benchmarks.
4. Use `extract` for messaging language from a specific page section.
5. Use `redditSearch` only when raw audience language is necessary.
6. Reserve `reader` for a whole article or document argument.

**Phase 2: Present & Validate (Chatty & Iterative)**

1. Synthesize findings into a 2–3 paragraph brief: how competitors communicate, what language audiences use, initial hypothesis for the core message, and key gaps in current communication.
2. Ask 2–4 focused questions:
   - Who are the 3–4 most important stakeholders to communicate with? (students, parents, schools, investors, media, government)
   - Is there a specific communication challenge driving this request? (product launch, crisis, rebrand, new market)
   - What does the brand currently stand for in the market — is this accurate or in need of repositioning?
   - Are there any messages or claims that must be avoided (regulatory, competitive, internal political)?
3. Wait for the user's response. Do NOT generate the full strategy yet.

**Phase 3: Final Output Generation**
Only after user validation, compile the full Market Communication Strategy using the template below.

---

## Communication Frameworks

### StoryBrand 7-Part Framework (SB7)

Donald Miller's framework for clarifying brand communication around the customer's story:

1. **A Character (The Hero):** [The Customer] wants something — always the student/parent/school, never the brand.
2. **Has a Problem:** External (exam stress), Internal (feeling unprepared), Philosophical (students deserve better tools).
3. **Meets a Guide:** The brand plays the Mentor/Guide role — never the hero. Position with Empathy + Authority.
4. **Who Gives Them a Plan:** A clear 3-step process the customer follows. Simple. Actionable.
5. **That Calls Them to Action:** A direct CTA (start free, get demo, download).
6. **That Helps Them Avoid Failure:** What is at stake if they do NOT act? (fail exams, fall behind).
7. **That Results in Success:** The transformation — the student they become after using the product.

### Message Map Architecture

```
CORE MESSAGE (1 sentence — the single promise)
        │
        ├── PILLAR 1: [Rational benefit / functional proof]
        │       └── Proof point A
        │       └── Proof point B
        │
        ├── PILLAR 2: [Emotional benefit / identity transformation]
        │       └── Proof point A
        │       └── Proof point B
        │
        └── PILLAR 3: [Social/community benefit]
                └── Proof point A
                └── Proof point B
```

Every piece of communication — ad, press release, school pitch, parent email — must be traceable back to one of these three pillars.

### Stakeholder Communication Matrix

| Stakeholder   | Their Core Concern               | Message Theme                                 | Tone                        | Best Format                           | Best Channel                     |
| ------------- | -------------------------------- | --------------------------------------------- | --------------------------- | ------------------------------------- | -------------------------------- |
| Students      | Exam success, peer validation    | "You can do this"                             | Energizing, peer-to-peer    | Short video, meme, challenge          | TikTok, Instagram, YouTube       |
| Parents       | Child's future, value for money  | "Invest in their best result"                 | Reassuring, outcome-focused | Long-form testimonial, data           | Facebook, WhatsApp, Email        |
| Teachers      | Reduce workload, better outcomes | "Built for how teachers teach"                | Respectful, professional    | Tutorial, resource pack               | Email, LinkedIn, Facebook Groups |
| School Admins | Institutional performance, ROI   | "Proven results, measurable impact"           | Evidence-based, ROI-led     | Case study, proposal                  | Email, Deck, In-person meeting   |
| Investors     | Growth, market opportunity       | "Leading the EdTech wave in [region]"         | Confident, data-heavy       | Report, pitch deck                    | Email, Investor meeting          |
| Media         | Story angle, uniqueness          | "The brand changing education in [region]"    | Newsworthy, narrative-led   | Press release, spokesperson interview | Email to journalists, press room |
| Government    | Policy alignment, compliance     | "Aligned to [curriculum] — measurable impact" | Formal, evidence-led        | White paper, MOU proposal             | Official channel, in-person      |

### PESO Communication Channels Model

Organize channel strategy across four types:

- **Paid:** Sponsored content, digital ads, influencer paid partnerships
- **Earned:** Press coverage, organic influencer mentions, word-of-mouth, reviews
- **Shared:** Social media posts, community-driven content, UGC campaigns
- **Owned:** Website, blog, email newsletter, app notifications, press room

### Crisis Communication Protocol (DEARE Framework)

When negative news, errors, or criticism emerge:

1. **D — Detect:** Monitor mentions, identify the issue early (set up Google Alerts, social listening)
2. **E — Evaluate:** Assess severity (contained vs. viral), identify the root cause
3. **A — Acknowledge:** Respond publicly within 1–2 hours with an acknowledgment (not a full statement yet)
4. **R — Respond:** Issue formal response via owned channels + proactive outreach to affected parties
5. **E — Evolve:** Post-crisis review; update communication protocols; publish transparency report if warranted

### Education-Specific Crisis Types (pre-draft holding statements for each)

| Crisis | Why it's different in education | First-hour priority |
| --- | --- | --- |
| **Student-data incident** | Children's data = maximum regulatory + emotional severity (COPPA/AADC/PDPA/PDP); schools are co-custodians | Notify affected schools/parents directly BEFORE public statement; regulator clock may be ticking |
| **Content/curriculum error** | A wrong answer teaches thousands of students the wrong thing | Correct in-product first, then transparent notice with the fix; never quietly patch |
| **Exam-season outage** | Downtime during revision peak is existential trust damage | Status page + student-facing apology with offline alternatives (downloadable papers), goodwill extension |
| **Inappropriate content/moderation failure** | Parents' trust in child safety is the brand's foundation | Remove, document, notify schools; explain the safeguard fix |
| **Efficacy-claim challenge** (press/regulator questions results claims) | Education claims face YMYL-level scrutiny | Publish the evidence base or retract the claim — never argue without data |

### Education PR Moments Calendar (owned, recurring)

Results days (student success stories with consent, thresholds analysis for press), back-to-school (adoption/expansion announcements), teacher days (recognition campaigns), education fairs and ministry events, efficacy-study releases, and partnership signings (publisher/OEM/school-network). Pre-plan these annually — education press runs on this calendar too.

---

## Intake Questions

Ask these BEFORE generating the strategy:

1. What is driving this communication request? (product launch, new market entry, rebrand, specific audience gap, PR campaign, or crisis)
2. Who are the 3 most important stakeholder groups to reach with priority communication?
3. What is the ONE thing you want every audience to know or believe about the brand after reading/watching/hearing a communication?
4. What has been said (or misstated) about the brand in the past that this strategy needs to correct or reinforce?
5. Are there any messages, claims, or topics that are off-limits?

---

## Output Format

### Market Communication Strategy: [Brand/Product] — [Date]

---

#### 1. Core Brand Narrative (StoryBrand)

**The Hero:** [Customer — who they are, what they want]
**The Problem:**

- External: [Practical barrier]
- Internal: [Emotional state]
- Philosophical: [What ought to be true]

**The Guide (the Brand):** [Brand as empathetic, authoritative mentor]

- Empathy statement: [1 sentence]
- Authority proof: [1–2 evidence points]

**The Plan (3 Steps):** [Simple, clear steps the customer takes]

1. [Step 1]
2. [Step 2]
3. [Step 3]

**The CTA:** [Primary CTA] / [Transitional CTA]

**Failure Stakes:** [What happens if they don't act]

**Success Vision:** [The transformation after using the product]

---

#### 2. Core Message & Message Map

**CORE MESSAGE:**

> [One sentence. Brand-level promise. Clear, differentiated, memorable.]

**PILLAR 1 — [Functional Benefit]**
Supporting messages:

- [Message A]
- [Message B]
  Proof points: [Data, features, testimonials]

**PILLAR 2 — [Emotional Benefit]**
Supporting messages:

- [Message A]
- [Message B]
  Proof points: [Stories, case studies, outcomes]

**PILLAR 3 — [Social/Community Benefit]**
Supporting messages:

- [Message A]
  Proof points: [Community size, school partnerships, testimonials]

---

#### 3. Audience-Specific Message Sheets

For each primary stakeholder (repeat per audience):

**Audience: [Stakeholder Name]**

| Element                        | Content |
| ------------------------------ | ------- |
| Primary concern                |         |
| Core message for this audience |         |
| Tone and voice                 |         |
| Key proof point                |         |
| CTA                            |         |
| What NOT to say                |         |

---

#### 4. PESO Channel Strategy

| Channel Type | Specific Channel      | Frequency       | Content Format   | Primary Audience   | KPI                   |
| ------------ | --------------------- | --------------- | ---------------- | ------------------ | --------------------- |
| Paid         | Facebook Ads          | Ongoing         | Video / Carousel | Parents            | CPC, Leads            |
| Paid         | TikTok Ads            | Campaign bursts | 15–30s video     | Students           | CPM, CTR              |
| Earned       | Local education media | Monthly         | Press release    | All                | Coverage volume       |
| Earned       | Teacher influencers   | Ongoing         | Organic review   | Teachers           | Reach, engagement     |
| Shared       | Facebook page         | 3×/week         | Mixed content    | Parents / Teachers | Engagement rate       |
| Shared       | TikTok account        | Daily           | Study tips       | Students           | Followers, views      |
| Owned        | Email newsletter      | Weekly          | Digest           | Parents            | Open rate, click rate |
| Owned        | Blog / SEO            | 2–4×/month      | Long-form        | All                | Organic traffic       |
| Owned        | App notifications     | As triggered    | Short alerts     | Students           | Push CTR              |

---

#### 5. PR & Media Relations Plan

**Target Media:**

| Publication / Channel | Audience | Story Angle | Contact Approach |
| --------------------- | -------- | ----------- | ---------------- |
| [Name]                |          |             |                  |

**Press Release Calendar:**

| Date | Story                       | Hook | Embargo? |
| ---- | --------------------------- | ---- | -------- |
|      | Product launch              |      |          |
|      | Partnership announcement    |      |          |
|      | Impact data / outcome story |      |          |

**Spokesperson Guidelines:**

- Primary: [Name / Role]
- Key talking points: [3 bullets]
- Off-limits topics: [List]

---

#### 6. Crisis Communication Protocol

**Tier Classification:**

| Tier       | Definition                                          | Response Time | Escalation  |
| ---------- | --------------------------------------------------- | ------------- | ----------- |
| 1 — Low    | Single negative review or comment                   | 24 hours      | Social team |
| 2 — Medium | Viral post, media enquiry, data concern             | 4 hours       | Comms lead  |
| 3 — High   | Media coverage, regulatory inquiry, public backlash | 1 hour        | CEO + Legal |

**Default Response Templates:**

- **Acknowledgment (< 2 hours):** "We've seen [issue] and are looking into it immediately. We'll have a full update within [X] hours."
- **Full Response (< 24 hours for Tier 1–2):** [See Response Framework]

---

#### 7. 90-Day Communication Calendar

| Week | Activity                        | Channel  | Audience           | KPI         |
| ---- | ------------------------------- | -------- | ------------------ | ----------- |
| 1    | Core message alignment workshop | Internal | Team               | Alignment   |
| 2    | Updated website copy live       | Owned    | All                | Bounce rate |
| 3    | First PR pitch sent             | Earned   | Media              | Coverage    |
| 4    | Social content calendar live    | Shared   | Students / Parents | Engagement  |
| …    | …                               | …        | …                  | …           |

---

## Self-Evaluation Criteria (Evals)

Before submitting the strategy, verify:

- **[ ] Core message is singular:** There is ONE core message, not five competing taglines.
- **[ ] StoryBrand completed:** The customer is the hero; the brand is the guide — not the other way round.
- **[ ] Stakeholder specificity:** Every audience has a tailored message sheet with distinct tone, proof point, and CTA.
- **[ ] PESO coverage:** All four channel types are represented with a clear role for each.
- **[ ] Crisis tier defined:** Three clear escalation tiers exist with time-bound response windows.
- **[ ] Message map traceable:** Every audience message can be traced back to one of the three pillars.
- **[ ] No off-limits violations:** The strategy avoids any flagged topics or claims.

---

## Related Skills

- **`brand-strategy`** — Define the brand archetype and voice that underpins all communication
- **`brand-positioning`** — Establish the positioning statement before building message map
- **`creative-copylines`** — Execute the core message into taglines, copy frameworks, and ad copy
- **`product-marketing`** — Integrate communication strategy into launch and persona messaging
- **`ad-creative`** — Translate the stakeholder message sheets into ad creative
- **`marketing-plan`** — Embed communication cadence into the broader marketing roadmap

## References

- **[Communication Frameworks Reference](references/communication-frameworks.md)**: StoryBrand SB7 deep-dive, Message Map templates, PESO model application guide.
- _Building a StoryBrand_ by Donald Miller — SB7 Framework
- _Made to Stick_ by Chip & Dan Heath — Sticky message design
- _Spin Sucks_ by Gini Dietrich — PESO model for modern communications
