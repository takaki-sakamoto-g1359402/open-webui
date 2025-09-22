import { useMemo } from "react";

type Incident = {
  id: string;
  status: "open" | "triage" | "contained" | "closed";
  severity: "low" | "medium" | "high" | "critical";
  playbook: string;
};

const incidents: Incident[] = [
  {
    id: "incident-1",
    status: "triage",
    severity: "high",
    playbook: "ransomware-response",
  },
];

export function IncidentBoard() {
  const grouped = useMemo(() => {
    return incidents.reduce<Record<string, Incident[]>>((acc, incident) => {
      acc[incident.status] = acc[incident.status] || [];
      acc[incident.status].push(incident);
      return acc;
    }, {});
  }, []);

  return (
    <div>
      {Object.entries(grouped).map(([column, items]) => (
        <section key={column}>
          <h2>{column}</h2>
          <ul>
            {items.map(item => (
              <li key={item.id}>
                {item.id} – {item.severity} – {item.playbook}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
