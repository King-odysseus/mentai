/** Dashboard page — overview of all learning progress. Stub for Phase 3-4 implementation. */

export default function DashboardPage() {
  return (
    <div className="dashboard-page" style={{ maxWidth: 1100, margin: "0 auto", padding: "var(--space-2xl) var(--space-xl)" }}>
      <header style={{ marginBottom: "var(--space-2xl)" }}>
        <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}>
          Welcome back
        </h1>
        <p style={{ opacity: 0.55, marginTop: "var(--space-xs)" }}>
          Your full-stack journey, one project at a time.
        </p>
      </header>

      <div className="dash-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "var(--space-lg)",
      }}>
        <div className="neo-card">
          <div className="card-header" style={{ marginBottom: "var(--space-md)" }}>
            <h2 style={{ fontSize: "var(--font-size-lg)" }}>Your Projects</h2>
          </div>
          <p className="empty-state">Project list coming in Phase 3.</p>
        </div>

        <div className="neo-card">
          <div className="card-header" style={{ marginBottom: "var(--space-md)" }}>
            <h2 style={{ fontSize: "var(--font-size-lg)" }}>Quick Session</h2>
          </div>
          <p className="empty-state">Session buttons coming in Phase 3.</p>
        </div>

        <div className="neo-card">
          <div className="card-header" style={{ marginBottom: "var(--space-md)" }}>
            <h2 style={{ fontSize: "var(--font-size-lg)" }}>Concept Mastery</h2>
          </div>
          <p className="empty-state">Mastery bars coming in Phase 4.</p>
        </div>
      </div>
    </div>
  );
}
