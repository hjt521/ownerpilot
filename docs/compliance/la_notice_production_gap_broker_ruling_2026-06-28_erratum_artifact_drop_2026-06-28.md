# LA Notice Production Gap Ruling — Erratum + Artifact Drop

**Date:** 2026-06-28 (same-day erratum)
**Reviewer:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review
**Parent ruling:** `la_notice_production_gap_broker_ruling_2026-06-28.md`
**Trigger:** Engineering's content-free Phase 2D scaffold (PHASE2D_ASSEMBLY_ENGINE_WIRED flag, `evaluateLaProduceGate`, fail-closed error codes) is built and verified. Engineering surfaced four §0 content gaps. While assembling the artifact drop, **two of the four "gaps" turned out to be spec errors in the parent ruling**, not real gaps. This erratum corrects them, packages the real artifacts, and tightens the produce-face spec.

---

## §1 Erratum (corrections to the parent ruling)

### Error 1 — There is no separate "RTC Declaration" form

**Parent ruling Decision 3 said:** the produce path attaches 5 forms — the 3-day notice itself, RTC Notice EN, RTC Notice ES, RTC Declaration EN, RTC Declaration ES.

**Correct count: 3 forms.** The 3-day notice itself + **Notice of Right to Counsel (English)** + **Notice of Right to Counsel (Spanish)**. There is no LAHD-issued "Declaration" form. I conflated two things while drafting:

1. The LAHD **Notice of Right to Counsel** (a single PDF per language, the standalone notice the landlord attaches to the eviction notice under LAMC § 166.04(B)). This is what attaches at produce.
2. The state-level **CCP § 1162 proof of service / declaration of service** the landlord or process server fills out **after** service. This is a statewide artifact, already part of the statewide service-method capture, **not an LAHD-issued form, not part of the produce-face attachment**.

