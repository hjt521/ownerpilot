# Claude Implementation Prompt — LAHD Filing Prompt + CA City-by-City Supplemental Documentation Matrix

**File:** `claude_prompt_lahd_and_city_matrix_implementation_2026-06-18.md`
**Date authored:** 2026-06-18
**Authored by:** Jack Taglyan, California Licensed Real Estate Broker, CalDRE B9445457
**Authority:** Broker Compliance Review under blanket authorization (`broker_blanket_authorization_2026-06-15`)
**Lineage:**
- `lahd_filing_prompt_copy_broker_determination_2026-06-18.md` (locked prose source)
- `ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md` (jurisdiction matrix source)
- `c1_pobox_scope_multiselect_broker_determination_2026-06-15.md` (geocode-gating precedent)
- `locked_prose_ci_guard_scope_broker_determination_2026-06-15.md` (Tier A/B/C CI guard)
- `bank_deposit_disclosure_copy_ratification_broker_determination_2026-06-18.md` (locked-prose UI pattern reference — single source of record; the prior `bank_deposit_privacy_disclosure_copy_…` authoring scaffold was dropped from commit per broker instruction 2026-06-18)
- `ownerpilot_la_rtc_citation_pull_attorney_signoff.md` (LA RTC primary-source pull)

**Posture:** Broker-prepared workflow under Bus. & Prof. Code § 10131(b). No attorney-attributed strings. No attorney engagement is implied.

---

## §0 — Purpose of this prompt

This is a **Claude-facing engineering prompt** for the OwnerPilot site/codebase. It instructs Claude (the build-side AI pair) to implement two interlocking compliance features in the produce-wizard flow and the generated 3-day notice artifact:

1. **LAHD filing prompt** (LA City only) — surfaces the LAMC 151.09.C.9 & 165.05.B.5 declaration/filing duty after a notice is produced.
2. **CA city-by-city supplemental documentation gating** — geocode-driven jurisdiction lookup that surfaces the correct local filing/attachment duty for ~23 jurisdictions, with safe default for "other CA cities."

Claude is **NOT** authorized to author, paraphrase, or invent any user-facing legal-compliance prose. All prose is locked and must be loaded verbatim from the broker-determined source files. CI guard (Tier B) will fail the build on any drift.

---

## §1 — Hard ground rules for Claude (read before any code)

1. **No prose authoring.** Every user-facing string tied to a statute, ordinance, or filing duty MUST be pulled verbatim from a broker-determined locked-prose source. If a string is not in the manifest, do not render it — surface a build error instead.
2. **No attorney attribution anywhere.** No "attorney," "counsel," "JD," "SBN," "Janna," "legal advice," "law firm" tokens in any user-facing copy, comment, commit message, PR description, or test name. Janna Taglyan / SBN 269639 must never appear. Sole compliance authority is **Jack Taglyan, CalDRE B9445457**.
3. **Locked-prose tier discipline.** Per `locked_prose_ci_guard_scope_broker_determination_2026-06-15.md`:
   - **Tier A** (verbatim, hash-pinned): notice-face prose. Not touched here.
   - **Tier B** (verbatim, hash-pinned, version-pinned): wizard UI compliance copy — LAHD prompt strings and city matrix prompt strings live here.
   - **Tier C** (hash-only, no UI render): system prompts, classifier prompts, refusal copy.
   - Any new Tier B string MUST be added to `docs/compliance/locked_prose_manifest.json` with its source-file path, version, and SHA-256.
