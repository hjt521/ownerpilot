# Lane 2E — Fork A Wiring Countersign + §5/§6 Open-Items Omnibus (Broker Ruling)

**Re:** `lane2e_fork_a_attestation_2026-07-01.md` (engineering, 2026-07-01)
**Parent rulings:**
- `lane2e_persona_render_mechanism_broker_ruling_2026-07-01.md` (Fork A)
- `lane2e_persona_prose_broker_ruling_2026-07-01.md` (§§2-5 verbatim prose)
- `lane2e_schema_checkpoint_broker_ruling_2026-07-01.md` (tri-state DisputeAnswer, 4-value SignerCapacity)
- `pr_a3_intake_produce_completeness_broker_ruling_2026-07-01.md` (four missing capture categories → Lane 2E)

**Disposition:** COUNTERSIGNED with two subsequent rulings folded in (§5 PROPOSED strings ratified; §6 entityType capture gap ruled).

---

## §1 — Mechanism countersign (attestation §§1-3)

**Countersigned.** The wired mechanism matches the Fork A ruling on every attested dimension:

1. **Verbatim emission on the wire.** `scriptedCapture.ts` returns the ratified constants byte-for-byte; the integration suite asserts `beginCapture(...).reply === chatIntake...Prompt`. Grep evidence on L294/297/300 (first-asks), L306 (dispute framing+Q1 with `\n\n` join per prose ruling §6), L391/434 (signer acks). Matches render ruling §2 ("server emits ratified verbatim blocks") and §4 ("LLM not called for the four capture categories").
2. **Deterministic parsers, no model fallback.** Nine pure parsers cover every guardrail branch specified in render ruling §3: `parseFullDate`, `parseAmount`, `parseTriState`, `parseContinuation`, `parseIndividualOrEntity`, `parseTitleToCapacity`, `parseConfirm`, `parseDays`, `parseHours`. `grep -c perplexity` on both scripted modules → 0/0. Matches render ruling §3.3 ("Model-mediated fallback prohibited") and §3.4 ("Deterministic parser for tri-state").
3. **Tri-state fidelity.** `parseTriState('not sure') === 'unknown'` persists to storage without collapsing to `'no'` — asserted directly. This is the core compliance property the tri-state DisputeAnswer type exists to protect. Matches schema-checkpoint ruling §2 and prose ruling §5.
4. **Two-attempt escalation.** After two failed parses on a field, the flow escalates to save-and-resume rather than looping. Matches render ruling §3 ("two failed attempts → verbatim escalation").
5. **Turn-level glue is safe.** Cursor active → deterministic step, LLM not called. Transition turn → LLM extracts the last non-scripted field, then its reply is overridden with the verbatim first-ask. The LLM never authors a scripted prompt. Matches render ruling §4 ("The four capture-turn prompts are emitted verbatim from the server; the LLM never authors them").
6. **`persona.lock.json` UNCHANGED.** SHA-256 `f3991a92…4b5451`, 6266 bytes, `check_system_prompt_lock.mjs` PASS. Constants appended after the hashed literal, as render ruling §5 required. No operator re-review of the system prompt is triggered — correct.
7. **Cursor storage in `transcript.metadata.capture` (jsonb).** No new column, `intake_state` stays clean. Consistent with the Lane 2E "no new columns" posture. Approved.
8. **29 Shape-A manifest entries, per-string constants, no `entry_id`.** Hashes computed from the live constants. Guard PASS (39 Shape-A total; 93 across both manifests; no dangling references). Approved.

**Evidence bars cleared:** tsc clean · 15 suites / 0 failed (new `scriptedCapture.test.ts` 61/0 + `scriptedOrchestrate.test.ts` 13/0; existing 16/0 + 12/0 hold) · locked-prose guard PASS · banned-terms lint clean · system-prompt lock unchanged.

## §2 — Deviations disposition (attestation §4)

All three deviations reconcile under **as-built parity** (render ruling §8) — drafting-error type, not compliance-behavior. No fresh ruling required for the mechanism to merge.

1. **Mechanism-basis correction.** Prose ruling §§7-8 assumed an LLM-reply flow; render ruling superseded that. Prose ruling §§7-8 are hereby amended by the render ruling — noted for the record; already folded in.
2. **Manifest count correction.** Pre-append count was **10**, not 8 or 11. Post-append: **39** (41 once the two §5 PROPOSED strings ratify — see §3 below, which brings it to 41). No `entry_id` field. **Corrections ratified for the record.** Neither figure "8" nor "11" from earlier documents is authoritative; the live file is.
3. **Per-string constants supersedes "four concatenated blocks."** This is the correct Fork A shape ("hashes lock the actual bytes the owner sees") and the only shape the flat-literal extractor supports. **Ratified as the Lane 2E manifest shape.** Prose ruling §6 is amended: the "four concatenated block constants" wording is superseded by per-string constants (25 EN + 4 PROVISIONAL ES first-asks, breaking down 8 rent + 7 signer + 5 personal-delivery + 5 dispute).

