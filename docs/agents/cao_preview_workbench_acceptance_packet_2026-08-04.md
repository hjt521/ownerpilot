# OwnerPilot CAO Preview Workbench — Founder Acceptance Packet

**Status:** NONCANONICAL — ADVISORY — DRAFT-ONLY — HUMAN REVIEW REQUIRED  
**Implementation authority:** None until PR review and merge authorization  
**Production authority:** None  
**Date:** 2026-08-04  
**PR:** #340 — `feat(agents): complete restricted CAO Preview workbench`

## 1. Objective

Complete the restricted Chief Architecture Officer Preview capability as an OwnerPilot-native architecture workbench that can analyze approved repository evidence, prepare implementation-grade advisory plans, preserve uncertainty and dissent, and export bounded reports without becoming a repository writer, deployment operator, persistence service, or Production authority.

## 2. Verified platform

- OwnerPilot Next.js application on Vercel.
- Next.js 16.2.6.
- Vercel AI SDK 6.0.239-compatible dependency range.
- Vercel AI Gateway adapter.
- Provider: `openai`.
- Pinned model: `openai/gpt-5.6-terra`.
- Adapter: `vercel-ai-gateway-v1`.
- Exact Preview-only gate: `VERCEL_ENV === "preview"`.
- Default-off feature flag: `EXECUTIVE_AGENTS_PREVIEW_ENABLED === "true"`.
- Supabase-authenticated administrator access.
- Server-side `ADMIN_EMAILS` allowlist.
- Dedicated `OwnerPilot Preview Auth` Supabase project.
- No tools, persistence, fallback, provider substitution, automatic retry, automatic continuation, or Production eligibility.

No credential value is recorded in this packet.

## 3. Completion architecture

The selected design is server-controlled read-only evidence collection with browser-controlled assignment fields and browser-only export.

### Evidence boundary

- Fixed repository: `hjt521/ownerpilot`.
- Server-owned evidence-scope registry.
- Immutable source commit per approved scope.
- No arbitrary repository or path selection in the browser.
- No GitHub token or repository-write permission.
- Text-only formats.
- File-count, per-file-byte, and total-byte limits.
- SHA-256 per available file.
- Immutable evidence references.
- Explicit truncation and unavailable-evidence status.
- Secret, credential, environment, key, dump, build-output, dependency-output, unrestricted-log, and Production-export path rejection.

### Work-product handling

- No server persistence.
- No Supabase schema or RLS change.
- No GitHub draft commit by the CAO.
- Validated report may be exported by the human as Markdown or JSON.
- Human disposition exists only in local browser state and export data.

## 4. Implemented workbench input

The internal surface supports:

- `architecture_analysis`;
- `evaluation_only`;
- concise objective;
- approved evidence scope;
- immutable source commit;
- constraints;
- known decisions;
- unresolved questions;
- exact Founder approval reference;
- requested output type;
- explicit human initiation;
- explicit nonsensitive-content confirmation.

No new task class was activated.

## 5. Implemented output contract

The CAO-specific validator defines the required architecture-workbench structure:

1. Status and authority labels
2. Executive summary
3. Objective
4. Evidence reviewed
5. Source commit and evidence limitations
6. Current-state findings
7. Target-state interpretation
8. Architecture options
9. Tradeoffs
10. Recommended architecture
11. Security and authority boundaries
12. Dependencies
13. File-level implementation map
14. Test strategy
15. Rollout plan
16. Rollback plan
17. Risks
18. Unknowns
19. Dissent or competing interpretation
20. Founder decisions required
21. Engineering handoff
22. Explicit prohibition on autonomous continuation

Recommendation confidence remains separate from recommendation quality. No composite numeric score controls the recommendation, and critical failures cannot be averaged away.

## 6. Internal review surface

The Preview page now provides:

- visible authority labels;
- approved evidence-scope display;
- exact immutable source commit;
- bounded assignment fields;
- application-generated progress text;
- validated final output only;
- evidence manifest with file hashes and truncation status;
- unknowns and dissent display;
- local-only human disposition;
- Markdown export;
- JSON export;
- no implementation, deployment, model-selection, tool, continuation, or Production buttons.

## 7. Deterministic verification

Implemented or inherited deterministic coverage includes:

- exact Preview gate and Production concealment;
- authenticated admin requirement;
- missing/non-allowlisted session concealment through `currentAdmin()`;
- unapproved task rejection;
- missing or stale Founder approval reference rejection;
- source-commit mismatch rejection;
- unapproved scope and arbitrary-path rejection;
- secret-path and unsupported-file-type rejection;
- file-count and byte limits;
- unavailable and truncated evidence handling;
- malformed structured output rejection;
- missing required output-field rejection;
- invalid evidence-reference rejection;
- provider timeout, authentication, rate-limit, and general failure classification;
- zero retry;
- zero fallback;
- zero provider substitution;
- sanitized error response;
- no raw partial-output release;
- no repository write;
- no deployment;
- no persistence expansion;
- no autonomous continuation;
- browser-controlled Markdown and JSON export;
- unchanged Production eligibility.

## 8. Preview deployment evidence

Latest audited Preview deployment at packet authoring:

- Branch: `feat/complete-cao-preview-workbench`
- Commit: `3095b529c5c8cb32feb3f9e3bd4cf74fd54d2949`
- Vercel deployment ID: `dpl_DD2DKSGxssZAX62xW4s2z5PWFw7j`
- Deployment state: `READY`
- Unauthenticated workbench request: concealed `404`
- Cache posture: private, no-cache, no-store
- Indexing posture: noindex

## 9. Live acceptance assignment

Authorized assignment:

> Analyze the OwnerPilot Enterprise AI Workforce recovery package and Founder intent. Produce an architecture recommendation for completing the CAO, designing the future Repository Developer Operator, and sequencing the enterprise-agent program without activating any new role.

Approved evidence scope: `enterprise_workforce_recovery` at immutable PR #338 commit `b4d183573352a3fed2c072dab9fffbfaf3c21eab`.

**Founder-authenticated live execution:** PENDING.  
**Validated report export:** PENDING.  
**Observed provider latency and usage:** PENDING.  
**Founder disposition:** PENDING.

No acceptance result may be inferred from deployment readiness or deterministic tests alone.

## 10. Rollback

Rollback is a repository revert of PR #340. No database, RLS, stored artifact, migration, model registry, or Production-data rollback is required.

Preview can also be disabled independently through the existing Preview-only feature flag without changing Production.

## 11. Residual gaps

- Live Founder-authenticated acceptance assignment remains pending.
- The CAO remains limited to one approved repository evidence scope.
- Evidence retrieval depends on bounded unauthenticated GitHub raw reads; unavailable evidence fails closed.
- No server-side report history exists by design.
- Human disposition is not persisted by design.
- The Repository Developer Operator remains proposed, unchartered, tool-free, and unauthorized.
- PR #338 remains Draft and noncanonical.
- The CAO cannot independently ratify, merge, implement, deploy, activate roles, change models, or continue.

## 12. Readiness recommendation

The CAO workbench should be considered **implementation-complete but acceptance-pending** only after all CI checks are green on the final head.

Readiness to begin design of the Repository Developer Operator requires a separate Founder decision after:

1. successful Founder-authenticated live acceptance;
2. review of the exported CAO report;
3. explicit acceptance or revision disposition;
4. confirmation that the operator remains separately chartered and receives no authority by implication.

## 13. Required Founder decision

After the live assignment, the Founder must choose one:

- accept the CAO Preview workbench;
- accept with revisions;
- request revision;
- reject and revert.

No automatic continuation follows any disposition.
