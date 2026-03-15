import { getSources } from '../../lib/api';

export default async function SourcesPage() {
  const data = await getSources();
  return (
    <main>
      <h2>Source Explorer</h2>
      <p>Total records: {data.count}</p>
      <ul>
        {data.items.map((s: any, i: number) => (
          <li key={i}>{s.sourceOrganization} | {s.pillar} | {s.iso3} | <a href={s.sourceUrl}>{s.sourceDocumentTitle}</a></li>
        ))}
      </ul>
    </main>
  );
}
