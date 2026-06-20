# Build-side escalation — LAHD/city-matrix prompt vs. existing LA architecture: a model conflict

**File:** `lahd_city_matrix_architecture_conflict_broker_ruling_request_2026-06-19.md`
**Date:** 2026-06-19
**Authored by:** Build side (engineering) — architecture-conflict escalation for broker determination. Not a determination. No legal wording authored by build.
**To:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457 — sole compliance authority for OwnerPilot AI
**Re:** `claude_prompt_lahd_and_city_matrix_implementation_2026-06-18.md` (implementation prompt) and `lahd_city_matrix_implementation_blockers_broker_ruling_response_2026-06-19.md` (§3/§4 re-escalation)
**Posture:** Build-side facts and questions only. This is the §7 re-escalation the prior ruling anticipated — but the survey surfaced a material architecture conflict that warrants its own determination file rather than a one-paragraph in-thread answer. Build authored no prose, wrote no code, ran nothing. Read-only survey only, under the §3b grant.

---

## §0. Why this is a determination-grade escalation, not a one-paragraph follow-up

The prior ruling (§7) expected build to return three short findings (§3a geocode path, §4a extend shape, §4b calendar gap). Build has those (§1 below). But the read-only survey of `lib/jurisdiction/*` revealed that **the implementation prompt and the existing codebase encode two contradictory architectures for LA handling.** Build cannot open Phase 1 without a ruling on which model governs, because the two models produce opposite behavior for the same addresses and would require contradictory acceptance tests. Per the prior ruling's own carve-out ("not a fresh determination file unless something material surfaces that warrants one"), this qualifies.

All claims below are from a read-only survey at `47d593b`. No file contents are reproduced here; only contracts and behaviors are described.

---

## §1. The three findings the prior ruling asked for (§7)

**§3a — Geocode path: NONE exists. Confirmed prerequisite, not a codeable gap.**
- `components/places-autocomplete.tsx` uses Places API (New): `places:autocomplete` then `places/{id}` with field mask `formattedAddress` ONLY. It returns a formatted address string. No `addressComponents`, no `geometry`, no `administrativeArea`/state, no confidence.
- No `lib/places` or `lib/geocode` module exists.
- Nothing in the repo resolves an address to (CA-state + incorporated-city + confidence). The prompt §4 resolver's input contract is therefore unsatisfiable today.
- The codebase already names this exact gap: `lib/jurisdiction/laRtcRules.ts` declares `geocodeConfirmationBuilt: false` as the first of three production dependencies, and `isLaProductionUnblocked()` returns false until it (and two others) are built.

**§4a — Extend shape: thin wrapper (ii), gated. NOT extend-in-place (i).**
- `detectJurisdiction({address, city?})` returns `{decision: 'BLOCK_OVERLAY_CITY' | 'NEEDS_CONFIRMATION' | 'NO_KNOWN_OVERLAY', matchedCity?, message, requiresAuthoritativeConfirmation, note}`.
- It is explicitly a STRING-MATCH STUB with a documented "fail toward caution" design: it refuses to confidently identify City-of-LA from a string, routing anything LA-ish to `NEEDS_CONFIRMATION`. Folding boundary-dependent matrix logic into it (shape i) would corrupt a function designed not to be authoritative. Shape (ii) — a wrapper that consults the matrix only once a property is authoritatively confirmed — is the only coherent option. But see §2: "authoritatively confirmed" cannot happen until geocode dep #1 lands.

**§4b — LA city calendar: gap OPEN. §5.1 binds (no computed deadline).**
- `laCityCalendar.ts` exports `computeLahdFilingDeadline(serviceDate, businessDays=3)` and it IS tested with weekend + city-holiday rollover, including a test proving the city calendar diverges from the judicial table.
- BUT `LA_CITY_HOLIDAYS[2026].verified = false`, and `getVerifiedCityHolidaySet` THROWS on unverified data. Tests only pass by flipping `verified=true` in-memory. `laRtcRules.ts` lists `cityBusinessDayCalendarBuilt: false` as dependency #2.
- Conclusion: the machinery exists but is forced-closed pending verification sign-off of the 2026 city-holiday citation pull. No computed deadline date can render. The prompt's §5.1 instruction ("do not compute/display the deadline date") still binds. Gap-1 in the prompt's §10 is NOT closed; it is gated.