## §3 — §5 PROPOSED strings — RATIFIED

Engineering proposed two owner-facing strings that had no ratified text in the prose ruling. I'm ratifying both verbatim as proposed. They may be manifest-locked on receipt of this ruling.

### §3.1 — `chatIntakeRentPeriodsReAskContinuationProposed` → RATIFIED as `chatIntakeRentPeriodsReAskContinuation`

**Verbatim:**

> Sorry — I didn't catch whether you want to add another period. Is there another rent period to include on this notice, or is this everything?

**Basis:** the ratified rent-period continuation prompt (prose ruling §2) asks a two-option question ("another period" vs. "this is everything"). This re-ask preserves the same two-option shape verbatim, opens with a brief non-blaming acknowledgment ("Sorry — I didn't catch"), and does not add a new option. Consistent with the Fork A re-ask discipline (render ruling §3: deterministic re-ask on unclassifiable input) and with prose ruling §3.1's phrasing style for the other guardrail re-asks. **No changes.**

### §3.2 — `chatIntakeCaptureEscalationProposed` → RATIFIED as `chatIntakeCaptureEscalation`

**Verbatim:**

> Let's not get stuck here. I'll save what we have so far so you don't lose it — you can come back and finish this step anytime. Would you like me to email you a link to pick up where you left off?

**Basis:** matches the two-failed-attempt escalation posture in render ruling §3 (save-and-resume, not loop). Opens by de-escalating ("Let's not get stuck here"), promises no data loss, and asks a yes/no continuation question the deterministic parser (`parseConfirm`) can handle. The offered mechanism (emailed resume link) is consistent with the save-and-resume flow already referenced in the render ruling — engineering wires that flow separately; this is the owner-facing surface. **No changes.**

**Both strings ratified.** Engineering: add manifest entries (Shape-A, no `entry_id`), hashes computed from the live constants. Post-ratification manifest count: **41** Shape-A entries. Guard re-run required after append.

## §4 — §6 OPEN ITEM: entity `entityType` capture gap — RULED

**Finding recap.** `signerCaptureSchema` requires `entityType ∈ {llc | corporation | lp | gp | trust | other}` on the entity branch. Prose ruling §3.4 prohibits inferring `entityType` from the entity name. No ratified prompt asks it. The deterministic flow cannot produce a schema-valid entity signer without either (a) a ratified `entityType` prompt or (b) a render-derivation ruling. Engineering surfaced the gap (`gap: 'entity_entityType_uncaptured'`) rather than defaulting — correct discipline, matches the day-count and produce-completeness precedents.

**Ruling: Option (a) — new ratified `entityType` prompt.** Render-derivation refused for the same reason inferring from the name is refused: `entityType` carries legal-consequence downstream (the mailbox rule, service posture, and forfeiture-election language differ across entity types), and a rendered guess is not distinguishable at the compliance layer from an inferred guess. The owner is the only reliable source. This is consistent with the Fork A anti-defaulting posture and with §3.4 of the prose ruling.

### §4.1 — Placement in the signer capture sequence

After capacity is captured as `entity_representative` and after the entity legal name is captured, before the title question. Rationale: the parser branches on entity-vs-individual at capacity; entityType is meaningless on the individual branch; asking after the name gives the owner the name in front of them (grounds the question) and before the title (title-to-capacity mapping does not depend on entityType).

### §4.2 — Ratified verbatim string — `chatIntakeSignerEntityTypePrompt`

> Got it — {{entityName}}. What kind of entity is that? An LLC, a corporation, a limited partnership, a general partnership, a trust, or something else?

**Notes:**
- Owner-slot interpolation only (`{{entityName}}`), consistent with the flat-literal guard.
- Lists all six ratified `entityType` values in owner-facing plain English. "something else" maps to `other`.
- Opens with acknowledgment ("Got it — {{entityName}}.") to keep the register consistent with the surrounding signer capture prose.

### §4.3 — Deterministic parser (`parseEntityType`)

Return type: `'llc' | 'corporation' | 'lp' | 'gp' | 'trust' | 'other' | null`. Match rules (case-insensitive, word-boundary; same discipline as `parseTitleToCapacity`):

