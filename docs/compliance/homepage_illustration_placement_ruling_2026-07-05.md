# Homepage Illustration Placement — Broker/Marketing Ruling — 2026-07-05

**From:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review

## Decision — Option B approved

| Decision | Ruling |
|---|---|
| Canonical homepage | `landing-variant.tsx` remains canonical |
| Root `/` behavior | Keep proxy rewrite to `/landing/default` |
| Image placement | Option B (illustrations as section accents; keep the functional hero preview) |
| `app/page.tsx` | Reconcile into the landing system; do not leave dead long-term |
| Ship timing | Build now behind preview; production waits until the §2.2 freeze clears |

Do NOT repoint root to `app/page.tsx`; do NOT remove the 7-variant UTM/ad landing infrastructure; do NOT replace the concrete hero product preview with an abstract illustration (weaker conversion).

## Ratified placement + copy (verbatim)

1. **`hero_chat_first_flow`** — band below the hero/trust strip, before "How it works":
   - Eyebrow: *AI-first workflow* · H2: **Start with a question. Move into the right workflow.**
   - Body: *OwnerPilot AI helps you understand the issue, then routes you into courtesy reminders, notice preparation, service tracking, written resolution records, and RiskPath™.*
2. **`feature_jurisdiction_check_v2`** — property-aware / jurisdiction feature section:
   - Eyebrow: *Built for California complexity* · H2: **Property-aware routing**
   - Body: *OwnerPilot checks live jurisdiction data, pauses when source confidence is insufficient, and routes the address to broker review when needed.*
3. **`feature_resolve_document`** — after-print / Serve & Track section:
   - Eyebrow: *After the notice* · H2: **The notice does not end at service.**
   - Body: *If the tenant pays, makes a payment plan, agrees to move out, or returns possession, OwnerPilot helps you create a written record and keep the next step organized.*
   - Labels: Record Payment · Create Payment Plan · Create Move-Out Agreement · Record Surrender

## `app/page.tsx` disposition

Harvest useful pieces into reusable components consumed by `landing-variant.tsx` (done: `AIFlowIllustrationBand`, `JurisdictionFeatureBand`, `ResolveDocumentBand`). After migration, reduce `app/page.tsx` to a preview/internal route or remove it once no longer needed. **Follow-up** — not done in the first PR to keep it focused and reversible.

## Ship timing (§2.2)

Build now in preview; do NOT ship to production until: env checks pass, broker-confirm flow passes end-to-end, mobile review is approved, copy audit confirms no banned terms, illustrations don't crowd the page, CTAs remain clear.

— Ruling adopted 2026-07-05.
