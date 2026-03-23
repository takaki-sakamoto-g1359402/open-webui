import { Observation, Pillar, ScoreExplanation } from '../../core/src/types';

export const DEFAULT_WEIGHTS: Record<Pillar, number> = {
  child_protection: 0.2,
  poverty: 0.17,
  health: 0.15,
  water_sanitation: 0.13,
  education: 0.13,
  food_nutrition: 0.1,
  dignity_rights: 0.07,
  institutions_peace: 0.05,
};

const pillars = Object.keys(DEFAULT_WEIGHTS) as Pillar[];

export function normalizeTo100(value: number, min: number, max: number, direction: 'higher_better' | 'lower_better'): number {
  if (max <= min) return 0;
  const scaled = ((value - min) / (max - min)) * 100;
  const bounded = Math.max(0, Math.min(100, scaled));
  return direction === 'higher_better' ? bounded : 100 - bounded;
}

export function computeHeavenScore(observations: Observation[], weightOverrides?: Partial<Record<Pillar, number>>) {
  const weights = { ...DEFAULT_WEIGHTS, ...weightOverrides };
  const pillarScores: Partial<Record<Pillar, number>> = {};
  const explanations: ScoreExplanation[] = [];

  for (const pillar of pillars) {
    const subset = observations.filter((o) => o.pillar === pillar);
    if (!subset.length) continue;

    const avg = subset.reduce((sum, o) => sum + o.value, 0) / subset.length;
    pillarScores[pillar] = avg;

    explanations.push({
      pillar,
      pillarScore: avg,
      weight: weights[pillar],
      formula: 'pillar_score = mean(normalized_indicator_values)',
      confidenceNotes: subset.length < 2 ? 'Limited coverage in this pillar.' : 'Adequate indicator coverage.',
      citations: subset.map((s) => ({
        sourceOrganization: s.sourceOrganization,
        sourceDocumentTitle: s.sourceDocumentTitle,
        sourceUrl: s.sourceUrl,
        lastUpdated: s.lastUpdated,
      })),
    });
  }

  const weighted = explanations.reduce((acc, item) => acc + item.pillarScore * item.weight, 0);
  const coverage = explanations.length / pillars.length;
  const recency = observations.some((o) => new Date(o.lastUpdated).getFullYear() >= new Date().getFullYear() - 2) ? 1 : 0.7;
  const modeledShare = observations.length ? observations.filter((o) => o.isModeled).length / observations.length : 1;
  const agreement = 1 - Math.min(0.4, modeledShare * 0.4);
  const confidence = Number((coverage * recency * agreement).toFixed(3));

  return {
    score: Number(weighted.toFixed(2)),
    confidence,
    pillarScores,
    explanations,
  };
}