- `'llc'` ← reply contains "llc" OR "l.l.c." OR "limited liability company"
- `'corporation'` ← reply contains "corp" (as a whole word or in "corporation" / "incorporated" / "inc") OR "corporation" OR "incorporated" OR bare "inc"
- `'lp'` ← reply contains "lp" (whole word) OR "l.p." OR "limited partnership" (before "gp"/"general partnership" match, since "partnership" is a substring)
- `'gp'` ← reply contains "gp" (whole word) OR "g.p." OR "general partnership"
- `'trust'` ← reply contains "trust"
- `'other'` ← reply contains any of: "other", "something else", "different", "none of"
- else → `null` (triggers re-ask via §4.4)

**Ordering matters.** Test `limited partnership` before `general partnership` (both contain "partnership"), and both before the "trust" branch. Test `llc` before `corporation` (an LLC-owner reply of "LLC — well, kind of a corp" should classify as `llc`). This mirrors the property-manager-vs-broker ordering fix engineering already made.

### §4.4 — Ratified re-ask on unclassifiable input — `chatIntakeSignerEntityTypeReAsk`

> Sorry — I want to make sure I record this correctly. Is {{entityName}} an LLC, a corporation, a limited partnership, a general partnership, a trust, or something else?

**Notes:** same two-attempt discipline as the other guardrail re-asks; unclassifiable input twice → save-and-resume escalation via the §3.2 ratified `chatIntakeCaptureEscalation`.

### §4.5 — Effect on manifest and count

Two new Shape-A entries (`chatIntakeSignerEntityTypePrompt`, `chatIntakeSignerEntityTypeReAsk`). Combined with §3's two, post-Lane-2E-close manifest count: **43** Shape-A entries.

### §4.6 — Effect on scriptedCapture reducer

- Insert entityType capture step between entity-name capture and title capture on the entity branch.
- Emit `chatIntakeSignerEntityTypePrompt` verbatim (owner-slot interpolation).
- Parse owner reply via `parseEntityType`.
- Persist `entityType` on the signer value; the entity path now produces a schema-valid `signerCaptureSchema` value.
- Remove the `gap: 'entity_entityType_uncaptured'` flag once wired.
- Add unit tests for `parseEntityType` covering: each of the six values via the primary token, the ordering constraints in §4.3, and re-ask emission on unclassifiable input. Add an integration test asserting the entity path now passes `signerCaptureSchema.parse(...)` end-to-end.

### §4.7 — ES translation posture

`entityType` prompt and re-ask are added to the ES PROVISIONAL set (same posture as the four Fork A first-asks). English ratifies now; Spanish awaits the general ES ratification pass.

## §5 — Countersign disposition

- **Attestation §§1-3 (mechanism, wiring, evidence):** COUNTERSIGNED.
- **Attestation §4 (deviations):** RATIFIED under as-built parity; parent rulings amended for the record.
- **Attestation §5 (two PROPOSED strings):** RATIFIED verbatim per §3 above. Engineering: append manifest entries; guard re-run.
- **Attestation §6 (entityType capture gap):** RULED per §4 above. Engineering: wire the new prompt + parser + tests; append manifest entries; guard re-run.
- **Attestation §7 (non-changes):** confirmed intact.

## §6 — Sequencing after this ruling

1. Engineering wires §3.1, §3.2, and §4 (entityType prompt + parser + tests) on the same Lane 2E branch, or as a fast-follow immediately after the Lane 2E merge — engineer's call.
2. Engineering re-runs the guard, tsc, tests, banned-terms, and lock check. Manifest count expected: **43** (39 + 2 from §3 + 2 from §4).
3. Engineering files a brief amendment attestation (or folds into the merge PR body) referencing this ruling and confirming §3 + §4 wired.
4. Lane 2E merges to main.
5. **PR-A3 §5.2 (Review-step client port) resumes on the merged base**, per the PR-A3 fork ruling §5 sequencing.
6. PR-B on PR-A3 §5.2 merge; PR-C on PR-B merge.

## §7 — Standing rules reaffirmed

- **§4.12 closure-artifact verification bars match as-built mechanism.** Cleared here — the attestation cites Fork A, not the earlier LLM-flow assumption.
- **Anti-defaulting discipline holds.** Engineering surfaced the entityType gap rather than papering over it. That is the correct posture and I want it preserved across all future capture-flow work.
- **As-built parity (§8 rule of construction)** governs the three attested deviations; no fresh ruling required for those. Compliance-behavior divergences would still require §1.6 escalation.

## §8 — Operator items (unchanged from prior standing list)

None added by this ruling. Prior standing items (Clifton Alexander no-serve, cron `0abb46c4` edit, env provisioning §3.2, branch protection §3.3, G14 §6 closure) remain as previously ruled.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-01
