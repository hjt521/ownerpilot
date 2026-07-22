// components/marketing/HomepageIllustrations.tsx
// Option B (homepage_illustration_placement_ruling_2026-07-05) + AI-first update (homepage_canonical_update_2026-07-05):
// the three buildout-V2 Canva illustrations as SECTION ACCENTS on the served landing variant. Copy is broker-
// ratified. Illustrations are abstract/decorative (alt=""), styled by `.cb-home .illus-*` in app/globals.css.

import Link from 'next/link';

/** Below the hero: the AI-first workflow story (hero_chat_first_flow). */
export function AIFlowIllustrationBand() {
  return (
    <section className="illus-band shell illus-band--flow">
      <div className="illus-copy">
        <p className="eyebrow">AI-first workflow</p>
        <h2>Start with a question. Move into the right workflow.</h2>
        <p className="illus-body">
          OwnerPilot AI helps you understand the issue, then routes you into courtesy reminders, notice
          preparation, service tracking, written resolution records, and RiskPath&trade;.
        </p>
        <Link className="text-link" href="/chat">Ask OwnerPilot AI &rarr;</Link>
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
        <h2>Property-aware routing.</h2>
        <p className="illus-body">
          OwnerPilot checks live jurisdiction data, pauses when source confidence is insufficient, and routes the
          address to broker review when needed.
        </p>
        <div className="status-card" aria-label="Jurisdiction check example">
          <p className="status-title">Property Check</p>
          <div className="status-row"><span>Status</span><strong>Reviewed</strong></div>
          <div className="status-row"><span>Result</span><strong className="ready">Ready to continue</strong></div>
          <div className="status-row"><span>Next</span><strong>Broker-supervised workflow</strong></div>
        </div>
      </div>
    </section>
  );
}

// ResolveDocumentBand removed (Ruling 5 / shipped-surface inventory 2026-07-14, disposition (c)): it marketed an
// unshipped interactive Resolve & Document surface (Record Payment / Create Payment Plan / Create Move-Out
// Agreement / Record Surrender action labels). Supersedes the 2026-07-05 illustration-placement approval per the
// 2026-07-14 inventory finding (§4). Returns automatically to a future tranche if/when the product ships.
