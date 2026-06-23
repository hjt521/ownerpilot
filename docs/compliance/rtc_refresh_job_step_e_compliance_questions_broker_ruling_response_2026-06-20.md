# Broker Ruling — Step (e) RTC Refresh Job: Five Compliance Questions

**File:** `rtc_refresh_job_step_e_compliance_questions_broker_ruling_response_2026-06-20.md`
**Date:** 2026-06-20
**Authored by:** Jack Taglyan, California Licensed Real Estate Broker (CalDRE B9445457) — sole compliance authority for OwnerPilot AI.
**To:** Build side (engineering)
**Re:** Build's five edge-case questions on step (e) productionized refresh-job runtime semantics (`rtc_refresh_job_step_e_compliance_questions_broker_ruling_request_2026-06-20.md`).
**Companion to:**
- `la_rtc_forms_authoritative_source_and_refresh_policy_broker_ruling_response_2026-06-19.md` (W4 — sets the policy frame these questions resolve within)
- `la_phase2_first_action_routing_broker_ruling_response_2026-06-19.md` (§2.3 broker-run URL-drift antecedent)
- `phase2_step_e_sequencing_broker_ruling_response_2026-06-19.md` (§2.4 W4 sub-ruling sequencing)
- `la_rtc_form_revision_acceptance_english_2026-06-19.md` + `…_spanish_2026-06-19.md` (the two acceptances that closed §3.2 of W4)
- `la_geocode_resolver_parameters_broker_ruling_2026-06-19.md` (§2.3 alert-channel pattern)
- `broker_blanket_authorization_2026-06-15.md` (operative authority)
**Posture:** OwnerPilot AI operates as broker-scope only under Bus. & Prof. Code § 10131(b). No attorney engagement. Broker rules, build implements. Every ruling below is a tenant-facing compliance posture, not an engineering preference.

---

## §0. Frame — what these five questions are actually asking

W4 set the policy at the contract level: weekly + on-deploy cadence, per-language block on failure, no stale-serve, strict SHA-256, version-record fields locked, broker-gated rollout with in-flight pin to draft-time hash, alert via in-app + email. Build is now asking five runtime-semantics questions that decide what those rulings mean **at the moment a tenant clicks "produce notice."** Each answer is a compliance posture on tenant output.

I'll rule each one explicitly with reasoning, then pull the answers into a §6 summary table that build can paste into the spec.

---

## §1. Q1 ruling — "per-language block" runtime meaning

**Ruling: (A) Hard block at produce time.** No in-flight allowance. No grandfathering.

### §1.1 Mechanism

When `isLaLanguageUnblocked({language})` is `false` at the moment of notice production:

1. Production refuses for that language. The notice is not produced.
2. The user is routed to one of two recovery paths, in order of preference:
   - **(i) Switch to English** — English is the always-available fallback and the only language guaranteed by the RTC rules to never be blocked under this gate (subject to its own refresh-success state). Surface a one-click "produce in English instead" option.
   - **(ii) Wait for the language to come back online** — surface the broker's current ETA if known (set by the broker on the acceptance file or the manual-override determination; otherwise show "temporarily unavailable, check back later").
3. Any in-flight draft in the blocked language is **not lost** — the draft data persists, but production is refused until the language unblocks. The user may switch the draft's language to English to produce immediately, or wait.

### §1.2 Why not (B)

(B) — "block new, allow in-flight to finish on pinned hash" — is the path that looks tenant-friendly but is the wrong posture here. Two reasons:

1. **The §2.2 block trigger is a refresh failure or a detected revision.** A refresh failure means we don't know what LAHD's current form is. A detected revision means LAHD has changed the form and we haven't reviewed the change yet. In either case, the prior hash that an in-flight draft "pinned to" may itself be the wrong artifact to serve — the underlying form may have been withdrawn, corrected, or superseded for a reason that matters (e.g., a phone number correction like the Spanish (800)→(888) fix). Serving the old version because a draft was started before the block is exactly the stale-serve hazard W4 §2.2 ruled out.
2. **The §2.5 in-flight pin is for a different scenario.** W4 §2.5(b) pins in-flight notices to draft-time hash when **the broker has reviewed and accepted** the new version but pre-existing drafts are still on the old. That's a controlled transition. Q1 is asking about the uncontrolled state — block triggered by *unreviewed* drift or by *fetch failure*. The two situations look similar mechanically but are opposite on compliance: §2.5 pin is "old version was good, we're moving to a reviewed new version, finish out the old"; Q1 block is "we don't know if the version we have is still good, stop."

### §1.3 What "English is always available" means precisely

English is not exempt from the refresh gate — it can be blocked if its own refresh fails or a revision is detected against it. What's true is:

- English is the only language guaranteed to be a *recovery target* (per `la_rtc_form_revision_acceptance_english_2026-06-19.md` it is the canonical baseline).
- If English is itself blocked, the entire LA RTC path is blocked — there is no further fallback. The user is routed to "LA RTC attachment temporarily unavailable; notice production paused" with a broker alert. This is the worst-case scenario and a deliberate stop-the-line posture.

The §2.2 per-language isolation means the *other eight* languages can independently block without taking English down; English going down is not isolated and stops LA notice production system-wide.

### §1.4 Telemetry

When Q1 produces a block at produce time, log: language, block reason (`refresh_failure` | `revision_detected` | `manual`), block-since timestamp, user choice (switched to English / waited / abandoned). This is operational telemetry, not a compliance record — keep it separate from the `rtcFormVersionRecord` audit fields.

---

## §2. Q2 ruling — on-deploy refresh failure vs. the deploy itself

**Ruling: (A) Non-blocking on deploy.** The refresh runs on deploy, but a failure or detected change does **not** fail the deploy — it sets runtime state (block / staged-revision) and alerts. Deploy proceeds.

### §2.1 Why (A), not (B)

(B) — "refresh failure fails the deploy" — couples form-drift to deploy availability. That looks like belt-and-suspenders safety until you trace what it actually does:

1. **It blocks unrelated deploys for the wrong reason.** A code change to, say, the EFT disclosure copy or the geocode resolver has no relationship to LAHD's PDF having a new Last-Modified. Failing the deploy because the on-deploy refresh tripped means we cannot ship a fix for an unrelated module until the LAHD form is reviewed. That's an availability bug pretending to be a compliance feature.
2. **It tempts engineering toward overrides.** When a CI red on deploy is "LAHD changed a PDF," the path of least resistance is a `--skip-rtc-refresh-check` flag. That's exactly the override-mechanism failure mode that got `brokerOverrideToLive` rescinded in the production-status ruling.
3. **It doesn't actually add safety.** If the on-deploy refresh detects a revision, (A) sets the language to blocked at runtime — the deployed code cannot serve the stale form anyway, because the runtime gate refuses. The blocking-on-deploy variant adds zero protection at runtime; it only adds friction at deploy time.

### §2.2 Why not (C)

(C) — "detect-only on deploy; weekly is the enforcement run" — is the most permissive option and is rejected. The on-deploy run **must** enforce, not just record, because the gap between a deploy and the next weekly run can be up to a week and a deploy is the most common moment for a new code path to start serving forms that were verified against the previous baseline. Detect-only on deploy would mean a deploy could land mid-week, start serving a language whose form moved on a non-deploy day, and rely on the next Monday's refresh to notice. That's a stale-serve window measured in days. The whole point of "on-deploy" in W4 §2.1 is to slam that window shut.

### §2.3 The precise (A) semantics

On every production deploy that touches LA modules (per W4 §2.1(b)):

1. The refresh job runs against all 9 languages.
2. **Per-language outcomes:**
   - Match against baseline → no-op, no alert, language stays unblocked.
   - Mismatch (revision detected) → set language to staged-revision per W4 §2.5; alert the broker via in-app + email; runtime gate refuses production for that language until broker acceptance.
   - Fetch error (HTTP non-200, timeout, hash failure) → set language to refresh-failure block per W4 §2.2; alert; runtime gate refuses production for that language until next successful refresh.
