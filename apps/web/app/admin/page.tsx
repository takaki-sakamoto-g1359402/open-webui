export default function AdminPage() {
  return (
    <main>
      <h2>Admin / Ingestion Dashboard</h2>
      <ul>
        <li>Source registry: configured adapters for UN SDG, WHO, World Bank, UNICEF, UNESCO, ILO.</li>
        <li>Ingestion status: mock mode active.</li>
        <li>Parsing logs: scaffolded via ingestion_runs + audit_logs schema.</li>
        <li>Failed document queue: placeholder for human review workflow.</li>
      </ul>
    </main>
  );
}
