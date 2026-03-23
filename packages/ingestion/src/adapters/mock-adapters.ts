import { SourceAdapter, SourceRecord } from '../contracts';

const sharedCountry = { iso3: 'KEN', geography: 'Kenya', year: 2023 };

function makeRecord(partial: Partial<SourceRecord> & Pick<SourceRecord, 'organization' | 'indicatorCode' | 'indicatorName' | 'pillar' | 'value' | 'unit' | 'sourceDocumentTitle' | 'sourceUrl' | 'lastUpdated'>): SourceRecord {
  return {
    ...sharedCountry,
    ...partial,
  };
}

abstract class MockAdapter implements SourceAdapter {
  abstract sourceId: string;
  abstract organization: string;
  protected abstract records: SourceRecord[];
  async fetchLatest(): Promise<SourceRecord[]> {
    return this.records;
  }
}

export class UNSDGAdapter extends MockAdapter {
  sourceId = 'un-sdg';
  organization = 'United Nations SDG';
  protected records = [
    makeRecord({
      organization: this.organization,
      indicatorCode: 'SDG.1.1.1',
      indicatorName: 'Population below international poverty line',
      pillar: 'poverty',
      value: 61,
      unit: 'normalized_score',
      sourceDocumentTitle: 'SDG Global Database 2024 Update',
      sourceUrl: 'https://unstats.un.org/sdgs/dataportal',
      lastUpdated: '2024-09-20',
    }),
  ];
}

export class WHOUHCAdapter extends MockAdapter {
  sourceId = 'who-uhc';
  organization = 'WHO';
  protected records = [
    makeRecord({
      organization: this.organization,
      indicatorCode: 'WHO.UHC.SCI',
      indicatorName: 'Universal Health Coverage Service Coverage Index',
      pillar: 'health',
      value: 58,
      unit: 'normalized_score',
      sourceDocumentTitle: 'Tracking Universal Health Coverage 2023',
      sourceUrl: 'https://www.who.int/data/gho',
      lastUpdated: '2024-06-15',
    }),
  ];
}

export class WorldBankPovertyAdapter extends MockAdapter {
  sourceId = 'wb-poverty';
  organization = 'World Bank';
  protected records = [
    makeRecord({
      organization: this.organization,
      indicatorCode: 'SI.POV.DDAY',
      indicatorName: 'Poverty headcount ratio at $2.15/day (2017 PPP)',
      pillar: 'poverty',
      value: 55,
      unit: 'normalized_score',
      sourceDocumentTitle: 'World Development Indicators',
      sourceUrl: 'https://databank.worldbank.org/source/world-development-indicators',
      lastUpdated: '2024-10-01',
    }),
  ];
}

export class UNICEFChildWellbeingAdapter extends MockAdapter {
  sourceId = 'unicef-child';
  organization = 'UNICEF';
  protected records = [
    makeRecord({
      organization: this.organization,
      indicatorCode: 'UNICEF.CHILD.DEPRIV',
      indicatorName: 'Children in severe multidimensional deprivation',
      pillar: 'child_protection',
      value: 49,
      unit: 'normalized_score',
      sourceDocumentTitle: 'UNICEF Global Child Well-being Dataset',
      sourceUrl: 'https://data.unicef.org',
      lastUpdated: '2024-08-30',
    }),
  ];
}

export class UNESCOEducationAdapter extends MockAdapter {
  sourceId = 'unesco-edu';
  organization = 'UNESCO UIS';
  protected records = [
    makeRecord({
      organization: this.organization,
      indicatorCode: 'UIS.LR.AG15T24',
      indicatorName: 'Youth literacy rate',
      pillar: 'education',
      value: 72,
      unit: 'normalized_score',
      sourceDocumentTitle: 'UIS Education Indicators 2024',
      sourceUrl: 'https://uis.unesco.org',
      lastUpdated: '2024-07-18',
    }),
  ];
}

export class ILOChildLabourAdapter extends MockAdapter {
  sourceId = 'ilo-child-labour';
  organization = 'ILO';
  protected records = [
    makeRecord({
      organization: this.organization,
      indicatorCode: 'ILO.CLAB.PCT',
      indicatorName: 'Children in child labour',
      pillar: 'child_protection',
      value: 52,
      unit: 'normalized_score',
      sourceDocumentTitle: 'Global Estimates of Child Labour 2024',
      sourceUrl: 'https://www.ilo.org',
      lastUpdated: '2024-11-02',
    }),
  ];
}

export const adapters: SourceAdapter[] = [
  new UNSDGAdapter(),
  new WHOUHCAdapter(),
  new WorldBankPovertyAdapter(),
  new UNICEFChildWellbeingAdapter(),
  new UNESCOEducationAdapter(),
  new ILOChildLabourAdapter(),
];
