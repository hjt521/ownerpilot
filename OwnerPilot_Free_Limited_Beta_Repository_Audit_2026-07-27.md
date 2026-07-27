EXECUTIVE FINDING
The previous 62% estimate cannot be confirmed or refuted from this repository or session history — no document, commit, or STATUS.md entry referencing "62%" was found anywhere accessible. Treat that figure as unverified rather than confirmed stale; this audit does not extend it, it replaces it with a grounded estimate.

Scoring method: this audit scores only active product behavior under app/ and lib/ — the constitution/ governance work (BTRM ratification, RCO-001/DECG-001, ADRs) is real and substantial but counts as zero toward MVP completion, per the directive's explicit instruction not to equate documentation-only governance work with product behavior. Each capability area was scored 0–100% using the evidence gathered against the required implementation-state vocabulary (Code implemented → Deployed route present → Production path actively invoked → Persistence verified → Resume/recovery verified → End-to-end operationally proven), weighted toward the capabilities the free beta actually needs (chat intake, eligibility gating, 3-Day Notice workflow, Serve & Track, RiskPath continuity, review/escalation) over deferred or explicitly out-of-scope capabilities (BTRM production activation, LAHD/LA City activation, broader Resolve & Record, payment/billing).

Current estimated MVP implementation completion: approximately 45–50%. Substantial, well-built code exists across nearly every area, but the free-beta path is fragmented across two parallel systems (a database-backed chat/RiskPath system and a localStorage-only notice wizard) that do not talk to each other, and several gates that look enforced on paper are unfed in the live route.

Free limited-beta readiness: approximately 25–30%. The gap between "code exists" and "responsibly launchable to ungated public traffic" is large: the wizard the beta would ship has no server persistence at all, eligibility-gate triggers are computed but never written to the database column the produce-gate actually reads, and Serve & Track has zero test coverage and no link to RiskPath.

Broader public-launch readiness (paid, wider scope): approximately 10–15%, included only as a non-controlling comparison — LAHD/LA City activation, broader Resolve & Record, and billing infrastructure are all either explicitly out of scope or materially incomplete.

1. CURRENT-STATE CAPABILITY INVENTORY

Ask OwnerPilot AI (Chat)
- Implementation state: Deployed route present; Persistence verified (server-side `chat_sessions` table); Resume/recovery verified server-side only (client UI does not rehydrate transcript).
- Route: `app/chat`. Key files: `app/api/chat/route.ts`, `lib/chat/orchestrate.ts`, `lib/chat/session.ts`, `lib/chat/dbTypes.ts`, `lib/chat/toNoticeFlowData.ts`.
- Persistence: `chat_sessions` Postgres table, keyed by hashed anonymous token in an httpOnly cookie.
- Feature flags: none gate `/chat` itself; `FF3_CAPTURE_ENABLED` gates the newer structured-intake chain (default off); `CLASSIFIER_LIVE` gates an AI response classifier (log-only by default).
- Known gap: the attorney-signed-off legal-guard suite (`lib/chat/guards.ts`) is fully built and tested but is imported only by test/harness files — never by the live `app/api/chat/route.ts`. Only a narrower banned-term scrubber is actually wired in.

Eligibility gating
- Implementation state: Code implemented (definitions exist) but largely UI-only/advisory in the live path.
- Key files: `lib/chat/refusalBank.ts`, `lib/riskpath/triggers.ts`, `lib/riskpath/produceGate.ts`, `lib/intake/noticePathwayGate.ts`, `lib/chat/scriptedCapture.ts`.
- Known gap: `evaluateProduceEligibility` (the actual hard-block) is wired into the chat→produce route and works correctly, but the column it reads (`chat_sessions.counsel_route_trigger`) is never written by the live chat route — only by a test-only seed route. Every trigger that depends on that column (residential scoping, retaliation, fair-housing, subsidized housing, disputed/partial/post-notice payment) evaluates to "no trigger" for real users regardless of what they typed.

