# Build-side escalation — Phase 1 dangling-source-comment guard fail + determination-commit question

**File:** `lahd_city_matrix_phase1_guardfail_broker_ruling_request_2026-06-19.md`
**Date:** 2026-06-19
**Authored by:** Build side (engineering) — escalation for broker determination. Not a determination. No legal wording authored by build.
**To:** Jack Taglyan, CalDRE B9445457 — sole compliance authority for OwnerPilot AI
**Re:** Phase 1 of the LAHD/CA-city-matrix workstream; locked-prose CI guard failure on the pre-push checklist.
**Posture:** Build-side facts and options only. Nothing staged, no branch pushed, no commit made. Ruling fields blank for broker authorship.

---

## §0. What happened

Build finalized the four Phase 1 files per `lahd_city_matrix_phase1_finalization_broker_ruling_response_2026-06-19.md` and ran the local pre-push checklist on branch `feat/ca-jurisdiction-matrix-phase-1`. Results:

- **All 25 test suites pass, 0 failures** — including both new Phase 1 suites (`caJurisdictionMatrix.test.ts` 24/0, `resolveSupplementalDuty.test.ts` 22/0), running against the **real** `detectJurisdiction` / `laRtcRules` modules (not sandbox stubs). CONFIRM-1 behavior holds against the real modules.
- **`npx tsc --noEmit`** clean.
- **Byte-match** of the LA `notes` cell against `git show f46bebf:…matrix….md` — identical.
- **Token scan** — exactly one occurrence, the verbatim data string (the documented exemption).
- **`npm run ci:verify-locked-prose`** — **HARD FAIL, 1 drift:**

```
[dangling-source-comment] lib/jurisdiction/caJurisdictionMatrix.ts:86 cites
lahd_city_matrix_phase1_finalization_broker_ruling_response_2026-06-19.md which
does not exist in docs/compliance/ or at the given path.
```

The guard is working as designed. This is the same dangling-reference failure mode the guard exists to prevent, caught on the first code PR that would have introduced one.

## §1. Root cause (build's, not a content issue)

Per the finalization ruling §2 / §3, build added a **scan-exempt marker comment** above the LA row's verbatim `notes` field. To make the exemption auditable, build's comment named the governing ruling file:

> `// ... citations are exempt ... per lahd_city_matrix_phase1_finalization_broker_ruling_response_2026-06-19.md §2;`

The guard's Tier-2 dangling-reference check (per `locked_prose_ci_guard_scope_broker_determination_2026-06-15.md` §3.4) scans `lib/` and `components/` for filename references and requires each to resolve in `docs/compliance/`. The finalization ruling file is **not committed to the repo** — it exists in broker workspace but was never added to `docs/compliance/`. So the comment is a dangling reference, and the guard correctly hard-fails.

This is a build-side over-citation: build named a determination file in a code comment when the finalization ruling §3 only required the reference to appear in the **PR description**, not in code.

## §2. The two resolutions

### Option A — reword the marker comment to drop the uncommitted filename (build's lean)

Reword `caJurisdictionMatrix.ts` line 86's comment so it explains the exemption **without** citing the specific uncommitted determination filename. The audit reference lives where the finalization ruling §3 already put it: the **PR description** (reference #5 of the required five). The comment would say something like: the `notes` value is verbatim broker-source transcription including a source-determination filename citation, exempt from the build-authored-text token rule, addressed in the post-Phase-1 attribution reconciliation — with no filename that fails the dangling check.

- **Pros:** Guard passes immediately, no extra commit. Aligns with what the finalization ruling actually directed (reference in PR description, not in code). Removes a code-comment pointer to an uncommitted file — which is arguably more correct: durable determination references belong in the PR description and the determination record, not embedded in code comments. The finalization ruling §4 did **not** direct that the ruling file itself be committed.
- **Cons:** The code comment no longer names the exact governing ruling; an auditor reading only the code (not the PR) sees "per the post-Phase-1 reconciliation" without a specific file. (Mitigated: the PR description carries the precise reference, and the determination record is the system of record.)

