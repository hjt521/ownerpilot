# P4 Persona Production Wiring — Broker Ruling

**Date:** 2026-07-04
**From:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review
**To:** Claude Code (engineering)
**Re:** P4 verification pass — five open items on persona production wiring
**Request doc:** Engineering P4 broker ruling request, 2026-07-03

---

## Executive summary

All five items ruled below. Headline decisions:

- **Q1 (CAR RLMM):** Adopt engineer's lean with tightenings. Concept-based lease literacy in OwnerPilot's own words. Landlords upload their own leases; OwnerPilot operates on the user's copy under first-sale / fair-use / agent-authorization framework. **No CAR licensing agreement required.**
- **Q2 (Transcript retention doc):** Attach for verification — but out of P4 scope for blocking. Proceed with P4; reconcile transcript retention as a parallel lane.
- **Q3 (Runtime banned-term enforcement):** **Build the runtime output gate.** CI-only is insufficient for a compliance product.
- **Q4 (Classifier / rate-limit wiring in /api/chat):** **Wire into /api/chat.** Chat surface has the same abuse/compliance exposure as geocode; parity is required.
- **Q5 (System-prompt locking form):** **Keep the dedicated guard.** Byte-fidelity equivalent, no security gain to moving into the manifest.

Full reasoning and implementation notes below.

---

## Q1 — CAR RLMM lease facts: source + IP question

### Ruling

**ADOPT engineer's lean, with three tightenings.**

The persona is taught **landlord-tenant lease concepts in OwnerPilot's own words** — never CAR's form section text, paragraph numbers, headings, or clause structure. The persona is lease-**literate** (concepts, statute, doctrine), not CAR-**literate** (form-specific expression).

Product framing: **"OwnerPilot works with your existing lease."** Landlords upload the lease they already have — CAR RLMM, LawDepot, eForms, custom attorney draft, handwritten — and the persona reads it, extracts facts, and maps to notice/packet fields.

### Legal basis (no CAR license required)

Three doctrines converge to authorize this without any CAR agreement:

**1. First-sale doctrine (17 U.S.C. § 109).** Once CAR delivers an executed lease copy to the landlord through their licensee channel (zipForm/Transactions), that specific copy belongs to the landlord. The landlord can read it, store it, hand it to their attorney, upload it to property-management software — all without CAR's permission. Reference: [17 U.S.C. § 109 — Limitations on exclusive rights: Effect of transfer of particular copy](https://www.copyright.gov/title17/92chap1.html#109).

**2. Agent authorization via ToS.** OwnerPilot Terms of Service will include a user representation that they own or have rights to documents they upload, and a limited license grant to OwnerPilot to process those documents on the user's behalf. OwnerPilot operates as the landlord's tool — legally equivalent to a paralegal reading the lease and typing facts into a spreadsheet.

