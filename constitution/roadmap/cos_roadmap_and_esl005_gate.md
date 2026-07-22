# Constitutional Operating System — Roadmap & ESL-005 Resume Gate

Extends `gap_analysis_and_roadmap.md` (Phase 0) with the COS governance phases. Current constitution version: **v1.0 "Genesis"** (git `8fa17cb`, overall checksum `8830f6b1…b71e36`).

## Status of the governance build

| Phase | Deliverable | Status |
|---|---|---|
| 0 | Foundation (structure, CONSTITUTION.md, standards, ADRs, workflow, validation, roadmap) | ✅ approved + merged |
| 1 | **Genesis Baseline** — `CONSTITUTION_BASELINE_v1.md`, manifest, checksums | ✅ drafted (real checksums); `constitution_v1.0.sql` pending broker `pg_dump` |
| 2 | **Validation automation** — `checks.sql` (runnable) + `ci_cd_design.md` | ✅ designed + queries runnable; runner/CI wiring = implementation follow-up |
| 3 | **Governance automation** — `governance_automation.md` + migration record template | ✅ |
| 4 | **Governance handbook** — lifecycle/versioning/release/review/approval/deprecation/amendment | ✅ |
| 5 | **`const_0001` trigger coverage** — first official migration + governance record | ✅ drafted (broker applies → v1.1) |
| 6 | **Resume ESL-005** | ⛔ gated (below) |

## Prioritized roadmap

- **P0 — Adopt Genesis + apply const_0001.** Broker produces `constitution_v1.0.sql` (pg_dump). Then `const_0001` runs the full workflow end-to-end (review → validate → apply → baseline refresh to **v1.1** → doc refresh). This is the first proof the COS workflow functions.
- **P1 — Stand up validation in CI + the continuous watch.** Implement `run_checks` from `checks.sql`; wire the three gates (pre-merge, baseline, continuous); extend the weekly watch to `constitution`. After this, silent drift is impossible.
- **P2 — Backfill governance debt.** Comment backfill (check #8) on high-traffic tables; confirm module boundaries with the owner (encode a `module` tag if desired).
- **P3 — Resume ESL-005** (below).
- **P4 — Future subsystems** (Enterprise Knowledge Graph, Consciousness Layer, Evolution Engine, future Intelligence Engines / AI Organizations): each blocked by the **architecture-precedes-implementation** rule — no schema until an EA doc + ADRs + module doc + security model + validation strategy exist (governance handbook + CONSTITUTION.md).

## ESL-005 resume gate

**Resume ESL-005 Phase 5A when all hold:**
1. Phase 0 approved ✅ (done).
2. Genesis baseline adopted — `constitution_v1.0.sql` committed (broker pg_dump). ⏳
3. `const_0001` applied through the workflow → constitution at **v1.1**, proving the workflow works end-to-end. ⏳
4. Validation runner live in CI (P1) — recommended before ESL-005 so 5A's apply is guarded automatically. ⏳ (strongly recommended, not strictly blocking)

When resumed, ESL-005 runs the **full COS workflow**: architecture (done) → ADR-008 (done, promote from Proposed to Accepted) → review → migration (5A draft exists) → validation → broker apply → baseline refresh (v1.2) → doc refresh → release. It becomes the first *feature* module to traverse the complete Constitutional Operating System.

## Recommendations before ESL-005 resumes (deliverable #11)

1. **Adopt the Genesis baseline first** (P0-2). Do not resume ESL-005 until `constitution_v1.0.sql` is committed — otherwise 5A's baseline refresh has no v1.0 anchor to diff against.
2. **Apply `const_0001` before 5A** (P0). It's lower-risk (triggers only, no new table) and is the intended "prove the workflow" first run. Let the *correctness* migration break in the new process, not the *feature* migration.
3. **Wire validation into CI before 5A** (P1). Then 5A's apply is checked automatically (checksum, RLS, SD, trigger coverage) rather than by hand.
4. **Promote ADR-008** (ESL-005 Monte Carlo) from Proposed → Accepted at design review, and resolve the two open 5A decisions on the record: keep-vs-drop the `updated_at` trigger, and `approved_by text` (vs the prompt's uuid).
5. **Timing vs FF-3:** all of the above is additive to `constitution` (zero `public`/FF-3 impact), but every apply is still a write to the shared prod DB. Sequence the applies around the ~2026-07-28 FF-3 flip window — owner's call. A clean order: FF-3 flip settles → adopt Genesis → const_0001 → CI validation → ESL-005 5A → 5B.
