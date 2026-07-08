/** Shared site footer — R1a design system (Concept #1).
    Disclosure paragraph is a DRAFT for JT preview approval: broker positioning
    per the redesign direction; retains "attorney" per JT (2026-06-12). */
import { DoNotSellLink } from "@/components/DoNotSellLink";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-brand text-white">
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-10">
        <p className="font-serif text-lg font-bold">
          OwnerPilot<span className="text-gold">.AI</span>
        </p>
        <p className="max-w-3xl text-sm leading-relaxed text-white/75">
          OwnerPilot AI is not a law firm and does not provide legal advice. OwnerPilot provides broker-supervised document preparation workflows and recordkeeping tools for California property owners. For legal advice about your specific situation, consult a California licensed attorney.
        </p>
        <p className="text-xs text-white/60">California Licensed Real Estate Broker · CalDRE B9445457</p>
        {/* CCPA/CPRA "Do Not Sell or Share" opt-out link (Lane 6 §Q). */}
        <div className="text-sm text-white/75 [&_a]:text-white/90"><DoNotSellLink /></div>
        <p className="text-xs text-white/50">
          © {new Date().getFullYear()} OwnerPilot AI. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
