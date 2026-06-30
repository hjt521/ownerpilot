// components/marketing/FooterLegal.tsx
// Lane 8 Surface 8 — footer legal block: broker-supervised disclaimer (locked) + Do-Not-Sell link (Lane 6).
// Mount inside the existing components/site-footer.tsx (do not clobber that file). DoNotSellLink ships in Lane 6.

import { lockedProse } from '@/lib/compliance/lockedProse';
import { DoNotSellLink } from '@/components/DoNotSellLink';

// LockedKey: DISCLAIMER_BROKER_SUPERVISED
const disclaimer = lockedProse('DISCLAIMER_BROKER_SUPERVISED');

export function FooterLegal() {
  return (
    <div className="mt-6 space-y-2 text-sm text-neutral-500">
      <p>{disclaimer}</p>
      <DoNotSellLink />
    </div>
  );
}
