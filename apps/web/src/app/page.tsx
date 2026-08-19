export default function FoundationPage() {
  return (
    <main className="foundation-page">
      <section className="foundation-card" aria-labelledby="foundation-title">
        <p className="foundation-eyebrow">Phase 1 · Application foundation</p>
        <h1 id="foundation-title">Experiment Assistant</h1>
        <p className="foundation-summary">
          The web application foundation is ready. Product navigation and scientific workflows will
          be added through their reviewed Phase 1 issues.
        </p>
        <ul className="foundation-status" aria-label="Foundation status">
          <li>Next.js and TypeScript application</li>
          <li>Versioned FastAPI boundary</li>
          <li>Migration-managed persistence foundation</li>
        </ul>
        <p className="foundation-note">
          No Project, Protocol, ExperimentRun, or other business record is implemented in P1-01.
        </p>
      </section>
    </main>
  );
}
