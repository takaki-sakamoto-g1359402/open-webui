export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, Arial, sans-serif', margin: 24, background: '#f8fafc', color: '#0f172a' }}>
        <header style={{ marginBottom: 20 }}>
          <h1>Heaven Blueprint Atlas</h1>
          <nav style={{ display: 'flex', gap: 12 }}>
            <a href="/">Dashboard</a>
            <a href="/sources">Source Explorer</a>
            <a href="/admin">Admin</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
