import { getDashboard } from '../lib/api';

export default async function Home() {
  const data = await getDashboard();

  return (
    <main>
      <h2>Global Summary</h2>
      <p>Countries tracked: {data.globalSummary.countriesTracked}</p>
      <p>Average Heaven Score: {data.globalSummary.avgScore}</p>
      <p>Average Confidence: {data.globalSummary.avgConfidence}</p>

      <h3>Top Risks</h3>
      <ul>{data.topRisks.map((r: any) => <li key={r.iso3}><a href={`/country/${r.iso3}`}>{r.iso3}</a> — {r.score}</li>)}</ul>

      <h3>Top Improving Regions (proxy: top scores)</h3>
      <ul>{data.topImproving.map((r: any) => <li key={r.iso3}>{r.iso3} — {r.score}</li>)}</ul>

      <h3>Latest Source Updates</h3>
      <ul>
        {data.latestSourceUpdates.map((s: any, i: number) => (
          <li key={i}><a href={s.url}>{s.organization}: {s.title}</a> ({s.lastUpdated})</li>
        ))}
      </ul>
    </main>
  );
}
