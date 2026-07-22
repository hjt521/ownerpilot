// components/marketing/Features.tsx
// Lane 8 Surface 3 — features section. Copy verbatim from the materialization.

const FEATURES = [
  {
    heading: 'Chat-first, not a 14-page form',
    body: 'Walk through your situation in plain English. Our AI assistant asks the questions that matter — rent owed, payment dates, who’s on the lease — and pulls the right form for your jurisdiction. No legal jargon, no 14-page wizard. You answer, we check your address against California broker-supervised jurisdiction rules, and you get the notice.',
  },
  {
    heading: 'Real broker review when it counts',
    body: 'If your address sits at a jurisdictional boundary that automated checks can’t resolve, we route it to our California licensed real estate broker (CalDRE B9445457) for personal review — usually within 24 hours. You get an email when it’s confirmed; you keep editing your draft in the meantime. We do not file with the court, do not serve papers, and do not give legal advice.',
  },
  {
    heading: 'We route you to counsel when we should',
    body: 'Every notice goes through the same broker-supervised resolution process: check the property’s jurisdiction, match the situation to the right California statutory path, surface anything that needs independent counsel before producing. When a situation falls outside our document-preparation scope — bankruptcy filings, tenant death, subsidized housing disputes — we route you to consult a California licensed attorney instead of producing a notice that might not fit.',
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-14">
      <h2 className="text-2xl font-semibold">Built for California landlords. Supervised by a California broker.</h2>
      {/* Lane 8 §3.1: abstract jurisdiction-check illustration (Canva-generated per ratified
          feature_jurisdiction_check prompt — CA map + gold push-pin threaded to a chat phone,
          no legible text, no people). Decorative (alt=""), so it adds no copy claims. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/feature_jurisdiction_check_v2.jpg"
        alt=""
        className="mx-auto mt-8 w-full max-w-sm rounded-xl"
      />
      <div className="mt-8 grid gap-8 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.heading}>
            <h3 className="text-lg font-semibold">{f.heading}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-700">{f.body}</p>
          </div>
        ))}
      </div>
      {/* Resolve & Document illustration removed (Ruling 5 / shipped-surface inventory 2026-07-14, disposition (c)):
          it depicted an unshipped interactive Resolve & Document surface. Returns automatically if the product ships. */}
    </section>
  );
}
