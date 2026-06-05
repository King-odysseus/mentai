/** Onboarding page — account creation form. Full implementation in Phase 2. */

export default function OnboardingPage() {
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "var(--space-2xl) var(--space-xl)" }}>
      <header style={{ marginBottom: "var(--space-2xl)", textAlign: "center" }}>
        <h1 style={{ fontSize: "var(--font-size-2xl)", fontWeight: 700 }}>
          Create Your MentAi Account
        </h1>
        <p style={{ opacity: 0.55, marginTop: "var(--space-xs)" }}>
          Tell us about yourself and we'll build a personalized learning path.
        </p>
      </header>

      <div className="neo-card">
        <p className="empty-state">Onboarding form coming in Phase 2.</p>
      </div>
    </div>
  );
}
