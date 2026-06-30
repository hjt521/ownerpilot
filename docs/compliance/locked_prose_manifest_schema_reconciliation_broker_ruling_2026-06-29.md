# Locked-Prose Manifest Schema Reconciliation — Broker Determination

**Filed:** 2026-06-29
**Authority:** Jack Taglyan, CalDRE B9445457 (broker compliance review)
**Source:** Engineering Phase 2 pre-inspection surfaced a structural fork between the existing hash-attested manifest (`docs/compliance/locked_prose_manifest.json`, 9 entries) and the staged additions file (`docs/compliance/locked_prose_manifest_phase2d_additions.json`, 54 entries under `phase2dAdditions.entries[]`).
**Why §0 fork:** This is a compliance-architecture decision — it determines what CI Guard A actually means going forward. The agent should not pick silently.

---

## §1. The fork (verbatim from engineering)

> The existing repo manifest and the staged one use incompatible schemas:
>
> - **Existing** (`docs/compliance/locked_prose_manifest.json`): `entries` is a **list** of `{constant, verbatim, hash, version_stamp, source_determination, source_section, tier, file}` — hash-attested, and the live `ci:verify-locked-prose` guard validates against it.
> - **Staged** (`docs/compliance/locked_prose_manifest_phase2d_additions.json`, plus all Lane code): `entries` is a list under `phase2dAdditions.entries[]` of `{key, version, value, sourceRuling, note?}` — **no hashes, no file pointer, no tier**. Code reads the manifest as the source of the prose itself (not as an audit of a `.ts` export).
>
> Merging one into the other breaks the opposite side. One file can't be both shapes.

I verified this directly:
- `verify_locked_prose.ts` reads `MANIFEST_PATH = docs/compliance/locked_prose_manifest.json` and iterates `manifest.entries[]` expecting `{constant, tier, file, verbatim, hash, version_stamp, source_determination, source_section}`. HARD CI FAIL on any drift, no warn mode.
- The staged additions file's `entries[]` items have `{key, version, value, sourceRuling}` — no `constant`, no `file`, no `hash`, no `tier`, no `version_stamp`.
- Two different governance models: the 9 existing entries treat `.ts` exports as the source-of-truth-of-the-prose and the manifest as an **audit/attestation layer**. The 54 staged entries treat the manifest itself as the source-of-truth-of-the-prose, with `.ts` modules importing the manifest at runtime.

---

## §2. Determination — **Option 2: Two manifests + hash the 54**

I am ruling **Option 2**.

### §2.1 What gets built

Two manifest files live side-by-side under `docs/compliance/`:

1. **`locked_prose_manifest.json`** — UNCHANGED in shape. Continues to hold the 9 existing hash-attested Tier A/B entries that govern prose exported from `.ts` files (`bankDepositMethodHelper`, etc.). Guard A continues to validate this manifest against live `.ts` exports byte-for-byte.

2. **`locked_prose_manifest_phase2_assembly.json`** — NEW. Holds the 54 entries (formerly under `phase2dAdditions.entries[]`), but each entry is **upgraded to carry a hash field computed over the `value` string**. Schema:

   ```json
   {
     "manifest_version": "v1",
     "manifest_role": "runtime-source",
     "generated_at": "2026-06-29T...",
     "guard_status": "live",
     "broker_authority": "CalDRE B9445457",
     "source_rulings": [
       "G1_G8_omnibus_pre_ruling_2026-06-29.md",
       "locked_prose_broker_review_status_states_copy_conflict_broker_ruling_2026-06-29.md",
       "la_notice_production_gap_broker_ruling_2026-06-28.md",
       "la_notice_production_gap_broker_ruling_2026-06-28_erratum_artifact_drop_2026-06-28.md"
     ],
     "entries": [
       {
         "key": "<manifest key, e.g. CLAUSE_PAYMENT_RECEIVED_V1>",
         "version": "v1",
         "value": "<verbatim prose>",
         "hash": "<sha256 of value, lower-hex>",
         "source_ruling": "<filename.md §section>",
         "tier": "A" | "B"
       },
       ...
     ]
   }
   ```

The two manifests are **complementary, not redundant**, because they govern different code patterns:

| Manifest | Code pattern | Guard role |
|---|---|---|
| `locked_prose_manifest.json` (9 entries) | Prose lives in `.ts` exports (`export const bankDepositMethodHelper = "..."`). Manifest audits the export. | Guard A reads `.ts` file, hashes its string literal, compares against manifest hash. **Drift detection.** |
| `locked_prose_manifest_phase2_assembly.json` (54 entries) | Prose lives in the manifest itself. `.ts` modules import via `manifest.entries.find(e => e.key === "CLAUSE_X")?.value`. | Guard A reads manifest, hashes `value` field, compares against manifest's own `hash` field. **Tamper detection.** Plus: scans `lib/` and `components/` for `// Source: <key>` references and confirms each key resolves. |

### §2.2 Why not Option 1 (two manifests, leave 54 un-hashed)

Option 1 lets CI Guard A continue to mean "the 9 existing entries are byte-stable" — but it lets the 54 newer entries drift silently. That collapses the meaning of "locked prose" to "locked-if-it's-one-of-the-9-old-ones." The whole point of expanding the locked-prose discipline to G1 clauses, broker-review status states, courtesy reminders, magic-link body, and SM overlays is that those strings are legally load-bearing too. Hash-attesting them is cheap and brings them under the same compliance umbrella.

### §2.3 Why not Option 3 (unify on one schema)

Option 3 is architecturally cleanest in the abstract but:
- It requires reshaping the 9 existing entries (currently `.ts`-exported, manifest-audited) into manifest-sourced runtime imports, which means rewriting `lib/flow/bankDepositDisclosureCopy.ts` and similar to read from manifest at runtime. That's a backwards-incompatible refactor of code that was attested live on 2026-06-18 (`locked_prose_guard_live_attestation_2026-06-18.md`).
- Or it requires reshaping the 54 new entries (currently manifest-as-source) into `.ts`-exported constants, which means generating 54 new `.ts` modules and writing matching audit entries — much more code, much more surface for byte-drift between the runtime source and the audit record.
- Either direction breaks one side's existing attestation chain. Engineering would have to re-attest live operation.

Two-manifest preserves both existing attestation chains and adds a parallel one for the new entries.

### §2.4 Guard A scope expansion

The existing guard (`scripts/ci/verify_locked_prose.ts`) gets a small expansion, not a rewrite:

1. **MUST FIX before Phase 2 land:** Refactor `MANIFEST_PATH` into `MANIFEST_PATHS: string[]` and iterate both manifests.
2. **MUST FIX:** For entries from `locked_prose_manifest.json` (shape A): existing behavior — hash the `.ts` export's string literal, compare against `entry.hash`.
3. **MUST FIX:** For entries from `locked_prose_manifest_phase2_assembly.json` (shape B): hash `entry.value` directly, compare against `entry.hash` (tamper detection on the manifest file itself).
4. **MUST FIX:** Tier-2 dangling-source-comment check (§3.4 of the original determination) continues to scan `lib/` and `components/` for `// Source: <filename>.md` and resolve to `docs/compliance/`. Add a second comment pattern: `// LockedKey: <KEY>` resolves to a key in shape B.
5. **SHOULD FIX:** Schema validator at start of guard run — Shape A entries must have `{constant, file, verbatim, hash, ...}`; Shape B entries must have `{key, value, hash, ...}`. Cross-schema entries (e.g., a Shape B entry missing `hash`) hard-fail with exit 1.
6. **CONSIDER:** A pre-commit hook (or `pnpm lockedprose:hash`) script that recomputes the hash field on any Shape B entry whose `value` was edited, so authors can't forget. The CI guard remains the enforcement gate; the hook is convenience.

### §2.5 What engineering must execute before Phase 2 `cp`

This is an **omnibus ruling** — engineering executes all of the following in one PR (cut from `main@5942d7b`, on a new branch `compliance/locked-prose-schema-reconciliation` that lands **before** any of the four rebuild branches merge):