The LAHD "Instructions: How to File a Copy of an Eviction Notice with LAHD" PDF ([Jan-2024 LAHD instructions](https://housing.lacity.gov/wp-content/uploads/2024/01/Instructions_How-to-File-a-Copy-of-an-Eviction-Notice-with-LAHD.pdf)) lists no "Declaration of Service" form issued by LAHD. The proof-of-service is the landlord/server's own document under CCP § 1162. Engineering should NOT look for or attach a separate LAHD declaration PDF — there is none.

### Error 2 — There is no "RTC notice-face paragraph" requirement

**Parent ruling Decision 3 said:** wire an "RTC paragraph on the notice face" from `lib/copy/rtc/noticeFaceParagraph.ts` into `buildNoticeHtml`, conditional on `verdict === 'confirmed_la'`.

**Correct: no such paragraph is required.** LAMC § 166.04(B) requires the landlord to **attach the Notice of Right to Counsel** to the eviction notice. The ordinance is satisfied by the attachment of the standalone PDF; it does not require an on-face disclosure paragraph in the 3-day notice body. Engineering was right that no such string exists in the locked-prose set — **it doesn't need to**.

If a future LAMC amendment adds a face-paragraph requirement, that's a new §0 fork at that point. Until then, the produce path attaches the standalone PDFs and does not modify the 3-day notice face for LA jurisdiction.

### Error 3 — Audit-log field naming

**Parent ruling Decision 3 said:** log `rtcPacketSha256_en`, `rtcPacketSha256_es`, `rtcDeclarationSha256_en`, `rtcDeclarationSha256_es`.

**Correct:** drop the declaration SHA fields. The audit-log fields are exactly the three already locked in the parent refresh-policy ruling §2.4: `rtcFormHashes: { english, spanish, ... }`, `rtcFormLastModified: { english, ... }`, `rtcRefreshRunAt`. These are persisted **on the notice record** (not a separate audit log) per `la_rtc_forms_authoritative_source_and_refresh_policy_broker_ruling_response_2026-06-19.md` §2.4. Plus the produce-time fields from this ruling: `lahdFilingPromptCopyVersion`, `lahdFilingPromptAcknowledgedAt`, `isLaProductionUnblockedAtProduce`, `cachedResolverVerdictSource`.

---

## §2 Corrected produce-face spec (replaces parent ruling Decision 3)

### Attached forms (REQUIRED — fail-closed if any missing)

1. **The 3-day notice itself**, produced from the existing statewide notice-template engine. **No LA-specific face modifications.** The notice form is unchanged for LA jurisdiction.
2. **Notice of Right to Counsel (English)** — the standalone PDF. Source: `lib/rtc/packet/english/notice-of-tenants-right-to-counsel-program-english.pdf`. SHA-256 baseline pinned at `d0653950008da9004c405a91685c2c212557ae6398eb2f79d9a6cf7d7beb5f7a`. Filename suffix in produced output: `_rtc_notice_en.pdf`.
3. **Notice of Right to Counsel (Spanish)** — the standalone PDF. Source: `lib/rtc/packet/spanish/notice-of-tenants-right-to-counsel-program-spanish.pdf`. SHA-256 baseline pinned at `947885d0af7eb21f7b66c0f54294b6803923449a21c93c75c0797512455d8371`. Filename suffix: `_rtc_notice_es.pdf`. **Both languages attach by default. No owner opt-out.**

If `lib/rtc/loadCurrentPacket()` cannot return both languages with valid SHA-256 hashes matching the pinned baselines (or the SHA-pinned refresh-job snapshot, whichever is current after future revisions), **fail closed**: do not produce, return 409 with `JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED`.

### Produce-success page additions (REQUIRED)

4. **LAHD filing prompt** — surfaced on the produce-success page. Copy is locked at `lahd_filing_prompt_copy_broker_determination_2026-06-18.md` §1 (`lahdFilingPromptHeader`, `lahdFilingPromptBody`, `lahdFilingChannelsList`, `lahdFilingPromptCopyVersion = "v1"`). Owner must acknowledge before the produce-success page completes. Acknowledgment timestamp + copy version logged.

### Audit-log additions on the notice record (REQUIRED)

5. `rtcFormHashes: { english: "<sha>", spanish: "<sha>" }` (per the refresh-policy ruling §2.4)
6. `rtcFormLastModified: { english: "<iso8601>", spanish: "<iso8601>" }` (per same)
7. `rtcRefreshRunAt: "<iso8601>"` (per same)
8. `lahdFilingPromptCopyVersion: "v1"` (advances when broker updates the LAHD prompt)
9. `lahdFilingPromptAcknowledgedAt: "<iso8601>"` (new)
10. `isLaProductionUnblockedAtProduce: true` (must be true at produce time)
11. `phase2dAssemblyEngineWiredAtProduce: true` (must be true at produce time)
12. `cachedResolverVerdictSource: 'live_resolver' | 'broker_confirm'` (per Decision 2 produce-gate reconciliation ruling)

### What does NOT change

- The 3-day notice template content. No LA face additions.
- The day-count engine.
- The packet structure for non-LA jurisdictions.
- The CCP § 1162 proof-of-service workflow (statewide, unchanged).

---

## §3 Artifact drop (what's in `repo_drop/`)

I'm packaging the artifacts so engineering can move them into the repo with `git mv` or equivalent. The drop is structured to match the paths the parent ruling and the refresh-policy ruling reference.

### Directory tree

```
repo_drop/
├── lib/
│   └── rtc/
│       └── packet/
│           ├── english/
│           │   └── notice-of-tenants-right-to-counsel-program-english.pdf
│           ├── spanish/
│           │   └── notice-of-tenants-right-to-counsel-program-spanish.pdf
│           └── baseline.json
└── docs/
    └── compliance/
        └── locked_prose_manifest_phase2d_additions.json
```

### Files

#### `lib/rtc/packet/english/notice-of-tenants-right-to-counsel-program-english.pdf`

- Source: [LAHD official URL](https://housing.lacity.gov/wp-content/uploads/2025/07/NOTICE-OF-TENANTS-RIGHT-TO-COUNSEL-PROGRAM-English.pdf)
- SHA-256: `d0653950008da9004c405a91685c2c212557ae6398eb2f79d9a6cf7d7beb5f7a`
- Size: 844,172 bytes
- Last-Modified at upstream: `2026-06-16T21:03:44Z`
- Acceptance ruling: `la_rtc_form_revision_acceptance_english_2026-06-19.md`
- Status: **accepted as authoritative baseline**

#### `lib/rtc/packet/spanish/notice-of-tenants-right-to-counsel-program-spanish.pdf`

- Source: [LAHD official URL](https://housing.lacity.gov/wp-content/uploads/2025/07/NOTICE-OF-TENANTS-RIGHT-TO-COUNSEL-PROGRAM-Spanish.pdf)
- SHA-256: `947885d0af7eb21f7b66c0f54294b6803923449a21c93c75c0797512455d8371`
- Size: 867,218 bytes
- Last-Modified at upstream: `2026-06-16T21:03:55Z`
- Acceptance ruling: `la_rtc_form_revision_acceptance_spanish_2026-06-19.md`
- Status: **accepted as authoritative baseline (substantive correction; promote immediately per the acceptance ruling)**

#### `lib/rtc/packet/baseline.json`

The SHA + metadata baseline `loadCurrentPacket` reads. See contents in §4 below.

#### `docs/compliance/locked_prose_manifest_phase2d_additions.json`

The locked-prose manifest entries Phase 2D adds. See contents in §5 below.

---

## §4 `lib/rtc/packet/baseline.json` (lock this verbatim)

```json
{
  "schemaVersion": "1.0.0",
  "lastBaselineUpdate": "2026-06-19T00:00:00Z",
  "lastBaselineUpdateRuling": "la_rtc_form_revision_acceptance_english_2026-06-19.md + la_rtc_form_revision_acceptance_spanish_2026-06-19.md",
  "rtcFormBaselineHashes": {
    "english": "d0653950008da9004c405a91685c2c212557ae6398eb2f79d9a6cf7d7beb5f7a",
    "spanish": "947885d0af7eb21f7b66c0f54294b6803923449a21c93c75c0797512455d8371"
  },
  "rtcFormLastModified": {
    "english": "2026-06-16T21:03:44Z",
    "spanish": "2026-06-16T21:03:55Z"
  },
  "rtcFormSource": {
    "english": "https://housing.lacity.gov/wp-content/uploads/2025/07/NOTICE-OF-TENANTS-RIGHT-TO-COUNSEL-PROGRAM-English.pdf",
    "spanish": "https://housing.lacity.gov/wp-content/uploads/2025/07/NOTICE-OF-TENANTS-RIGHT-TO-COUNSEL-PROGRAM-Spanish.pdf"
  },
  "rtcFormLocalPath": {
    "english": "lib/rtc/packet/english/notice-of-tenants-right-to-counsel-program-english.pdf",
    "spanish": "lib/rtc/packet/spanish/notice-of-tenants-right-to-counsel-program-spanish.pdf"
  },
  "rtcFormSize": {
    "english": 844172,
    "spanish": 867218
  },
  "rtcRefreshRunAt": null,
  "rtcHashThreshold": "strict_sha256",
  "rtcRefreshPolicy": "Weekly cron; broker-gated rollout on revision; strict SHA-256 inequality triggers review.",
  "notes": "Phase 2D produce gate consumes this file. If file is missing, or any hash on disk fails to match the baseline at produce time, fail closed with JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED. The rtcRefreshRunAt field is populated by the weekly cron (job 6528bcda) once it has run a baseline capture."
}
```

`loadCurrentPacket` reads this file, opens both PDFs from `rtcFormLocalPath`, recomputes their SHA-256s, asserts they match `rtcFormBaselineHashes`, and returns the buffers + metadata. Any mismatch is a fail-closed `JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED`.

Future revisions follow the existing pattern: cron 6528bcda detects revision → broker reviews + authors `la_rtc_form_revision_acceptance_<lang>_<date>.md` → broker promotes hashes in `baseline.json` → next produce uses the new version.

---

## §5 `docs/compliance/locked_prose_manifest_phase2d_additions.json`

These are the entries to **merge into** the existing `locked_prose_manifest.json`. Engineering merges; the schema for adding entries is the same as the existing manifest pattern.

```json
{
  "phase2dAdditions": {
    "addedOnRuling": "la_notice_production_gap_broker_ruling_2026-06-28.md (parent) + la_notice_production_gap_broker_ruling_2026-06-28_erratum_artifact_drop_2026-06-28.md (this file)",
    "addedDate": "2026-06-28",
    "tier": "B",
    "entries": [
      {
        "key": "lahdFilingPromptHeader",
        "version": "v1",
        "value": "File this notice with LAHD within 3 business days",
        "sourceRuling": "lahd_filing_prompt_copy_broker_determination_2026-06-18.md §1"
      },
      {
        "key": "lahdFilingPromptBody",
        "version": "v1",
        "value": "The City of Los Angeles requires this 3-day notice to be filed with the Los Angeles Housing Department (LAHD) within 3 business days of service on the tenant. Filing applies to all eviction notices for all rental units in the City of LA, regardless of whether the unit is covered by the Rent Stabilization Ordinance or the Just Cause Ordinance. Filing is the landlord's obligation. Failure to file may be raised by the tenant as an affirmative defense in an unlawful detainer action. Authority: Los Angeles Municipal Code §§ 151.09.C.9 and 165.05.B.5.",
        "sourceRuling": "lahd_filing_prompt_copy_broker_determination_2026-06-18.md §1"
      },
      {
        "key": "lahdFilingChannelsList",
        "version": "v1",
        "value": "File one of three ways:\n\n1. **Online** — Upload a PDF of the notice to the LAHD eviction filing portal at housing.lacity.gov. This is the fastest method and produces an automatic confirmation receipt.\n2. **By mail** — Mail a hard copy of the notice (with a printed LAHD cover sheet) to LAHD. Postmark date is not the filing date — LAHD's date of receipt controls.\n3. **In person** — Deliver a hard copy of the notice to an LAHD public counter.\n\nFile the actual notice that was served. The LAHD cover sheet alone is not a filing. Include the proof of service if one was prepared — the service date is what the 3-business-day clock measures from.",
        "sourceRuling": "lahd_filing_prompt_copy_broker_determination_2026-06-18.md §1"
      },
      {
        "key": "lahdFilingPromptCopyVersion",
        "version": "v1",
        "value": "v1",
        "sourceRuling": "lahd_filing_prompt_copy_broker_determination_2026-06-18.md §1"
      },
      {
        "key": "jurisdictionLaOverlayNotYetAvailable",
        "version": "v1",
        "value": "This property is in the City of Los Angeles. The Los Angeles overlay isn't available in OwnerPilot yet, so a notice for this address can't be produced here. We'll let you know when LA support is live.",
        "sourceRuling": "la_notice_production_gap_broker_ruling_2026-06-28.md Decision 1 (parent ruling). Pre-existing in code; this entry formalizes the manifest record.",
        "note": "Stays in the manifest after the gate flips. Becomes the fallback when isLaProductionUnblocked() returns false for any reason (snapshot stale, refresh runner failing, predicate-6 freshness guard tripping)."
      },
      {
        "key": "jurisdictionLaOverlayAttachmentFailed",
        "version": "v1",
        "value": "This property is in the City of Los Angeles. We hit a problem attaching the required Los Angeles forms, so this notice can't be produced right now. Please try again shortly. If this persists, the issue has been logged for review.",
        "sourceRuling": "la_notice_production_gap_broker_ruling_2026-06-28_erratum_artifact_drop_2026-06-28.md §5 (this file). Engineering proposed; broker accepted with a one-sentence tail addition.",
        "note": "Distinct from jurisdictionLaOverlayNotYetAvailable. Fires when Phase 2D is wired AND isLaProductionUnblocked() returns true AND the attachment step fails at runtime (missing PDF, SHA mismatch, I/O error). The audit log records the failure mode for engineering review."
      }
    ]
  }
}
```

### Engineering's proposed copy for `JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED` — accepted with one addition

Engineering proposed: *"This property is in the City of Los Angeles. We hit a problem attaching the required Los Angeles forms, so this notice can't be produced right now. Please try again shortly."*

**Accepted with one-sentence tail addition:** *"If this persists, the issue has been logged for review."*

Rationale: the tail tells the owner that an indefinite "try again shortly" loop won't be on them — someone is actually seeing the failure on the engineering side. Warm framing, plain English, no fake reassurance.

---

## §6 What engineering can now build (unblocked items)

With the artifacts above in the repo, the parent ruling's Decision 3 items unblock:

1. **`lib/rtc/loadCurrentPacket()`** — reads `lib/rtc/packet/baseline.json`, loads both PDFs from disk, recomputes and verifies SHAs, returns `{ english: Buffer, spanish: Buffer, metadata: {...} }`. Fail-closed on any mismatch.
2. **Server-side produce endpoint** (`app/(chat)/api/document/route.ts`) — runtime assertion = the existing `evaluateLaProduceGate` + `loadCurrentPacket` succeeds + LAHD copy version match. 409 with the appropriate error code on any failure.
3. **Produce-success page LAHD prompt** — renders `lahdFilingPromptHeader` + `lahdFilingPromptBody` + `lahdFilingChannelsList` from the manifest. Owner must acknowledge before completion. Acknowledgment timestamp + copy version logged to the notice record.
4. **Audit-log fields on the notice record** — the 8 fields listed in §2 above.
5. **3-day notice template** — **no changes for LA jurisdiction**. The statewide template stands as-is. No `lib/copy/rtc/noticeFaceParagraph.ts` is needed. Skip that part of the parent ruling's Decision 3.

### Removed from the parent ruling's spec

- ❌ `lib/copy/rtc/noticeFaceParagraph.ts` — not needed; no on-face requirement
- ❌ RTC Declaration EN / ES PDFs — not a real LAHD form
- ❌ Conditional RTC paragraph injection in `buildNoticeHtml` — not needed

---

## §7 §3 closeouts from the parent ruling

The parent ruling §3 listed three broker owes-before-gate-flip items. Disposition now:

- [x] **[MUST FIX]** Confirm RTC packet snapshot SHAs current + refresh cron baseline captured.
  - **Status:** The SHA baselines are pinned in `repo_drop/lib/rtc/packet/baseline.json` and match both acceptance rulings exactly. The weekly refresh cron (`6528bcda`) fires Mon 09:15 PT — first run is tomorrow (Mon 2026-06-29). The cron will write `rtcRefreshRunAt` once it captures its first snapshot; until then, that field is `null` and the engineering produce-gate code treats `null` as a non-blocker because the baselines are pinned in this file from the acceptance rulings. After the first cron run, the cron-captured SHAs MUST match the baselines in this file. If they don't, that's a broker-review event under the existing refresh-policy ruling.
- [x] **[MUST FIX]** Confirm LAHD filing prompt copy version locked. **Status:** v1, locked in `lahd_filing_prompt_copy_broker_determination_2026-06-18.md`. Engineering consumes from the manifest.
- [x] **[SHOULD FIX]** Walk through produce-face spec with engineering. **Status:** This erratum is the walk-through. The corrected spec in §2 above is what engineering builds to. The two spec errors from the parent ruling are corrected here; engineering does not need to find or wire the (non-existent) face paragraph or the (non-existent) declaration forms.

---

## §8 Phase 2D flip readiness

After engineering wires the items in §6 against the artifacts in §3–§5:

1. **Local-test phase** — engineering produces a test LA notice with the EN+ES RTC PDFs attached + LAHD prompt surfaced + acknowledgment captured + audit fields populated, behind the closed `PHASE2D_ASSEMBLY_ENGINE_WIRED` flag (still `false` in production).
2. **Broker-attested verification** — broker runs the two real-address tests from the parent ruling §2.4 step 2: `5537 La Mirada Ave, Unit 202, Los Angeles, CA 90038` (RSO-likely) and `1200 Wilshire Blvd, Los Angeles, CA 90017` (boundary case). Plus the non-LA control: a Santa Monica address must still receive `not_la` and proceed through the statewide-only template (no RTC attachment, no LAHD prompt).
3. **Gate flip** — broker flips `PHASE2D_ASSEMBLY_ENGINE_WIRED` to `true`. **Go-live gravity applies.** This is the second flip from the predicates kickoff prompt that opens the gate.
4. **Decision 2 client wiring resumes** with the produce path actually producing.

---

## §9 No new §0 forks

This erratum closes the four §0 content gaps engineering surfaced:

- ❌ → ✅ The 4 RTC PDFs → **corrected to 2 PDFs (EN + ES notice), packaged with pinned SHAs**
- ❌ → ✅ The RTC notice-face paragraph → **doesn't need to exist; spec corrected**
- ❌ → ✅ LAHD filing prompt copy in the locked-prose manifest → **packaged in `phase2d_additions.json`**
- ❌ → ✅ `JURISDICTION_LA_OVERLAY_ATTACHMENT_FAILED` user-facing copy → **engineering's proposal accepted with one-sentence tail**

No new §0 forks open from this erratum. Engineering has everything it needs.

---

## §10 Hard reservations (carried forward unchanged)

1. Fail-closed posture is non-negotiable.
2. No partial-language production. EN + ES always attach.
3. Runtime assertion is server-side.
4. Phase 2D verification is broker-attested.
5. `JURISDICTION_LA_OVERLAY_NOT_YET_AVAILABLE` stays in the manifest after the gate flips as the fallback.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-28
