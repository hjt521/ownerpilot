# LA Notice Production Gap — Broker Ruling

**Date:** 2026-06-28
**Reviewer:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review
**Subject:** Engineering determination request — `confirmed_la` cannot produce; `lib/produce/` has no RTC/LAHD overlay attachment
**Status:** RULING ISSUED — Decisions 1–4 below are binding
**Severity:** High. Blocks the morning "produce" goal and Decision 2's "confirmed → produce" terminal step. Does NOT relax the §0 fail-closed posture; reinforces it.

---

## §0 — Compliance framing (read first)

Engineering is right not to touch the `JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE` block. Removing it without the RTC/LAHD overlay in `lib/produce/` would let an LA-jurisdiction notice produce without the Right-to-Counsel attachment and without the LAHD filing prompt. That is the exact false-positive failure mode the jurisdiction system was built to prevent (`detectJurisdiction` SAFETY DIRECTION; `isLaProductionUnblocked()` gate; the six-flag predicate). The block is currently **correct and protective**.

The asymmetry runs in the same direction it always has: an LA notice served without the RTC attachment can be **defeated in unlawful detainer** and can **harm the tenant** by depriving them of statutory counsel. The City of LA Right-to-Counsel ordinance is a hard procedural requirement, not a courtesy attachment. Producing without it is a worse outcome than producing nothing.

This ruling does NOT open the gate. It rules on what the gap is, who owns closing it, and the sequencing.

---

## §1 — Answer to the core question (a) or (b)

**(b) — not-yet-built.**

The Right-to-Counsel overlay and the LAHD filing prompt are **authored compliance content** sitting in workspace rulings, not wired modules in `lib/produce/`. Specifically:

- **RTC English notice + declaration** — authored and accepted (`la_rtc_form_revision_acceptance_english_2026-06-19.md`)
- **RTC Spanish notice + declaration** — authored and accepted (`la_rtc_form_revision_acceptance_spanish_2026-06-19.md`)
- **RTC authoritative source + refresh policy** — authored (`la_rtc_forms_authoritative_source_and_refresh_policy_broker_ruling_response_2026-06-19.md`)
- **LAHD filing prompt copy** — authored and locked at `lahd_filing_prompt_copy_broker_determination_2026-06-18.md`
- **RTC refresh runner architecture** — authored and ratified, with the edge-function spike result acknowledged (`la_rtc_refresh_runner_architecture_broker_ruling_response_2026-06-23.md`, `rtc_refresh_edge_function_*`)
- **Six-flag predicate gate** — `isLaProductionUnblocked()` is currently consulted by the resolver invocation path, **not** by the produce/overlay path (engineering's §3 finding is correct)
- **Phase 2D (assembly engine wired to locked LAHD strings + RTC URLs)** — authorized to scaffold behind the closed gate in the June 19 master-requirements ruling (`la_go_live_master_requirements_broker_ruling_response_2026-06-19.md` §4), but never wired into `lib/produce/`. That scaffold work appears to have been deprioritized in favor of the geocode resolver, the parcel endpoint health check, and the broker-confirm path.

So the components Phase 2D needs to consume (RTC PDFs, LAHD prompt copy, locked-prose strings) exist. The **wiring** in `lib/produce/` — load the RTC packet, attach it to the rendered notice, surface the LAHD filing prompt at the produce-success page, and runtime-assert `isLaProductionUnblocked()` at the produce entry point — does not.

The `JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE` block is therefore **not stale**. It is **load-bearing** until Phase 2D wiring lands and is verified.

---

## §2 — Decisions

### Decision 1 — Disposition of the locked block (no change)

The locked-prose message `JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE` (`"This property is in the City of Los Angeles. The Los Angeles overlay isn't available in OwnerPilot yet, so a notice for this address can't be produced here. We'll let you know when LA support is live."`) **stays in place verbatim** until Phase 2D wiring is built, verified, and the gate flips.

**[MUST FIX]** Engineering does not alter, paraphrase, or feature-flag this string without a follow-up ruling. It is part of `locked_prose_manifest.json` and remains enforced by `verify_locked_prose.ts`.

### Decision 2 — `confirmed_la` produce disposition (post-overlay)

Once Phase 2D wiring lands and `isLaProductionUnblocked()` returns `true`:

- **`confirmed_la` AND `isLaProductionUnblocked() === true` AND overlay attachment succeeds → PRODUCE** with the RTC notice + declaration (English + Spanish, both attached) + LAHD filing prompt surfaced at the produce-success page.
- **`confirmed_la` AND (`isLaProductionUnblocked() === false` OR overlay attachment fails) → BLOCK** with the existing locked-prose message. **Fail-closed.** No partial production. No "soft" overlay where the notice produces but the RTC attachment is silently omitted. If `lib/rtc/loadCurrentPacket()` cannot return both languages with valid SHA-256 hashes matching the refresh-job snapshot, produce halts and the locked block fires.
- The block when the overlay can't attach **uses a distinct error code** (`JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED`) so engineering can distinguish "feature not built" from "feature broke at runtime" in logs. The user-facing copy may be the same warm-language message; the audit-log code differs.

**[MUST FIX]** The fail-closed assertion lives at the **server-side produce endpoint**, not the client. Client-side checks are advisory. The server runtime-asserts: `(verdict === 'confirmed_la') && isLaProductionUnblocked() && rtcPacketAttached && lahdPromptCopyVersion === currentLockedVersion`. If any clause is false, produce returns 409 with the appropriate error code.

### Decision 3 — Produce-face requirements for an LA notice

What must appear / attach on the produce face for an LA-jurisdiction notice. This is the compliance spec engineering builds to.

#### Attached forms (REQUIRED — fail-closed if any missing)

1. **The 3-day notice itself**, produced from the existing notice-template engine, with the Right-to-Counsel disclosure paragraph on the notice face (locked prose, authored at `la_rtc_form_revision_acceptance_english_2026-06-19.md` §3 and Spanish equivalent).
2. **RTC Notice (English)** — the standalone Right-to-Counsel notice form. Source: the SHA-pinned current packet from the RTC refresh runner. Filename suffix: `_rtc_notice_en.pdf`.
3. **RTC Notice (Spanish)** — same form, Spanish version. Source: SHA-pinned. Filename suffix: `_rtc_notice_es.pdf`. **Both languages attach by default. The owner does NOT get to opt out of the Spanish version.** LA's RTC ordinance requires both regardless of the tenant's preferred language because the owner doesn't get to assume the tenant's language preference.
4. **RTC Declaration (English)** — the proof-of-service declaration form. Source: SHA-pinned. Filename suffix: `_rtc_declaration_en.pdf`.
5. **RTC Declaration (Spanish)** — same. Filename suffix: `_rtc_declaration_es.pdf`.

If the refresh runner's snapshot SHAs don't match what `lib/rtc/loadCurrentPacket()` retrieves, **fail closed**. Do not produce. This is the same fail-closed posture as the predicate-6 freshness guard.

#### Produce-success page additions (REQUIRED)

6. **LAHD filing prompt** — surfaced on the produce-success page (the page the owner lands on after the notice + RTC packet renders). Copy is locked at `lahd_filing_prompt_copy_broker_determination_2026-06-18.md` §3 and §4. Engineering reads `lahdFilingPromptCopyVersion` from the locked-prose manifest and renders the corresponding copy. The owner must acknowledge the prompt before the produce-success page completes — the [SHOULD FIX §5.5] audit-log entry from that ruling becomes [MUST FIX] here. Acknowledgment timestamp + copy version logged to the audit log.

#### Face changes (the notice form itself)

7. **Right-to-Counsel paragraph on the notice face** — locked prose, already authored. Engineering wires the existing string from `lib/copy/rtc/noticeFaceParagraph.ts` (creating it if it doesn't exist; the source string is in the form-revision acceptance ruling) into `buildNoticeHtml`. Conditional on `verdict === 'confirmed_la'`. Below the rent-amount-itemization block, above the signature block.

8. **No change to the existing day-count, payment-method-disclosure, financial-institution, EFT election, commencement/expiration date, or service-method face content.** Those are statewide CCP § 1161/§ 1162 requirements and are not modified by the LA overlay. The LA overlay is **additive only** at the face level.

#### Audit-log additions (REQUIRED)

9. On produce, append to the audit log: `rtcPacketSha256_en`, `rtcPacketSha256_es`, `rtcDeclarationSha256_en`, `rtcDeclarationSha256_es`, `rtcPacketRefreshTimestamp`, `lahdFilingPromptCopyVersion`, `lahdFilingPromptAcknowledgedAt`, `isLaProductionUnblockedAtProduce` (must be `true`), `cachedResolverVerdictSource` (`'live_resolver' | 'broker_confirm'` per the Decision 2 produce-gate reconciliation ruling).

#### What does NOT change

- The 3-day notice template content (other than the conditional RTC paragraph in #7).
- The day-count engine.
- The packet structure for non-LA jurisdictions.
- The Decision 2 broker-confirm path beyond what's specified in the produce-gate reconciliation ruling and the produce endpoint cross-check above.

### Decision 4 — Sequencing (this outranks Decision 2 client wiring)

**Phase 2D wiring (LA notice production path) outranks finishing the Decision 2 client wiring.**

The Decision 2 backend (verdict-type extension, broker-confirm path, status-view writes, server-side cross-check at produce) is built and inert. Its terminal step is "confirmed → produce." That terminal step is blocked by this gap. Finishing the client wiring on Decision 2 before the produce path can actually produce means polishing a road that ends at a wall.

**Order of operations:**

1. **Phase 2D wiring** — the work specified in Decision 3 above. Engineering builds it behind the closed gate (the existing `isLaProductionUnblocked()` assertion at production-traffic entry points stays in force throughout). Includes the produce-endpoint runtime assertion and the 409 error responses.
2. **Phase 2D verification** — broker-attested end-to-end test on a real LA address (5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038) and a known boundary case (1200 Wilshire Blvd, Los Angeles, CA 90017). Both must produce a notice with all 5 attachments + LAHD prompt + audit log entries. A second test on a non-LA address (e.g., a Santa Monica address) must still receive `not_la` and proceed through the statewide-only template (no RTC attachment, no LAHD prompt).
3. **Gate flip** — once verified, the broker flips `phase2dAssemblyEngineWired` to `true` in the predicate set. **This is the second flip the predicates kickoff prompt referenced** — the one that "opens the gate" and makes LA production live and end-user-facing for the first time. Go-live gravity applies: this is not a routine predicate flip and should be treated as a launch event.
4. **Decision 2 client wiring resumes.** With produce actually producing, the Decision 2 broker-confirm path's terminal step is operative. Engineering finishes whatever client work remained.
5. **Decision 2 produce-gate reconciliation guardrails** (server cross-check, address normalization, cache invalidation on non-confirm) are already authored and should be wired in step 1 alongside Phase 2D — they are the same code paths.

**[MUST FIX]** Engineering does not begin Phase 2D wiring until the broker has acknowledged this ruling in the workspace ack channel. Once acknowledged, the work is authorized.

---

## §3 — What I (the broker) owe before Phase 2D wiring ships

These do not block engineering starting the wiring, but they must close before the gate flips.

- [ ] **[MUST FIX]** Confirm the current RTC packet snapshot SHAs in `cron_tracking/la_rtc_packet/snapshots/` are current and the weekly refresh cron (`6528bcda`) has run at least once with a green baseline. If the cron has not yet captured a baseline, that capture is a prerequisite to Phase 2D verification.
- [ ] **[MUST FIX]** Confirm the LAHD filing prompt copy version locked in `lahd_filing_prompt_copy_broker_determination_2026-06-18.md` is the version Phase 2D should consume, and that the locked-prose manifest reflects it. If a v2 of that copy is pending, ship Phase 2D against the current locked version and revisit on next manifest update.
- [ ] **[SHOULD FIX]** Walk through the produce-face spec in Decision 3 above with engineering before they start, to surface any wiring ambiguities (e.g., which template file the RTC paragraph injects into, ordering of attachments in the final PDF) before they become rework.
- [ ] **[CONSIDER]** Pre-stage a v2 of the locked-prose footer disclaimer for the LA notice produce-success page that explicitly names the RTC ordinance citation and the LAHD filing obligation. Optional; the current footer is sufficient.

---

## §4 — Hard reservations

1. **The fail-closed posture is non-negotiable.** No "ship LA production without the RTC attachment because the refresh runner is down today" workaround. If the packet can't attach, produce halts. The user-facing message is warm; the behavior is strict.
2. **No partial-language production.** Both English and Spanish RTC notice + declaration attach, always. The owner does not get to choose. This is a tenant-protection requirement, not an owner-convenience setting.
3. **The runtime assertion is server-side.** Client-side checks are advisory and may be bypassed by extensions, sync bugs, or future code paths. The produce endpoint's runtime assertion is the load-bearing check.
4. **Phase 2D verification is broker-attested, not unit-test-attested.** Unit tests are required but not sufficient. The broker runs the two real-address tests in step 2 of §2.4 and signs the attestation. Until that attestation lands, the predicate flag stays `false`.
5. **`JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE`** stays in the locked-prose manifest **after** the gate flips. It is the fallback when `isLaProductionUnblocked()` later returns `false` for any reason (snapshot stale, refresh runner failing, predicate-6 freshness guard tripping). The fallback message is part of the production system, not a temporary placeholder.

---

## §5 — Open §0 forks (none)

This ruling does not surface a §0 fork. All compliance prose Phase 2D needs (RTC notice paragraph, RTC standalone forms, LAHD filing prompt copy, locked-block fallback message) is already authored and locked. Engineering builds wiring; the broker has already authored the content.

If during Phase 2D wiring engineering surfaces a content gap — a string that needs to appear somewhere and isn't in the locked-prose manifest — that becomes a §0 fork at that point and pauses Phase 2D until the broker authors and locks the string. **Engineering does not author statutory or compliance prose silently.**

---

## §6 — Acceptance for this ruling

- [ ] Engineering acknowledges this ruling in the workspace ack channel.
- [ ] Phase 2D wiring scope (Decision 3 above) is broken into engineering tickets, all behind the closed `isLaProductionUnblocked()` gate per the June 19 master-requirements ruling §4 conditions.
- [ ] Decision 2 client-wiring work is **paused** (not abandoned — the backend stays in place, no rip-and-replace) until Phase 2D ships and the gate flips.
- [ ] The broker's open items in §3 above are tracked.
- [ ] The locked-prose `JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE` message remains in `locked_prose_manifest.json` unchanged.
- [ ] A new locked-prose entry for `JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED` is added to the manifest with the user-facing copy (engineering proposes; broker locks).

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-28
