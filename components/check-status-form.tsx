'use client';
/**
 * Check-status form (Decision 2 UI slice §3.3). Owner pastes their saved review
 * link; we parse the token and redirect to the canonical status page (token in the
 * fragment). Locked copy for the field label, button, and error.
 */
import { useState } from 'react';
import { parseTokenFromLink, buildStatusLinkPath } from '@/lib/flow/brokerReviewLink';
import { checkStatusFieldLabel, checkStatusButton, checkStatusError } from '@/lib/flow/brokerConfirmCopy';

export function CheckStatusForm() {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = parseTokenFromLink(value);
    if (!token) {
      setError(true);
      return;
    }
    window.location.href = buildStatusLinkPath(token);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6">
      <label htmlFor="review-link" className="block text-base font-medium text-ink">
        {checkStatusFieldLabel}
      </label>
      <input
        id="review-link"
        type="text"
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(false); }}
        className="mt-2 w-full min-h-[48px] rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-brand focus:outline-none"
        placeholder="https://www.ownerpilot.ai/broker-review/status#t=…"
        autoComplete="off"
      />
      {error && <p className="mt-2 text-sm text-red-700 leading-relaxed">{checkStatusError}</p>}
      <button
        type="submit"
        className="mt-4 inline-flex min-h-[48px] items-center px-6 py-3 bg-brand text-white font-semibold rounded-lg hover:bg-brand-bar transition-colors"
      >
        {checkStatusButton}
      </button>
    </form>
  );
}
