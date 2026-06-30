// app/broker-review/[token]/page.tsx
// Lane 5 Decision 2 — owner-facing status page. Fetches /status server-side, renders one of 6 states
// using the Option-A locked-prose bodies (decision2 §2.E–§2.H). UNBLOCKED by the copy-conflict ruling.

import { brokerReviewStatusCopy, BROKER_REVIEW_COUNSEL_CTA, BROKER_CONFIRM_CANCEL_CONFIRM } from '@/lib/decision2/brokerConfirmCopy';

type Status = 'pending' | 'confirmed_la' | 'not_la' | 'inconclusive' | 'cancelled' | 'expired';
interface StatusResponse {
  status: Status;
  submittedAt: string;
  slaDueAt: string;
  resolvedAt: string | null;
  resolvedOutcome: string | null;
}

async function fetchStatus(token: string): Promise<StatusResponse | null> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const res = await fetch(`${base}/api/notice/broker-confirm/status?token=${encodeURIComponent(token)}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null; // 404 wrong-or-expired token → not found
  return res.json();
}

export const metadata = { title: 'Broker review status — OwnerPilot', robots: { index: false } };

export default async function BrokerReviewStatusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await fetchStatus(token);

  if (!data) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-semibold">Broker review status</h1>
        <p className="mt-4">We couldn&apos;t find a review for this link.</p>
      </main>
    );
  }

  const body = brokerReviewStatusCopy(data.status);
  const routesToCounsel = data.status === 'not_la' || data.status === 'inconclusive' || data.status === 'expired';
  const canCancel = data.status === 'pending';
  const canContinue = data.status === 'confirmed_la';

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-semibold">Broker review status</h1>
      <p className="mt-4 text-base leading-relaxed">{body}</p>

      {canContinue && (
        <a href="/chat" className="mt-8 inline-block min-h-[48px] rounded-md bg-neutral-900 px-5 py-3 text-white">
          Continue to notice
        </a>
      )}

      {routesToCounsel && (
        <a href="/route-to-counsel" className="mt-8 inline-block min-h-[48px] rounded-md bg-neutral-900 px-5 py-3 text-white">
          {BROKER_REVIEW_COUNSEL_CTA} →
        </a>
      )}

      {canCancel && (
        <form action="/api/notice/broker-confirm/cancel" method="post" className="mt-8">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="min-h-[48px] text-sm underline" aria-label={BROKER_CONFIRM_CANCEL_CONFIRM}>
            Cancel review request
          </button>
        </form>
      )}
    </main>
  );
}
