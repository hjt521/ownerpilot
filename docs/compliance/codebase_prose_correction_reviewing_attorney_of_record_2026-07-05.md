# Codebase Prose Correction — "Reviewing Attorney of Record" Attribution

**Date:** 2026-07-05
**From:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review
**To:** Claude Code (engineering) — codebase-surface correction
**Re:** `lib/dates/holidays.ts` and `lib/flow/templateVersion.ts` reference a `verifiedBy` field with the string "reviewing attorney of record (name + State Bar number)" — conflicts with the broker-only / no-SBN attribution posture and with the "Signer of record" rename from the packet ruling
**Companion rulings:**
- [`persona_correction_ud_filing_pro_per_authority_2026-07-05.md`](persona_correction_ud_filing_pro_per_authority_2026-07-05.md) — persona output surface
- [`packet_prose_correction_ud_filing_pro_per_authority_2026-07-05.md`](packet_prose_correction_ud_filing_pro_per_authority_2026-07-05.md) — delivered-document surface
- [`omnibus_broker_ruling_2026-07-04.md`](omnibus_broker_ruling_2026-07-04.md) — governing attribution rule

**Priority:** MEDIUM — codebase strings are not user-facing until rendered downstream, but they seed defective attribution into any downstream renderer that consumes them (verification badges, audit records, template metadata footers). Correct in the next codebase touchpoint; do not wait for a batch window if either file is being edited for other reasons.

---

## The defect

Claude Code flagged during Correction 2 execution:

> "lib/dates/holidays.ts and lib/flow/templateVersion.ts reference a verifiedBy 'reviewing attorney of record(name + State Bar number)' — that phrasing conflicts with the broker-only / no-SBN attribution posture and the packet ruling's 'Signer of record' rename."

**The defect is twofold:**

1. **"Reviewing attorney of record"** is inconsistent with the standing broker-only attribution posture. There is no attorney of record on OwnerPilot's compliance artifacts. Verification is performed by the broker under Cal. Bus. & Prof. Code § 10131(b), CalDRE B9445457.
2. **"State Bar number"** is inconsistent with the standing no-SBN attribution rule. Broker attribution uses the CalDRE license number, not any State Bar identifier. Any SBN placeholder in the codebase invites downstream renderers or reviewers to fill it in with an attorney's SBN, which is exactly the wrong attribution.

Both files are compile-time constants or type/interface strings that feed downstream rendering surfaces — verified.by badges, audit-log entries, template version metadata. Correcting at the source stops the defect from propagating.

---

## The correction — replacement string

Replace **every occurrence** across the codebase (start with `lib/dates/holidays.ts` and `lib/flow/templateVersion.ts` per Claude's flag, then grep the full repo for the same phrasing):

**Remove:** `reviewing attorney of record (name + State Bar number)`

**Insert:** `broker of record (Jack Taglyan / CalDRE B9445457)`

If the surrounding context needs a longer form for a rendered attribution footer (e.g., a verification badge with more surface area), the canonical long form remains the standing signature block:

> `Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · <verified-on date>`

Do not introduce a new attribution shape; reuse the standing block.

---

## Full-repo sweep discipline

Because this class of defect (attorney/SBN attribution) has now shown up in three surfaces (persona output → packet prose → codebase strings), a repo-wide sweep is prudent to catch any remaining instances before they surface in a fourth. Grep patterns to run (case-insensitive):

```
attorney of record
State Bar number
State Bar No\.
State Bar #
SBN\s+\d
reviewing attorney
attorney review
attorney sign(off|-off| off)
attorney must
attorney is required
```

For each hit, apply the same disposition:

- **String constant / interface / type name:** rename to broker-of-record equivalent
- **Rendered UI copy:** replace with broker attribution per this ruling
- **Test fixture:** update to broker attribution (any test asserting attorney attribution is asserting the wrong contract)
- **Comment:** leave in place if the comment is genuinely explaining the defect being avoided (i.e., a "do not add attorney attribution here" guard comment); otherwise remove or update

If a hit is inside form text imported verbatim from LASC / Judicial Council / LAHD source PDFs, leave it — that is government-form text, not OwnerPilot-authored copy, and the disposition is the same as the packet ruling's grep exceptions.

**Time-box the sweep to one Claude session.** If it grows beyond that scope, break it up per file and issue a follow-up ruling with the file list.

---

## Test additions

For each corrected file, add a test that asserts the file does not contain the banned attribution phrases. Run in CI. Reuse the eight banned phrases from the persona ruling **plus** these three attribution-specific additions:

```
"attorney of record"
"State Bar number"
"reviewing attorney"
```

Any codebase file that legitimately needs to reference these phrases (e.g., a test file that asserts they don't appear in production output) should be added to an explicit allowlist so the CI check doesn't false-positive on itself.

---

## Guardrails — reaffirmed

Same six from `omnibus_broker_ruling_2026-07-04`, unchanged. Broker-only attribution. No SBN. Signature block below.

---

## Ratification & signature

This correction is authorized under broker scope (Cal. Bus. & Prof. Code § 10131(b) — landlord-tenant compliance advisory) and adopted for OwnerPilot production.

Ruling reference for Claude Code: **codebase_prose_correction_reviewing_attorney_of_record_2026-07-05**

Signed for the record:

— **Jack Taglyan** / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-05