**3. Facts are not copyrightable (Feist doctrine).** [Feist Publications v. Rural Telephone Service Co., 499 U.S. 340 (1991)](https://supreme.justia.com/cases/federal/us/499/340/) established that facts themselves cannot be copyrighted — only the creative expression of them. "Rent = $3,000" is a fact and freely usable. "Tenant agrees to pay Landlord as rent for the Premises the sum of $3,000" is CAR's copyrighted expression and must not be reproduced.

**What CAR actually licenses** (via [zipForm/Transactions terms](https://www.car.org/tools/zipformplus)): generating new CAR forms, redistributing CAR forms, and creating derivative works that replicate CAR's form structure. None of those are what OwnerPilot does under this ruling.

**Precedent — every California property-management platform operates on this model without a CAR license:** Buildium, AppFolio, Rentec Direct, DoorLoop, TurboTenant, and every eviction attorney's practice-management software all read whatever lease the client uploads and extract data. Same first-sale / fair-use / agent-authorization framework.

### Tightenings (all three MUST ship with P4)

**Tightening 1 — Concept vocabulary, OwnerPilot's own words.**
The persona reference context describes lease concepts in OwnerPilot-authored prose. Approved concept map (extend as needed):

- Rent amount, due date, grace period, late-fee mechanics (with Orozco v. Casimiro reasonableness reference)
- Fixed-term vs. month-to-month, holdover, automatic conversion clauses
- Security deposit rules (Cal. Civ. Code § 1950.5)
- Parties (landlord entity vs. natural person, tenant list, occupant vs. tenant distinction)
- Premises legal description (unit + street + city + state + zip, APN when known)
- Notice address / service address (Cal. Civ. Code § 1962 disclosure requirement)
- Utilities, pets, smoking, alterations — as legal concepts and lease-configurable terms
- Signature block requirements, entity signer authority (LLC managing member, corporate officer, trustee)
- Late-charge enforceability doctrine (reasonableness of liquidated damages)

**None of this prose may quote, paraphrase-with-attribution, or structurally mirror CAR form language.** If the concept description reads like a CAR paragraph, rewrite it. When in doubt, express the concept in terms of the underlying California statute or common-law doctrine.

**Tightening 2 — No verbatim echo of CAR prose in persona output.**
When a user uploads a CAR-branded lease, the persona reads and extracts facts, but must not echo CAR's clause language verbatim in its responses. Paraphrase to landlord-tenant concepts. If quoting a lease clause is unavoidable for the user's question, quote the minimum necessary and frame it as "your lease at [approximate location] says [minimal quote] — the effect of that under California law is [OwnerPilot analysis]."

**Tightening 3 — Runtime banned-term entries for CAR form identifiers.**
Add to the runtime banned-term allowlist (see Q3): "RLMM", "C.A.R. Form", "CAR Form", "C.A.R.", paragraph-number patterns like `¶ 3B(1)`, `Paragraph 3B`, "Copyright © California Association of REALTORS", and any CAR form code (LR, MTM, PAA, NBP, etc.). Runtime output that would emit these strings is scrubbed or blocked before returning to the user.

Rationale: Tightening 3 is the technical wall between "we read your lease" (fine) and "we reproduced CAR's copyrighted expression" (lawsuit). See Q3 for the enforcement mechanism.

### On the missing lease examination doc

The referenced file `5537LaMirada-202-CliftonAlexander_lease_examination_and_ud_field_mapping_broker_ruling_2026-07-03.md` is a workspace artifact from a specific tenant matter, not a persona training source. **It is out of scope for persona reference context.** Under the concept-based framing, the persona does not need Clifton-specific extractions — it builds the concept map from statute and doctrine, then applies concepts to whatever lease the user uploads at runtime.

Engineering: **do not attempt to import that doc into the persona.** If Claude needs it for a different lane, request it separately with clear scope.

### ToS language to add (product/legal task, ships alongside P4)

Add to OwnerPilot Terms of Service, User Content section:

> "You represent that you own or have all necessary rights and permissions to upload documents (including leases, notices, and correspondence) to OwnerPilot. By uploading, you grant OwnerPilot a limited, non-exclusive, revocable license to store, read, analyze, and process those documents on your behalf for the purpose of providing the service. OwnerPilot does not claim ownership of your uploaded documents and does not redistribute them to third parties except as directed by you."

This is standard SaaS document-processing boilerplate. Not a P4-blocking item, but MUST ship before public launch.

---

## Q2 — Transcript retention doc

### Ruling

**ATTACH for verification, but OUT OF P4 SCOPE for blocking.**

P4 proceeds without waiting on the transcript retention doc. Transcript retention is a persistence-layer decision (Lane 2 territory), not a persona wiring decision. Persona operates on the message it receives; whether that message is later retained is orthogonal to persona correctness.

**Action for engineering:** Note in the P4 attestation that transcript retention was flagged as an open reconcile-item and is being handled in a parallel lane. When Claude Code has bandwidth after 042 clears, retrieve `schema_and_persistence_lane2_transcript_retention_decision_2026-06-29.md` from wherever the current Lane 2 workspace holds it and reconcile against as-built persistence behavior. Report drift as a separate ruling request.

**Action for broker (me):** I'll add this to the 07-10 countersign queue under a new Section 9 (P4 follow-ups) so we address transcript retention formally when we reconvene.

---

## Q3 — Runtime banned-term enforcement

### Ruling

**BUILD the runtime output gate.**

CI-only enforcement is insufficient for a compliance product. Here's why:

**What CI catches:** Committed prose in the repo. System prompts, template text, marketing copy, documentation. Static, reviewable, gated by PR.

**What CI does NOT catch:** Model output generated at inference time. The persona is an LLM — it can generate any string, including strings that would fail CI if they'd been committed. A user prompt like "quote the exact rent clause from my lease" could induce the model to echo CAR's copyrighted expression verbatim, and CI has no visibility into that.

For a compliance product where the wall between fair use and copyright infringement runs through model output, **runtime scrubbing is table stakes.**

### Implementation spec

**Gate location:** In `/api/chat`, between the model response and the return to the client. All response text passes through the gate before it leaves the server.

**Banned-term source of truth:** The existing banned-term allowlist (extend with CAR form identifiers per Q1 Tightening 3, and any additional entries broker adds later). Single source used by both CI and runtime.

**Enforcement action per term (configurable per entry):**
- **BLOCK** — response is discarded; return a safe fallback ("I can't share that specific language — let me describe the concept instead") and log the block event for broker review.
- **SCRUB** — offending substring is redacted (`[redacted]`) and the redacted response is returned. Use for term categories where the surrounding response is still valuable (e.g., a stray CAR paragraph number in an otherwise-fine analysis).
- **LOG-ONLY** — response passes through unchanged, but the event is logged for broker review. Use during initial rollout for entries where you're calibrating false-positive rate.

**Default action for CAR form identifiers per Q1 Tightening 3:** SCRUB. The persona's substantive analysis is usually correct; we just don't want CAR's specific expressions to leak into the output.

**Default action for existing banned-term entries (attorney/legal-advice language, etc.):** Keep whatever the CI guard treats them as. If CI blocks, runtime blocks.

**Logging:** Every runtime gate action writes to the audit sink with: timestamp, session ID (if available), user ID (if authenticated), gate action (BLOCK/SCRUB/LOG-ONLY), matched term, redacted excerpt (first 200 chars of offending output with the matched term highlighted), and full-response hash. Do NOT log full response text — that could itself contain PII or compliance-sensitive content.

**Broker review surface:** Aggregate runtime gate events into the existing broker review queue (or a new sub-queue if volume warrants). Weekly digest of BLOCK/SCRUB events; drill-down for LOG-ONLY calibration.

**Performance budget:** Gate latency < 50ms p95 on typical response sizes (~2KB). Regex-based match against the compiled allowlist should be well under that. If perf becomes an issue, benchmark and report — but I expect this to be a non-issue.

**Failure mode:** If the gate service fails or errors, **fail closed** (return the safe fallback, log the failure). Never fail open and return unscrubbed output — that defeats the purpose.

### Testing requirements

Before P4 attestation:

1. Unit tests for each enforcement action (BLOCK / SCRUB / LOG-ONLY) against known offending strings
2. Integration test that exercises the full `/api/chat` path with an induced offending model output (mock the model to return a string containing "C.A.R. Form RLMM ¶ 3B(1)"), verify SCRUB action, verify log entry
3. Negative test: benign response with no banned terms passes through unchanged
4. Failure-mode test: gate service returns error → safe fallback returned, no unscrubbed leak

### Attestation section required

P4 attestation must include a Q3 section documenting: gate implementation location, banned-term source used, default actions per category, log destination, test evidence links, perf measurement.

---

## Q4 — Classifier / rate-limit wiring in /api/chat

### Ruling

**WIRE into /api/chat.**

The chat surface has the same abuse and compliance exposure as geocode — arguably more, because chat is the primary public entrypoint and has broader query surface. H1 classifier and rate-limit exist as modules; not wiring them into the primary user-facing chat route is a gap, not a design choice.

### Scope

**H1 classifier:** Wire into `/api/chat` as pre-model middleware. Every incoming user message runs through the classifier before it reaches the persona. Classification result (category + confidence) is:
- Attached to the request context for downstream use (audit sink, routing decisions)
- Optionally used to reject or route certain categories (spam, prompt injection attempts, off-topic) per existing classifier ruling

Default behavior on classification: **log and pass through** during initial rollout. Do not add routing/rejection logic in P4 — that's a separate calibration exercise. Just get the classifier invoked and its output logged.

**Rate-limit:** Wire into `/api/chat` using the same rate-limit store already in use for geocode. Per-IP and per-authenticated-user buckets. Recommended starting limits:
- Anonymous / unauthenticated: 10 messages / 60 seconds, 100 messages / 24 hours
- Authenticated landlord: 60 messages / 60 seconds, 1000 messages / 24 hours

These are starting values — calibrate on real traffic and revise via ruling if either is too tight or too loose.

**Rate-limit failure mode:** Return HTTP 429 with a friendly message ("You're sending messages faster than we can respond — give it a minute"). Log every 429 to the audit sink for broker review.

### Attestation section required

P4 attestation must include a Q4 section documenting: classifier invocation location, classification log destination, rate-limit invocation location, per-bucket limits, 429 response behavior, test evidence links.

---

## Q5 — System-prompt locking form

### Ruling

**KEEP the dedicated `system-prompt-lock` guard.**

Byte-fidelity is byte-fidelity — a dedicated SHA-256 guard on an inline const provides equivalent lock strength to embedding the prompt in the locked-prose manifest. Moving a 6.3KB prompt into the manifest is churn with no security gain and non-trivial risk:

- Manifest schema was recently amended (per `locked_prose_manifest_schema_reconciliation_broker_ruling_2026-06-29.md`)
- Manifest is optimized for many-small-strings; a single 6.3KB blob is an outlier
- Every future manifest schema change would need to preserve the persona prompt correctly
- Rollback of a bad manifest change could inadvertently unlock the persona prompt

The dedicated guard is single-purpose, small, and easy to audit. Keep it.

### Consistency housekeeping

Update the P4 order text (wherever it says "from locked-prose manifest") to reflect as-built: **"system prompt is byte-locked via the dedicated `system-prompt-lock` guard (SHA-256 verified at build, matches inline const)."** This is not a code change — it's a documentation reconcile so future engineers don't get confused by the drift.

### Attestation section required

P4 attestation must include a Q5 section documenting: current lock mechanism (dedicated guard), SHA-256 of locked prompt, guard test coverage, verification that the inline const matches the guard's expected hash.

---

## Summary of engineering deliverables for P4 close-out

Claude Code must produce, in the P4 attestation packet:

1. **Q1 concept vocabulary** — persona reference context authored in OwnerPilot's own words, no CAR verbatim/structure. Include the full concept map (see Q1 Tightening 1 list, extend as engineering deems appropriate). Broker will countersign the vocabulary before P4 attests.
2. **Q1 CAR banned-term entries** — added to runtime allowlist (RLMM, C.A.R. Form, CAR Form, paragraph-number patterns, form codes)
3. **Q2 note** — flag transcript retention as parallel-lane follow-up, no P4 block
4. **Q3 runtime output gate** — implemented per spec above, all four test categories passing, attestation section written
5. **Q4 classifier + rate-limit wiring** — both invoked in `/api/chat`, logs going to audit sink, attestation section written
6. **Q5 no code change** — documentation reconcile in the P4 order text, attestation section documents the as-built guard

**ToS language (Q1 legal footing)** — draft in a follow-up task, does not block P4 attestation but MUST ship before public launch.

---

## Ratification & signature

This ruling is authorized under broker scope (Cal. Bus. & Prof. Code § 10131(b) — landlord-tenant compliance advisory) and adopted for OwnerPilot production.

Ruling reference for Claude Code: **p4_persona_production_wiring_broker_ruling_2026-07-04**

Signed for the record:

— **Jack Taglyan** / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-04
