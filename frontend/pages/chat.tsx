import { useEffect, useState } from "react";

interface ChatLog {
  id: number;
  talent_id?: number;
  user_id: string;
  message: string;
  safe: boolean;
  violation_category?: string;
  assistant_reply?: string;
}

export default function ChatPage() {
  const [talentId, setTalentId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [logs, setLogs] = useState<ChatLog[]>([]);

  const send = async () => {
    const res = await fetch("http://localhost:8000/chat/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        talent_id: talentId ? Number(talentId) : null,
        user_id: userId || "anon",
        message,
      }),
    });
    const data = await res.json();
    setResponse(
      data.safe
        ? data.assistant_reply || "No reply"
        : "Message blocked for guideline violation"
    );
    loadLogs();
  };

  const loadLogs = async () => {
    const res = await fetch("http://localhost:8000/chat/logs?limit=10");
    const data = await res.json();
    setLogs(data.logs || []);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <main style={{ padding: "2rem" }}>
      <h2>Governance-Aware Chat</h2>
      <div style={{ marginBottom: "1rem" }}>
        <label>
          Talent ID:
          <input
            value={talentId}
            onChange={(e) => setTalentId(e.target.value)}
            style={{ marginLeft: "0.5rem" }}
          />
        </label>
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <label>
          User ID:
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ marginLeft: "0.5rem" }}
          />
        </label>
      </div>
      <div style={{ marginBottom: "1rem" }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          style={{ width: "100%" }}
          placeholder="Enter message"
        />
      </div>
      <button onClick={send}>Send</button>
      {response && (
        <p>
          <strong>Assistant:</strong> {response}
        </p>
      )}

      <h3>Recent Logs</h3>
      <ul>
        {logs.map((log) => (
          <li key={log.id}>
            <strong>User:</strong> {log.user_id} — {log.message}
            {" "}
            {log.safe ? "(safe)" : `⚠️ ${log.violation_category}`}
            {log.assistant_reply && <div>Reply: {log.assistant_reply}</div>}
          </li>
        ))}
      </ul>
    </main>
  );
}
