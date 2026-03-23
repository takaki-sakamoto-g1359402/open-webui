# Heaven Score Methodology

## 1. Score Structure
Heaven Score is a weighted composite from 8 pillars, each normalized to 0–100:
- Dignity & equal rights
- Poverty alleviation
- Food & nutrition
- Water & sanitation
- Health coverage
- Education
- Child protection
- Peaceful/accountable institutions

## 2. Default Weights (Configurable)
Weights intentionally prioritize child safety, poverty, health, water, and education.

| Pillar | Weight | Justification |
|---|---:|---|
| Child protection | 0.20 | Irreversible harm from child labor/deprivation and intergenerational effects |
| Poverty | 0.17 | Extreme poverty drives multi-pillar deprivation |
| Health | 0.15 | Catastrophic spending and preventable mortality are core dignity failures |
| Water & sanitation | 0.13 | Foundational for health and human security |
| Education | 0.13 | Long-run mobility and capability floor |
| Food & nutrition | 0.10 | Immediate survival and developmental outcomes |
| Dignity & rights | 0.07 | Legal protections and rights implementation |
| Institutions & peace | 0.05 | Enables durable policy execution and accountability |

Total = 1.00.

## 3. Computation
1. Normalize each indicator into [0,100] with documented transform function.
2. Aggregate indicators into pillar score (weighted mean).
3. Aggregate pillars into Heaven Score.
4. Compute confidence independently from coverage, recency, source quality, and disagreement.

`final_score = Σ(pillar_score_i * pillar_weight_i)`

`confidence = coverage_factor * recency_factor * agreement_factor * source_quality_factor`

## 4. Missing Data
- Missing observation does **not** get fabricated.
- Pillar score uses available indicators only; confidence receives penalty.
- Confidence thresholds:
  - High: >= 0.80
  - Medium: 0.55–0.79
  - Low: < 0.55

## 5. Uncertainty & Classification
Each claim is tagged:
- **Observed fact**: directly from source.
- **Model estimate**: statistical/model-derived source value.
- **Normative judgment**: policy interpretation (never merged with facts).

## 6. Reproducibility Requirements
Every score explanation must persist:
- Source IDs and document URLs
- Indicator definitions
- Transformation formula names and parameters
- Methodology version hash
- Timestamp and actor/tool that generated output
