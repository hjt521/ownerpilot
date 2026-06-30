// components/DoNotSellLink.tsx
// Lane 6 Analytics §Q — CCPA "Do Not Sell" footer link (master prompt §4.4). Copy = locked-prose DISCLAIMER_DO_NOT_SELL_HEADER.

import { lockedProse } from '@/lib/compliance/lockedProse';

// LockedKey: DISCLAIMER_DO_NOT_SELL_HEADER
const label = lockedProse('DISCLAIMER_DO_NOT_SELL_HEADER');

export function DoNotSellLink() {
  return (
    <a href="/privacy-request" className="text-sm underline">
      {label}
    </a>
  );
}
