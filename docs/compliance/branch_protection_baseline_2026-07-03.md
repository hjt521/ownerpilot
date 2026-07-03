# Branch-Protection Baseline — 2026-07-03 (supersedes `branch_protection_actual_baseline_2026-07-01.md`)

**Purpose:** Refresh the branch-protection baseline for the omnibus §3.9 / roll-up §4.2 item — add the new route body-parse guard to the Required set on `main`. Supersedes the 2026-07-01 reconciliation doc (kept for history).
**By:** Engineering (Claude Code), 2026-07-03. Repo HEAD `main` (post-#145 + G1 countersign).
**Governance:** `main` is protected by a **Ruleset** ("main protection", Active) — Classic branch protection is NOT configured. The actual Required-checks set is readable **only in the GitHub UI** (Settings → Rules → Rulesets → "main protection"); engineering cannot read it (no `gh`). **Applying any change to Required checks is a §4.13 broker-executed action.**

---

## §1 — New check to add
| Field | Value |
|---|---|
| Workflow | `route-body-parsing-lock` (`.github/workflows/route-body-parsing-lock.yml`) |
| **Required status-check name (add this exactly)** | **`verify-route-body-parsing`** |
| Local runner | `npm run ci:verify-route-body-parsing` (CI runs the guard directly) |
| Guard | `scripts/ci/verify_route_body_parsing.mjs` — forbids `req.formData()` in `app/api` routes unless they import `readRequestBody` |
| Why enforcement-grade | The formData-first parse defect has **recurred once** (#139 privacy-intake Sev-1 → #145 waitlist Sev-2). Advisory ≠ sufficient; making it merge-blocking prevents a third recurrence. |

**Single check, not two.** `route-body-parsing-lock` is one workflow with one job (`verify-route-body-parsing`). The roll-up §4.2 phrasing "both parse-lock checks" refers to the workflow name + job name — add **one** Required status check named `verify-route-body-parsing`.

## §2 — Last-known Required set (needs broker UI re-read)
As of the 2026-07-01 reconciliation, the **actual** Required checks were **5**:
1. `verify-locked-prose`
2. `verify-system-prompt-lock`
3. `test-and-typecheck`
4. `verify-classifier-lock`
5. `verify-no-live-cliff`

**Caveat:** engineering cannot see the live GitHub state; checks may have been added since 07-01. **Broker: re-read the "main protection" ruleset UI and record the current actual set here** before/with adding `verify-route-body-parsing`, so this doc reflects reality (the whole point of the 07-01 §4.12 finding was helper-vs-reality drift).

## §3 — Open §4.12 reconciliation (still broker's call)
The 2026-07-01 doc surfaced that `scripts/verify-branch-protection.mjs` `EXPECTED` did not match GitHub reality, and left a corrective choice **(a) bring GitHub up / (b) correct helper down / (c) curated middle** — unresolved. Adding `verify-route-body-parsing` is consistent with the engineering recommendation **(c): enforce the compliance-critical faces**. Recommended minimum enforcement-grade set for closure:

`test-and-typecheck`, `verify-locked-prose`, `verify-system-prompt-lock`, `verify-classifier-lock`, `verify-no-live-cliff`, `synthetic-daycount-jul2026` (day-count face), `verify-review-produce-parity` (wizard parity), `verify-banned-terms`, `verify-no-operator-secrets`, `verify-e2e-seed-guard`, **`verify-route-body-parsing`** (new).

If the broker adopts a set, engineering will set `verify-branch-protection.mjs` `EXPECTED` to **exactly** that set so helper == GitHub (closes the 07-01 drift finding).

## §4 — Actions
- **Engineering (done, this doc):** specify the exact check name + workflow; recommend the enforcement-grade set.
- **Broker (§4.13):** re-read the ruleset UI → record actual set in §2 → add `verify-route-body-parsing` (and any others from §3 the broker adopts) to Required → tell engineering the final set.
- **Engineering (follow-up):** align `verify-branch-protection.mjs` `EXPECTED` to the broker-adopted set.

---

— Engineering (Claude Code) · Branch-protection baseline refresh (omnibus §3.9 / roll-up §4.2) · 2026-07-03
