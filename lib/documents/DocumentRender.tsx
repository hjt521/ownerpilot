// lib/documents/DocumentRender.tsx
// Parametrized server-render for the 6 Resolve & Document v1 paths. Composition: title → field table (from
// captured_payload) → locked clause(s) → locked disclaimer (+ UD footer) → broker attribution. Reservation slot
// is INERT (G2 — not rendered). Clauses are byte-exact locked prose; only the field table is data-driven.
// G8: the produced document is the legitimate full-data surface (unlike transcript_snapshot).

import { DOCUMENT_PATHS, type DocumentPathId } from '@/lib/riskpath/paths';
import { clausesForPath, clauseBody, disclaimerForPath, udFooterForPath, BROKER_ATTRIBUTION } from './clauses';

export interface DocumentRenderProps {
  path: DocumentPathId;
  /** captured_payload snapshot (field → value). */
  payload: Record<string, unknown>;
  mutualLeaseTermination?: boolean;
}

function fieldRows(payload: Record<string, unknown>): { k: string; v: string }[] {
  return Object.entries(payload).map(([k, raw]) => ({
    k: k.replace(/_/g, ' '),
    v: Array.isArray(raw) ? raw.join(', ') : String(raw ?? ''),
  }));
}

/** Server component → HTML; handed to the PDF pipeline (lib/documents/pdf.ts). */
export function DocumentRender({ path, payload, mutualLeaseTermination = false }: DocumentRenderProps) {
  const spec = DOCUMENT_PATHS[path];
  const title = mutualLeaseTermination && path === 'move_out_agreement'
    ? 'Move-Out Agreement / Mutual Lease Termination & Surrender'
    : spec.pdfTitle;
  const clauses = clausesForPath(path, mutualLeaseTermination);
  const udFooter = udFooterForPath(path);

  return (
    <article className="document">
      <h1>{title}</h1>

      <table className="fields">
        <tbody>
          {fieldRows(payload).map((r) => (
            <tr key={r.k}><th>{r.k}</th><td>{r.v}</td></tr>
          ))}
        </tbody>
      </table>

      {/* Locked clause(s) — byte-exact; no in-clause interpolation. */}
      {clauses.map((id) => <p key={id} className="clause">{clauseBody(id)}</p>)}

      {/* Locked disclaimer footer (the 5 §7 disclaimers) + UD footer where applicable. */}
      <p className="disclaimer">{disclaimerForPath(path)}</p>
      {udFooter && <p className="disclaimer ud-footer">{udFooter}</p>}

      <p className="attribution">{BROKER_ATTRIBUTION}</p>
      {/* RESERVATION_OF_RIGHTS_SLOT is inert (G2) — intentionally not rendered. */}
    </article>
  );
}
