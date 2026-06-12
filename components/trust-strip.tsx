/** Shared trust strip — R1a design system (Concept #1). Copy follows the
    approved concept mock; subject to JT preview approval. */
export function TrustStrip() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-3">
      <div>
        <div className="mb-3 h-1 w-10 rounded bg-gold" />
        <h2 className="font-serif text-lg font-bold text-brand">
          Broker-Prepared Workflow
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Created by a California licensed real estate broker.
        </p>
      </div>
      <div>
        <div className="mb-3 h-1 w-10 rounded bg-gold" />
        <h2 className="font-serif text-lg font-bold text-brand">
          CA Licensed Real Estate Broker Review
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Get expert review from a licensed broker for extra peace of mind.
        </p>
      </div>
      <div>
        <div className="mb-3 h-1 w-10 rounded bg-gold" />
        <h2 className="font-serif text-lg font-bold text-brand">
          RiskPath™ Follow-Up
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Smart guidance for what comes next — service tracking, records, and
          reminders.
        </p>
      </div>
    </div>
  );
}
