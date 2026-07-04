# W5 Artifact-Filename Generator — Verification & Close

**Date:** 2026-07-03
**By:** Engineering (Claude Code)
**Governing rulings:** `gate3_wave3_wiring_and_ff3_omnibus_broker_ruling_2026-07-03.md` §3 (Decision 3 — document generators + W5 caller sweep); W5 two-convention design (omnibus §3.6).
**Finding:** W5 (task #119) is **complete** as-built per its ruled scope. No code change required. This memo records the verification.

---

## Scope (per Wave-3 §3.1–§3.2)

The ruling scoped W5's caller sweep to **the notice-PDF download bridge only** — "the one artifact that IS generated in-app today." The three broker-filing generators (cover sheet, POS, packet-manifest PDF) are **deferred** to future lanes, each needing its own compliance review. "Nothing else" (§3.2).

## Verification against as-built

| Item | Requirement | As-built evidence | Status |
|---|---|---|---|
| Convention A generator | broker-filing pattern `<address>-<unit>-<Tenant>_<descriptor>_<date>.<ext>` | `lib/produce/artifactFilename.ts:64` `generateBrokerFilingFilename` | ✅ |
| Convention A callers | intentionally none yet (callers = deferred cover-sheet/POS/manifest generators) | no callers — matches §3.1 deferral | ✅ (by design) |
| Convention B generator | owner-download `OwnerPilot_…`, KEEP AS-IS | `artifactFilename.ts:16` re-exports `buildNoticePdfFilename` as `generateOwnerDownloadFilename` | ✅ |
| Convention B wired at notice-PDF bridge | standardize the download filename at the one existing call-site | `components/notice-flow.tsx:3171` sets `baseName` from `buildNoticePdfFilename`; `lib/produce/laProduceServer.ts:72–73` suffixes it (`${baseName}_rtc_notice_en/es.pdf`) | ✅ |
| Tests | both conventions + no-cross-sweep guard | `lib/produce/__tests__/artifactFilename.test.ts` — 10/10 pass (incl. "owner download not swept to Convention A") | ✅ |

## Verification run

`tsc --noEmit` clean · `artifactFilename.test.ts` 10/10 · `buildNoticePdfFilename` wired at the notice-flow download bridge.

## Conclusion

**W5 (task #119) is complete within its ruled scope.** Convention A is generator-only by design (its callers are deferred generators). Convention B is generated, re-exported, and live at the notice-PDF download bridge. The Convention-A caller sweep for the deferred generators is future-lane work (cover sheet / POS / packet-manifest PDF), each gated on its own compliance review per Wave-3 §3.1.

---

— Engineering (Claude Code) · W5 verify-and-close · 2026-07-03