3-Day Notice workflow (wizard)
- Implementation state: Code implemented; Deployed route present. Persistence is browser-localStorage only — not "Persistence verified" in the durable/server sense.
- Route: `app/notice/3-day` (`components/notice-flow.tsx`), `app/notice/3-day/options`.
- Key files: `lib/dates/computeCompliancePeriod.ts`, `lib/dates/intendedServiceDate.ts`, `lib/flow/gates.ts`, `lib/produce/renderNotice.ts`, `lib/produce/buildPacketHtml.ts`, `lib/flow/persistence.ts`.
- Tests: dense unit-test coverage (persistence, gates, advancement, date math, packet build). Zero e2e coverage — every existing Playwright spec targets the separate `/chat` rebuild, not this wizard.
- Known gap: `lib/flow/persistence.ts` writes only to `window.localStorage` (design comment: "Data never leaves the browser"). No Supabase call anywhere in this flow. Does not write to `riskpath_records` — this wizard is not connected to RiskPath at all.

Serve & Track
- Implementation state: Code implemented for fact capture; not Persistence verified (localStorage only); not Resume/recovery verified beyond same-browser/same-version; no test evidence found.
- Route: `app/notice/3-day/serve` (`components/serve-track.tsx`, `ReServePanel` in `notice-flow.tsx`).
- Captures: method, attempt date/outcome, mailing date, server identity/attestations, notes. Generates a printable service log and proof-of-service page (browser print-to-PDF, no server PDF service).
- Known gaps: no photo capture (guidance text only, no upload path); no Supabase call anywhere in this flow; a `DRAFT_VERSION` bump silently discards in-progress drafts with no migration or warning; zero e2e or unit tests found for this route; the RiskPath schema has no service-record table at all, so even if this were wired up today there is nowhere for it to write.

RiskPath / matter continuity
- Implementation state: Persistence verified for the chat-path system (real Supabase tables, RLS-scoped); the notice wizard and Serve & Track are entirely disconnected from it.
- Key tables: `chat_sessions`, `riskpath_records` (FKs: `user_id`, `chat_session_id`, `property_id`, `notice_document_id`), `lahd_filing_records`.
- Known gaps: no `tenant_id`/`tenancy_id` FK anywhere in the schema (tenant identity lives only in jsonb blobs); no service-record table; no "served" state in the 15-state machine; the notice wizard the beta will actually ship writes nothing to this schema.

Jurisdiction & property handling
- Implementation state: mature — Code implemented, well tested (18-address test sets, 17/18 and 12/18 pass rates across two resolver generations), three independently layered gates (resolver gate, produce gate, dynamic freshness gate).
- Key files: `lib/jurisdiction/geocode/resolveLaAddressV2.ts`, `countyParcelAdapter.ts`, `zimasParcelAdapter.ts`, `laRtcRules.ts`, `parcelHealthGate.ts`.
- Known gap: one flagged test-set item (a Santa Monica address) still needs broker/Janna resolution; the geographic-detection vs. legal-activation distinction is cleanly separated in code, which is good, but LA City is not activated (by design, pending Founder/Janna sign-off).

LAHD / local filing support
- Implementation state: conditional — Code implemented in part; explicitly not launchable as-is per the code's own comments.
- Key files: `lahd_filing_records` migration, `lib/filing/` (efsRecord.ts, lateFilingGate.ts), `rtcFormBaselines.ts`.
- Known gap: the W6 late-filing gate is explicitly not yet wired into the live produce route (its own header comment says it would fail-closed on every current produce today); `PHASE2D_ASSEMBLY_ENGINE_WIRED` (the LA produce flag) defaults false.

Payment fact plumbing
- Implementation state: Code implemented for payment-method validation only.
- Key files: `lib/payments/validatePaymentMethods.ts`, `contactValidation.ts`.
- Known gap: payment-event facts (partial payment, payment-after-notice, cure/withdrawal/reconsideration records) exist only in the separate, disconnected chat-rebuild's RiskPath document-path layer (`lib/riskpath/paths.ts`) — not in `lib/payments/` and not connected to the wizard the beta would ship.

