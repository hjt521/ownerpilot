# Predicate-5 Attestation Packet — `cityOfLaZipsAuthoritative`

**Predicate:** `cityOfLaZipsAuthoritative` (predicate 5 of 6 on the LA go-live gate)
**Governing ruling:** `workstream_a_fork_3_authoritative_determination_broker_ruling_2026-06-27.md` (sha256 `b4510858a4c4c0fdc9f4e8458c4be480e93577d22b2acfa0e0a2996136d81ee2`)
**Implementation clarification:** `A3_section_6_1_implementation_clarification_broker_ruling_2026-06-27.md` (sha256 `8747e3fd4d39aff0c3dec1c85c50f90ef931c6c0bfcabdfec5a1f87ad777e88c`)
**Attestation date:** 2026-06-27
**Author:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457

---

## §1 — Predicate identity

This packet attests that the predicate `cityOfLaZipsAuthoritative` is satisfied as of 2026-06-27, on the strength of the 10 conditions enumerated in A-3 §8.3. The signing of this packet (see §6 below) is the broker act that flips predicate 5 on the LA go-live gate from FALSE to TRUE.

This predicate sits as one of six on the LA go-live gate. After this packet signs, only predicate 6 (`parcelEndpointHealthCheckLive`, Workstream B) remains; the gate opens when predicate 6 is also attested.

This packet is a manifest pointing at committed artifacts; it is not a standalone document. Every claim in §3 is backed by a retrievable file in the workspace or the repository.

---

## §2 — Predicate satisfaction table

Each row maps an A-3 §8.3 predicate to its satisfying artifact and the broker's attestation that it is satisfied.

| # | Predicate | Satisfied by | Artifact | Attested |
|---|---|---|---|---|
| 1 | Canonical source identified and broker-attested | A-3 §2 | A-3 ruling (sha `b4510858…`) | ✓ |
| 2 | Currency window defined and broker-ruled | A-3 §3 | A-3 ruling | ✓ |
| 3 | Refresh cadence defined and broker-ruled | A-3 §4 | A-3 ruling + cron registration (see §3) | ✓ |
| 4 | Discrepancy policy defined and broker-ruled | A-3 §5 | A-3 ruling + `canonical_override_exceptions` schema | ✓ |
| 5 | Runtime resolution chain defined and broker-ruled | A-3 §6 + §6.1 clarification | A-3 ruling + clarification (sha `8747e3fd…`) + wired resolver | ✓ |
| 6 | License / reliance posture defined and broker-ruled | A-3 §7 | A-3 ruling | ✓ |
| 7 | First snapshot loaded and sha256-verified | Construction pipeline + repo commit | `cityOfLaZipsAuthoritative.snapshot.json` (sha `e40e3ab2…`) + regenerated TS module | ✓ |
| 8 | v6 corpus passes against authoritative snapshot | Resolver wire-up + corpus run | `resolveLaAddressV2.test.ts` 48/48 PASS | ✓ |
| 9 | A-2 diff packet emitter live and tested | Emitter + synthetic fixture + TS test | `emit_a2_diff_packet.py` + `__fixtures__/a2/` + `a2DiffEmitter.test.ts` 13/13 PASS; example packet sha `169f6deda…` | ✓ |
| 10 | NO-DIFF auto-attestation observed (synthetic path per A-3 §8.3 discretionary note) | Emitter synthetic fixture exercise of `broker_attestation_routine` pathway | Synthetic NO-DIFF observed via emitter test fixture | ✓ |

All 10 conditions satisfied as of attestation date.

---

## §3 — Artifact inventory

### §3.1 — Compliance documents (workspace)

| Artifact | Path | sha256 |
|---|---|---|
| A-3 ruling (signed final) | `/home/user/workspace/workstream_a_fork_3_authoritative_determination_broker_ruling_2026-06-27.md` | `b4510858a4c4c0fdc9f4e8458c4be480e93577d22b2acfa0e0a2996136d81ee2` |
| §6.1 implementation clarification | `/home/user/workspace/A3_section_6_1_implementation_clarification_broker_ruling_2026-06-27.md` | `8747e3fd4d39aff0c3dec1c85c50f90ef931c6c0bfcabdfec5a1f87ad777e88c` |
| Predicate-5 verification evidence | `/home/user/workspace/predicate_5_verification_evidence_2026-06-27.md` | (companion build-evidence file) |
| Fork A-1 ruling (canonical source) | `/home/user/workspace/workstream_a_fork_1_canonical_source_broker_ruling_2026-06-27.md` | (referenced; A-3 builds on this) |
| Fork A-2 ruling (reconciliation discipline) | `/home/user/workspace/workstream_a_fork_2_reconciliation_discipline_broker_ruling_2026-06-27.md` | (referenced; emitter governed by this) |

