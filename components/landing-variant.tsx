import Link from 'next/link';
import { SiteFooter } from './site-footer';

type LandingVariantProps = {
  /** Which persona/channel this page serves, e.g. "Crisis variant — Google Search".
      Preserved for UTM attribution + future per-variant copy. Not rendered as a
      visible label (marketing direction, 2026-06-16); exposed only as a dev-only
      data attribute for QA. */
  variantLabel: string;
};

/**
 * Shared landing template for all seven UTM variants — Concept B "Action
 * Forward" with the 2026-06-16 marketing hero revision (above-the-fold system
 * strip; "Create a California 3-Day Notice in Minutes" headline). One shared
 * design for now; per-persona copy (by variantLabel) is a later project.
 * Routing and campaign labels are unchanged (see proxy.ts). Layout styles are
 * scoped under `.cb-home` in app/globals.css.
 */

const workflowSteps = [
  { number: '1', title: 'Ask AI', body: 'Plain-English guidance for California property owners before you act.' },
  { number: '2', title: 'Generate Notice', body: 'Build and review a broker-prepared 3-Day Notice packet.' },
  { number: '3', title: 'Serve & Track', body: 'Log attempts, track mailing, and keep the record moving.' },
  { number: '4', title: 'Proof & Record', body: 'Complete proof of service and keep the packet organized.' },
];

const heroSystem = [
  { title: 'Generate Notice', body: 'Tenant + owner copies' },
  { title: 'Serve & Track', body: 'Log attempts and mailing' },
  { title: 'Proof & Record', body: 'Complete after service' },
  { title: 'RiskPath\u2122 Follow-Up', body: 'Return from your dashboard' },
];

const packetItems = [
  'Tenant Service Copy',
  'Owner Record Copy',
  'Proof of Service',
  'Service Log',
  'RiskPath\u2122 Follow-Up',
];

const chatPrompts = [
  'My tenant is behind on rent. What should I do?',
  'How do I create a 3-Day Notice?',
  'What happens after I serve the notice?',
  'How do I track a failed service attempt?',
];

function ArrowIcon() {
  return <span aria-hidden="true" className="arrow">&rarr;</span>;
}

function CheckIcon() {
  // Inline SVG check (centered by geometry) instead of a unicode glyph, whose
  // font metrics left it sitting off-center in the small circle. Sized via CSS
  // (.cb-home .check svg) so it scales for the hero (22px) and list (28px).
  return (
    <span className="check" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6.5 9 17.5l-5-5" />
      </svg>
    </span>
  );
}