Resolve & Record (six approved factual outcomes)
- Implementation state: mostly missing / represented only in data or copy.
- Key files: `lib/riskpath/paths.ts`, `lib/riskpath/transitions.ts`, `app/api/riskpath/route.ts` (GET-only).
- Known gap: `docs/compliance/ruling5_resolve_document_removal_attestation_2026-07-22.md` (dated five days before this audit) documents that the interactive version of this feature was explicitly removed from marketing on 2026-07-22 because it advertised an unshipped surface. No POST/PATCH route anywhere updates outcome status. Of the six Founder-approved labels: "attorney referral" is the most built (locked status + live referral page + 22-trigger taxonomy); "payment reported" and "possession change reported" have data-shape scaffolding only; "payment status requires review," "owner withdrew current notice path," and "service issue requires review" have no code representation found at all.

BTRM (seven stages)
- Implementation state: shipped, feature-flagged off by default, zero production callers found for any stage — by design.
- Key files: `lib/btrm/*` (enr, bae, tm, cm, icoa, rie, ocm, cs, pol), `lib/btrm/envelope.ts`, `lib/btrm/safeguards/`.
- Note: this is a deliberate, ratified posture (BTRM-001), not a gap to close for beta.

Review-model infrastructure
- Implementation state: risk-trigger routing to outside counsel is implemented and tested; a general "every notice reviewed" queue does not exist.
- Key files: `lib/riskpath/triggers.ts`, `lib/riskpath/produceGate.ts`, `app/route-to-counsel/`, `lib/admin/ff3Review.ts` (narrow FF-3 review queue), `manual_review_queue` (geocode-only).
- Known gap: no SLA-breach alerting; no non-triggered "skip" logging; no multi-reviewer pool.

Privacy, production operations, and audit
- Implementation state: comparatively mature — Code implemented and largely wired for privacy requests, consent, suppression, and audit logging.
- Key files: `app/api/privacy-request/route.ts`, `lib/privacy/sla.ts`, `lib/privacy/suppression.ts`, `lib/audit/exportCore.ts`, `lib/audit/cliffCore.ts`, `CookiebotBanner.tsx`.
- Known gap: no beta-feedback mechanism found anywhere; no in-product "flag this AI answer" correction path; monitoring (Sentry) is opt-in via env var with no confirmation it will be set for beta; audit-write-failure recovery is a manual runbook step, not automated.

Public site / marketing copy
- Implementation state: mixed — most SEO/marketing pages (`app/(marketing)/*`) are gated behind `MARKETING_TRANCHE1` and currently 404 in production (preview-only); `app/landing`, `app/our-approach`, `app/route-to-counsel`, `app/declaration-of-intent`, `app/waitlist` are live.
- Known gap: no "free beta" messaging exists anywhere on the public site today (the waitlist page says "limited beta," not "free"); this would need to be added deliberately if the Founder wants it stated publicly.

2. PRESERVATION REGISTER
Do not rebuild or restructure: the `chat_sessions`/`riskpath_records` persistence and identity model; the fail-closed chat→notice bridge (`toNoticeFlowData.ts`); the two-attempt escalation-to-broker-review mechanism (`scriptedCapture.ts`); the attorney-signed-off H1 legal-guard suite (`lib/chat/guards.ts`) — it needs wiring, not re-authoring; `lib/dates/computeCompliancePeriod.ts` and related date-math modules (attorney-reviewed, fully unit-tested); `lib/produce/renderNotice.ts` (build-locked, attorney-signed-off prose v4); `lib/flow/persistence.ts`'s versioned-envelope discipline (even though it's localStorage-only, the pattern itself is sound); `lib/payments/validatePaymentMethods.ts` (statute-mapped, tested); the RiskPath status/path catalog (`lib/riskpath/transitions.ts`, `paths.ts`, `triggers.ts` — broker-ruling-locked, "do not add/remove/re-order"); the entire `lib/jurisdiction/` resolver stack (mature, tested, three-layer gating already correctly separates geographic detection from legal activation); the `MARKETING_TRANCHE1` kill-switch pattern and the single-source `legalBoilerplate.ts` broker-attribution footer; the closed-beta allowlist/waitlist infrastructure; all of `lib/btrm/*` (ratified, deliberately dark — do not activate or redesign); the privacy-request/consent/suppression/audit-log infrastructure in `lib/privacy/` and `lib/audit/`.