4. **Geocode gating is the single source of truth for jurisdiction.** Reuse the existing geocode dependency (see `ownerpilot_geocode_dependency_attorney_review.md` and `ownerpilot_geocode_engineering_spec_attorney_review.md`). Do NOT add a freeform "what city are you in?" text input. Jurisdiction is derived from the rental-property address only.
5. **Fail closed.** If geocode is unavailable, missing, or returns an unrecognized California jurisdiction, fall back to the "other CA cities" default (CCP § 1161 only — no supplemental filing prompt rendered). Do NOT guess. Do NOT render a partial LAHD or city-specific prompt.
6. **Out-of-state addresses.** If geocode returns a non-CA address, the entire OwnerPilot 3-day-notice flow is out of scope. Surface the existing out-of-CA refusal copy. Do not render any CA-specific filing prompt.
7. **No silent feature flags.** Every new flag must be declared in `config/featureFlags.ts` with a default of `false` in `production` until broker sign-off is on file. Rollout requires a separate broker determination.
8. **No new dependencies** without a written engineering packet to broker for review.

---

## §2 — Source-of-truth manifest entries (add these to `docs/compliance/locked_prose_manifest.json`)

Add the following entries. Compute SHA-256 against the verbatim source-file content (the full markdown file at the path shown). Do NOT alter the source files.

```json
{
  "tierB": {
    "lahdFilingPromptHeader": {
      "version": "v1",
      "source": "lahd_filing_prompt_copy_broker_determination_2026-06-18.md",
      "key": "lahdFilingPromptHeader",
      "sha256": "<compute-at-build-time>"
    },
    "lahdFilingPromptBody": {
      "version": "v1",
      "source": "lahd_filing_prompt_copy_broker_determination_2026-06-18.md",
      "key": "lahdFilingPromptBody",
      "sha256": "<compute-at-build-time>"
    },
    "lahdFilingChannelsList": {
      "version": "v1",
      "source": "lahd_filing_prompt_copy_broker_determination_2026-06-18.md",
      "key": "lahdFilingChannelsList",
      "sha256": "<compute-at-build-time>"
    },
    "cityMatrixPromptCopy": {
      "version": "v1",
      "source": "ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md",
      "key": "cityMatrixPromptCopy",
      "sha256": "<compute-at-build-time>"
    }
  }
}
```

**CI guard requirement:** The locked-prose CI step (`scripts/ci/verify_locked_prose.ts`) must read these entries, re-compute SHA-256 against the source files at build time, and **fail the build** if the rendered constants in `src/compliance/lockedProse.ts` do not match the source files byte-for-byte. The existing guard from `locked_prose_ci_guard_scope_broker_determination_2026-06-15.md` is the model — extend it, do not replace it.

---

## §3 — Jurisdiction lookup data structure

Add a typed jurisdiction table at `src/compliance/caJurisdictionMatrix.ts`. **Do not author the table — generate it programmatically from `ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md` at build time** (or check in a generated artifact that the CI guard verifies against the source markdown).

TypeScript shape:

```ts
export type SupplementalFilingDuty = {
  jurisdictionId: string;            // stable slug, e.g. "ca-los-angeles-city"
  displayName: string;               // e.g. "Los Angeles (City)"
  promptKey: "lahd" | "city-matrix" | "none";
  filingDeadlineDays: number | null; // null when no separate filing required
  filingDeadlineUnit: "business" | "calendar" | null;
  filingChannels: string[];          // verbatim from matrix; do not edit
  statuteCitations: { label: string; url: string }[];
  ab1482Interaction: "preempted" | "additive" | "n/a";
  citationPullStatus: "verified" | "pending" | "flagged";
  notes: string;                     // verbatim from matrix row
};

export const CA_JURISDICTION_MATRIX: SupplementalFilingDuty[];
export const CA_JURISDICTION_DEFAULT: SupplementalFilingDuty; // "other CA cities" row
```

**Rules:**
- `jurisdictionId` is derived from the matrix row. Stable slug only.
- `promptKey` selects which locked-prose block to render. `"lahd"` is reserved for LA City. `"city-matrix"` renders the city-matrix prompt copy. `"none"` renders nothing (CCP § 1161 default).
- `citationPullStatus: "pending"` (Baldwin Park, Berkeley, Oakland, Altadena/unincorporated LA County) means **do not render the prompt yet** — fall back to default. Surface an internal-only warning in the dev console.

