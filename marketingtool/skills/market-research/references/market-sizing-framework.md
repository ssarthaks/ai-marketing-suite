# Market Sizing Frameworks (TAM / SAM / SOM)

Reference methodology for sizing markets credibly. Always present **both** a top-down and a bottom-up estimate, then reconcile. Use the anonymized placeholders (`[Target Region]`, `[Our Product]`, `[Local Exam]`) — the real values come from the loaded `.agents/<productname>/product.md` context.

---

## The Three Layers

| Layer                                    | Definition                                                                                  | Question it answers                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **TAM** — Total Addressable Market       | Total revenue if you captured 100% of the market with no competition or constraints         | "How big could this ever be?"                    |
| **SAM** — Serviceable Addressable Market | The slice of TAM you can reach given geography, language, product scope, and channels today | "How big is the market we can actually sell to?" |
| **SOM** — Serviceable Obtainable Market  | The realistic share you can win in 12–36 months given resources, brand, and competition     | "How much can we realistically capture soon?"    |

---

## Method 1 — Top-Down (industry → your slice)

Start from a published industry figure and filter down with defensible percentages.

```
TAM  = Published industry revenue for the category (cite the analyst/report)
SAM  = TAM × % addressable by geography × % addressable by segment/product fit
SOM  = SAM × realistic market-share % (benchmark against incumbents' share)
```

**Strengths:** fast, anchored to credible sources.
**Weakness:** percentages can be hand-wavy — always state the assumption behind each filter.

**Sources for the anchor figure:** government statistics offices, analyst reports (HolonIQ for EdTech, Statista, IDC, Gartner), trade associations, central-bank digital-payment reports, census/enrollment data (for EdTech: ministry of education, exam boards, EMIS-type systems).

---

## Method 2 — Bottom-Up (unit economics → total)

Build the number from the smallest real unit upward. This is the more defensible method for investors.

```
SOM (annual) = (# addressable customers in reach)
             × (realistic conversion / penetration %)
             × (average revenue per user per year)
```

Example skeleton for an EdTech product:

```
Addressable students in [Target Region] for [Local Exam] grades
  × % with a smartphone + affordable data
  × % whose families pay for supplementary learning
  = Reachable paying base
Reachable paying base × realistic year-1 penetration × annual subscription price = SOM
```

**Strengths:** grounded in verifiable inputs (device penetration, prices, enrollment).
**Weakness:** sensitive to each assumption — show a low/base/high range.

---

## Reconciliation

If top-down and bottom-up diverge by more than ~2–3×, the model is unreliable. Investigate which assumption is off (usually the share % top-down or the penetration % bottom-up), and present a reconciled range rather than a single false-precision figure.

| Metric | Top-Down | Bottom-Up | Reconciled |
| ------ | -------- | --------- | ---------- |
| TAM    |          | —         |            |
| SAM    |          |           |            |
| SOM    |          |           |            |

---

## Growth & Timing

- **CAGR** — cite the category growth rate; note whether your segment grows faster/slower than the category.
- **Inflection signals** — policy changes, device/connectivity adoption curves, exam-cycle seasonality, new funding into the category.

---

## Common Pitfalls (avoid these)

1. **"1% of a huge market"** reasoning — investors discount it instantly. Justify share bottom-up.
2. **Confusing users with payers** — size the _paying_ base, then note free-to-paid potential.
3. **Stale or global data applied locally** — always localize to `[Target Region]`; global averages mislead.
4. **No sources** — every figure must cite a source or show its derivation.
5. **Single-point estimates** — give low/base/high ranges to show you understand the uncertainty.

---

## Output Checklist

- [ ] TAM, SAM, SOM each have a number, a method, and a source/derivation
- [ ] Both top-down and bottom-up presented and reconciled
- [ ] SOM is defended with real penetration/conversion assumptions
- [ ] CAGR and timing signals included
- [ ] Ranges (low/base/high) shown for the key figure
- [ ] All localized to the requested geography — no generic global data
