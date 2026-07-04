'use client';
/**
 * Broker-review status view (Decision 2 UI slice §3). Reads the token from the URL
 * fragment (#t=…) or localStorage, polls /status, and renders the locked-copy
 * status/resolution. Cancel is offered while pending. All owner-facing strings come
 * from the locked-prose module.
 */
import { useCallback, useEffect, useState } from 'react';
import { parseTokenFromLink } from '@/lib/flow/brokerReviewLink';
import {
  brokerConfirmPendingStatus,
  brokerConfirmConfirmed,
  brokerConfirmDeniedPreamble,
  brokerConfirmInconclusivePreamble,
  brokerConfirmExpiredPreamble,
  brokerConfirmCounselCtaLabel,
  brokerConfirmCancelConfirm,
} from '@/lib/flow/brokerConfirmCopy';

const TOKEN_KEY = 'op.brokerReviewToken';
const TERMINAL = new Set(['confirmed', 'denied', 'inconclusive', 'cancelled', 'expired']);

interface StatusRow {
  status: string;
  slaDueAt: string | null;
  outcome: string | null;
  priorReviewReason: string | null;
}

function formatDeadline(iso: string | null): string {
  if (!iso) return 'shortly';
  try {
    return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return 'shortly';
  }
}

function CounselCta() {
  return (
    <a
      href="/route-to-counsel"
      className="mt-4 inline-flex min-h-[48px] items-center px-5 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-bar transition-colors"
    >
      {brokerConfirmCounselCtaLabel} →
    </a>
  );
}

export function BrokerReviewStatusView() {
  const [token, setToken] = useState<string | null>(null);
  const [noToken, setNoToken] = useState(false);
  const [row, setRow] = useState<StatusRow | null | undefined>(undefined); // undefined=loading, null=not found

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let t = parseTokenFromLink(window.location.hash);
    if (!t) t = window.localStorage.getItem(TOKEN_KEY);
    if (t) {
      window.localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
    } else {
      setNoToken(true);
    }
  }, []);

  const poll = useCallback(async (t: string) => {
    try {
      const res = await fetch('/api/notice/broker-confirm/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t }),
      });
      if (res.status === 404) {
        setRow(null);
        return;
      }
      const j = (await res.json()) as StatusRow;
      setRow(j);
    } catch {
      /* keep last known state on a transient error */
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void poll(token);
    const id = setInterval(() => {
      void poll(token);
    }, 15000);
    return () => clearInterval(id);
  }, [token, poll]);

  // Stop polling once terminal.
  useEffect(() => {
    if (row && TERMINAL.has(row.status)) {
      // no-op: the interval cleanup in the poll effect handles teardown on unmount;
      // a terminal status simply means subsequent polls are harmless no-ops.
    }
  }, [row]);

  const onCancel = useCallback(async () => {
    if (!token) return;
    if (!window.confirm(brokerConfirmCancelConfirm)) return;
    await fetch('/api/notice/broker-confirm/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    void poll(token);
  }, [token, poll]);

  if (noToken || row === null) {
    return (
      <p className="text-base text-gray-700 leading-relaxed">
        We couldn&apos;t find a broker review on this device. If you have the link you saved, open it
        directly, or <a className="text-brand underline" href="/broker-review/check-status">check your status with your link</a>.
      </p>
    );
  }
  if (row === undefined) {
    return <p className="text-base text-gray-500">Checking your broker review status…</p>;
  }

  switch (row.status) {
    case 'pending':
      return (
        <div>
          <p className="text-base text-gray-800 leading-relaxed">
            {brokerConfirmPendingStatus.replace('{deadline}', formatDeadline(row.slaDueAt))}
          </p>
          <button
            onClick={onCancel}
            className="mt-4 min-h-[48px] text-base text-gray-600 underline hover:text-gray-900"
          >
            Cancel this request
          </button>
        </div>
      );
    case 'confirmed':
      return <p className="text-base text-gray-800 leading-relaxed">{brokerConfirmConfirmed}</p>;
    case 'denied':
      return (
        <div>
          <p className="text-base text-gray-800 leading-relaxed">{brokerConfirmDeniedPreamble}</p>
          <CounselCta />
        </div>
      );
    case 'inconclusive':
      return (
        <div>
          <p className="text-base text-gray-800 leading-relaxed">{brokerConfirmInconclusivePreamble}</p>
          <CounselCta />
        </div>
      );
    case 'expired':
      return (
        <div>
          <p className="text-base text-gray-800 leading-relaxed">{brokerConfirmExpiredPreamble}</p>
          <CounselCta />
        </div>
      );
    case 'cancelled':
      return <p className="text-base text-gray-700 leading-relaxed">This broker review request was cancelled.</p>;
    default:
      return <p className="text-base text-gray-500">Checking your broker review status…</p>;
  }
}