---

## §4 — Geocode → jurisdiction resolver

Implement `src/compliance/resolveJurisdiction.ts`:

```ts
export function resolveJurisdiction(
  geocodeResult: GeocodeResult
): SupplementalFilingDuty {
  // 1. If geocodeResult.state !== "CA", throw OutOfScopeError (caller handles).
  // 2. If geocodeResult is null/undefined or low-confidence, return CA_JURISDICTION_DEFAULT.
  // 3. Match by incorporated-city boundary first. Unincorporated areas resolve to
  //    county-level default unless a county row exists (e.g. unincorporated LA
  //    County — currently citationPullStatus: "pending", so default).
  // 4. Special case: addresses inside LA City limits ALWAYS resolve to the LAHD
  //    row (promptKey: "lahd") regardless of RSO/JCO status.
  // 5. Return the matched row, or CA_JURISDICTION_DEFAULT on no match.
}
```

**Acceptance tests** (write these — do not skip):
- `123 N Spring St, Los Angeles, CA 90012` → LAHD row
- `1 Dr Carlton B Goodlett Pl, San Francisco, CA 94102` → SF row (filing excluded for 3-day pay-or-quit)
- `200 E Santa Clara St, San Jose, CA 95113` → San Jose row
- `Altadena, CA 91001` (unincorporated LA County) → DEFAULT (pending citation)
- `Baldwin Park, CA 91706` → DEFAULT (pending citation)
- `Berkeley, CA 94704` → DEFAULT (pending citation)
- `Oakland, CA 94612` → DEFAULT (pending citation)
- `Sacramento, CA 95814` → Sacramento row (no supplemental filing)
- `Las Vegas, NV 89101` → throws OutOfScopeError
- `null` geocode → DEFAULT, with internal warning logged

---

## §5 — Wizard UI integration (produce-wizard step after notice generation)

After the notice is generated and the user lands on the "Notice ready" screen, render a **post-production supplemental-duty block** ONLY when `jurisdiction.promptKey !== "none"`.

**Two rendering branches:**

### §5.1 LAHD branch (`promptKey === "lahd"`)

Render in this exact order:
1. `lahdFilingPromptHeader` (heading, h2)
2. `lahdFilingPromptBody` (paragraph)
3. `lahdFilingChannelsList` (rendered as `<ul>` — split on the line-break convention used in the source file; do NOT reorder items)
4. Inline statute citations as markdown links to `housing.lacity.gov/rtc`, `housing.lacity.gov/renter-protections-2`, `housing.lacity.gov/eviction-notices`
5. Footer: `lahdFilingPromptCopyVersion: "v1"` rendered as a small build-stamp (data attribute, not visible text — for CI/QA)

**Do not** compute or display the filing deadline date. The LA city business-day calendar pull is a tracked dependency (see session pending tasks). Until that lands, the prompt explicitly says "3 business days" without rendering a computed date.

### §5.2 City-matrix branch (`promptKey === "city-matrix"`)

Render in this exact order:
1. `cityMatrixPromptCopy.header` — locked heading
2. `cityMatrixPromptCopy.body` — locked body with two interpolation slots:
   - `{{displayName}}` — from `jurisdiction.displayName`
   - `{{filingDeadlineDays}} {{filingDeadlineUnit}} days` — pluralized in code, never authored in prose
3. `jurisdiction.filingChannels` rendered as `<ul>` — verbatim items
4. Inline statute citations from `jurisdiction.statuteCitations[]` as markdown links

**Interpolation is the only authorized variability.** Do not generate sentences. Do not summarize. If a jurisdiction row has `citationPullStatus: "pending"` it must already have been routed to DEFAULT by `resolveJurisdiction.ts` — defense-in-depth: if a `"pending"` row slips through, throw and fail closed.