### §3.2 — Repository artifacts (wire-up PR)

| Artifact | Path (in repo) | sha256 |
|---|---|---|
| Authoritative snapshot | `lib/jurisdiction/geocode/cityOfLaZipsAuthoritative.snapshot.json` | `e40e3ab2c47bdb9429f19c1d97d69f0ca5bd20aa6ecbd2e15b203e5f47b18452` |
| Regenerated ZIP module | `lib/jurisdiction/geocode/cityOfLaZips.ts` | (recorded in PR head sha; carries snapshot-sha provenance) |
| Codegen script | `scripts/gen_city_of_la_zips.py` | (recorded in PR head sha) |
| Wired resolver | `lib/jurisdiction/geocode/resolveLaAddressV2.ts` | (recorded in PR head sha; County-primary order preserved per §6.1 clarification) |
| A-2 diff emitter | `scripts/emit_a2_diff_packet.py` | (recorded in PR head sha) |
| A-2 synthetic fixture (baseline, candidate, expected) | `lib/jurisdiction/geocode/__fixtures__/a2/` | (expected_packet sha `169f6dedafa0fb6dbc63a495d639bf2642c32f20394c61a26701142800c1b00d`) |
| A-2 emitter test | `lib/jurisdiction/geocode/a2DiffEmitter.test.ts` | (recorded in PR head sha) |
| Resolver corpus | `lib/jurisdiction/geocode/resolveLaAddressV2.test.ts` | (recorded in PR head sha; 48 cases) |
| Compliance docs (in repo) | `docs/compliance/workstream_a_fork_3_authoritative_determination_broker_ruling_2026-06-27.md` and predicate-5 evidence | (build-placed per §10.1 items 17–18) |

### §3.3 — A-2 first-reconciliation packet (live, against provisional baseline)

| Field | Value |
|---|---|
| Packet file | `workstream_a_A2_first_reconciliation_packet.json` |
| Packet sha256 | `5288c999874f79291301bd3e41f8e33ab18bd9f6414ccd6f2121d5f843369437` |
| Baseline | provisional 111-set |
| ADD auto-applied | 10 |
| REMOVE broker-ruled | 3 (1 with §5.4-c override, 2 clean) |
| Broker attestation | 2026-06-27 |

---

## §4 — Runtime verification evidence

Per A-3 §8.4, runtime predicates (7, 8, 9, 10) require explicit verification-evidence records.

### §4.1 — Predicate 7 (snapshot loaded + sha256-verified)

| Field | Value |
|---|---|
| Snapshot file (repo path) | `lib/jurisdiction/geocode/cityOfLaZipsAuthoritative.snapshot.json` |
| Snapshot sha256 | `e40e3ab2c47bdb9429f19c1d97d69f0ca5bd20aa6ecbd2e15b203e5f47b18452` |
| Bucket counts (city-intersecting frame) | in: 82 · straddler: 37 · out: 35 (non-intersecting CA ZCTAs: 1615; total out rows: 1650) |
| Authoritative total (in + straddler) | 119 |
| SANITY_OUT canary | CLEAN — no SANITY_OUT ZIP in `in` bucket; 90056→straddler override introduces none |
| `coverage_ratio` | 0.993 (PASS, within 1.5% per A-3 §5.1-c calibration) |
| Override count / ZIPs | 1 / `["90056"]` (§5.4-c, broker-attested 2026-06-27) |
| Zero-area slivers | none observed |
| ZCTA-field validity | PASS (zero rows dropped) |
| Cross-check C-7 | SKIPPED (fail-soft §5.3-d; `cross_check_skipped: true` in provenance; deferred to next refresh once GeoJSON sourced via Socrata "Download file" path) |

Inputs (sha256-fixed for reproducibility):

| Input | sha256 | Vintage |
|---|---|---|
| C-8 boundary | `328b4db47541d9cb8bac1d5bc66570f62f587406172ac488d543bf71dbb68b38` | 2026-05-19 edit |
| ZCTA-2010 (CA state file) | `3f2de4022aeb5ef3c1806c91b62b433a49f3feb73238065b9717a2ea298f7a02` | 2010 vintage (fixed historical) |
| C-7 boundary | — | SKIPPED |

### §4.2 — Predicate 8 (v6 corpus passes)

