# G1 Status Rollup — 2026-07-03

**By:** Engineering (Claude Code) · **Repo:** `hjt521/ownerpilot` `main` HEAD post-case-168 · **Supabase prod:** `txpetdrfsmqnyooydmas`
**Governance:** §0 broker-governance. Engineering builds + verifies + hands git blocks; JT (broker) runs all git/merge/deploy/DB/GitHub-settings actions (§4.13). Migrations to prod are broker-executed in Supabase Studio.

---

## 1 — Merged this cycle (cases 146–168)

**Omnibus Gate-3 waves — all merged:**
- **Wave-1/2:** W1 walkthrough + FMR table (148, 149) · W5 filename generator + two-convention align (150, 156) · W7 DO-NOT-SERVE holds (151) · C1 broker checklist (152) · W6 late-filing escape hatch (153) · FF-4 FMR pre-check gate — pure (154) · W4 post-filing EFS capture (155) · W2 intake routing (157) · W3 packet-manifest disposition (158).
- **Branch-protection:** baseline (147) + full-inventory refresh (167).
- **FF-3 keystone (the big one):** structured intake fields + migrations 041/043 (159) · capture matchers (161) · capture prompts/locked prose (162) · capture state machine (163) · activation wiring, dark/flag-gated (164) · amount-reconciliation gate core (165) · Playwright spec (166).
- **PR-A2:** intendedServiceDate wiring + UI completion audit (168).

**Parallel non-FF-3 backlog — cleared this session:** branch-protection refresh (#118 ✅), PR-A2 (#82 ✅), W5 (#119 ✅ verify-and-close).

## 2 — Migrations ledger (prod)

| # | What | Status |
|---|---|---|
| 037 | waitlist | applied |
| 038 | do_not_serve_holds | applied |
| 039 | broker_compliance_actions | applied |
| 040 | lahd_filing_efs_capture | applied |
| 041 | ff3 structured intake columns (+6 NOT VALID checks) | **applied** |
| 043 | ff3_capture_status (+NOT VALID check) | **applied** |
| **042** | **VALIDATE all 7 FF-3 constraints** | **PENDING — earliest 2026-07-10 (post-soak); reminder scheduled** |

## 3 — FF-3 keystone: four-gate flag-on tracker (Preview only)

FF-3 capture is fully built but **DARK** (`FF3_CAPTURE_ENABLED` off everywhere incl. prod). Path to Preview flag-on (countersign §4 — the only authorized path):

| Gate | What | Status |
|---|---|---|
| 1 | Migration 042 VALIDATE | ⏳ ~2026-07-10 (broker-executed) |
| 2 | Playwright spec (5 categories + escalation + confirmation + reconciliation branch + amount conditional) | ✅ merged (166); reconciliation branch scaffolded pending 042 wiring |
| 3 | Preview E2E run (042 landed · 14 locked entries hashed · broker-side resolution surface live · reconciliation synthetics executable) | ⛔ blocked on Gate 1 + below |
| 4 | Broker countersign of the Gates 1–3 attestation packet | ⛔ after 1–3 |

**FF-3 work that must land WITH migration 042 (per countersign §6 — no merge to main before the 042 window):** reconciliation gate wiring (place core between FF-3 and FF-4, emit mismatch card) · locked-prose entries 13 (`chatFf3ResumeAfterBrokerReviewCard`) + 14 (`chatFf3AmountReconciliationFlag`) · broker-side `awaiting_broker_review` resolution surface. **Prod flag-on is NOT authorized** — needs its own ruling (data-volume review, rollback drill, on-call).

## 4 — Pending BROKER actions (the queue)

1. **Migration 042 VALIDATE** — Supabase Studio, earliest 2026-07-10 (pre-flight for constraint violations first; reminder scheduled).
2. **Branch-protection Required checks** (§4.13, GitHub "main protection" ruleset UI) — add `verify-route-body-parsing`; recommend promoting the 8 advisory guards to Required (all 20); record the live set into `branch_protection_full_inventory_baseline_2026-07-03.md` §2; tell engineering the final set → helper `EXPECTED` aligned.
3. **ADMIN_EMAILS** on Vercel — for the C1 broker-checklist admin gate.
4. **Sentry toggles** — Data Scrubber + Scrub IP (C1 preconditions) before relying on Sentry.
5. **W5 verify-close doc** (169) — merge (doc-only, optional).
6. **Do NOT** flip `FF3_CAPTURE_ENABLED` before Gate 4; do NOT run 042 early even if it looks clean (the soak is the point).

## 5 — Pending ENGINEERING / future-lane work (dependency-ordered)

**Blocked on the 042 window (~07-10):** FF-3 reconciliation gate wiring + entries 13/14 + broker resolution surface (§3 above).

**Wave-3 produce-wiring lane (not 042-gated — buildable now):**
1. FF-4 FMR gate → produce-entry hook (pure gate already merged; needs the call-site for non-payment 3-day-pay-or-quit, same shape as the W7 hold gate).
2. Wire W6/W2 into produce.
3. Packet-manifest generator (consumes W3 classifier + W5 Convention-A filenames — the deferred Convention-A callers).
4. W4 EFS capture as an UPDATE (tight-scope).
5. Wave-4 golden integration test.
6. W5 notice-PDF bridge already wired (Convention B); Convention-A generators are this lane's cover-sheet/POS/manifest work.

## 6 — Bottom line

The omnibus is merged; FF-3 is built and parked correctly behind its four-gate discipline until the ~07-10 migration-042 window. The near-term parallel backlog is cleared. Next engineering work is either the 042-gated FF-3 finish (waits on JT + soak) or the non-042 Wave-3 produce-wiring lane (buildable now, starting with the FF-4 produce-gate hook).

---

— Engineering (Claude Code) · G1 status rollup · 2026-07-03
