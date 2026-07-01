// lib/chat/stalenessCopy.ts
// PR-B serve-time stale-facial-dates guard — owner-facing warning copy.
// Source: pr_b_staleness_scope_omnibus_broker_ruling_2026-07-01.md §6 (broker-authored, ratified verbatim).
//
// Three Tier-A locked-prose blocks: two warning branches selected deterministically on evaluateStaleness.reason
// (AMOUNT_CHANGED vs FACE_FIELD_CHANGED) + the acknowledgment button label. Flat string literals so the Shape-A
// locked-prose guard can extract + hash them. {{changedFields}} is the one interpolation slot, filled server-side
// from evaluateStaleness's human-readable field labels (no LLM in the copy path). Same copy renders on Surface 1
// (Review Generate pre-produce warning) and Surface 2 (riskpath row banner).
// EN ratified now; ES translations are deferred to the general ES ratification pass (§6.3) — not authored here.

export const chatStalenessWarningAmountChanged = `This notice is out of date. Since you produced it, the amount demanded changed ({{changedFields}}). A notice can't be re-served after its face has changed — you'll need to produce a new notice with the updated details before serving.`;

export const chatStalenessWarningFaceChanged = `This notice is out of date. Since you produced it, something on the notice changed ({{changedFields}}). A notice can't be re-served after its face has changed — you'll need to produce a new notice with the updated details before serving.`;

export const chatStalenessAckButton = `I understand — take me to produce a new notice`;
