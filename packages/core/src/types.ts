export type Pillar =
  | 'dignity_rights'
  | 'poverty'
  | 'food_nutrition'
  | 'water_sanitation'
  | 'health'
  | 'education'
  | 'child_protection'
  | 'institutions_peace';

export type Observation = {
  indicatorCode: string;
  pillar: Pillar;
  iso3: string;
  year: number;
  value: number;
  unit: string;
  sourceOrganization: string;
  sourceDocumentTitle: string;
  sourceUrl: string;
  lastUpdated: string;
  isModeled?: boolean;
};

export type Citation = {
  sourceOrganization: string;
  sourceDocumentTitle: string;
  sourceUrl: string;
  quote?: string;
  locator?: string;
  lastUpdated: string;
};

export type ScoreExplanation = {
  pillar: Pillar;
  pillarScore: number;
  weight: number;
  formula: string;
  confidenceNotes: string;
  citations: Citation[];
};
