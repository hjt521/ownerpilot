/** Shared site footer — R1a design system (Concept #1).
    Disclosure paragraph is a DRAFT for JT preview approval: broker positioning
    per the redesign direction; retains "attorney" per JT (2026-06-12). */
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-brand text-white">
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-10">
        <p className="font-serif text-lg font-bold">
          OwnerPilot<span className="text-gold">.AI</span>
        </p>
        <p className="max-w-3xl text-sm leading-relaxed text-white/75">
          OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.
        </p>
        <p className="text-xs text-white/50">
          © {new Date().getFullYear()} OwnerPilot AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