export function LandingVariant({ variantLabel }: LandingVariantProps) {
  // variantLabel is preserved for UTM attribution + future per-variant copy.
  // It is intentionally NOT rendered as a visible label (marketing direction,
  // 2026-06-16); exposed only as a dev-only data attribute for QA.
  const devVariantAttr: Record<string, string> =
    process.env.NODE_ENV !== 'production' ? { 'data-variant': variantLabel } : {};
  return (
    <div className="cb-home" {...devVariantAttr}>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="OwnerPilot.AI home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-mark" src="/ownerpilot-mark.png" alt="OwnerPilot.AI" />
          <span className="brand-text">OwnerPilot<span>.AI</span></span>
        </Link>
        <nav className="nav" aria-label="Main navigation">
          <Link href="/notice/3-day">3-Day Notice</Link>
          <Link href="/notice/3-day/serve">Serve &amp; Track</Link>
          <Link href="/chat">Ask OwnerPilot</Link>
          <Link href="/our-approach">Our Approach</Link>
        </nav>
        <Link className="nav-cta" href="/notice/3-day">Start 3-Day Notice</Link>
      </header>

      <main>
        <section id="top" className="hero shell">
          <div className="hero-copy">
            <p className="eyebrow">The complete 3-Day Notice workflow</p>
            <h1>Create a California 3-Day Notice in Minutes.</h1>
            <p className="hero-subline">Track service. Keep the record organized.</p>
            <p className="lead">
              Generate a broker-prepared notice packet, separate tenant and owner copies, log service attempts, complete proof of service, and return anytime with RiskPath&trade; Follow-Up.
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
              <Link className="primary-btn" href="/notice/3-day">Start 3-Day Notice <ArrowIcon /></Link>
              <Link className="secondary-btn" href="/chat">Ask OwnerPilot AI</Link>
            </div>
            <p className="hero-help">
              Not sure what to do first? <Link href="/chat">Ask OwnerPilot AI before you start.</Link>
            </p>
            <div className="trust-row" aria-label="Trust points">
              <span>CA Licensed Real Estate Broker supervision</span>
              <span>Broker-prepared workflow</span>
              <span>RiskPath&trade; Follow-Up from your dashboard</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="OwnerPilot notice and service tracking preview">
            <div className="paper-card notice-card">
              <div className="doc-top">THREE-DAY NOTICE<br />TO PAY RENT OR QUIT</div>
              <div className="doc-line thick"></div>
              <div className="doc-grid">
                <span>Tenant</span><strong>John Doe</strong>
                <span>Rent owed</span><strong>$4,354.00</strong>
                <span>Status</span><strong className="ready">Ready</strong>
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
          </div>
        </section>

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
            <span>Proof &amp; Record</span>
          </div>
        </section>

        <section className="split shell" id="serve-track">
          <div className="split-copy">
            <p className="eyebrow">After the notice prints</p>
            <h2>Everything you need after you print.</h2>
            <p>
              Most form tools stop at the form. OwnerPilot keeps going so you can track service attempts, complete proof of service, and return later through your dashboard.
            </p>
            <Link className="text-link" href="/notice/3-day">Learn how the packet works <ArrowIcon /></Link>
          </div>
          <div className="feature-panel">
            <p className="packet-heading-mobile">Your packet includes:</p>
            {packetItems.map((item) => (
              <div className="feature-row" key={item}>
                <CheckIcon />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="notice-section shell" id="notice">
          <div className="section-heading">
            <p className="eyebrow">Built for speed and records</p>
            <h2>Built for what happens after the notice prints.</h2>
            <p>Start with a fast notice generator, then continue with Serve &amp; Track when service actually happens.</p>
          </div>
          <div className="cards-three">
            <article className="service-card">
              <h3>Fast 3-Day Notice</h3>
              <p>Four guided steps: Quick Safety Check, Property/Tenant/Rent, Landlord/Payment/Signer, Review &amp; Produce.</p>
            </article>
            <article className="service-card featured">
              <h3>Serve &amp; Track</h3>
              <p>Keep service attempts, mailing steps, and notes separate from the notice itself.</p>
            </article>
            <article className="service-card">
              <h3>RiskPath&trade; Follow-Up</h3>
              <p>Return to your open notice record anytime from your dashboard.</p>
            </article>
          </div>
        </section>

        <section className="chat-section" id="ask">
          <div className="shell chat-box">
            <div>
              <p className="eyebrow">RE Broker AI Assistant</p>
              <h2>Ask OwnerPilot AI.</h2>
              <p>
                Get plain-English guidance for California property owners and route into the right workflow when you are ready to act.
              </p>
            </div>
            <div className="prompt-box">
              {chatPrompts.map((prompt) => (
                <Link key={prompt} href="/chat" className="prompt-link">{prompt}</Link>
              ))}
              <Link className="primary-btn chat-btn" href="/chat">Ask Now <ArrowIcon /></Link>
            </div>
          </div>
        </section>

        <section className="final-cta shell">
          <h2>Start with the notice. Stay on track after printing.</h2>
          <p>Your RiskPath&trade; stays open so you can come back and finish the service record.</p>
          <Link className="primary-btn" href="/notice/3-day">Create Your 3-Day Notice <ArrowIcon /></Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
