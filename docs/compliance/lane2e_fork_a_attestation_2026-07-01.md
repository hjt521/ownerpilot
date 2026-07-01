# LANE 2E — Fork A Wiring Attestation (Engineering → Broker Countersign)

**Re:** `lane2e_persona_render_mechanism_broker_ruling_2026-07-01.md` (Fork A) + `lane2e_persona_prose_broker_ruling_2026-07-01.md` (§§2-5 verbatim prose).
**Filed by:** engineering, 2026-07-01. Awaiting broker countersign (§7 of the render ruling) before merge.
**Branch:** to be opened by JT (all git is operator-run). from-chat §5.1 + PR-A3 docs remain uncommitted for the PR-A3 branch and are NOT part of this change set.

---

## §1 — Mechanism basis (cited)

- Render mechanism: `lane2e_persona_render_mechanism_broker_ruling_2026-07-01.md` §§2-4 (Fork A — server emits the four ratified blocks verbatim; the LLM is not called for the four capture categories; all guardrails are server-deterministic).
- Prose source: `lane2e_persona_prose_broker_ruling_2026-07-01.md` §§2-5 (four blocks + guardrail re-asks, ratified verbatim v1; ES PROVISIONAL).
- Schema shapes: `lane2e_schema_checkpoint_broker_ruling_2026-07-01.md` §§2-3 (tri-state `DisputeAnswer`; 4-value `SignerCapacity`) and `pr_a3_intake_produce_completeness_broker_ruling_2026-07-01.md` §4.1 (four field categories) — already landed at 72c6617 (#116).

## §2 — What was wired

1. **`lib/chat/persona.ts`** — 25 EN + 4 PROVISIONAL ES verbatim capture-turn constants appended **after** `OWNERPILOT_PERSONA_SYSTEM_PROMPT`. Each is a flat string literal (guard-extractable). Two additional constants are marked **PROPOSED** (see §5) and are deliberately NOT manifest-locked.
2. **`lib/chat/scriptedCapture.ts`** (new) — the deterministic reducer: `beginCapture` / `stepCapture` emit the verbatim constants (owner-slot interpolation only) and parse owner replies via pure exported parsers (`parseFullDate`, `parseAmount`, `parseTriState`, `parseContinuation`, `parseIndividualOrEntity`, `parseTitleToCapacity`, `parseConfirm`, `parseDays`, `parseHours`). No model-mediated fallback: unclassifiable input → verbatim re-ask; two failed attempts on a field → save-and-resume escalation.
3. **`lib/chat/scriptedOrchestrate.ts`** (new) + **`app/api/chat/route.ts`** — turn-level glue. A cursor (stored in the emitted assistant turn's `transcript.metadata.capture`; **no new column**, `intake_state` stays clean) drives the flow: cursor active → deterministic step, **LLM not called**; else on the transition turn the LLM is called only to extract the last non-scripted field and its reply is **overridden** with the verbatim first-ask (the LLM never authors a scripted prompt). Scripted categories chain contiguously; on completion of all four, route to review.
4. **`docs/compliance/locked_prose_manifest.json`** — 29 new Shape-A entries (as-built schema, no `entry_id`), hashes computed from the live constants.

## §3 — Evidence

- **Verbatim emission (on the wire):** `scriptedCapture.ts` returns the exact constants (`grep`): L294/297/300 first-asks, L306 dispute framing+Q1 (`\n\n`-joined per ruling §6), signer acks L391/434. The integration suite asserts `beginCapture(...).reply === chatIntake...Prompt` byte-for-byte.
- **No LLM in the scripted path:** `grep -c perplexity lib/chat/scriptedCapture.ts lib/chat/scriptedOrchestrate.ts` → `0`, `0`.
- **Tri-state fidelity:** `parseTriState('not sure') === 'unknown'` and `'unknown'` persists through to the stored value without collapsing to `'no'` (asserted).
- **Tests:** `lib/chat/scriptedCapture.test.ts` 61/0; `lib/chat/scriptedOrchestrate.test.ts` 13/0; existing `intakeSchemaLane2e.test.ts` 16/0 and `toNoticeFlowData.test.ts` 12/0 still green. Full run: **15 suites, 0 failed**. `tsc --noEmit` clean.
- **Locked-prose guard:** PASS — Shape-A now 39 entries; 93 locked entries verified across both manifests; no dangling references.
- **Banned-terms lint:** OK (persona.ts new EN + ES strings in scope, clean).
- **System-prompt lock UNCHANGED:** `check_system_prompt_lock.mjs` PASS, sha256 `f3991a92…4b5451`, 6266 bytes — Fork A did **not** re-lock `persona.lock.json` (constants appended after the hashed literal), so no operator re-review of the system prompt is triggered.

## §4 — Deviations from parent rulings (§8 rule of construction)

1. **Mechanism-basis correction** (render ruling §5): prose ruling §§7-8 assumed an LLM-reply flow; the mechanism is now Fork A deterministic emission. §8's countersign conditions are enforceable as ruled.
2. **Manifest count correction** (render ruling §6): the pre-append Shape-A manifest had **10** entries (not "8" and not the "11" cited in the escalation — actual count verified from the file). Lane 2E appends **29**, for **39** total. No `entry_id` field. The "four concatenated block constants" model in prose ruling §6 is superseded by **per-string constants** (one hashed constant per owner-facing string), which is what Fork A requires ("manifest hashes lock the actual bytes the owner sees") and what the flat-literal guard extractor supports. Count breakdown: 25 EN (8 rent + 7 signer + 5 personal-delivery + 5 dispute) + 4 PROVISIONAL ES first-asks.
3. **Cursor storage:** `transcript.metadata.capture` (jsonb), chosen over a new column to honor the Lane 2E "no new columns / intake_state stays clean" posture.

## §5 — PROPOSED strings (engineering proposes; broker ratifies → then manifest-locked)

Per render ruling §3.1 and §3, two owner-facing strings had no ratified text. Proposed below; NOT in the manifest until ratified:

- **Continuation-ambiguity re-ask** (§3.1) — `chatIntakeRentPeriodsReAskContinuationProposed`:
  > "Sorry — I didn't catch whether you want to add another period. Is there another rent period to include on this notice, or is this everything?"
- **Two-attempt escalation → save-and-resume** (§3) — `chatIntakeCaptureEscalationProposed`:
  > "Let's not get stuck here. I'll save what we have so far so you don't lose it — you can come back and finish this step anytime. Would you like me to email you a link to pick up where you left off?"

On ratification I add their manifest entries (Shape-A) and the count becomes 41.

## §6 — OPEN ITEM requiring a broker ruling: entity `entityType` capture gap

**Finding (surfaced, not defaulted).** The ratified §3 signer prose captures capacity → entity legal name → title → confirmation. But `signerCaptureSchema` requires `entityType` (`llc | corporation | lp | gp | trust | other`) for the entity branch, and prose ruling §3.4 **prohibits inferring entityType from the entity name**. No ratified prompt asks entityType. Therefore the deterministic flow **cannot** complete a schema-valid entity signer value without either (a) a new ratified prompt that asks entityType explicitly, or (b) a corporate-landlord render-derivation ruling.

**What engineering did NOT do:** it did not fabricate, default, or infer `entityType`. The entity path emits the captured value **without** `entityType` and flags `gap: 'entity_entityType_uncaptured'` (asserted in tests: the entity value intentionally fails `signerCaptureSchema` until ruled). This is the same anti-defaulting discipline as the day-count and produce-completeness work — surface, do not paper over.

**Impact:** individual-owner signer capture is complete and unaffected. Entity-landlord notices are blocked at signer capture pending this ruling. Requesting the broker's call: new ratified entityType prompt (engineering will wire + hash it) vs. render-derivation.

## §7 — Non-changes (render ruling §9 preserved)

The four ratified prose strings are byte-verbatim (guard-hashed). Tri-state `DisputeAnswer` and 4-value `SignerCapacity` untouched. G4 fires on `'yes'`, not on `'unknown'` — untouched (this change writes the value; downstream gate machinery consumes it unchanged). Existing 10 manifest entries untouched. `OWNERPILOT_PERSONA_SYSTEM_PROMPT` + `persona.lock.json` untouched. `refusalBank.ts` untouched. LLM continues to drive all non-scripted turns.

## §8 — Countersign request

Requesting broker countersign per render ruling §7. This packet references the true entry count (39; 41 after the two PROPOSED strings ratify) and no `entry_id` field, per §6/§7 of the render ruling. Two items await broker action before Lane 2E is fully closed: (1) ratify the two §5 PROPOSED strings; (2) rule the §6 entityType capture gap. Neither blocks countersign of the mechanism + the 29 ratified-prose entries as wired.

— Engineering · 2026-07-01
