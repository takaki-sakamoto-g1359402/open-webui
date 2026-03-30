import { useEffect, useState } from "react";

interface Talent {
  id: number;
  name: string;
  kind: string;
  priority_score: number;
  max_weekly_hours: number;
}

export default function TalentsPage() {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [fatigue, setFatigue] = useState<Record<number, number>>({});

  useEffect(() => {
    fetch("http://localhost:8000/talents")
      .then((res) => res.json())
      .then(setTalents)
      .catch((err) => console.error(err));
  }, []);

  const fetchFatigue = async (id: number) => {
    const res = await fetch(`http://localhost:8000/talents/${id}/fatigue`);
    const data = await res.json();
    setFatigue((prev) => ({ ...prev, [id]: data.fatigue_score }));
  };

  return (
    <main style={{ padding: "2rem" }}>
      <h2>Talents</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Kind</th>
            <th>Priority</th>
            <th>Fatigue</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {talents.map((talent) => (
            <tr key={talent.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{talent.name}</td>
              <td>{talent.kind}</td>
              <td>{talent.priority_score.toFixed(2)}</td>
              <td>{fatigue[talent.id] ?? "–"}</td>
              <td>
                <button onClick={() => fetchFatigue(talent.id)}>View fatigue</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
