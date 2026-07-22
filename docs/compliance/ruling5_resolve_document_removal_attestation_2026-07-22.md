# Ruling 5 — Homepage/Landing "Resolve & Document" Removal — Attestation · 2026-07-22

**Scope:** Task #171 / Ruling 5 — remove the homepage "Resolve & Document" illustration and sweep the `/landing/*` variants for unshipped-capability marketing. Executes the **(c) removal** dispositions ratified in `marketing_tranche1_shipped_surface_inventory_2026-07-14.md` (§4 flagged the production homepage illustration as marketing an unshipped interactive surface; §5 ratified (c) removal for Resolve & Document and Move-Out Agreement). Pre-2026-07-28 flip.

**Supersession (standing ruling #4 — surfaced, not silent):** the 2026-07-05 `homepage_illustration_placement_ruling` approved a `ResolveDocumentBand` / `feature_resolve_document` homepage band. The 2026-07-14 inventory finding supersedes that approval — the band/illustration marketed an interactive Resolve & Document surface that is not shipped. This removal executes the later ruling.

## Removed (unshipped-surface marketing)

| Surface | File | What |
|---|---|---|
| Homepage features illustration | `components/marketing/Features.tsx` | `feature_resolve_document.jpg` schematic image |
| Homepage/landing illustration band | `components/marketing/HomepageIllustrations.tsx` | `ResolveDocumentBand()` — "The notice does not end at service" + Record Payment / Create Payment Plan / **Create Move-Out Agreement** / Record Surrender action labels |
| Canonical landing (`/landing/*`, served at `/`) | `components/landing-variant.tsx` | the `<ResolveDocumentBand/>` render + import; the **"Resolve & Document product lane"** section (incl. the **"Open Resolve & Document"** CTA and the "Create Move-Out Agreement" featured card); the `resolveCards` array; the `'Resolve & Document'` packet-list item; two Move-Out-Agreement copy references (workflow step-4 body + a chat prompt) trimmed to shipped language |

Outcome recordkeeping remains represented by the **shipped RiskPath surface** (workflow band + final CTA + RiskPath™ follow-up references retained — RiskPath is live). "Resolve & Record" as a workflow-phase name is retained; only the unshipped *interactive Resolve & Document / Move-Out Agreement product surfaces* are removed. All removed items are disposition-(c) "pending product ship" — they return automatically if/when the product ships.

## Flagged, NOT changed here — needs a broker wording call

**Photo capture (`/landing/*`) — inventory disposition (a) reframe, not (c) removal.** The landing variant still carries timestamped-photo-capture claims the inventory flagged as unshipped: the `'Photo Proof of Posting'` packet item, the `#photo-proof` section, and "Capture and timestamp posting photos from your phone for the owner record." The inventory ruled these should be **reframed** around the shipped proof-of-service + service-log discipline — which requires authoring replacement marketing copy on the canonical (broker-ratified) homepage. Rather than write that copy unilaterally, it's surfaced for a wording decision. Recommendation: reframe "capture and timestamp posting photos" → the shipped service-log / proof-of-service framing; keep the `Timestamped` status pill only if the serve flow genuinely records a timestamp. **This is the one remaining `/landing/*` unshipped-capability item.**

## Verification

- `tsc --noEmit`: **0 errors** (removed-symbol references cleaned).
- Guards green: `ci:verify-banned-terms`, `ci:check-attorney-attribution`, `ci:verify-analytics-no-pii`.
- No orphaned references to `ResolveDocumentBand` / `resolveCards`.
- No shipped surface touched: `/chat`, `/notice/3-day`, `/notice/3-day/serve`, RiskPath references retained.

— Engineering · Ruling 5 Resolve & Document removal · 2026-07-22