### Option B — commit the finalization ruling file(s) to `docs/compliance/` first, then the comment resolves

Land a determination-commit PR adding `lahd_city_matrix_phase1_finalization_broker_ruling_response_2026-06-19.md` (and, for completeness, its paired request and possibly the rest of the Phase 1 ruling chain) to `docs/compliance/` **before** the code PR. Then the comment's filename reference resolves and the guard passes.

- **Pros:** Keeps the precise filename in the code comment; the reference resolves in-tree. The Phase 1 ruling chain becomes part of the committed compliance record (consistent with how the source determinations were committed).
- **Cons:** Front-loads a determination-commit PR that the finalization ruling §4 did not direct. Raises the question of *which* ruling files get committed (just the finalization response? the request too? the whole Phase 1 chain — blockers, architecture, scoping, finalization, all request+response pairs?). Serial-orders another PR ahead of the code that is otherwise ready to merge.

## §3. The broader question this surfaces (needs a ruling regardless of A/B)

This workstream has generated a **chain of determination files** that currently live only in broker workspace, not in `docs/compliance/`:

- `lahd_city_matrix_implementation_blockers_broker_ruling_request_2026-06-19.md` + response
- `lahd_city_matrix_architecture_conflict_broker_ruling_request_2026-06-19.md` + response
- `lahd_city_matrix_phase1_scoping_broker_ruling_request_2026-06-19.md` + response
- `lahd_city_matrix_phase1_finalization_broker_ruling_request_2026-06-19.md` + response
- (and this file's request + response, once authored)

Earlier this session, the precedent was set (per the C7a / pkt_s85 / attestation request-response pairs) that **broker ruling request+response pairs are committed in-tree** so a future auditor can read the question next to the determination. By that precedent, the Phase 1 ruling chain arguably belongs in `docs/compliance/` too.

**This is independent of A/B:** even under Option A (where the code comment no longer cites the file), the determination chain may still warrant committing for audit-trail completeness — just not as a blocker to the code PR.

## §4. Rulings requested

- **(1) Guard fix:** Option **A** (reword the comment, drop the uncommitted filename; reference stays in the PR description per finalization §3) or Option **B** (commit the finalization ruling file(s) first, then the comment resolves)?
- **(2) If A:** Confirm build reasons the marker comment to a token-free, filename-free exemption note, re-runs the full local gate (all 25 suites + `verify-locked-prose` must go green), and re-hashes `caJurisdictionMatrix.ts`. The other three files are untouched.
- **(3) Determination-chain commit (independent of 1):** Do the Phase 1 workstream ruling request+response pairs get committed to `docs/compliance/` (per the session's established request-response in-tree precedent)? If yes: (a) as a separate determination-commit PR before the code PR (Option B's vehicle), (b) as a separate PR after the code PR merges, or (c) bundled some other way you specify. If no: confirm the determination chain stays in broker workspace and the audit reference lives in PR descriptions only.
- **(4) If determinations are committed:** which files — only the finalization pair, or the full Phase 1 chain (blockers, architecture, scoping, finalization, all request+response pairs)? Build will supply exact byte counts + hashes for a verify-after-copy table once you specify the set.

## §5. What build did NOT do

- Authored no legal prose. The matrix content remains verbatim from `f46bebf`.
- Staged nothing, pushed nothing, committed nothing. The four files are copied into the working tree on `feat/ca-jurisdiction-matrix-phase-1` but uncommitted.
- Did not reword the comment or alter any file pending this ruling.
- Did not commit any determination file.

Build is paused at the guard fail. The code is otherwise green and ready; only the dangling-comment reference blocks it.

## §6. Ruling summary (broker)

- **(1)** Guard fix — A (reword comment) / B (commit ruling first):
- **(2)** If A — confirm reword + re-gate + re-hash:
- **(3)** Determination-chain commit — yes (a/b/c) / no:
- **(4)** If yes — which files (finalization pair / full chain):
- **Sign-off:**

---

Authored by build (Claude). Awaiting Broker Compliance Review under blanket authorization (`broker_blanket_authorization_2026-06-15`). No legal wording authored by Claude.