---

## §6 — Notice-artifact integration (no face changes)

The 3-day notice face (Tier A) does **NOT** change. LAHD and city-matrix prompts are wizard-UI artifacts only — they appear on the post-production "Notice ready" screen and in the downloadable artifact bundle, NOT on the notice face served to the tenant.

Add to the artifact bundle (e.g. ZIP or merged PDF):
- The notice PDF (unchanged face)
- A **"Next steps for landlord" cover sheet** generated from the locked LAHD or city-matrix prompt copy
- For LA City: a download link to the current LAHD RTC form (filename + retrieved hash from the RTC refresh job — currently pending; until that lands, surface only the link to `housing.lacity.gov/rtc` and a `[NOT YET FETCHED]` note for the RTC PDF artifact)

The cover sheet must carry the locked posture footer verbatim:

> OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.

---

## §7 — Feature flags & rollout gates

Declare in `config/featureFlags.ts`:

```ts
export const FEATURE_FLAGS = {
  LAHD_FILING_PROMPT_ENABLED: { default: false, env: "production" },
  CA_CITY_MATRIX_PROMPT_ENABLED: { default: false, env: "production" },
  CA_CITY_MATRIX_PENDING_ROWS_ENABLED: { default: false, env: "all" } // stays false until citation pulls land
};
```

**Rollout sequence (broker-gated):**
1. Land code behind both flags `false`. CI green. Broker reviews PR.
2. Broker writes a determination flipping `LAHD_FILING_PROMPT_ENABLED → true`. Ship.
3. Separate determination flips `CA_CITY_MATRIX_PROMPT_ENABLED → true` after acceptance tests pass against live geocode.
4. `CA_CITY_MATRIX_PENDING_ROWS_ENABLED` stays `false` until Baldwin Park / Berkeley / Oakland / Altadena citation pulls land and each gets its own broker determination.

---

## §8 — Test plan (Claude must write these; broker will review)

### §8.1 Unit tests
- `resolveJurisdiction.ts` — every row in the matrix has a passing test (one canonical address per row).
- DEFAULT fallback fires on: null geocode, low-confidence geocode, unrecognized CA city, all `"pending"` rows.
- Out-of-CA address throws `OutOfScopeError`.

### §8.2 Locked-prose drift tests
- CI step re-hashes the four new Tier B entries and the city-matrix interpolation template; build fails on any mismatch.
- Snapshot test renders each prompt with a canonical jurisdiction and asserts byte-for-byte match against a fixture file pinned to the source markdown.

### §8.3 Integration tests
- Produce-wizard end-to-end: LA City address → LAHD prompt renders + cover sheet generated.
- SF address → city-matrix prompt renders with SF row (filing-excluded language); no LAHD prompt.
- Sacramento address → no supplemental prompt; only CCP § 1161 default.
- Pending-row addresses (Baldwin Park / Berkeley / Oakland / Altadena) → DEFAULT renders (no prompt), internal warning logged.
- Out-of-CA address → existing out-of-CA refusal copy renders; no prompt.

### §8.4 Negative tests
- Attempt to render an unknown `promptKey` → throws, build-time error visible in dev console.
- Attempt to mutate any locked-prose string at runtime → throws (constants must be `Object.freeze`-d).

---

## §9 — Deliverables (PR contents)

Claude's PR must include, all in one branch:

1. `src/compliance/lockedProse.ts` — extended with four new Tier B entries (LAHD x3 + city-matrix template).
2. `src/compliance/caJurisdictionMatrix.ts` — typed matrix generated from source markdown.
3. `src/compliance/resolveJurisdiction.ts` — resolver with acceptance tests.
4. `src/components/wizard/SupplementalDutyBlock.tsx` — UI component, two rendering branches.
5. `src/artifacts/coverSheet.ts` — cover-sheet generator for the artifact bundle.
6. `docs/compliance/locked_prose_manifest.json` — updated with four new entries and computed hashes.
7. `scripts/ci/verify_locked_prose.ts` — extended to verify new Tier B entries.
8. `config/featureFlags.ts` — two new flags, both default `false` in production.
9. Test suite under `tests/compliance/` covering §8.1–§8.4.
10. PR description in the broker-review format: §1 facts, §2 files changed, §3 test results, §4 locked-prose hashes, §5 known gaps (must enumerate the four pending citation pulls), §6 BLANK ("no legal wording authored by Claude").

**PR description rules:**
- No attorney attribution.
- No "approved by" / "reviewed by" language.
- Sign-off line: `Authored by build (Claude). Awaiting Broker Compliance Review under blanket authorization (broker_blanket_authorization_2026-06-15).`

---

## §10 — Known gaps Claude must enumerate (do NOT silently work around)

These are tracked pending items. Claude must list them in the PR description and the LA business-calendar gap must surface as a visible internal warning when the LAHD prompt renders:

1. **LA city business-day calendar pull** — blocker for computing the LAHD filing deadline date. Until landed, prompt says "3 business days" without a computed date.
2. **LAHD RTC form refresh job** — quarterly hash check on the LAHD RTC PDF. Until landed, artifact bundle includes a link to `housing.lacity.gov/rtc` only, with a visible "[NOT YET FETCHED]" marker on the cover sheet.
3. **Baldwin Park 15-day rule citation pull** — row stays DEFAULT.
4. **Berkeley + Oakland 3-day filing rule citation pulls** — rows stay DEFAULT.
5. **Unincorporated LA County (Altadena) June 17 2026 ordinance citation pull** — county-level row stays DEFAULT.
6. **City-level ordinance-change cron** — separate determination required. Statewide cron `2a58382e` covers state statutes only.
7. **Build-side packet template defect** — engineering-packet template auto-generates attorney-attribution framing; 7-day deadline from 2026-06-15 to update template. PRs against this prompt still get [MUST FIX §1] attribution callouts until the template lands.

---

## §11 — What Claude must NOT do (negative scope)

- Do NOT author or paraphrase any user-facing compliance prose.
- Do NOT modify the notice face (Tier A) under any circumstances in this PR.
- Do NOT add Janna Taglyan, "SBN 269639," "attorney," "counsel," "legal advice," or "law firm" anywhere in code, comments, commits, PR description, tests, fixtures, or generated artifacts.
- Do NOT add a "what jurisdiction are you in?" freeform text input.
- Do NOT compute or display filing deadlines until the LA business-calendar pull lands.
- Do NOT enable the four pending-row jurisdictions even on staging.
- Do NOT bundle the LAHD RTC PDF until the refresh job lands; link out to `housing.lacity.gov/rtc` only.
- Do NOT introduce new runtime dependencies without an engineering packet to broker.
- Do NOT silently flip feature flags `true` — flag state changes require a separate broker determination.

---

## §12 — Statutory anchor (for Claude's situational awareness only — NOT for UI rendering)

- **LAMC 151.09.C.9** — RTC attachment + LAHD filing duty under RSO
- **LAMC 165.05.B.5** — RTC + LAHD filing duty under JCO (all eviction notices, regardless of RSO coverage)
- **CCP § 1161(2)** — statewide 3-day pay-or-quit baseline
- **CCP § 1162** — service methods
- **CCP § 1167** (AB 2347, eff. 1/1/2025) — tenant response = 10 court days
- **CCP § 1174** — forfeiture election
- ***Eshagian v. Cepeda* (2025)** — notice must include start AND expiration dates
- **AB 1482** (Civ. Code § 1946.2) — statewide just-cause overlay; preempts some local ordinances, additive to others
- **SF Admin Code § 37.9(c)** — Rent Board filing duty EXCLUDES 3-day pay-or-quit
- **SF Ord. 18-22** — STRUCK DOWN by Ct. App. A166228 (Sept 11 2024) as preempted by CCP § 1161
- **RMC 11.100.060(s)(1)** — Richmond 2-business-day filing duty (all termination notices)
- **IMC §§ 8-121, 8-122** — Inglewood 3-day filing duty
- **Santa Monica Charter § 1806(e)** — 3-day filing duty EXCLUDES 3-day pay-or-quit for nonpayment