3. COPY-TO-CAPABILITY DISCREPANCY REPORT
Fully supported: "Serve & Track" (real capture UI + service log, though not server-persisted), "proof of service"/"service log" claims, "LAHD filing support" (correctly qualified — copy explicitly says OwnerPilot does not file for the owner), jurisdiction-checking claims (substantial real code), the CalDRE 01871659 broker-credential line (single-source, structurally enforced).
Supported with qualification: "RiskPath" continuity claims (real persistence exists but access requires a claimed session, and the wizard/Serve&Track data never reaches this system); the "within 24 hours" broker-review SLA claim (a real SLA-tracking mechanism exists; whether a human actually responds within 24h in practice is an operational fact, not a code fact).
Based on dark/preview-only functionality: most `app/(marketing)/*` SEO pages currently 404 behind the `MARKETING_TRANCHE1` flag.
Flagged for legal review (Janna), not resolved here: all "broker-supervised"/"broker-reviewed" language, and all attorney-adjacent references (properly hedged in code as found, but the underlying licensure/regulatory characterization is a legal question, not a code question).
No unsupported claims of legal conclusiveness were found: "legally served," "court-ready," "legally valid," and "QR resume" do not appear anywhere as affirmative public claims; the live chat surface has an explicit banned-term gate blocking exactly this category of language ("legally compliant," "court-ready," "guaranteed," "verified").
"Resolve & Record": the interactive version of this was removed from marketing on 2026-07-22 per a documented compliance ruling, specifically because it advertised an unshipped surface — this is the one confirmed instance of copy having previously outrun capability, already corrected.

4. OPERATIONAL PROOF-GAP REPORT
Code exists but deployment not proven: none identified — every area audited has at least a deployed route.
Deployed route exists but invocation not proven: Serve & Track (no test evidence of invocation anywhere); the FF-3 structured-intake chain (flagged off by default).
Invocation exists but persistence not proven durably: the 3-Day Notice wizard and Serve & Track both — persistence exists only as browser localStorage, explicitly documented as never leaving the browser.
Persistence exists but resume/recovery not fully proven: chat sessions persist server-side but the client UI does not rehydrate the visible transcript on return; the wizard/Serve&Track resume only same-browser, same-version, with silent data loss on a version bump.
Workflow works in code but operator process not proven: the broker-confirm SLA and FF-3 review queue have real timestamps and status fields but no dashboard, no SLA-breach alert, and no confirmation an operator actually monitors them.
End-to-end operationally proven: not established for any area from static code review alone — this audit found e2e test files for the chat/RiskPath path (suggesting real test intent) but did not execute them, and found zero e2e coverage at all for the notice wizard or Serve & Track. No area in this repository can be described as "end-to-end operationally proven" on the evidence gathered.

5. ELIGIBILITY-GATE INVENTORY
California residential tenancy scoping — advisory only (keyword regex, no explicit intake question) — operational gap; not Janna-blocked, a plumbing gap.
Nonpayment matter type scoping — implemented, dark (behind `FF3_CAPTURE_ENABLED`, off by default).
Supported vs. unresolved jurisdiction — implemented client-side only; server route hardcodes a pass rather than calling the resolver — operational gap.
Bankruptcy/stay flag — UI-only in the chat path; the real hard-block only protects the unreachable old wizard.
Habitability issue flag — UI-only, same reachability gap.
Retaliation issue flag — advisory only (detector built, unwired).
Fair-housing/accommodation flag — advisory only, same pattern.
Subsidized housing flag — advisory only, same pattern.
Disputed rent flag — advisory only, trigger defined but never set.
Partial payment flag — advisory only, defined but disconnected from chat capture.
Post-notice payment flag — advisory only, same pattern.
Unsupported notice type fallback — implemented (two-attempt escalation to broker review; fails closed).
Missing material facts handling — implemented (fail-closed bridge to notice creation).
Duplicate/conflicting matter state — missing entirely; no code found checking for an existing open matter before starting a new one.
Root cause common to nearly all "advisory only" rows: the live chat route never writes the resolved trigger to `chat_sessions.counsel_route_trigger`; only a test-only seed route does. The consumer gate (`evaluateProduceEligibility`) already blocks correctly on that column — it is unfed, not broken. This is a single, well-scoped operational fix, not a Janna-blocked item, though the separate question of whether the old wizard's bankruptcy/habitability hard-block should be ported into the chat-based produce path is a Janna-relevant judgment call about what should happen, not just wiring.