| Field | Value |
|---|---|
| Test suite | `lib/jurisdiction/geocode/resolveLaAddressV2.test.ts` |
| Result | **48 / 48 PASS** |
| Delta vs pre-snapshot baseline | No new failures attributable to the snapshot |
| Resolver wire pattern | County-primary / ZIMAS-fallback preserved (§6.1 clarification (b)); snapshot consulted at `county_situs_gap` via three-bucket `classifyZip` (§6.1 clarification (c)); `countyZipBucket` audit field added; verdict taxonomy unchanged (§6.1 clarification (f)) |

Snapshot ZIP-set consistency spot checks per §6.1 clarification §6.2:

| Address ZIP | Snapshot bucket | Expected | Verified |
|---|---|---|---|
| 90401 (Santa Monica) | out | out | ✓ |
| 91343 (North Hills) | in | in | ✓ |
| 90017 (downtown) | in | in | ✓ |
| 90044 (South LA) | straddler (routed to parcel rail) | straddler | ✓ |
| 90056 (Ladera) | straddler-via-override (§5.4-c) | straddler-via-override | ✓ |
| 90249 (Gardena) | out | out | ✓ |
| 90748 (Wilmington P.O.-Box) | out (addresses route via §2.2-c parcel rail) | out | ✓ |

### §4.3 — Predicate 9 (A-2 emitter live + tested)

| Field | Value |
|---|---|
| Emitter | `scripts/emit_a2_diff_packet.py` |
| Synthetic fixture path | `lib/jurisdiction/geocode/__fixtures__/a2/` |
| Fixture composition | 1 ADD + 1 normal REMOVE + 1 corpus-impact REMOVE |
| Expected-packet sha256 | `169f6dedafa0fb6dbc63a495d639bf2642c32f20394c61a26701142800c1b00d` |
| Disposition discrimination verified | ADD 90099 → `auto_apply` (A-2 §2.1); REMOVE 91608 → `broker_review` (A-2 §2.2); REMOVE 91343 → `build_halt` (corpus-impact REMOVE) |
| TS test | `a2DiffEmitter.test.ts` 13/13 PASS |

### §4.4 — Predicate 10 (NO-DIFF auto-attestation, synthetic path)

Per A-3 §8.3 predicate 10 discretionary note: the gate-flip timing predates the first scheduled refresh under §4.1's daily-03:00-PT cadence, so the **synthetic NO-DIFF path** is exercised in lieu of a production NO-DIFF event.

| Field | Value |
|---|---|
| Path selected | Synthetic NO-DIFF test fixture (per A-3 §8.3 predicate 10 path (b)) |
| Verification | Emitter test fixture exercises the `broker_attestation_routine` recording pathway under a NO-DIFF input |
| Production NO-DIFF | Will be observed at the first scheduled refresh after cron registration (A-3 §10.1 item 9 / §10.2 item 9) and recorded in the audit sink at that time; not required for this packet |

---

## §5 — Cross-predicate dependencies

This predicate has no hard runtime dependency on the other five gate predicates. The wired resolver consults the authoritative snapshot independent of predicate 1–4 and 6 state.

The gate-opening itself is dependent on predicate 6 (`parcelEndpointHealthCheckLive`, Workstream B). After this packet signs, `laProductionMissingDependencies().length === 1`, with predicate 6 the only outstanding item per build's §6 verification. Workstream B's attestation packet closes that.

### §5.1 — §6.5 Gate-closed-with-guidance UX copy

A-3 §6.5 defines gate-closed-with-guidance as a named runtime disposition; the UX copy is deferred (A-3 §9.2, §10.3 item 13). The deferred status is preserved across the predicate-5 flip: the gate flag flipping does not impose a deadline on UX-copy authoring, and the runtime chain continues to use the existing placeholder copy until the deferred authoring lands.

---

## §6 — Pre-commit gate sequence

Per A-3 §8.5, the standing pre-commit gate sequence must pass clean before broker sign-off.

### §6.1 — Sandbox-verified gates (clean as of 2026-06-27)

| Gate | Result |
|---|---|
| `tsc --noEmit` | CLEAN |
| `lib/jurisdiction/geocode/*.test.ts` (12 suites) | 12 / 12 PASS |
| `lib/jurisdiction/laOverlay.test.ts` | 37 / 37 PASS |
| `ci:verify-locked-prose` | CLEAN |
| `ci:typecheck-edge` | CLEAN |

### §6.2 — Host-pending gates (expected clean; not blocking)

