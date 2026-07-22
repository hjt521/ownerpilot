import Link from 'next/link';
import { SiteFooter } from './site-footer';
import { AIFlowIllustrationBand, JurisdictionFeatureBand } from './marketing/HomepageIllustrations';

type LandingVariantProps = {
  /** Which persona/channel this page serves, e.g. "Crisis variant — Google Search".
      Preserved for UTM attribution + future per-variant copy. Not rendered as a
      visible label (marketing direction, 2026-06-16); exposed only as a dev-only
      data attribute for QA. */
  variantLabel: string;
};

/**
 * Canonical served homepage (proxy rewrites / → /landing/default). AI-first repositioning per
 * homepage_canonical_update_2026-07-05: leads with "Ask OwnerPilot AI first." and tells the full workflow story
 * (Ask AI → Generate Notice → Serve & Track → Resolve & Record → RiskPath Records) rather than a notice-only
 * pitch. The functional product preview stays in the hero; the Canva illustrations are Option-B accents lower on
 * the page. UTM/landing-variant infrastructure unchanged. Styles scoped under `.cb-home` in app/globals.css.
 */

const workflowSteps = [
  { number: '1', title: 'Ask AI', body: 'Plain-English workflow guidance before you act.' },
  { number: '2', title: 'Generate Notice', body: 'Build and review a broker-supervised 3-Day Notice packet.' },
  { number: '3', title: 'Serve & Track', body: 'Log attempts, mailing, photos, and notes.' },
  { number: '4', title: 'Resolve & Record', body: 'Document the outcome and keep the record in RiskPath™.' },
];

const heroSystem = [
  { title: 'Ask AI', body: 'Guidance before you act' },
  { title: 'Generate Notice', body: 'Broker-supervised packet' },
  { title: 'Serve & Track', body: 'Attempts, mailing, photos' },
  { title: 'Resolve & Record', body: 'Document the outcome' },
];

const packetItems = [
  'Tenant Service Copy',
  'Owner Record Copy',
  'Proof of Service',
  'Service Log',
  'Photo Proof of Posting',
  'RiskPath™ Follow-Up',
];

const chatPrompts = [
  'My tenant is behind on rent. What should I do?',
  'How do I create a 3-Day Notice?',
  'What happens after I serve the notice?',
  'The tenant paid after notice. What should I document?',
  'The tenant agreed to move out. What are my next steps?',
];

function ArrowIcon() {
  return <span aria-hidden="true" className="arrow">&rarr;</span>;
}

function CheckIcon() {
  return (
    <span className="check" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6.5 9 17.5l-5-5" />
      </svg>
    </span>
  );
}

