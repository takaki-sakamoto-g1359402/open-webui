import { getCountry } from '../../../lib/api';

export default async function CountryPage({ params }: { params: { iso3: string } }) {
  const data = await getCountry(params.iso3);

  return (
    <main>
      <h2>{data.iso3} — Country Detail</h2>
      <p><strong>Heaven Score:</strong> {data.heavenScore}</p>
      <p><strong>Confidence:</strong> {data.confidence}</p>

      <h3>Pillar Sub-scores</h3>
      <ul>
        {data.pillarBreakdown.map((p: any) => (
          <li key={p.pillar}>{p.pillar}: {p.pillarScore} (weight {p.weight})</li>
        ))}
      </ul>

      <h3>Trend</h3>
      <ul>{data.trend.map((t: any) => <li key={t.year}>{t.year}: {t.score}</li>)}</ul>

      <h3>Evidence Cards</h3>
      <ul>
        {data.evidenceCards.map((e: any, i: number) => (
          <li key={i}>{e.indicatorCode} — <a href={e.sourceUrl}>{e.sourceOrganization}</a> ({e.lastUpdated})</li>
        ))}
      </ul>

      <h3>Methodology</h3>
      <pre>{JSON.stringify(data.methodology, null, 2)}</pre>
    </main>
  );
}
