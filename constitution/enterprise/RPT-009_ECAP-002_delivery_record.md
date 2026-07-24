---
constitutional_id: RPT-009
object_type: report
title: ECAP-002 Document Generation — PROC-100 Delivery Record
status: Operational
version: 1.0
canonical_owner: Enterprise
governing_authority: EA-100
ratification_authority: Founder
lifecycle_state: Operational
created: 2026-07-24
updated: 2026-07-24
depends_on: [ECAP-002, PROC-100, EA-100]
required_by: []
implements: [PROC-100]
governed_by: [EA-100]
validated_by: [CBS-001, CA-001]
supersedes: []
superseded_by: []
related_artifacts: [ECAP-002, RPT-006]
registry_tags: [delivery-record, ecap-002, document-generation]
program_phase: enterprise-delivery
repository_path: constitution/enterprise/RPT-009_ECAP-002_delivery_record.md
checksum_scope: file
---

# RPT-009 — ECAP-002 Document Generation · PROC-100 Delivery Record

Completes ECAP-002 through PROC-100. **Honest outcome: no code change** — the capability's constitutional stakes (locked-prose/CAR-copyright integrity, broker-only attribution, banned-term avoidance) are already enforced by dedicated, passing CI guards. Delivery is stages 6/8/9/10 (validation + release). No change was made to the notice/produce path days before the FF-3 flip.

## Implementing artifacts (real)
`lib/documents` (clauses, smClauses, pdf, DocumentRender), `lib/produce` (renderNotice, buildNoticeHtml, buildPacketHtml, laProduce{Client,Server,Gate}, lahdCoverSheet, packet{Copy,Manifest,Qr,Verification}, artifactFilename…), `lib/compliance/lockedProse.ts`, `lib/filing` (efsRecord, lateFiling, lateFilingGate). Routes: `app/api/documents/[id]`, `app/api/notices/[riskpathId]`, `app/notice/3-day`.

## Stages 1–5 (satisfied by existing implementation)
Notice/document production from reviewed intake → clause registry + locked-prose blocks → HTML → PDF/packet (manifest, QR, verification). All owner-facing legal expression is **original OwnerPilot IP** (never CAR forms); attribution is **broker-only** (CalDRE B9445457; never attorney/SBN). The produce path is gated (produce-gate chain, counsel hard-stop lives in the produce route).

## Stage 6 — Security / IP Review (executed 2026-07-24, guard-based)
The IP-critical invariants are enforced by CI guards, all **run green now**:
- **Locked-prose integrity** — `ci:verify-locked-prose` (+ `verify_locked_prose.test.mjs`, 7/7): SHA-256 manifest over locked blocks; drift, missing export, dangling `// Source:`, and shape-B schema contamination all **fail** the build. The CAR-copyright / verbatim-expression wall. **PASS.**
- **Broker-only attribution** — `ci:check-attorney-attribution`: **OK — no attorney/SBN attribution in production source.** Matches CLAUDE.md (broker credential above the fold; attorney/SBN never on public/marketing surfaces). **PASS.**
- **Banned terms** — `ci:verify-banned-terms`: **OK — no banned terms in owner-facing copy** (legal-advice / CAR-copyright language wall), complemented at runtime by `runtimeBannedTermGate` (fail-closed on model output). **PASS.**
- These guards are wired as `ci:*` scripts (branch-protected CI), so the invariants are continuously enforced, not point-in-time.

## Stage 8 — Testing
Extensive `lib/produce` coverage (renderNotice, buildPacketHtml, laProduce{Client,Server,Gate}, lahdCoverSheet, packetCopy, noticePdfFilename, laPacketDelivery…) + the locked-prose guard's own test. Adequate.

## Stage 9 — Constitutional Validation
`cbs check` green; ECAP-002 metadata current; registered in `capability_index.json`. CA-001 evidence = this record + the three passing IP guards.

## Stage 10 — Release (under governance)
ECAP-002 `operational_maturity: operational`, `delivery_stage: released`. No code change. Governed by EA-100 / registered in REG-CAP-001.

## Deferred observation (ops queue — no code change here)
Like ECAP-001, the produce/PDF path's failure exits could be routed to central monitoring (`captureException`) for availability observability. **Deferred until after the ~2026-07-28 FF-3 flip** — the produce path is flip-adjacent and IP-sensitive; monitoring is additive but not worth touching this path pre-flip. Evidence/IP integrity is not affected.

## Outcome
**ECAP-002 is delivered through PROC-100** — IP guards verified green, tested, validated, released — with **no code change**. Wave-1: ECAP-001 ✅ · ECAP-010 ✅ · ECAP-002 ✅. Remaining: ECAP-003 Serve & Track.