export function LandingVariant({ variantLabel }: LandingVariantProps) {
  // variantLabel is preserved for UTM attribution + future per-variant copy. Not rendered as a visible label
  // (marketing direction, 2026-06-16); exposed only as a dev-only data attribute for QA.
  const devVariantAttr: Record<string, string> =
    process.env.NODE_ENV !== 'production' ? { 'data-variant': variantLabel } : {};
  return (
    <div className="cb-home" {...devVariantAttr}>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="OwnerPilot.AI home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-mark" src="/ownerpilot-mark.svg" alt="OwnerPilot.AI" />
          <span className="brand-text">OwnerPilot<span>.AI</span></span>
        </Link>
        <nav className="nav" aria-label="Main navigation">
          <Link href="/notice/3-day">3-Day Notice</Link>
          <Link href="/notice/3-day/serve">Serve &amp; Track</Link>
          <Link href="/chat">Ask OwnerPilot</Link>
          <Link href="/our-approach">Our Approach</Link>
        </nav>
        <Link className="nav-cta" href="/chat">Ask OwnerPilot AI</Link>
      </header>

      <main>
        <section id="top" className="hero shell">
          <div className="hero-copy">
            <p className="eyebrow">Built for California property owners</p>
            <h1>Ask OwnerPilot AI first.</h1>
            <p className="hero-subline">
              Get plain-English guidance, then move into broker-supervised notice preparation, service tracking,
              written resolution records, and organized next steps.
            </p>

            <div className="hero-system" aria-label="OwnerPilot connected workflow">
              {heroSystem.map((item) => (
                <div className="hero-system-item" key={item.title}>
                  <CheckIcon />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.body}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hero-actions" id="start">
              <Link className="primary-btn" href="/chat">Ask OwnerPilot AI <ArrowIcon /></Link>
              <Link className="secondary-btn" href="/notice/3-day">Start 3-Day Notice</Link>
            </div>
            <p className="hero-help">
              Not sure what to do first? <Link href="/chat">Ask OwnerPilot AI before you start.</Link>
            </p>
            <div className="trust-row" aria-label="Trust points">
              <span>California Licensed Real Estate Broker supervision</span>
              <span>Broker-supervised workflow</span>
              <span>RiskPath™ Follow-Up from your dashboard</span>
            </div>
            <p className="hero-broker-line">Built and operated under California real estate broker supervision.</p>
          </div>

          <div className="hero-visual" aria-label="OwnerPilot notice and service tracking preview">
            <div className="paper-card notice-card">
              <div className="doc-top">THREE-DAY NOTICE<br />TO PAY RENT OR QUIT</div>
              <div className="doc-line thick"></div>
              <div className="doc-grid">
                <span>Notice Packet</span><strong className="ready">Ready</strong>
                <span>Service Log</span><strong>Logged</strong>
                <span>RiskPath Record</span><strong className="ready">Next</strong>
              </div>
              <div className="doc-lines">
                <i></i><i></i><i></i><i></i>
              </div>
            </div>
            <div className="phone-card">
              <div className="phone-bar"></div>
              <h3>Service Log</h3>
              <p>Resume from your RiskPath&trade;</p>
              <div className="log-row"><span>Attempt 1</span><strong>Failed</strong></div>
              <div className="log-row"><span>Attempt 2</span><strong>Logged</strong></div>
              <div className="log-row success"><span>Mailing</span><strong>Next</strong></div>
            </div>
            <div className="ai-minicard" aria-hidden="true">
              <span className="ai-minicard-label">OwnerPilot AI</span>
              <p>Tell me what happened. I&apos;ll help route the next step.</p>
              <div className="ai-minicard-input"><span>Ask a question&hellip;</span></div>
            </div>
          </div>
        </section>

        <AIFlowIllustrationBand />

        <section className="workflow-band" id="approach">
          <div className="shell workflow-grid">
            {workflowSteps.map((step) => (
              <article className="workflow-step" key={step.number}>
                <div className="step-number">{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
          <div className="shell workflow-compact">
            <span>Ask AI</span><i>&rarr;</i>
            <span>Generate Notice</span><i>&rarr;</i>
            <span>Serve &amp; Track</span><i>&rarr;</i>
            <span>Resolve &amp; Record</span>
          </div>
          <p className="shell workflow-riskpath-note">
            <strong>RiskPath&trade;</strong> keeps your notice packet, service log, photos, agreements, and next
            steps organized in one record.
          </p>
        </section>

        {/* Ask OwnerPilot AI — surfaced high, right after the workflow story so it isn't buried. */}
        <section className="chat-section" id="ask">
          <div className="shell chat-box">
            <div>
              <p className="eyebrow">AI-first workflow</p>
              <h2>Not sure what to do next? Ask OwnerPilot AI.</h2>
              <p>
                Get plain-English workflow guidance before you create a notice, accept payment, document service, or
                close a record.
              </p>
            </div>
            <div className="prompt-box">
              {chatPrompts.map((prompt) => (
                <Link key={prompt} href="/chat" className="prompt-link">{prompt}</Link>
              ))}
              <Link className="primary-btn chat-btn" href="/chat">Ask OwnerPilot AI <ArrowIcon /></Link>
            </div>
          </div>
        </section>

        <JurisdictionFeatureBand />

        <section className="split shell" id="serve-track">
          <div className="split-copy">
            <p className="eyebrow">After the notice is created</p>
            <h2>Everything you need after the notice is created.</h2>
            <p>
              Most tools stop at the form. OwnerPilot keeps going so you can track service, capture records, document
              outcomes, and return later through your dashboard.
            </p>
            <Link className="text-link" href="/notice/3-day/serve">Track service from the same record <ArrowIcon /></Link>
          </div>
          <div className="feature-panel">
            <p className="packet-heading-mobile">Your workflow includes:</p>
            {packetItems.map((item) => (
              <div className="feature-row" key={item}>
                <CheckIcon />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Serve & Track + Photo Proof of Posting. Status pill "Timestamped" (never "Verified"). */}
        <section className="split shell reverse-split" id="photo-proof">
          <div className="proof-card" aria-label="Photo Proof of Posting example">
            <div className="proof-head">
              <strong>3-Day Notice</strong>
              <span className="pill">Timestamped</span>
            </div>
            <p className="proof-sub">Posted on Front Door</p>
            <div className="proof-photo" aria-hidden="true"><span className="proof-doc"><i className="proof-pin"></i></span></div>
            <p className="proof-time">May 12, 2025 · 10:24 AM</p>
          </div>
          <div className="split-copy">
            <p className="eyebrow">Serve &amp; Track</p>
            <h2>Track service from the same record.</h2>
            <p>
              Log service attempts, mailing steps, notes, and owner-side records without mixing them into the tenant
              copy. Capture and timestamp posting photos from your phone for the owner record.
            </p>
          </div>
        </section>

        {/* Resolve & Document band + product lane removed (Ruling 5 / shipped-surface inventory 2026-07-14,
            disposition (c)): marketed an unshipped interactive Resolve & Document surface, Move-Out Agreement
            creation, and an "Open Resolve & Document" CTA. Outcome recordkeeping remains covered by the shipped
            RiskPath surface (see the workflow band and final CTA). Returns to a future tranche if the product ships. */}

        <section className="final-cta shell">
          <h2>Start with a question. Keep every next step organized.</h2>
          <p>
            OwnerPilot helps you move from plain-English guidance to notice preparation, service tracking, written
            resolution records, and RiskPath&trade;.
          </p>
          <div className="hero-actions" style={{ justifyContent: 'center' }}>
            <Link className="primary-btn" href="/chat">Ask OwnerPilot AI <ArrowIcon /></Link>
            <Link className="secondary-btn" href="/notice/3-day">Start 3-Day Notice</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
