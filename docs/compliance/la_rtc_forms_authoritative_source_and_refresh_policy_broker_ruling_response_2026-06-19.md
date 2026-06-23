# W4: RTC Forms Authoritative Source + Refresh Policy — Broker Ruling Response

**File:** `la_rtc_forms_authoritative_source_and_refresh_policy_broker_ruling_response_2026-06-19.md`
**Date:** 2026-06-19
**Determination by:** Jack Taglyan, California Licensed Real Estate Broker (CalDRE B9445457)
**Authority:** Bus. & Prof. Code § 10131(b); OwnerPilot AI broker-scope posture
**Lineage:**
- `la_go_live_master_requirements_broker_ruling_response_2026-06-19.md` (§2.5 opened W4)
- `la_phase2_first_action_routing_broker_ruling_response_2026-06-19.md` (§2.3 authorized broker-run URL-drift)
- `phase2_step_e_sequencing_broker_ruling_response_2026-06-19.md` (§2.4 split W4 into three gating + two deferrable)
- `la_rtc_forms_authoritative_source_and_refresh_policy_broker_ruling_request_2026-06-19.md` (build's request packet w/ drift findings)
- `lahd_filing_prompt_copy_broker_determination_2026-06-18.md` (prior LAHD form scope)
**Posture:** Broker-scope only. No attorney engagement. Janna Taglyan has NO operative authority.

---

## §0 Scope & Attribution Check

Build supplied mechanical drift findings (9/9 URLs returned 200, baseline hashes, two english+spanish Last-Modified dates of Jun 16 2026) and asked for five sub-rulings plus the authoritative-source confirmation. Build authored no legal content. This determination rules all five sub-rulings (closing the three gating, addressing the two deferrable on the merits rather than tabling), rules the authoritative-source confirmation with a split for english/spanish, and is the trigger to open step (e) — but only after the english/spanish verification step in §4 below closes.

No attribution drift in the request packet.

---

## §1 Ruling Summary

| # | Sub-ruling | Determination | Gates (e)? |
|---|---|---|---|
| 2.1 | Refresh cadence | **Weekly + on-deploy** | YES — closed |
| 2.2 | Failure handling | **Per-language block; no stale-serve; in-app + email alert; isolation across languages** | YES — closed |
| 2.3 | Hash threshold | **Strict SHA-256 inequality** | YES — closed |
| 2.4 | Version recording | **RULED** (stub OK for scaffold; final shape below) | no — ruled anyway |
| 2.5 | Rollout on revision | **RULED** (broker-gated; in-flight pin to draft-time hash) | no — ruled anyway |
| 3 | Authoritative-source confirmation | **SPLIT: 7/9 confirmed; 2/9 (english + spanish Jun-16) PENDING broker visual verification** | conditional |
| — | W4-partial closed → (e) may open? | **NOT YET** — see §4 | — |

---

## §2 The Five Sub-Rulings

### §2.1 Refresh cadence — WEEKLY + ON-DEPLOY

**Ruling:** The refresh job runs **(a) weekly on a fixed schedule (Mondays 06:00 PT)** and **(b) on every production deploy that touches LA modules.** No daily runs. No on-demand-only.

**Reasoning:**
- LAHD RTC forms historically change on a roughly twice-a-year cadence. The Jun-16 english/spanish moves are the first observed revisions in ~10 months. Daily checks would generate ~365 no-op runs per year per language for ~2 actual revisions — noise that desensitizes the broker to real alerts.
- On-demand-only fails to detect revisions like Jun-16 between deploys, which is exactly the scenario this workstream is meant to catch.
- Weekly hits the median detection latency (3.5 days) — fast enough that a tenant-facing notice doesn't reference a stale form for long, slow enough that the signal-to-noise ratio stays high.
- On-deploy as a belt-and-suspenders catches anything between the last weekly and the deploy gate, ensuring no production rollout uses an unverified form snapshot.

**Locked constant:** `RTC_REFRESH_CADENCE = { weekly: "Mon 06:00 PT", on_deploy: true }`

### §2.2 Failure handling — PER-LANGUAGE BLOCK; NO STALE-SERVE; ALERT

**Ruling:** When a refresh check fails for a given language:

1. **(a) Block LA production for that language.** Do not serve the last-known-good cached form. `isLaProductionUnblocked({language})` returns `false` for the affected language until the next successful refresh or broker manual override.
2. **(b) Other languages are unaffected.** Per-language isolation — if armenian fails, english/spanish/etc. continue to serve. A single language's failure is not an LA-wide outage.
3. **(c) Alert via the same in-app + email pattern used by the CA 3-day statute watch cron** (channels: `['in_app', 'email']`). Alert title: `"LAHD RTC refresh — <language> blocked (<reason>)"`. Alert body includes: language, URL, HTTP status / error, last-successful-refresh timestamp, last-known-good hash.
4. **"Failure" is defined as any of:** HTTP non-200, content-type ≠ `application/pdf`, zero-byte payload, payload Content-Length mismatch, network timeout > 30s, redirect chain (LAHD URLs must be direct).

**Reasoning:**
- Serving stale cached forms looks like a feature ("graceful degradation") and is a compliance hazard. If LAHD changed a form because the prior version was wrong or non-compliant, serving the old version is worse than serving nothing. Block-and-alert is the conservative posture for a regulatory artifact.
- Per-language isolation is correct because the nine URLs are independent files. There's no scenario where armenian failing implies english is also bad. Blocking all nine because one failed would over-restrict.
- The drift tool already distinguishes failure modes per build's note. Use that. Don't add new failure-mode logic.

**Locked constant:** `RTC_FAILURE_POLICY = { serveStaleCached: false, perLanguageIsolation: true, alertChannels: ["in_app", "email"], failureDefinition: ["http_non_200", "content_type_not_pdf", "zero_bytes", "content_length_mismatch", "timeout_gt_30s", "any_redirect"] }`

### §2.3 Hash threshold — STRICT SHA-256

**Ruling:** Any SHA-256 inequality against baseline is a "change" that triggers (i) the alert defined in §2.2(c) but reskinned as a revision alert (title: `"LAHD RTC revision detected — <language>"`), and (ii) the `rolloutOnRevision` flow defined in §2.5. **No metadata-aware diff. No size-delta threshold. No semantic-content diff.**

**Reasoning:**
- Strict SHA-256 is the simplest rule that cannot be wrong about whether bytes changed. Any "ignore trivial metadata" rule has to define "trivial," and getting that definition wrong creates a class of revisions the system silently misses. That's worse than the noise of flagging a metadata-only re-save.
- The cost of a false-positive (broker spends 5 minutes opening two PDFs side-by-side and confirming "metadata only") is much lower than the cost of a false-negative (a substantive revision served as if unchanged for weeks).
- The english/spanish Jun-16 case is the live test: under strict SHA-256, they correctly flag as changed and route to §2.5 for broker review. Under a metadata-ignoring rule, they might silently pass — and we don't yet know if they should.
- Broker review on each flag is where "trivial vs. substantive" gets decided — don't try to encode that in a heuristic.

**Locked constant:** `RTC_HASH_THRESHOLD = "strict_sha256"`

### §2.4 Version recording — RULED (not deferred)

**Ruling:** Every served LA notice records, in its persistence record:

1. **(a)** The SHA-256 of each RTC form attached, keyed by language served (`rtcFormHashes: { english: "...", spanish: "...", ... }`).
2. **(b)** The Last-Modified header value at fetch time (`rtcFormLastModified: { english: "...", ... }`).
3. **(c)** The refresh-job run timestamp that established the served version was current (`rtcRefreshRunAt: ISO-8601`).

These three fields are persisted **on the notice record**, not in a separate audit log. Storage shape: extend the existing notice schema with an `rtcFormVersionRecord` object. Scaffold may stub with `rtcFormVersionRecord: { _stub: true }` until the schema migration lands, but the field name and shape above are locked now so the stub matches the final shape.

**Reasoning:**
- Build flagged this as deferrable because step-(e) sequencing §2.4 said the scaffold could stub it. True, but the *shape* of what gets stubbed shouldn't be deferred — locking it now means the stub-to-real swap is a one-line change instead of a refactor.
- These three fields together let any served notice be reconstructed-for-compliance: which form, which version of the form, and when the version was verified. That's the minimum for the audit trail.
- Recording on the notice record (not a separate log) keeps the data co-located with what it documents. Audit logs get rotated/lost; notice records are preserved.

**Locked constant:** `RTC_VERSION_RECORD_FIELDS = ["rtcFormHashes", "rtcFormLastModified", "rtcRefreshRunAt"]` on notice schema.

### §2.5 Rollout on revision — RULED (not deferred)

**Ruling:**

1. **(a) Broker-gated rollout, not auto-rollout.** When strict-SHA256 detects a revision, the new version is **staged but not served.** `isLaProductionUnblocked({language})` flips to `false` for the affected language pending broker review. Broker reviews the diff (visual PDF comparison against prior baseline), then either (i) accepts the revision via a broker-determination file, which updates the baseline hash and re-unblocks the language, or (ii) rejects and reverts.
2. **(b) In-flight notices pin to their draft-time hash.** A notice drafted before a revision detection serves the form version that was current at draft time. A notice drafted after detection-but-before-acceptance is **blocked from completion in that language** (same as §2.2 block — user routed to a different language or asked to wait). A notice drafted after acceptance uses the new version.
3. **(c) Acceptance produces a broker-determination file** named `la_rtc_form_revision_acceptance_<language>_<YYYY-MM-DD>.md` recording: prior hash, new hash, Last-Modified, diff summary, accept/reject, sign-off. This is the same pattern as the CA 3-day statute watch cron's redline workflow.

**Reasoning:**
- Auto-rollout violates broker-scope posture: an unreviewed revision could change form text that interacts with the rules engine (e.g. a new field, a new disclosure) in ways the engine doesn't yet know to handle. Broker review is the safety gate.
- Pinning in-flight notices to draft-time hash prevents the worst-case scenario where a tenant sees one form during preview and a different form on the final served document.
- Blocking new drafts during the review window is acceptable because the median review time for "did LAHD change form text or just re-save the PDF?" is minutes, not days. The english/spanish Jun-16 case is the first exercise.
- The determination-file pattern mirrors the CA 3-day statute watch — same workflow, same author voice, same broker-sign-off discipline.

**Locked constant:** `RTC_ROLLOUT_POLICY = { brokerGated: true, inFlightPinning: "draft_time_hash", newDraftsBlockedDuringReview: true, acceptanceFilePattern: "la_rtc_form_revision_acceptance_<language>_<YYYY-MM-DD>.md" }`

---

## §3 Authoritative-Source Confirmation — SPLIT

### §3.1 Seven of nine — CONFIRMED authoritative

The following seven URLs and their baseline hashes from §1 of the request packet are **confirmed as the current authoritative LAHD forms**, consistent with the LAHD scope locked in `lahd_filing_prompt_copy_broker_determination_2026-06-18.md`:

| language | Last-Modified | confirmed-authoritative hash |
|---|---|---|
| armenian | 2025-08-07 23:34:01 GMT | `05b83877…1bba20` |
| cantonese (Traditional Chinese) | 2025-08-07 23:34:15 GMT | `71ad943a…3dafc9` |
| farsi | 2025-08-08 23:10:15 GMT | `8d12f5a4…40ee0` (truncated for table) |
| korean | 2025-08-07 23:34:07 GMT | `683dbc62…e248c5` |
| mandarin (Simplified Chinese) | 2025-08-07 23:15:03 GMT | `c74efb9f…c2acd3` |
| russian | 2025-08-07 23:15:10 GMT | `63cc30da…0bef02` |
| tagalog | 2025-08-07 23:14:57 GMT | `0a70e2eb…428c20` |

These hashes become the locked baseline for the §2.3 strict-SHA256 comparison. The full 64-char hashes are in the request packet §1 table and are referenced by hash, not re-transcribed here.

### §3.2 Two of nine — PENDING (english + spanish, Jun-16)

The **english** (`d0653950…beb5f7a`) and **spanish** (`947885d0…45d8371`) versions with Last-Modified `2026-06-16 21:03:44/55 GMT` are **NOT yet confirmed authoritative.** They are the most consequential pair (english + spanish carry the bulk of LA tenant volume) and they moved three days before this packet for reasons LAHD has not published.

Verification required before confirmation:

1. **Broker downloads both Jun-16 PDFs** from the URLs in `RTC_FORM_URLS`.
2. **Broker visually compares** each against the prior Aug-2025 version (which I have local copies of from the LAHD scope work in `lahd_filing_prompt_copy_broker_determination_2026-06-18.md`).
3. **Broker authors** `la_rtc_form_revision_acceptance_english_2026-06-XX.md` and `la_rtc_form_revision_acceptance_spanish_2026-06-XX.md` per the §2.5 acceptance pattern, recording: prior hash, new hash, diff summary (substantive vs. metadata-only), accept/reject, sign-off.

Until those two acceptance files exist:

- **`RTC_FORM_BASELINE_HASHES`** for english + spanish **stays pinned to the Aug-2025 versions.** Build does NOT update the english/spanish baseline to the Jun-16 hashes yet.
- LA notices continue to serve the **Aug-2025 english/spanish PDFs** (build keeps local copies). The Jun-16 versions are downloaded but staged, not served.
- The §2.5 broker-gated-rollout flow is the path for the two Jun-16 versions to become served — it does not auto-trigger from §2.3 strict-SHA256 because the comparison baseline for english/spanish is "pre-Jun-16," meaning the §2.5 flow is *already in flight* for those two languages as of this ruling.

### §3.3 Note on filename ↔ language keys

Build flagged that `cantonese → …Traditional-Chinese.pdf` and `mandarin → …Simplified-Chinese.pdf`. **The current mapping is correct and stays.** Cantonese speakers read Traditional Chinese script (Hong Kong / Taiwan); Mandarin speakers (PRC) read Simplified. The spoken-language key to written-script filename mapping reflects the actual reading audience and is sound. No change.

---

## §4 W4-Partial Status & Step (e) Gate

**W4 partial = closed for §2.1, §2.2, §2.3.** Those three are the interface-determining set per step-(e) sequencing §2.4.

**However, step (e) does NOT open immediately.** The dark-mode scaffold's first act will be to consume `RTC_FORM_BASELINE_HASHES`. Until the english/spanish verification in §3.2 closes (broker download + visual diff + two acceptance determinations), the baseline is in a transitional state (7 Aug-2025 hashes + 2 Aug-2025 hashes pinned pending Jun-16 review). Opening (e) against a transitional baseline is the same rework risk that §3.2 of the sequencing ruling warned against.

**Revised gate to open (e):**

1. ✅ §2.1 cadence ruled
2. ✅ §2.2 failure handling ruled
3. ✅ §2.3 hash threshold ruled
4. ⏳ **§3.2 english + spanish acceptance determinations authored** (one per language) — broker work, this week
5. Then (e) opens

The acceptance determinations are short — visual diff, accept-or-reject, sign-off. Median effort: 30 min per language assuming Adobe Acrobat side-by-side comparison. Likely outcome (educated guess, not a ruling): metadata-only re-save with no substantive text change, because the seven other languages from the same release window didn't move. If substantive text changed, the rules engine implications require their own determination before acceptance.

---

## §5 Locked Constants (summary, machine-readable)

```ts
RTC_REFRESH_CADENCE = { weekly: "Mon 06:00 PT", on_deploy: true }
RTC_FAILURE_POLICY = {
  serveStaleCached: false,
  perLanguageIsolation: true,
  alertChannels: ["in_app", "email"],
  failureDefinition: [
    "http_non_200",
    "content_type_not_pdf",
    "zero_bytes",
    "content_length_mismatch",
    "timeout_gt_30s",
    "any_redirect"
  ]
}
RTC_HASH_THRESHOLD = "strict_sha256"
RTC_VERSION_RECORD_FIELDS = ["rtcFormHashes", "rtcFormLastModified", "rtcRefreshRunAt"]
RTC_ROLLOUT_POLICY = {
  brokerGated: true,
  inFlightPinning: "draft_time_hash",
  newDraftsBlockedDuringReview: true,
  acceptanceFilePattern: "la_rtc_form_revision_acceptance_<language>_<YYYY-MM-DD>.md"
}
RTC_FORM_BASELINE_HASHES = {
  // 7 confirmed authoritative per §3.1
  armenian: "05b83877d97221bf3b98a4bbbaeb29235f870cef2fe3378885f991f5b51bba20",
  cantonese: "71ad943a24f1a6c49aa64c4db973b0262b92cafaa12743c9e8c5d86a1b3dafc9",
  farsi:    "8d12f5a4e3bdaa60807d61d94181b8db9c6280f29f349c81b329dfdce9140ee0",
  korean:   "683dbc620035d6458dc762cba776b36afd47b1f81a8eefe8a336194256e248c5",
  mandarin: "c74efb9f64771fb059e6186f8d6f150df6cf1c8b834fe3a1eaacb76199c2acd3",
  russian:  "63cc30da901b64e3c8e7a8169b38db7786dea7f5bb6a6799d8bfbdf2750bef02",
  tagalog:  "0a70e2eb4cb863f034ddf3723b05a82f152c3172453e1169ec6c18b566428c20",
  // 2 pending §3.2 verification — pinned to Aug-2025 versions until acceptance files land
  // english / spanish baselines remain whatever build has staged from prior LAHD scope work
  // (NOT the Jun-16 hashes shown in the drift report)
}
```

---

## §6 Build-Side Checklist

- [MUST FIX] Pin english + spanish baseline hashes to the Aug-2025 versions build already has staged from `lahd_filing_prompt_copy_broker_determination_2026-06-18.md`. Do NOT promote the Jun-16 hashes from the drift report into the baseline.
- [MUST FIX] Stage the Jun-16 english + spanish PDFs into `docs/compliance/rtc_pending_review/` for broker download. Do not serve them.
- [MUST FIX] Hold step (e) until broker authors the two `la_rtc_form_revision_acceptance_<language>_2026-06-XX.md` files.
- [MUST FIX] When (e) opens, lock the §5 constants into the engine as the first commit (constants before logic).
- [SHOULD FIX] Confirm the per-language gate function signature is `isLaProductionUnblocked({language})` (not LA-wide) so §2.2(b) per-language isolation is enforced at the type level.
- [SHOULD FIX] The §2.4 `rtcFormVersionRecord` schema migration should be its own PR before (e)'s second commit, so the stub-to-real swap is clean.
- [CONSIDER] Per-language alert routing — if english fails, the alert should make clear "english-only block" so the broker doesn't think LA-wide is down. Title format in §2.2 handles this; verify alert templates match.

---

## §7 Sign-Off

The drift report did its job — finding the english/spanish Jun-16 move is exactly why this workstream exists. Ruling all five sub-rulings on the merits (rather than deferring §2.4 and §2.5) because the deferrable ones are deferrable in *opening (e)*, not in defining the policy. Build will hit the §2.4/§2.5 boundaries within the first scaffold commits and would have to come back for rulings anyway; cleaner to land them now.

(e) waits for the two english/spanish acceptance determinations. Those are broker work, scheduled for this week. After that, (e) opens against a stable baseline.

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE **B9445457** / Broker Compliance Review · 2026-06-19

---

*Broker-scope only under Bus. & Prof. Code § 10131(b). No attorney engagement. This determination is broker compliance work product, not legal advice.*
