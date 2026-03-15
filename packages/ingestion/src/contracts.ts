export type SourceRecord = {
  organization: string;
  indicatorCode: string;
  indicatorName: string;
  pillar: string;
  iso3: string;
  geography: string;
  year: number;
  value: number;
  unit: string;
  sourceDocumentTitle: string;
  sourceUrl: string;
  lastUpdated: string;
};

export interface SourceAdapter {
  sourceId: string;
  organization: string;
  fetchLatest(): Promise<SourceRecord[]>;
}