6. REVIEW-MODEL COMPARISON
Current components shared by both models: a canonical 22-item trigger taxonomy, a hard pre-flight production gate, status enums with timestamps, and an audit-purge mechanism — all built for the risk-trigger/counsel-routing use case specifically.
Missing for either model: a "hold for review, not yet cleared" block on production output; non-triggered/skip-decision logging; multi-reviewer assignment; SLA-breach alerting.
Additional missing for Model 1 (every-notice review) specifically: a queue scoped to "every notice" rather than only trigger-fire or geocode-ambiguity cases; reviewer-pool assignment (today: single broker only, via `ADMIN_EMAILS`/shared secret).
Audit implications: Model 1 would generate substantially more review volume against the same narrow audit/reviewer-identity primitives that exist today; Model 2 already matches the shape of what's built.
Operational burden: Model 1 requires either more reviewer capacity or slower turnaround for every notice; Model 2 concentrates burden on flagged matters only, consistent with what's already wired.
Implementation difference: primarily scope (which notices enter the queue), not missing primitives — the same queue/status/reviewer-identity machinery underlies both; this audit does not recommend which model is legally permissible.
Janna dependencies: whether every notice must be reviewed, or only risk-triggered ones, and what "review" must consist of, are UPL/LDA and broker-authority questions reserved for Janna.

