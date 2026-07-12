// lib/chat/reconciliationCardOptions.ts
// FF-3 Block C §3.1 — parse the three owner selections out of the ratified entry-14 reconciliation card
// (chatFf3AmountReconciliationFlag). Per the amendment ratification §1: the three-way buttons render the ordinal
// sentences VERBATIM from the manifest string via a regex — never a hard-coded label array. If entry-14 is ever
// re-ratified, the buttons re-derive from the new text automatically.
//
// The card enumerates the options as bold ordinal sentences: **(1) …** / **(2) …** / **(3) …**. Each becomes a
// button whose label is the full ordinal sentence (including the ordinal) and whose value is the ordinal the
// produce gate expects as `reconciliationSelection`.

export interface ReconciliationOption {
  ordinal: '1' | '2' | '3';
  /** The full ordinal sentence, verbatim, including the leading "(N)". */
  label: string;
}

const OPTION_RE = /\*\*\((\d)\)\s*([^*]+?)\*\*/g;

/** Extract the three-way options from the (already interpolated) entry-14 card text, in document order. */
export function parseReconciliationOptions(card: string): ReconciliationOption[] {
  const out: ReconciliationOption[] = [];
  let m: RegExpExecArray | null;
  OPTION_RE.lastIndex = 0;
  while ((m = OPTION_RE.exec(card)) !== null) {
    const ord = m[1];
    if (ord === '1' || ord === '2' || ord === '3') {
      out.push({ ordinal: ord, label: `(${ord}) ${m[2].trim()}` });
    }
  }
  return out;
}