- [ ] **[MUST FIX]** Rename staged `docs/compliance/locked_prose_manifest_phase2d_additions.json` → `docs/compliance/locked_prose_manifest_phase2_assembly.json` (the file is no longer "additions to be merged"; it's a peer manifest).
- [ ] **[MUST FIX]** Reshape the file's top-level: drop `phase2dAdditions` wrapper; lift `entries[]` to top level; add `manifest_version`, `manifest_role: "runtime-source"`, `guard_status: "live"`, `broker_authority`, `source_rulings[]`, `generated_at`.
- [ ] **[MUST FIX]** For each of the 54 entries: compute SHA-256 of `value` (lower-hex, UTF-8, no trailing newline normalization beyond what's in the string), add `hash` field. Add `tier` field (A for the 7 G1 clauses, 3 G7 SM clauses, 4 courtesy reminder bodies, magic-link body, 5 broker-review state copy entries, jurisdictionLaOverlay* entries, LAHD filing entries — those are all face-of-notice or broker-routing-load-bearing; everything else is Tier B). Engineering's call on Tier assignment per entry; if uncertain mark Tier A.
- [ ] **[MUST FIX]** Refactor `scripts/ci/verify_locked_prose.ts` per §2.4 items 1–5. Add unit tests covering: Shape A hash-mismatch detection, Shape B hash-mismatch detection, Shape A missing-export detection, Shape B missing-key detection, Tier-2 dangling-comment detection in both forms.
- [ ] **[MUST FIX]** Update `docs/compliance/locked_prose_ci_guard_scope_broker_determination_2026-06-15.md` with an addendum noting Guard A now spans two manifests; reference this ruling by filename.
- [ ] **[MUST FIX]** All Lane code that currently reads `manifest.entries.KEY.body` is wrong against the new top-level shape — engineering must update those reads to `manifest.entries.find(e => e.key === "KEY")?.value`. (If a typed helper makes sense, build it: `import { lockedProse } from "@/lib/compliance/lockedProse"; lockedProse("CLAUSE_PAYMENT_RECEIVED_V1")`.)
- [ ] **[SHOULD FIX]** Add `pnpm lockedprose:hash` convenience script (Node CLI, ~30 lines) that reads the Shape B manifest, recomputes hashes from `value`, writes back. Document in the addendum.
- [ ] **[CONSIDER]** A second convenience script `pnpm lockedprose:verify` that runs the guard locally so authors can check before push.

Acceptance: PR diff shows two manifests both with `guard_status: "live"`, the guard script passing against both, all Lane imports updated, and no `// Source:` or `// LockedKey:` dangling references.

### §2.6 What I am NOT ruling

- **Whether the 5 broker-review state copy entries are Tier A or Tier B.** Engineering's call per the schema upgrade. Default Tier A if uncertain.
- **The exact module path for the typed helper** (`lib/compliance/lockedProse.ts` vs `lib/copy/lockedProse.ts` etc.). Engineering's call.
- **Whether the convenience scripts ship in this PR or a follow-up.** Engineering's call; the guard refactor is the only must-ship piece.

---

## §3. Impact on Phase 2 sequencing

Phase 2 of the land sequence (`cp -R` staged trees into the 4 rebuild branches) **cannot run** until this reconciliation PR lands on `main`. Reason: the staged trees contain code that reads the manifest in the now-wrong shape and tests that import keys assuming the merged-in shape. A blind `cp` produces a tree that fails Guard A immediately on any branch.

**Revised land sequence:**

| Step | Action | Status |
|---|---|---|
| Phase 0 | §R paste + amendment rename | ✅ COMPLETE |
| Phase 1 | Branch hygiene (stash + cut 4 branches from main@5942d7b) | ✅ COMPLETE per engineering report |
| **Phase 1.5 (NEW)** | **Locked-prose schema reconciliation PR (cut from main@5942d7b on `compliance/locked-prose-schema-reconciliation`, merge to main FIRST)** | **PENDING — this ruling authorizes** |
| Phase 2 | `cp -R` staged trees into 4 rebuild branches (rebased on the new main) | BLOCKED on Phase 1.5 |
| Phase 3+ | unchanged | unchanged |

Phase 1.5 is a small, focused PR (~1 file moved, ~1 guard-script refactor, manifest entries hashed, ~54 typed-helper imports updated). Engineering estimate: half a day. It must land on main before the 4 rebuild branches `cp` so they rebase onto a tree that already understands the new shape.

---

## §4. Reservation of rights

If during execution engineering discovers any entry whose `value` differs byte-for-byte from what is already in production code (i.e., the staged manifest's `value` is not what was actually shipped), STOP and file a one-line broker question — that's a substantive prose drift, not a schema reconciliation, and would need separate ratification.

---

**Filed for the record.**

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-29