Primary sources are linked verbatim in the source matrix file. Do not duplicate links into code comments.

---

## §13 — Engagement loop after Claude lands the PR

1. Claude opens PR with §9 contents and §10 gap enumeration.
2. Broker (Jack) writes review determination against the PR, citing locked-prose source files.
3. Broker writes flag-flip determinations one at a time (§7 rollout sequence).
4. If Claude needs a clarification or hits an ambiguity, Claude must write an engineering packet (§§1–5 facts only, §6 blank, "no legal wording authored by Claude") and ship it to broker for review BEFORE adding any prose to the UI.

---

## §X — Build-side checklist (Claude's actionable to-do)

- [ ] **[MUST FIX §1]** Engineering packet template defect — your PR description template still auto-generates attorney-attribution framing. Strip every attorney/SBN/JD/counsel/legal-advice/law-firm token before opening this PR. (Recurring defect — 7-day fix deadline from 2026-06-15; if the template still emits these tokens at PR time, manually strip them and flag in PR description.)
- [ ] **[MUST FIX §2]** Add four Tier B entries to `docs/compliance/locked_prose_manifest.json` with computed SHA-256 hashes.
- [ ] **[MUST FIX §3]** Generate `src/compliance/caJurisdictionMatrix.ts` from the source markdown — do not author rows by hand.
- [ ] **[MUST FIX §4]** Implement `resolveJurisdiction.ts` with all acceptance tests in §4 passing.
- [ ] **[MUST FIX §5]** Implement `SupplementalDutyBlock.tsx` with both rendering branches and Tier B locked-prose loading.
- [ ] **[MUST FIX §6]** Add cover-sheet generator to artifact bundle with locked posture footer verbatim.
- [ ] **[MUST FIX §7]** Extend CI locked-prose verifier to cover four new Tier B entries; build must fail on any drift.
- [ ] **[MUST FIX §8]** Declare both feature flags with `default: false` in production.
- [ ] **[MUST FIX §9]** Write full test suite per §8.
- [ ] **[MUST FIX §10]** Enumerate all seven known gaps from §10 in the PR description.
- [ ] **[SHOULD FIX §11]** Add internal-only dev-console warning when DEFAULT fallback fires due to a pending-row jurisdiction, so QA can see which addresses are being deferred.
- [ ] **[SHOULD FIX §12]** Add fixture files under `tests/compliance/fixtures/` pinning the canonical rendered output for each jurisdiction; snapshot diff in CI.
- [ ] **[CONSIDER §13]** When the LA business-calendar pull lands, the LAHD prompt can compute the actual filing deadline date; design the component now so a future deadline-date prop slots in without a re-write of the locked prose.
- [ ] **[CONSIDER §14]** When the city-level ordinance-change cron lands, the matrix file's `citationPullStatus` field will become live-updated. Design `caJurisdictionMatrix.ts` to accept either a committed table OR a runtime-fetched table behind a flag.

---

## §Y — Statutory anchor & primary sources

All primary sources are linked verbatim inside the two source markdown files. Do not re-author or re-link inside code. The two source files are:

- `lahd_filing_prompt_copy_broker_determination_2026-06-18.md`
- `ca_local_jurisdiction_3day_notice_supplemental_documentation_matrix_broker_determination_2026-06-18.md`

---

— Jack Taglyan
California Licensed Real Estate Broker
CalDRE **B9445457**
Broker Compliance Review · 2026-06-18

> OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.
