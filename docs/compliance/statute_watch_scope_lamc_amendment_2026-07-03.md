# Statute-Watch Cron Scope — LAMC Amendment Spec

**Date:** 2026-07-03
**By:** Engineering (Claude Code)
**Trigger:** W6 late-filing gate attestation §5.1 — the W6 ordinance-verbatim constant (`LAMC_LATE_FILING_ORDINANCE_VERBATIM`) needs a live drift-guard, and per the W6 pre-flight ruling (Fork-1) that guard belongs on the **statute-watch** cron (`cron_1_ca_statute_watch`, id `2a58382e`), not the LAHD forms-refresh cron.

---

## §1 — Finding: the watch-scope is external, not a code change

The statute-watch cron is a **Computer-owned automation** (`cron_1_ca_statute_watch`, in the `COMPUTER_OWNED_CRONS` allowlist at `app/api/automation/log/route.ts`). It reports runs into `/api/automation/log` and mirrors to Notion. Its **watch-target configuration** — which statutory sections/URLs it polls — lives in the Computer automation layer / Notion, **not** in this repo. There is no in-repo statute-list config to edit.

Therefore this "amendment" is **not a code PR**. It is a reconfiguration of the external cron's watch targets — a Computer/broker action. This doc is the auditable spec for that change and the repo-versioned reference the W6 drift-guard points to.

## §2 — Required watch-scope additions (`cron_1_ca_statute_watch`)

The cron currently monitors statewide CCP + Civil Code sections (e.g. CCP § 1161, § 1162, § 12/12a). Add the **LA City ordinance** authorities that govern the W6 late-filing rule (canonical source: `lib/jurisdiction/caJurisdictionMatrix.ts` ca-los-angeles-city entry):

| Authority to add | Governs | W6 constant it protects |
|---|---|---|
| LAMC § 151.09.C.9 | RSO post-service LAHD filing requirement | `LAMC_LATE_FILING_ORDINANCE_VERBATIM` |
| LAMC § 165.05.B.5 | JCO post-service LAHD filing requirement | ″ |
| Ordinance 188,681 (eff. 8/20/2025) | Consolidated tenant-protection ordinance | ″ |

**Source URLs to poll** (from `caJurisdictionMatrix` `sources`):
- https://housing.lacity.gov/rtc
- https://housing.lacity.gov/renter-protections-2
- https://housing.lacity.gov/eviction-notices

## §3 — Drift-response contract

If the cron detects a change to any of the §2 authorities that touches the late-filing window or wording:
1. **Fail closed:** the W6 gate module must be treated as stale until the verbatim is re-authored. (`lateFilingGate.ts` carries `LAMC_LATE_FILING_VERBATIM_HASH`; a changed ordinance ⇒ the re-authored verbatim ⇒ a new hash ⇒ the byte-equality + hash tests fail the build until updated + re-ratified.)
2. **Re-author + re-ratify:** pull the new ordinance text verbatim, update `LAMC_LATE_FILING_ORDINANCE_VERBATIM` + `LAMC_LATE_FILING_SOURCE_AUTHORITY` + the hash, and update `LATE_FILING_WINDOW_BUSINESS_DAYS` if the window count changed (the hard-code assertion test enforces the window matches the parsed number). Broker re-ratifies.
3. **Notify:** surface via the same cron notification path used for cover-sheet revision drift.

## §4 — Disposition

- **Engineering:** this spec (done). No code change — the repo already carries the W6 verbatim + hash + hard-code assertion that *react* to a detected change; the *detection* is the external cron's job.
- **Broker / Computer:** reconfigure `cron_1_ca_statute_watch` watch targets to include §2. External action; not blocking any repo build.
- **Standing rule reinforced:** any gate with an ordinance/portal verbatim constant must have its authority under a watch cron whose scope is recorded in a spec like this (repo-versioned), even though the cron itself runs externally.

---

— Engineering (Claude Code) · statute-watch LAMC scope amendment spec · 2026-07-03