---

## §2. The model conflict (the blocking issue)

The implementation prompt and the existing LA modules encode **incompatible models** for what happens when a property is in (or might be in) the City of LA.

### Model A — implementation prompt (`claude_prompt_lahd_and_city_matrix_…`)
- LA notices **are produced**, then a **post-production** LAHD filing prompt is surfaced on the "Notice ready" screen (§5, §6).
- Gating is two `_ENABLED` feature flags defaulting false (§7). Flip the flag → the prompt renders after production.
- City-matrix branch (§5.2) renders supplemental-filing prompts for other jurisdictions (SF, San Jose, etc.) post-production.

### Model B — existing codebase (`detectJurisdiction.ts`, `laOverlay.ts`, `laRtcRules.ts`)
- LA notices **cannot be produced at all yet.** `detectJurisdiction` routes LA-ish addresses to `NEEDS_CONFIRMATION` with user-facing copy stating LA notices can't be produced yet ("LA support is coming soon").
- `isLaProductionUnblocked()` is a **structural gate** returning false until THREE dependencies each land with their own sign-off: (1) authoritative geocode confirmation, (2) verified city business-day calendar, (3) RTC form embed-and-refresh job. **All three are currently false.**
- `laOverlay.ts` computes WHAT WOULD ATTACH for a CONFIRMED LA property (RTC attachment, posting, filing prompt) but explicitly "does not authorize production."
- The hard-block cities `['San Francisco','Oakland','Berkeley','San Jose','Santa Monica','West Hollywood']` are **blocked entirely** today — `detectJurisdiction` returns `BLOCK_OVERLAY_CITY` ("talk to a California licensed attorney before serving a notice for this property").

### Where they directly contradict

1. **LA: produce-then-prompt (A) vs. blocked-until-3-deps (B).** Model A surfaces a filing prompt after an LA notice is produced. Model B forbids producing an LA notice until geocode + calendar + RTC-refresh all land. These cannot both be the live behavior.

2. **SF / San Jose: render-supplemental-prompt (A) vs. hard-block (B).** The prompt's §4/§8 acceptance tests expect SF → "SF row (filing excluded)" and San Jose → "San Jose row" supplemental prompts to RENDER. The codebase currently BLOCKS both cities outright. Build cannot write Phase 1 acceptance tests without knowing which behavior is correct — the two are opposite assertions for the same inputs.

3. **Confidence model.** Model A's resolver keys off authoritative geocode (state + boundary + confidence). Model B's `detectJurisdiction` is deliberately non-authoritative and routes ambiguity to confirmation/blocking. The matrix lookup (Model A) has no authoritative input to key on until Model B's dependency #1 is built.

**Build's read (not a ruling):** Model B is the more conservative, already-attorney-verified, already-gated architecture. Model A reads as a forward design written for the post-dependency world (after geocode + calendar + RTC-refresh land). If that's right, the LAHD/city-matrix prompt is **not buildable as a live feature now** — it's buildable only as gated, non-production scaffolding behind `isLaProductionUnblocked()`, OR it's blocked entirely until the three dependencies land. But which of those — and whether Model A supersedes Model B's block-entirely posture for the non-LA hard-block cities — is yours to rule.

---

## §3. Attorney-attribution: structural tension, not just filenames (escalates the prior §5 flag)

The prior ruling (§5) addressed attorney-attribution in *filenames* and *new artifacts*. The survey surfaced a deeper issue: the existing LA modules build will integrate with are **saturated with attorney-attribution in code**:

- `laRtcRules.ts` header: "Attorney-verified 2026-06-01 (see citation pull sign-off)"; `verifiedBy: '{ATTORNEY_NAME}, SBN {SBN}'` placeholder fields; "attorney sign-off explicitly does NOT authorize…"; multiple "attorney-verified rules" comments.
- `laOverlay.ts`: "Language selection (attorney-confirmed)"; "attorney addition: do not silently default"; "encodes attorney-verified rules."
- `laCityCalendar.ts`: `verifiedBy?: string; // "Name, SBN ######"`; "attorney flips true after verifying"; `verifiedBy: '{ATTORNEY_NAME}, SBN {SBN}'`.

