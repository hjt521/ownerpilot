# A-3 Ruling — Currency-Trigger Field Correction Amendment

**Parent ruling**: `workstream_a_fork_3_authoritative_determination_broker_ruling_2026-06-27.md` (sha256 `b4510858a4c4c0fdc9f4e8458c4be480e93577d22b2acfa0e0a2996136d81ee2`)
**Mechanism invoked**: parent §7.3-c (defect resolution)
**Precedent**: same separate-asset pattern as `A3_section_6_1_implementation_clarification_broker_ruling_2026-06-27.md` (sha256 `8747e3fd4d39aff0c3dec1c85c50f90ef931c6c0bfcabdfec5a1f87ad777e88c`)
**Amendment date**: 2026-06-27

---

## §1 — Defect identified

Parent ruling §§3.1-a / 2.2-d / 2.4 name `lastEditDate` as the polled currency trigger for the daily refresh cron. Parent ruling §§2.1 / 4.2 describe the source as "data last edit 2026-05-19," and the snapshot baseline `c8LastEdit` was recorded as `2026-05-19`. The recorded baseline matches C-8's `editingInfo.dataLastEditDate` (2026-05-19), not `editingInfo.lastEditDate` (2026-05-21, reflecting a schema/metadata edit that did not move the boundary geometry).

The locked field name and the recorded baseline therefore disagree. On the cron's first run, polling `lastEditDate` would read 2026-05-21, compare against the 2026-05-19 baseline, and fire a "boundary changed — recompute" alert even though the geometry never moved.

## §2 — Correction

The polled currency-trigger field is corrected from `lastEditDate` to **`dataLastEditDate`** in parent §§3.1-a, 2.2-d, and 2.4. Baseline value is unchanged at `2026-05-19`. Comparison semantics are unchanged: fire recompute when `live.dataLastEditDate > snapshot.c8LastEdit`.

All other mechanics in parent §§3.1-a / 2.2-d / 2.4 — poll cadence (daily 03:00 PT), comparison operator (strict greater-than), recompute trigger, NO-DIFF auto-attest path (`broker_attestation_routine` event) — remain as written. Only the field name is corrected.

## §3 — Tenant-defense rationale

`dataLastEditDate` fires only when boundary geometry actually moves. Boundary movement is the change class that affects which parcels route through City-of-LA jurisdiction rules vs. County jurisdiction rules — a tenant-defense-relevant routing decision.

`lastEditDate` is over-inclusive: it fires on schema or metadata edits (column rename, attribute reordering, service-definition refresh) that do not change any parcel's jurisdiction. Repeated false-positive alerts train the on-call response to dismiss the alert class, which is the failure mode that would let a real boundary change slip through. Signal discipline is a tenant-defense property here, not just operational hygiene.

## §4 — Audit-chain integrity

This amendment is published as a separate asset, matching the §6.1 clarification precedent. Parent ruling file is unmodified — its sha256 `b4510858…` remains valid, and citations to it from the predicate-5 attestation packet (sha `4e2b154059f04ed436bd6f84597c0a2b4eaf5f333d32f32cef9bdfcb9d4d0c3c`), the verification evidence file, and the §6.1 clarification remain intact.

## §5 — Re-attestation

No re-attestation of predicate 5 is required. The snapshot baseline value (`c8LastEdit = 2026-05-19`) is unchanged; only the field-name interpretation under which that baseline was recorded is corrected. The §8 broker attestation in the predicate-5 packet stands.

## §6 — Build authorization

Build is authorized to:
1. Commit this amendment asset alongside the cron PR
2. Implement the cron polling `editingInfo.dataLastEditDate` against `c8LastEdit = 2026-05-19` (already done per build's report)
3. Reference this amendment's sha256 (computed at commit time) in any future doc that cites the parent ruling on the currency-trigger field question

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-27
