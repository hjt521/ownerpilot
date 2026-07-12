// components/chat/LockedText.tsx
// FF-3 Block C — render a locked-prose string that uses the manifest's **bold** convention, without a markdown
// library. The text is displayed VERBATIM (the ** markers are the only thing transformed, into <strong>); no words
// are added, removed, or reordered. Used for the reconciliation card body and the resume card.

'use client';
import { Fragment } from 'react';

export function LockedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className={className}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </p>
  );
}
