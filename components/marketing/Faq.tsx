// components/marketing/Faq.tsx
// Lane 8 Surface 6 — the 4 new FAQ items (added as the FIRST 4; existing items remain). Copy verbatim.

const NEW_FAQ_ITEMS = [
  {
    q: 'How does the chat work?',
    a: 'You answer questions about your tenant situation in plain English. Our AI extracts the details we need — rent owed, payment dates, lease terms — and confirms each one with you before producing a notice. You can edit any answer; the AI re-checks the jurisdiction and statutory path each time.',
  },
  {
    q: 'What if my address is at a jurisdiction boundary?',
    a: 'If our automated checks can’t confidently identify which city’s rules apply, we route your address to our California licensed real estate broker (CalDRE B9445457) for personal review. You typically hear back within 24 hours by email. While you wait, you can keep filling out the notice details — we just hold off on producing the PDF until the jurisdiction is confirmed.',
  },
  {
    q: 'When does OwnerPilot route me to an attorney instead of producing a notice?',
    a: 'When your situation involves bankruptcy filings, a tenant who has passed away, subsidized housing disputes, mobilehome parks, commercial tenancies, or other circumstances that fall outside California broker-supervised document preparation. In those cases we route you to consult independent counsel rather than producing a notice that might not fit your situation. We do not sell, bundle, or take referral fees from any attorney.',
  },
  {
    q: 'What does broker-supervised mean?',
    a: 'OwnerPilot is built and operated under California real estate broker supervision (CalDRE B9445457) with defined document-preparation boundaries. The broker authored the templates and supervises the workflows that fill them with your inputs. We are not a law firm, do not provide legal advice, and do not represent you in court.',
  },
];

/** Render before the existing FAQ items (Lane 8 Surface 6 placement: "first 4 items"). */
export function NewFaqItems() {
  return (
    <>
      {NEW_FAQ_ITEMS.map((item) => (
        <details key={item.q} className="border-b border-neutral-200 py-4">
          <summary className="cursor-pointer text-base font-medium">{item.q}</summary>
          <p className="mt-2 text-sm leading-relaxed text-neutral-700">{item.a}</p>
        </details>
      ))}
    </>
  );
}