7. LAUNCH-BLOCKER REGISTER
Legal or Janna: UPL/LDA and role boundary; demand-amount/excluded-charge rules; service-evidence and actual-server confirmation; LA City control package; payment-event legal treatment; whether the old wizard's dispute/bankruptcy hard-block must be ported into the chat produce path; the one flagged geocode test-set item (Santa Monica address).
Founder decision: whether/how to state "free" in public beta copy; which review model (every-notice vs. risk-trigger) to adopt once Janna rules; LA City activation timing; broader Resolve & Record scope beyond the six approved labels.
Architecture and governance: RCO-001/DECG-001 coordinated ADR (blocked pending the Architect's focused confirmation of the DECG-001 v0.4 correction — tracked separately under Track A, not a beta blocker per se).
Implementation (nonlegal, closeable now): wire the live chat route to write `counsel_route_trigger`; connect the notice wizard and Serve & Track to server-side persistence and RiskPath; add a service-record table and a "served" state; add duplicate/conflicting-matter detection; add resume/rehydration for the chat transcript; add e2e coverage for the wizard and Serve & Track.
Production operations: no beta-feedback/correction mechanism; no SLA-breach alerting; unconfirmed monitoring configuration.
Copy and compliance: no "free" messaging on the public site yet; broker-supervised/reviewed language awaiting Janna sign-off; most SEO marketing pages still gated off.
Post-launch enhancement (not a blocker): BTRM activation; broader Resolve & Record; LAHD/LA City full activation; payment-event automation beyond factual capture.

8. MINIMAL FREE-BETA SCOPE
The smallest credible scope uses the existing chat intake and its fail-closed bridge into the existing notice-drafting logic (dates, gates, document rendering), with the counsel-route-trigger persistence gap closed so the existing produce gate actually enforces what it already knows how to enforce; Serve & Track's existing fact-capture UI wired to durable, server-side storage (even a minimal one) rather than localStorage; the existing risk-trigger routing to outside counsel as the sole review model for launch (matches what's already built, pending Janna confirmation that this satisfies the applicable rules); and the six approved factual outcome labels represented, at minimum, as read-only status on the RiskPath dashboard rather than as a full interactive recording feature (consistent with the 2026-07-22 compliance ruling's own disposition). LA City activation, broader Resolve & Record, and any billing/payment infrastructure remain out of this minimal scope.

9. SMALLEST PR SEQUENCE (proposed only — not opened)
PR 1 — Persist `counsel_route_trigger` from the live chat route. Purpose: feed the already-correct produce gate. Files: `app/api/chat/route.ts`, `lib/chat/refusalBank.ts`. Dependencies: none. Risk: low (additive write). Tests: unit test asserting the column is set on each refusal category. Rollback: revert the write; gate reverts to current (permissive) behavior. Janna approval: not required for the wiring itself; recommended to confirm which trigger categories should actually block vs. merely log. Founder authorization: not required.
PR 2 — Add server-side persistence for the 3-Day Notice wizard draft (a durable table mirroring the existing localStorage envelope shape). Purpose: eliminate silent data loss on device change/cache clear. Files: `lib/flow/persistence.ts`, a new migration, a thin API route. Dependencies: none. Risk: medium (new write path). Tests: persistence round-trip test. Rollback: feature-flag the new write path off, fall back to localStorage. Janna: not required. Founder: recommended sign-off given it's a scope decision, not required.
PR 3 — Link the notice wizard and Serve & Track to `riskpath_records` (add the FK, write on notice creation and on each service attempt). Purpose: close the "two disconnected systems" gap. Files: `lib/flow/*`, `components/serve-track.tsx`, new migration for a service-record table. Dependencies: PR 2. Risk: medium. Tests: continuity test (create notice → serve → confirm one matter id). Rollback: additive-only, can be disabled via flag. Janna: not required. Founder: recommended sign-off (schema decision).
PR 4 — Add duplicate/conflicting-matter detection at chat/notice start. Purpose: close the one eligibility gate found entirely missing. Files: `lib/intake/`, `app/api/chat/route.ts`. Dependencies: PR 3 (needs a queryable matter store). Risk: low. Tests: unit test for existing-open-matter detection. Rollback: trivial. Janna: not required. Founder: not required.
PR 5 — Add e2e coverage for the notice wizard and Serve & Track. Purpose: close the "zero test evidence of invocation" gap. Files: new `e2e/*.spec.ts`. Dependencies: PR 2/3 for meaningful assertions. Risk: none (test-only). Rollback: n/a. Janna: not required. Founder: not required.
PR 6 — Chat transcript rehydration on resume. Purpose: fix the UX gap where a returning user sees a blank chat despite server-side history. Files: `components/chat/ChatSurface.tsx`, `app/api/chat/review`. Dependencies: none. Risk: low. Rollback: trivial. Janna/Founder: not required.
PR 7 — Beta feedback / correction-intake route. Purpose: close the "no way to flag a bad answer" gap identified in privacy/ops review. Files: new route + table. Dependencies: none. Risk: low. Janna: not required. Founder: recommended (scope/tone of the feedback surface).
PR 8 — Operator SLA-breach alerting for the broker-confirm/FF-3 review queues. Purpose: prevent silent reviewer unavailability. Files: `lib/cron/`, existing SLA timestamp fields. Dependencies: none. Risk: low. Janna: not required. Founder: recommended (who gets alerted).

10. JANNA-BLOCKED WORK
UPL/LDA and permissible broker/non-attorney role boundary; whether every notice requires review or risk-trigger review suffices; demand-amount and excluded-charge rules; service-evidence sufficiency and actual-server confirmation; the LA City control package in full; payment-event legal treatment (cure, waiver, acceptance-of-payment consequences); whether "broker-reviewed"/"broker-supervised" public language is permissible as currently worded; whether the old wizard's dispute/bankruptcy hard-block must be ported into the live chat produce path; resolution of the one flagged geocode test-set item's broader policy implication (if any). No rule is guessed at anywhere in this audit.

11. FOUNDER-DECISION WORK
Whether and how to state "free" in public beta copy (currently absent); which review model to formally adopt for launch once Janna rules on the boundary; timing of LA City activation once Janna/source-freeze conditions are met; scope of the durable persistence migration (PR 2/3 above) and its rollout sequencing; whether to sign off on a minimal read-only Resolve & Record display now versus waiting for full interactive recording; alerting/staffing model for review-queue SLA breaches.

12. TRACK A DEPENDENCY MAP
Can proceed before ratification: everything in the minimal free-beta scope above — the chat intake, notice wizard, Serve & Track, and risk-trigger review all currently operate (to the extent they operate at all) as ordinary application workflows using existing types (`NoticeFlowData`, `riskpath_records`, the 15-state RiskPath machine) — none of it depends on RCO-001 or DECG-001 being ratified, persisted authoritatively, or traversed in production. BTRM remains fully dark regardless of Track A's status. Must wait for ratification: any future migration of the notice/RiskPath data model onto RCO-001's canonical shape, any DECG-001 production trace traversal, any claim of canonical RCO/DECG conformance, and ECAP Phase B generally. The free limited beta, as scoped in section 8, does not require any of the waiting items.

13. NO-DUPLICATION CONFIRMATION
No existing product surface, workflow, test, research artifact, architecture artifact, data model, route, or operator tool was found to have been unnecessarily recreated or proposed for replacement anywhere in this audit. Two genuinely parallel systems exist (the localStorage-only notice wizard/Serve&Track vs. the Supabase-backed chat/RiskPath system) — this audit treats that as a real, pre-existing architectural fact to be reconciled (see PR 3), not as duplicated work to discard; both were built for real reasons and both contain material worth preserving, per section 2.

FINAL RESPONSE
1. Current estimated MVP implementation percentage: approximately 45–50%.
2. Free limited-beta readiness percentage: approximately 25–30%.
3. Broader public-launch readiness percentage (non-controlling comparison): approximately 10–15%.
4. Top five true free-beta launch blockers: (a) the live chat route never writes the eligibility-trigger column the produce gate already reads, so most eligibility gates are effectively inactive; (b) the notice wizard and Serve & Track persist only to browser localStorage, with no server record and no link to RiskPath; (c) no service-record table or "served" state exists in the RiskPath schema at all; (d) zero e2e test coverage exists for the actual wizard/Serve&Track path the beta would ship; (e) no duplicate/conflicting-matter detection exists.
5. Top five nonlegal PRs that could close gaps fastest: PR 1 (persist counsel_route_trigger), PR 2 (durable wizard persistence), PR 3 (link wizard/Serve&Track to RiskPath + service-record table), PR 5 (e2e coverage for the real beta path), PR 6 (chat transcript rehydration).
6. Every item blocked on Janna: listed in full in section 10 above.
7. Every item blocked on remaining Founder decision: listed in full in section 11 above.
8. What Track A must complete: the focused incorporation-verification review confirming DECG-001 v0.4's correction is properly incorporated, then the single coordinated RCO-001/DECG-001 ADR and Founder ratification — none of which blocks the free limited beta as minimally scoped in section 8.
9. Founder-approved capabilities operationally verified: none reach the "end-to-end operationally proven" bar on the evidence gathered; the closest is the jurisdiction/geocode resolver stack (mature, tested, three-layer gated) and the privacy/consent/audit infrastructure (wired and largely automatic).
10. Founder-approved capabilities remaining unverified: Serve & Track's operational readiness (factual capability exists, persistence/resume/production-invocation do not); Resolve & Record (mostly missing, one prior overclaim already corrected); LAHD/local filing support (explicitly conditional per its own code comments).
11. Exact recommended next instruction after this audit: authorize PR 1 (persist the eligibility-trigger column) as a narrowly scoped, independently testable, reversible fix — it requires no Janna ruling, no Founder decision beyond authorization to proceed, and closes the single largest gap between what the eligibility gates already know how to do and what they currently do in production. This audit does not perform that instruction.
