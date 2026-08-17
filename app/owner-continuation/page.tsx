// app/owner-continuation/page.tsx
// Public Owner Continuation scan shell. Contains no matter data. The inline bootstrap captures
// and scrubs the fragment synchronously before the client admission flow begins.

import type { Metadata } from 'next';
import { OwnerContinuationScan } from '@/components/owner-continuation/OwnerContinuationScan';

export const metadata: Metadata = {
  title: 'Continue your OwnerPilot record',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

const FRAGMENT_BOOTSTRAP = `(() => {
  const raw = window.location.hash;
  if (raw && raw.length > 1) {
    Object.defineProperty(window, '__opOwnerContinuationLocator', {
      value: raw.slice(1), configurable: true, enumerable: false, writable: false
    });
  }
  history.replaceState(null, '', window.location.pathname + window.location.search);
})();`;

export default function OwnerContinuationPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-12">
      <script dangerouslySetInnerHTML={{ __html: FRAGMENT_BOOTSTRAP }} />
      <OwnerContinuationScan />
    </main>
  );
}
