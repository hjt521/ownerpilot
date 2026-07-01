# LANE 2E — Fork A Amendment Attestation (omnibus §3 + §4 wired)

**Re:** `lane2e_fork_a_countersign_and_open_items_omnibus_broker_ruling_2026-07-01.md` (countersign + §3 ratified re-asks + §4 entityType ruling).
**Filed by:** engineering, 2026-07-01. Fast-follow to the countersigned Fork A merge (#117). Confirms the two open items are wired; no new broker action required.

## §1 — omnibus §3 (two ratified re-asks) — WIRED

Both engineering-proposed strings were ratified verbatim (omnibus §3). Wired as-ratified:

- `chatIntakeRentPeriodsReAskContinuation` (was `…ReAskContinuationProposed`) — continuation-ambiguity re-ask.
- `chatIntakeCaptureEscalation` (was `…EscalationProposed`) — two-attempt save-and-resume escalation.

Both are now flat Tier-A constants in `persona.ts` and manifest-locked (Shape-A). No byte change to the ratified text — only the `Proposed` suffix dropped from the identifier.

## §2 — omnibus §4 (entity entityType capture gap) — RULED (a) WIRED

Per the ruling (Option (a): ask the owner; render-derivation refused), the entity signer sequence now captures `entityType` directly:

- **Prose:** `chatIntakeSignerEntityTypePrompt` + `chatIntakeSignerEntityTypeReAsk` added to `persona.ts` (EN ratified; ES deferred to the general ES pass per §4.7), manifest-locked. `{{entityName}}` owner-slot only.
- **Placement:** capacity → entity name → **entityType** → title → confirm (omnibus §4.1).
- **Parser:** `parseEntityType` returns `llc | corporation | lp | gp | trust | other | null` with the §4.3 ordering enforced (`llc` before `corporation`; `limited partnership` before `general partnership`) — same word-boundary discipline as the property-manager-vs-broker fix. Asserted: `parseEntityType('LLC — well, kind of a corp') === 'llc'`; `'a limited partnership' === 'lp'`.
- **Gap closed:** the entity path now persists `entityType` and produces a **schema-valid** `signerCaptureSchema` value. The `gap: 'entity_entityType_uncaptured'` flag is removed (no residual references). Asserted end-to-end: `signerCaptureSchema.safeParse(entityValue).success === true`.

## §3 — Verification

- **Manifest:** 43 Shape-A entries (39 prior + 2 §3 + 2 §4), matching the ruling's expected count. No `entry_id`. Hashes computed from live constants.
- **Guard:** PASS — 43 Shape-A, 97 total across both manifests, no dangling references.
- **Tests:** `scriptedCapture.test.ts` 71/0 (adds `parseEntityType` coverage + entity path now asserts schema-valid completion); `scriptedOrchestrate.test.ts` 13/0; full run remains green.
- **tsc** clean · **banned-terms** OK (new EN strings in scope) · **system-prompt lock** unchanged (`f3991a92…4b5451`).

## §4 — Non-changes

Prose bytes of the four Fork A blocks + the two ratified re-asks unchanged. `scriptedOrchestrate.ts`, `route.ts`, `dbTypes.ts` unchanged in this fast-follow. Tri-state / G4 behavior untouched. ES entityType strings deferred (omnibus §4.7), not fabricated.

**Lane 2E is complete pending merge.** On merge, PR-A3 §5.2 (Review-step client port) resumes on the merged base per the omnibus §6 sequencing.

— Engineering · 2026-07-01
