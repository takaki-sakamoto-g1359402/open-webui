import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>AI-Augmented VTuber Governance System</h1>
      <p>This PoC highlights scheduling, fatigue tracking, and chat safety.</p>
      <ul>
        <li><Link href="/talents">Talents</Link></li>
        <li><Link href="/scheduler">Scheduler</Link></li>
        <li><Link href="/chat">Chat</Link></li>
      </ul>
    </main>
  );
}
