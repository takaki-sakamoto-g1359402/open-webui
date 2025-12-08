import { useEffect, useState } from "react";

interface Recommendation {
  id: number;
  talent_id: number;
  slot_start: string;
  slot_end: string;
  reason: string;
}

export default function SchedulerPage() {
  const [weekStart, setWeekStart] = useState<string>("");
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const runScheduler = async () => {
    if (!weekStart) return;
    setLoading(true);
    await fetch("http://localhost:8000/scheduler/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_start: weekStart }),
    });
    const res = await fetch(
      `http://localhost:8000/scheduler/recommendations?week_start=${weekStart}`
    );
    const data = await res.json();
    setRecs(data);
    setLoading(false);
  };

  const grouped = recs.reduce<Record<number, Recommendation[]>>((acc, rec) => {
    acc[rec.talent_id] = acc[rec.talent_id] || [];
    acc[rec.talent_id].push(rec);
    return acc;
  }, {});

  return (
    <main style={{ padding: "2rem" }}>
      <h2>Scheduler</h2>
      <div style={{ marginBottom: "1rem" }}>
        <label>
          Week start:
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            style={{ marginLeft: "0.5rem" }}
          />
        </label>
        <button onClick={runScheduler} disabled={loading} style={{ marginLeft: "0.5rem" }}>
          {loading ? "Running..." : "Run Scheduler"}
        </button>
      </div>
      {Object.keys(grouped).length === 0 && <p>No recommendations yet.</p>}
      {Object.entries(grouped).map(([talentId, items]) => (
        <section key={talentId} style={{ marginBottom: "1rem" }}>
          <h4>Talent #{talentId}</h4>
          <ul>
            {items.map((rec) => (
              <li key={rec.id}>
                {new Date(rec.slot_start).toLocaleString()} - {new Date(rec.slot_end).toLocaleString()}
                {" "}({rec.reason})
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
