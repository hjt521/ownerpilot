# Marketing Tranche 1 — Broker Ruling Addendum · 2026-07-14a

**Layers on top of:** `marketing_tranche1_broker_ruling_2026-07-14.md` (the base ruling; signature stands as-is)
**Type:** Supersession-style addendum. Amends §2, §4, §5 of the base ruling and codifies the four second-tier engineering notes. Does not re-open or re-sign the base ruling — the `2026-07-14` signature remains valid; this instrument is `2026-07-14a`, layered for a clean audit trail.
**Prepared by:** Engineering (drafting role). Counter-signature block for the broker at §6A.
**Boundary unchanged:** Build-only. No publishing. No spend. FF-3 flip (2026-07-28) and Gate-3 closure (2026-08-01) still take precedence over any marketing timeline.

**Origin:** Engineering pre-sign review of the six-artifact Tranche 1 package surfaced three catches (one verified against the production route table) plus four second-tier notes. This addendum rules them in one pass so engineering executes against a corrected package.

---

## §2A — Insert Gate T1-0: Shipped-surface inventory (amends base §2 + §4 gate list)

**Problem.** The base package routes primary CTAs and describes product capabilities against a surface taxonomy that does not match what production serves today. This is an engineering fact available now (a ~1-hour task), not a Tranche-2 copy question. Deferring it pushes ~20 pages + ~13 assets + 5 video storyboards worth of reckoning downstream and risks building marketing around 404s and unshipped capability — the compliance-failure category base §4 and gates 3/12 name.

**Verified mismatch (engineering, 2026-07-14).** Intended CTA/route → actual:

| Base-package route/claim | Production reality |
|---|---|
| `/ask` (primary "Ask OwnerPilot AI" CTA, used across all four prompts) | **Not shipped.** Actual ask surface is `/chat`. |
| `/3-day-notice` | **Not shipped as named.** Actual is `/notice/3-day` (+ `/notice/3-day/options`, `/notice/3-day/serve`). |
| `/serve-and-track` (SEO page #3, carousels, video 2) | **Not shipped as a standalone surface.** The serve step exists at `/notice/3-day/serve`. |
| `/photo-proof-of-posting` (SEO page #4, video 4) | **Not shipped as a standalone surface.** Belongs to the serve step, not a discrete route. |
| `/resolve-and-document` (SEO page #5, carousel 3, video none-direct) | **Not shipped. No route exists.** "Resolve & Document" is a Lane-4 design concept, not a shipped product surface. |
| `/move-out-agreement` (SEO page #6, carousel 4, video 3, lead magnet 4) | **Not shipped. No route exists.** |
| `/riskpath` (RiskPath pages/claims) | **Shipped** (`/riskpath`, `/riskpath/courtesy-reminder`) — but claimed-only; confirm the cold-traffic funnel in the inventory. |

**Authoritative ground-truth anchor.** The Gate T1-0 inventory starts from the production route table below (owner-facing routes served today, verified 2026-07-14), NOT from the marketing team's mental model of the product:

- `/` (homepage)
- `/chat`, `/chat/review` — the "Ask OwnerPilot AI" surface
- `/notice/3-day`, `/notice/3-day/options`, `/notice/3-day/serve`
- `/riskpath`, `/riskpath/courtesy-reminder` (claimed-only)
- `/route-to-counsel`
- `/our-approach`
- `/declaration-of-intent`
- `/landing/business`, `/landing/crisis`, `/landing/default`, `/landing/inheritor`, `/landing/inheritor-visual`, `/landing/retiree`, `/landing/tech` — **an existing marketing-landing system the 8 new SEO pages must reconcile against (dedupe / align), not duplicate**
- `/privacy`, `/privacy-request`, `/preferences/email`
- `/waitlist`

Internal/non-public (never a marketing CTA target): `/admin/*`, `/broker-review/*`.

**The gate.** Before any SEO page, blog article, Canva asset, or video storyboard begins build, engineering produces a shipped-surface inventory: a markdown table mapping every intended CTA and every product-capability claim across all six artifacts to exactly one disposition —

- **(a)** a shipped production route (named from the anchor above), or
- **(b)** "coming soon" in-draft, or
- **(c)** removal from Tranche 1 scope pending product ship.

**Default rule:** rows for surfaces confirmed unshipped default to **(c) removal** unless engineering explicitly recommends **(b) "coming soon"** with written reasoning. The inventory must also confirm the beta-gating status of `/chat` and the claimed-only status of `/riskpath` so cold-traffic CTAs are dispositioned honestly.

**Deliverable:** `docs/compliance/marketing_tranche1_shipped_surface_inventory_2026-07-14.md`.
**Blocking:** No page/blog/asset/storyboard build begins until the inventory is complete and the broker has acknowledged it. The broker's acknowledgment is a **non-signing acknowledgment** (receipt, not a new ruling); the base ruling signature stands.
**New gate placement:** T1-0 precedes base Gate T1-A. Sequence becomes T1-0 (inventory + broker ack) → build → T1-A (build-complete attestation).

---

## §4A — Broker-only attribution supersedes repo-level config on marketing surfaces (amends base §4)

On all marketing surfaces authorized under the base ruling and its tranches, **broker-only attribution supersedes any conflicting language in `CLAUDE.md`, `README.md`, or any other repo-level configuration document.** Attorney attribution, SBN references, and any "Backed by attorney + broker" or "trust badges (attorney + broker)" language must not appear on any marketing surface.

Specifically: where `CLAUDE.md` currently reads *"Trust badges (attorney + broker) above the fold on every page"* and *"Backed by: California Licensed Attorney + California Licensed Real Estate Broker (credentials appear on every page above the fold),"* **those instructions are void on marketing surfaces.** The only credential line permitted on a marketing surface is the broker license line: `California Licensed Real Estate Broker · CalDRE B9445457`.

**Required reconciliation (non-blocking).** Engineering opens a follow-up PR titled `chore(docs): reconcile CLAUDE.md broker-only attribution for marketing surfaces` that redlines the conflicting `CLAUDE.md` language to broker-only. That PR is a broker-review deliverable but **does not block Tranche 1 build** — the supersession clause in this addendum is authoritative in the interim. Rationale: an engineer following `CLAUDE.md` literally would inject attorney credentials into marketing copy, a §0 governance violation; the interim clause closes that gap immediately while the repo-config fix goes through normal review.

---

## §5A — Banned-terms SSOT + scan-scope fix (amends the SEO/blog and analytics/accessibility prompts)

The base package hand-copies a banned-terms list into the prompts. The single source of truth is `lib/chat/bannedTerms.json` (enforced by `scripts/ci/check_banned_terms.mjs`), which today scans only `.ts/.tsx` under `app/`, `components/`, `lib/`. If blogs land as `.md/.mdx` or under a content directory, the guard never sees them and the "zero banned terms" attestation is hollow.

The SEO/blog prompt and the analytics/accessibility prompt are amended to require:

1. **SSOT read.** The banned-terms CI guard reads its term list from `lib/chat/bannedTerms.json` as the single source of truth. No hand-copied banned list appears in any generated file.
2. **File-type globs extended** to include `**/*.md`, `**/*.mdx`, and whichever content directory blogs land in (engineering picks the path in Gate T1-0 and records it).
3. **Path globs extended** to include `**/marketing/**`, `**/blog/**`, `content/**`, `app/(marketing)/**`, `app/(blog)/**`, or whichever route grouping matches the actual layout.
4. **Additions land in the SSOT.** Any new banned term is added to `lib/chat/bannedTerms.json`, never to a duplicate file.
5. **Falsifiable attestation.** The "zero banned terms" claim at Gate T1-A must cite the exact commit SHA of `lib/chat/bannedTerms.json` and the exact glob list the guard scanned, so the attestation can be independently reproduced.

---

## §5B — Second-tier engineering notes (codified, non-blocking)

Folded in as binding execution constraints, none of which change scope or cost:

1. **Consent surface reuse.** The marketing analytics scaffolding reuses the existing Cookiebot consent surface (`lib/analytics/consent.ts`). Do **not** build a second consent banner. The scaffolding must not reintroduce a mount that the guard-G pre-consent-analytics deletion ruling forbids — it stays behind `MARKETING_ANALYTICS_ENABLED` (default OFF) and consent-gated, and `ci:verify-no-preconsent-analytics` must stay green.
2. **PII-guard extension.** Extend `scripts/verify-analytics-no-pii.mjs` to cover any new firing function introduced by the marketing analytics scaffolding — the same pattern used for the FF-3 telemetry seam (`emitFf3Event`), so the marketing event schema is under build-time PII coverage.
3. **Accessibility split.** The machine-executable audits (axe-core, Lighthouse, Pa11y) are the mandatory Gate T1-A deliverable. Manual checks (keyboard-only nav, VoiceOver, NVDA, WAVE) are **not** machine-executable from the engineering environment; they are delivered as a documented human-audit protocol for the broker or a designated auditor to execute separately. The prompt language claiming engineering "performs" the manual audit is reframed accordingly.
4. **Boilerplate as a single constant.** The sitewide disclaimer and broker license line are implemented as a single imported constant (`lib/marketing/legalBoilerplate.ts` or matching codebase convention) referenced by every surface, so the exact-string CI check is drift-proof rather than depending on 20+ hand-copies.
5. **Tooling reality.** The Canva MCP is connected in this environment — the authenticated Canva build path is viable once the broker authorizes it. AI video tooling (Sora, Runway, HeyGen, Gemini Omni) is not present; that stream stays prompts + storyboards only, which matches the base boundary.

---

## §6A — Amendment signature block

This addendum amends base §2, §4, §5 and codifies §5B. It does not change the build-only / no-publish / no-spend boundary and does not re-sign the base ruling. On counter-signature: engineering executes Gate T1-0 first, opens the `CLAUDE.md` reconciliation PR in parallel (non-blocking), and proceeds with Tranche 1 build only against the inventory-verified surface.

Reviewed and approved as an amendment to `marketing_tranche1_broker_ruling_2026-07-14.md`.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-14

Signature: ________________________________

Date: ____________

---

*Draft prepared by Engineering · 2026-07-14 · for broker counter-signature. Ground-truth route table verified against the production app router on 2026-07-14. Engineering does not sign the broker block.*
