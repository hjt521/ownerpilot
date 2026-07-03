// app/declaration-of-intent/page.tsx
// Lane W2 (omnibus §3.2) — Declaration of Intent to Evict scaffolding stub. 30/60/90-day termination notices are
// routed here (they don't file through the 3/5-day EFS flow). Body is the locked DECLARATION_OF_INTENT_STUB_EN;
// the single CTA is the LAHD forms page. 16px body / 48px tap target per the design rules.

import { lockedProse } from '@/lib/compliance/lockedProse';

// LockedKey: DECLARATION_OF_INTENT_STUB_EN
const BODY = lockedProse('DECLARATION_OF_INTENT_STUB_EN');
const LAHD_FORMS_URL = 'https://housing.lacity.gov/landlords/forms-notices';

export const metadata = {
  title: 'Declaration of Intent to Evict — OwnerPilot AI',
  description: 'Termination-of-tenancy notices (30/60/90-day) file through the LAHD Declaration of Intent to Evict pathway.',
};

export default function DeclarationOfIntentPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-semibold">Declaration of Intent to Evict</h1>
      <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-neutral-700">{BODY}</p>
      <a
        href={LAHD_FORMS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex min-h-[48px] items-center rounded-md bg-neutral-900 px-5 text-base text-white"
      >
        Open the LAHD forms page
      </a>
    </main>
  );
}
