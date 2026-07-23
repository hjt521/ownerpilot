# CA-001 — Audit Automation Design

Design only — **not deployed** by this task. Automation extends the existing validation runner (`constitution/validation/run_checks.*`) and CI, not a parallel system. Every automation is classified by who has authority over its output.

## The three tiers (authority boundary)

1. **Deterministic checks (CI-runnable, blocking where policy allows):** pure, reproducible, no judgment. Output is evidence, not a ruling.
2. **AI-assisted analysis (advisory only):** interpretation, risk framing, remediation drafting. **AI output alone is never constitutional ratification or a Compliant conclusion** — it is an input to a human/deterministic decision.
3. **Human-only constitutional decisions:** ratification, supersession, waivers, blocking-authority grants, Indeterminate→Compliant transitions. Reserved to the Founder / Constitutional Steward.

## Automation targets → tier

| Automation | Tier | Basis (extends) |
|---|---|---|
| Schema-baseline comparison / drift | **Deterministic** | `run_checks.sql` check 0/12 (genesis checksum vs committed baseline) |
| Migration linting (additive, reversible, standards-compliant, has record) | **Deterministic** | migration workflow + governance record template |
| Metadata validation (required CKO/artifact fields present) | **Deterministic** | artifact metadata standard |
| Checksum validation (recorded == recomputed) | **Deterministic** | checksum standard; CA-001 §7 |
| Broken-reference detection (references resolve to real artifacts) | **Deterministic** | `cross_references` / artifact registry |
| Supersession integrity (superseded_by/ supersedes consistent, ratified history immutable) | **Deterministic** | `amendments`, `artifacts` |
| Ratification-authority validation (only human actors ratify) | **Deterministic** | `approvals.actor`, governance identities standard |
| **Forbidden autonomous-ratification detection** (no AI actor in a ratify/supersede action) | **Deterministic** | governance-identity format (`ai:` prefix) + approvals/decisions |
| Separation-of-duties (implementer ≠ approver/auditor of same work) | **Deterministic** | approvals + authorship (git) |
| Production-vs-repository drift | **Deterministic** | run_checks live-vs-committed checksum |
| Supabase advisor review | **AI-assisted + deterministic** | `get_advisors` pull + baseline diff (weekly watch) |
| Pull-request constitutional review (does the PR follow the workflow, docs synced, ADR present?) | **AI-assisted** (advisory) → human approve | CI checks 11/13/14 + reviewer |
| Risk framing / remediation drafting on findings | **AI-assisted** (advisory) | finding model |
| Waiver grant / blocking-authority / final disposition | **Human-only** | Founder/Steward |

## Independence enforcement in automation
- The Auditor's automation **reads** repository + live introspection; it **never writes** to production or merges.
- Separation-of-duties check fails a PR where the same actor implemented and approved/audited the same change (evidence: git authorship vs `approvals.actor`).
- Forbidden-autonomous-ratification check fails any ratify/supersede action whose actor carries an `ai:` / `service:` identity prefix (governance-identities standard) — only human identities may ratify.

## Rollout (design, sequenced — not executed here)
Wire the deterministic tier into the existing CI gates + weekly watch first (extends `ci_cd_design.md`); add AI-assisted PR review as advisory-only; keep human-only decisions manual. No automation is granted blocking authority until an approved policy explicitly grants it (CA-001 mandate).