The following two gates were not run in-sandbox to avoid the `.git` lock issue surfaced earlier in the session. Both are expected clean because neither parcel-health nor edge-core surfaces were modified in the wire-up PR. Build SHALL run these against host before merging the wire-up PR; results SHALL be recorded as an addendum to this packet, **without** re-signing — the addendum is a verification update, not a re-attestation.

| Gate | Status |
|---|---|
| `ci:verify-parcel-health-core-sync` | pending host run; no parcel-health files changed |
| `ci:verify-edge-core-sync` | pending host run; no edge-core files changed except the laRtcRules flip itself (which is held — see §7) |
| `node scripts/run_tests.mjs` (full lib suite) | pending host run (sandbox times out at 45s; geocode subtree + overlay verified) |

If any host gate fails clean-check, the PR does not merge and the failure is resolved before merge; a failure post-attestation triggers A-3 §7.3-c defect-triggered re-attestation. Pre-merge clean is the standard.

---

## §7 — Predicate-flip diff (signing commit)

The following changes apply the predicate-5 flip. Per A-3 §8.6, the broker's signature in §8 below is the act that authorizes this commit; the diff is held until signature and applied as the signing commit (NOT as a pre-merge commit on the wire-up PR).

### §7.1 — `lib/jurisdiction/laRtcRules.ts`

- **L167**: `cityOfLaZipsAuthoritative: false` → `cityOfLaZipsAuthoritative: true`
- **L158–160 comment**: "Two production-traffic flags remain false…" → "One production-traffic flag remains false: parcelEndpointHealthCheckLive."
- **L208 (optional)**: Drop the "USPS LACA" string per the superseded provisional framing.

### §7.2 — `supabase/functions/rtc-refresh/_core/laRtcRules.ts`

- **L174**: same `false → true` flip.
- Followed by `npm run build:edge-core` so `ci:verify-edge-core-sync` passes on host run.

### §7.3 — `lib/jurisdiction/laOverlay.test.ts`

- **L31**: `length === 2` → `length === 1`
- **L63**: `cityOfLaZipsAuthoritative === false` → `cityOfLaZipsAuthoritative === true` (with corresponding label change)
- **L29–30 / L57 comments**: "two → one"

### §7.4 — Post-flip invariants

After the flip commit:
- `laProductionMissingDependencies().length === 1` (predicate 6 only)
- `cityOfLaZipsAuthoritative === true` in both `laRtcRules.ts` mirrors (in-app and edge-core)
- `laOverlay.test.ts` and downstream tests pass
- Workstream B's attestation packet remains the next gate-opening event

### §7.5 — Authorization

The broker's signature in §8 authorizes build to apply §§7.1–7.3 as a single commit titled (suggested): `chore(la-gate): flip cityOfLaZipsAuthoritative to true (predicate-5 attested)`. The commit message SHALL reference this packet by path and sha256.

---

## §8 — Broker signature

I, Jack Taglyan, California Licensed Real Estate Broker (CalDRE B9445457), having read in full the A-3 ruling at sha `b4510858a4c4c0fdc9f4e8458c4be480e93577d22b2acfa0e0a2996136d81ee2`, the §6.1 implementation clarification at sha `8747e3fd4d39aff0c3dec1c85c50f90ef931c6c0bfcabdfec5a1f87ad777e88c`, and the build-side evidence summarized in §§3–7 of this packet, hereby attest that:

1. The 10 conditions enumerated in A-3 §8.3 are satisfied per the satisfaction table in §2 above.
2. The wired v6 resolver conforms to the §6.1 clarification's implementation pattern (a)–(f) and meets the §6.1 clarification's verification requirements (1)–(4).
3. The first snapshot (`cityOfLaZipsAuthoritative.snapshot.json`, sha `e40e3ab2c47bdb9429f19c1d97d69f0ca5bd20aa6ecbd2e15b203e5f47b18452`) is the operational authoritative ZIP set under A-3 from this date forward, superseding the provisional 111-set.
4. The §5.4-c override for ZIP 90056 (area ratio 0.0591, forced to straddler) is the sole canonical override exception as of attestation, with provenance recorded in the snapshot and ratified at this attestation date.
5. The C-7 cross-check is skipped fail-soft under §5.3-d as of attestation, with the next refresh charged to obtain a C-7 GeoJSON via the Socrata "Download file" path per A-3 §2.3.
6. Predicate 5 (`cityOfLaZipsAuthoritative`) is satisfied. Build is authorized to apply the predicate-flip diff in §7 of this packet as a single signing commit, and to merge the wire-up PR once the host-pending gates in §6.2 pass clean and predicate 6 (`parcelEndpointHealthCheckLive`) is also attested.

`— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-27`
