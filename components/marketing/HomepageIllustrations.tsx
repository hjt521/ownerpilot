// components/marketing/HomepageIllustrations.tsx
// Option B (homepage_illustration_placement_ruling_2026-07-05): the three buildout-V2 Canva illustrations as
// SECTION ACCENTS on the served landing variant — the functional hero preview is kept; these support it lower on
// the page. Copy is broker-ratified verbatim in the ruling. Illustrations are abstract/decorative (alt=""),
// styled by the `.cb-home .illus-*` rules in app/globals.css so they match the Concept-B aesthetic.

/** Below the hero: the AI-first workflow story (hero_chat_first_flow). */
export function AIFlowIllustrationBand() {
  return (
    <section className="illus-band shell">
      <div className="illus-copy">
        <p className="eyebrow">AI-first workflow</p>
        <h2>Start with a question. Move into the right workflow.</h2>
        <p className="illus-body">
          OwnerPilot AI helps you understand the issue, then routes you into courtesy reminders, notice
          preparation, service tracking, written resolution records, and RiskPath&trade;.
        </p>
      </div>
      <div className="illus-visual">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero_chat_first_flow.jpg" alt="" />
      </div>
    </section>
  );
}

/** Property-aware routing (feature_jurisdiction_check_v2). Image on the left (reverse). */
export function JurisdictionFeatureBand() {
  return (
    <section className="illus-band reverse shell">
      <div className="illus-visual">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/feature_jurisdiction_check_v2.jpg" alt="" />
      </div>
      <div className="illus-copy">
        <p className="eyebrow">Built for California complexity</p>
        <h2>Property-aware routing</h2>
        <p className="illus-body">
          OwnerPilot checks live jurisdiction data, pauses when source confidence is insufficient, and routes the
          address to broker review when needed.
        </p>
      </div>
    </section>
  );
}

/** After the notice (feature_resolve_document) — introduces the Resolve &amp; Document layer. */
export function ResolveDocumentBand() {
  return (
    <section className="illus-band shell">
      <div className="illus-copy">
        <p className="eyebrow">After the notice</p>
        <h2>The notice does not end at service.</h2>
        <p className="illus-body">
          If the tenant pays, makes a payment plan, agrees to move out, or returns possession, OwnerPilot helps you
          create a written record and keep the next step organized.
        </p>
        <div className="resolve-labels">
          <span>Record Payment</span>
          <span>Create Payment Plan</span>
          <span>Create Move-Out Agreement</span>
          <span>Record Surrender</span>
        </div>
      </div>
      <div className="illus-visual">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/feature_resolve_document.jpg" alt="" />
      </div>
    </section>
  );
}