3. **Deploy status:**
   - Deploy succeeds regardless of refresh outcomes.
   - The deploy log records the per-language refresh outcome summary as a structured artifact (not a CI gate).
   - If **all 9 languages** fail to fetch (network-wide outage, DNS, etc.), the alert is escalated (title prefix `[CRITICAL]` per the W4 §2.2 alert format) but the deploy still proceeds — the runtime gate handles the safety, not the deploy gate.

### §2.4 What this preserves

Deploy availability is decoupled from LAHD's PDF publishing schedule. The runtime gate is the single source of truth for "may this language serve a notice right now." That's the architecture W4 chose and (A) is the only Q2 answer consistent with it.

---

## §3. Q3 ruling — in-flight pin semantics

W4 §2.5(b) said in-flight notices pin to draft-time hash. The three sub-questions are pin granularity, pin lifetime, and serve-time recheck. Ruling each:

### §3.1 Pin granularity — (a) specific language hash, not the 9-language snapshot

**Ruling: pin the specific language hash the notice will actually attach.**

A notice in a single language attaches a single PDF. Pinning the entire 9-language baseline is over-broad — it would mean that if any one language revises, every in-flight draft (regardless of the draft's chosen language) carries a pin against the now-stale 9-tuple. That generates spurious version-record mismatches and obscures what was actually served.

The `rtcFormVersionRecord` field locked by W4 §2.4 is keyed by language (`rtcFormHashes: { english: "...", spanish: "...", ... }`). The pin should mirror that shape: pin the language(s) the notice will physically serve, not the full snapshot. If a notice serves only English, only English's hash is pinned; if it serves both English and Spanish (when bilingual delivery is required by jurisdiction), both are pinned.

### §3.2 Pin lifetime — broker-set max-age of **30 days**, with one renewal allowed

**Ruling: pins expire 30 days after the superseding revision is broker-accepted. One renewal of up to 30 additional days is allowed on broker explicit grant; no second renewal.**

Build's recommendation (30 days, matching the §2.3 close cadence) is sound. I'm refining it slightly:

1. **Day 0** of the pin clock is the date of the broker acceptance file for the superseding revision (e.g., `la_rtc_form_revision_acceptance_<language>_<YYYY-MM-DD>.md`), not the date of revision detection. The clock runs from the moment we know the new version is good and the old version is officially superseded.
2. **Day 30:** the pin auto-expires. A draft still holding the pinned (now-superseded) hash is moved to a "must re-acknowledge current form" state. The user is shown a one-click prompt: "The Right-to-Counsel form was updated on [date]. Your draft references the prior version. Refresh to current version?" Accepting refreshes the draft to the current language hash and clears the pin. Declining or ignoring leaves the draft un-producible until refreshed.
3. **One renewal:** if a user explicitly requests a 30-day extension via the same prompt (e.g., they're in the middle of a multi-step process that depends on the prior form text appearing in supporting documents), broker can grant it via a determination file. No silent renewals; no automatic extensions.
4. **No expiry at the next broker rollout** (option iii in the build question) — that pegs pin lifetime to an event the user can't see and produces unpredictable expiry from the tenant's perspective. Fixed 30-day clock from the acceptance date is the cleanest tenant-facing posture.

The 30-day window is long enough to accommodate normal drafting cadence (most notices are drafted and served within 7–14 days) and short enough to prevent the worst case (a draft held for months suddenly producing a wildly out-of-date form).

### §3.3 Serve-time recheck — required, fail-closed

**Ruling: at the moment of actual service, the system re-verifies the pinned hash equals the SHA-256 of the PDF it will physically attach. Mismatch fails closed to manual review.**

This is the cheapest available cross-check that the pin actually matches reality. The pin is metadata; the PDF is the bytes that go to the tenant. They must match. If they don't, something has gone wrong (cache corruption, swapped file in storage, race condition between a baseline update and a pin) and the safe move is to stop, not to serve.

Mismatch handling:

1. Production fails for that notice.
2. The notice is flagged for manual broker review (same queue as the geocode manual-review path per `la_geocode_resolver_parameters_broker_ruling_2026-06-19.md` §2.4).
3. Alert broker via in-app + email with title `"RTC pin mismatch — <language>, notice <id>"` and body containing pinned hash, attached PDF hash, and the draft timestamp.
4. The user sees a "this notice needs broker review before production; you'll be notified" message — not the raw mismatch detail.

This is paranoid by design. The serve-time recheck protects against the failure mode where pinning logic is correct but storage drifts. It costs one SHA-256 computation per notice production, which is negligible.

---

## §4. Q4 ruling — version-record scope and immutability

### §4.1 Scope — (B) all notices carry the fields, null for non-LA

**Ruling: (B) all notices carry the `rtcFormVersionRecord` field for schema uniformity.**

Non-LA notices get `rtcFormVersionRecord: null`. LA notices get the populated object per W4 §2.4. Reasoning:

1. Schema uniformity beats schema sprawl. When the system later expands beyond LA (Phase 3+), other jurisdictions may have analogous form-attachment regimes — Oakland has a Tenant Protection Ordinance disclosure; Long Beach is exploring one. A null-tolerant uniform field on every notice means adding the next jurisdiction is a code change in the rules engine, not a schema migration on the notice table.
2. Querying compliance audits is easier when the field exists on every record. "Show me all notices that attached form version X" is one query; "show me all LA notices that attached form version X" requires knowing the jurisdiction-routing at query time, which couples the audit query to the rules engine.
3. The cost of nulls on non-LA notices is one nullable column in a database — trivial.

### §4.2 Immutability — RULED IMMUTABLE

**Ruling: the `rtcFormVersionRecord` object is immutable once written.** A later refresh-job run may **not** rewrite it on an existing notice record.

Build flagged this as their strong recommendation; I'm ruling it. The compliance posture is unambiguous:

1. **The whole point of the field is audit.** It exists to prove what version of the LAHD RTC form was actually served to a specific tenant at a specific time. If a later refresh could overwrite it, the field doesn't prove anything — it just records "the version current as of the most recent refresh," which is the same information `RTC_FORM_BASELINE_HASHES` already provides.
2. **The CA 3-day statute watch and Eshagian v. Cepeda doctrine both turn on what was served, not what is current.** If a tenant later disputes the notice, the operative question is "what was attached on the day of service?" An overwritten record cannot answer that.
3. **The Spanish (800)→(888) case is the cautionary example.** A Spanish notice served before the Jun-16 correction must record the prior (incorrect) hash, not the corrected one. Anyone auditing later needs to know the notice carried the wrong phone number, because that's a material defect on its face that affects the notice's validity. Overwriting to the corrected hash would erase the defect from the record.

### §4.3 What is allowed

What's **not** prohibited: the `rtcFormVersionRecord` field may be written **once** at the moment of notice production (or service, whichever the build picks — see §4.4) and is locked thereafter. Corrections to a serving error (e.g., the wrong PDF was attached due to a bug) require:

1. A broker-determination file authored against the notice ID.
2. The original `rtcFormVersionRecord` preserved.
3. A separate field (`rtcFormVersionRecordCorrection` or similar — name your call) recording the correction with: corrected hash, reason, broker sign-off file reference. The original record is never modified.

### §4.4 Write moment — at service, not at draft

**Ruling: write `rtcFormVersionRecord` at the moment of service, not at the moment of draft.** A draft can change hands, get edited, or be abandoned. Only the served notice carries the audit truth, and the served notice is the one whose hash needs to be recorded.

If the §3.2 pin clock has run and the draft is being refreshed to current form, the `rtcFormVersionRecord` reflects the current hash at the moment of service, not the original draft-time pin. The pin governs *which* hash the notice will use; the version record memorializes *which* hash was actually used.

---

## §5. Q5 ruling — alert channel reuse

**Ruling: (A) reuse the existing in-app + email alert channel, with distinct tagging.**

Build's recommendation is correct and adopted. Reasoning:

1. **Three workstreams already share the channel:** CA 3-day statute watch cron (per its workflow doc), geocode cap alerts (per `la_geocode_resolver_parameters_broker_ruling_2026-06-19.md` §2.3), and now RTC refresh. A dedicated channel for each would multiply broker inbox surface area without adding signal.
2. **Tagging beats routing.** Alerts should carry a structured `source` tag (`source: "rtc_refresh" | "geocode_cap" | "ca_3day_statute_watch"`) that the broker's email filters and the in-app card UI can use for sorting, sectioning, and per-source rules. The alert payload also carries the W4 §2.2 title format (`"LAHD RTC refresh — <language> blocked (<reason>)"`) which is human-readable and routable.
3. **One operational pane of glass** is a feature for a sole-compliance-authority shop. If broker is on vacation and a contractor is monitoring, "check the in-app alerts feed" is the entire monitoring playbook. Splitting into multiple channels invites missed alerts.

### §5.1 Alert taxonomy (for the spec)

RTC-refresh alerts come in four flavors. All use channels `['in_app', 'email']`. All carry `source: "rtc_refresh"`. Titles per W4 §2.2 with these prefixes:

| Trigger | Title | Severity |
|---|---|---|
| Refresh failure (HTTP / hash error) | `LAHD RTC refresh — <language> blocked (<reason>)` | major |
| Revision detected (strict SHA-256 mismatch) | `LAHD RTC revision detected — <language>` | major |
| Pin mismatch at serve time (per §3.3) | `RTC pin mismatch — <language>, notice <id>` | critical |
| All-9-language fetch failure on deploy (per §2.3) | `[CRITICAL] LAHD RTC refresh — all languages failed` | critical |

Severity is metadata, not a routing decision — the channel stays `in_app + email` across the board. Severity tagging lets the broker's filters elevate (e.g., add SMS for `critical` later if desired) without renegotiating channel architecture.

---

## §6. Ruling summary table

| Question | Build option chosen | Operative ruling (one-liner) |
|---|---|---|
| **Q1** Per-language block runtime | **(A)** Hard block at produce time | Production refuses; user switches to English or waits. No in-flight allowance for the unreviewed-drift case. |
| **Q2** On-deploy refresh failure | **(A)** Non-blocking on deploy | Deploy proceeds; runtime gate handles safety. Per-language outcomes set runtime state; all-9-language failure escalates to `[CRITICAL]` but still ships. |
| **Q3a** Pin granularity | **(a)** Specific language hash | Pin mirrors the W4 §2.4 keying — per language, not the 9-language snapshot. |
| **Q3b** Pin lifetime | **30 days from acceptance date** | Auto-expire at day 30; one explicit broker-granted renewal allowed; no event-pegged expiry. |
| **Q3c** Serve-time recheck | **Required, fail-closed** | SHA-256 the physical PDF; mismatch goes to manual review with critical alert. |
| **Q4a** Version-record scope | **(B)** All notices, null for non-LA | Schema uniformity; future-jurisdiction-friendly. |
| **Q4b** Immutability | **Immutable; written at service** | Locked once written; corrections go to a separate field with broker determination. |
| **Q5** Alert channel | **(A)** Reuse + tag | `source: "rtc_refresh"`, severity metadata, no dedicated channel. |

---

## §7. Authorization to build step (e)

On the basis of W4 (already closed for §2.1/§2.2/§2.3, ruled-not-deferred for §2.4/§2.5) and this ruling (closes the five runtime-semantics questions):

**Build is authorized to construct step (e) — the productionized RTC refresh job — in dark mode under the standing gate.** Specifically:

1. **Module location** under `lib/jurisdiction/rtcRefresh/` per build's stated engineering call. No edits to frozen `laRtcRules.ts`.
2. **Scaffold consumes** `RTC_FORM_BASELINE_HASHES`, `RTC_FORM_LAST_MODIFIED`, `RTC_VERSION_RECORD_FIELDS`, `RTC_ROLLOUT_POLICY` locked in W4, plus the per-language gate `isLaLanguageUnblocked({language})` for the runtime block semantics.
3. **Implements the five rulings above** in their precise semantics. Test fixtures should cover at minimum: a refresh failure for one language (Q1 hard-block path), an on-deploy hash mismatch (Q2 non-blocking + runtime gate), an in-flight pin that hits day 30 (Q3b expiry), a serve-time pin mismatch (Q3c fail-closed), an `rtcFormVersionRecord` write-then-immutable assertion (Q4b), and a Q5 alert taxonomy emission.
4. **Storage** uses the typed `RefreshStateStore` interface + in-memory stub per build's stated engineering call; real Supabase wiring deferred to the same pattern as geocode manual-review queue. **Engineering call, not a broker question.**
5. **Network adapter** reuses the committed `scripts/rtc_url_drift_check.ts` drift-checker logic, injectable for testability. Live cron / deploy hook is the thin wrapper. **Engineering call.**
6. **Gate posture:** scaffold asserts `isLaProductionUnblocked()` (LA-wide) and `isLaLanguageUnblocked({language})` (per language). **Flips no flag.** `rtcFormRefreshJobBuilt` stays `false` until broker sign-off on the built artifact. Standing rule; not a question.

When build is ready for sign-off, build authors a request file `rtc_refresh_job_step_e_broker_signoff_request_<YYYY-MM-DD>.md` listing: module structure, test coverage, alert wiring verification, and any deviations from the five rulings above (with reasoning, so the deviation can be ruled on rather than discovered later). Broker reviews, authors `rtc_refresh_job_step_e_broker_signoff_<YYYY-MM-DD>.md`, and flips `rtcFormRefreshJobBuilt` per the §2.9 master gate path.

---

## §8. Checklist

- [MUST FIX] Implement Q1 hard-block at produce time, not in-flight allowance. Surface English fallback as one-click recovery (per `la_rtc_form_revision_acceptance_english_2026-06-19.md` canonical-baseline posture).
- [MUST FIX] Implement Q2 non-blocking on-deploy refresh. Refresh-job results set runtime state and alert; deploy proceeds. All-9 failure escalates to `[CRITICAL]` but still ships.
- [MUST FIX] Implement Q3a per-language pin granularity matching W4 §2.4 keying.
- [MUST FIX] Implement Q3b 30-day pin lifetime from broker-acceptance-file date. Auto-expire UX prompt. One broker-granted renewal allowed via determination file. No event-pegged expiry.
- [MUST FIX] Implement Q3c serve-time SHA-256 recheck against the physical PDF. Mismatch fails closed to manual broker review with `critical` alert per §5.1 taxonomy.
- [MUST FIX] Implement Q4a — `rtcFormVersionRecord` on all notices, null for non-LA. Q4b — immutable, written at service, corrections via separate field + broker determination.
- [MUST FIX] Implement Q5 alert taxonomy per §5.1 — `source: "rtc_refresh"`, four trigger flavors, severity metadata, reuse `in_app + email` channel.
- [SHOULD FIX] Test fixtures cover the six paths enumerated in §7 item 3.
- [SHOULD FIX] On sign-off request, list any deviations from this ruling with reasoning. Don't silently deviate.
- [CONSIDER] Add `source: "rtc_refresh"` tag to broker's email filter rules before first alert lands, so the first real alert doesn't get buried in the general inbox.

---

## §9. Posture footer

OwnerPilot AI operates as broker-scope only under Bus. & Prof. Code § 10131(b). All RTC-refresh runtime-semantics decisions sit with the broker. This ruling supplements W4 and is binding on the step (e) scaffold; build implements verbatim or re-escalates with reasoning. No attorney engagement exists for this product; no attorney attribution may appear in code, comments, version records, or alert payloads.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE **B9445457** / Broker Compliance Review · 2026-06-20