The implementation prompt's §1 rule 2 / §11 say **no attorney tokens anywhere in code, comments, tests**. But the matrix and resolver (Model A) must integrate with these attorney-verified modules (Model B), which are *built on* the attorney-attribution the prompt forbids. And the prompt's own statutory anchors (RTC, LAMC 151.09.C.9 & 165.05.B.5, 3-business-day filing) are the SAME rules `laRtcRules.ts` encodes as attorney-verified.

This is a genuine §0 conflict build cannot resolve: the no-attorney-engagement posture (this session) vs. the attorney-verified provenance baked into the LA rule modules the feature depends on. Build is not proposing to touch those modules. Build is flagging that "build the matrix with zero attorney tokens, on top of attorney-verified rule modules" is internally inconsistent and needs your direction.

**Build will not:** rename, rewrite, or strip attribution from `laRtcRules.ts` / `laOverlay.ts` / `laCityCalendar.ts`. Build will not author a "broker-verified" replacement of attorney-verified rule provenance (that is a legal-provenance claim, squarely §0). Build only flags and asks.

---

## §4. What build needs ruled before Phase 1 can open

- **(A) Which model governs?**
  - (A1) Model B stands: LA stays blocked-until-3-deps; the LAHD/city-matrix prompt is built now only as **gated scaffolding** behind `isLaProductionUnblocked()` (renders nothing in production until deps land), OR
  - (A2) the whole feature is **deferred** until the three dependencies (geocode, city calendar, RTC-refresh) land, and this workstream pauses behind them, OR
  - (A3) Model A supersedes Model B in some defined way you specify (e.g., the post-production prompt is allowed for non-LA jurisdictions even while LA stays blocked).

- **(B) SF / San Jose / hard-block cities: block-entirely (B) or render-supplemental-prompt (A)?** This determines whether the prompt's §4/§8 acceptance tests are correct as written or must be rewritten to assert blocking. Build cannot write the tests until this is ruled.

- **(C) Geocode dependency.** Confirm geocode-confirmation (dep #1) is a prerequisite the feature waits on (build's read), or point build to an authoritative address→state+city+confidence path if one exists that build's survey missed.

- **(D) Attorney-attribution conflict (§3).** How does build integrate a zero-attorney-token matrix with attorney-verified rule modules? Options build sees (you choose / specify other): (D1) leave the rule modules untouched as historical-provenance, build the matrix referencing them by import only with no attribution in new code; (D2) the rule modules get a separate reconciliation determination first; (D3) other.

- **(E) Does the prompt's §10 gap list need reconciling** against the codebase reality (geocode/calendar/RTC-refresh are dependencies #1–3 already encoded in `laRtcRules.ts`, not the prompt's separately-numbered gaps)? Non-blocking, but the two gap lists should agree.

---

## §5. What build did NOT do

- Authored no prose, wrote no code, created no repo files, computed no hashes, wrote no tests.
- Did not touch `detectJurisdiction.ts`, `laOverlay.ts`, `laRtcRules.ts`, `laCityCalendar.ts`, or `places-autocomplete.tsx`. Read-only.
- Made no legal-provenance judgment and did not propose replacing attorney-verified provenance with broker-verified.
- Staged nothing. Opened no implementation branch. Nothing has touched `main`.

Build is paused pending the §4 rulings. The model conflict (§2) is the critical blocker; geocode (§1 §3a) is the prerequisite; the attorney-attribution conflict (§3) needs direction before build integrates with the LA rule modules.

---

## §6. Ruling summary (broker to author)

- **(A)** Which model governs — A1 gated scaffolding / A2 defer / A3 specify:
- **(B)** SF/San Jose/hard-block cities — block-entirely or render-prompt:
- **(C)** Geocode dependency — prerequisite confirmed / pointer to existing path:
- **(D)** Attorney-attribution integration — D1 / D2 / D3:
- **(E)** Reconcile prompt §10 gap list with codebase deps — yes/no:
- **Sign-off:**

---

Authored by build (Claude). Awaiting Broker Compliance Review under blanket authorization (`broker_blanket_authorization_2026-06-15`). No legal wording authored by Claude.
