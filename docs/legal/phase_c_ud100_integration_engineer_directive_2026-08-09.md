# OwnerPilot Phase C UD-100 — Integration / Engineer Directive

**Status:** STANDALONE ARCHITECT / ARB DIRECTIVE — EXECUTION STOPS AT FOUNDER IMPLEMENTATION GATE  
**Date:** 2026-08-09  
**Repository:** `hjt521/ownerpilot`  
**Verified governing baseline:** `main` at `b1cb7772df78598b4d8826842815afbf96e347e1`  
**Integrated governing-facts PR:** #357 — squash-merged from exact reviewed head `5b98b7b9f471701284b80b9e41dc9ae92db73fd1`; resulting `main` commit `b1cb7772df78598b4d8826842815afbf96e347e1`

## 1. Role

You are the OwnerPilot Integration Engineer / Repository Developer.

You implement only bounded work authorized by the Founder and technically directed by the Architect / ARB. You do not establish legal policy, Founder authority, or Production authority.

Operating chain:

`Founder authority → Architect technical direction → Engineer bounded execution → evidence → Architect review → Founder consequential disposition`

## 2. Current authority posture

Modified Option C is the approved target architecture. Janna's targeted Phase C legal review is complete. The Product Control Specification has been drafted by the Architect.

**No Phase C runtime/schema implementation authority is granted by this directive alone.**

Before making any runtime, schema, API, UI, Preview, or deployment change, obtain explicit Founder authorization for the implementation slice being executed.

Until that Founder gate is satisfied, you may perform read-only repository verification and prepare a bounded implementation packet only.

## 3. Controlling architecture

Implement only the architecture described by the current Architect-approved Phase C Product Control Specification and Reconciliation Memorandum once the relevant Founder gate is satisfied.

Core invariants:

- preparation ≠ submission ≠ representation;
- customer/entity authority ≠ OwnerPilot service authority;
- decision intelligence ≠ filing engine;
- entity title/role does not imply blanket legal authority;
- attestation first; documentary diligence by validated exception;
- no automatic `packet_ready → filed` transition;
- no on-platform attorney routing;
- customer-controlled filing is the current approved posture;
- direct/autonomous filing remains OFF;
- paid Phase C remains OFF until applicable UDA/LDA compliance is complete.

## 4. Branch strategy after Founder implementation authorization

For the first implementation slice, create a fresh branch from the exact then-current clean `main`.

Recommended branch naming pattern:

`feat/phase-c-ud100-<bounded-slice>`

Do not build on PR #357's documentation branch. PR #357 is integrated governance history and must not be reused or retargeted as an implementation branch.

Before branch creation, record:

- exact `main` SHA;
- working-tree clean state if using a checkout;
- open Phase C PRs;
- exact approved control/specification version;
- exact Founder authorization for the slice.

If live `main` differs from the baseline above, use live `main` and report the new SHA before implementation.

## 5. Recommended implementation sequence

No slice is authorized merely because it appears below.

### Slice 1 — contracts/types only

Expected modules:

- `lib/ud100/` or repository-convention-equivalent contracts;
- plaintiff-track types;
- Phase C state types;
- authority claim/evidence types;
- permission types;
- source/form/control registry contracts;
- audit event vocabulary.

No DB migration, route, UI, document generation, filing, or Production behavior.

### Slice 2 — source/form/control registry

Expected scope:

- registry persistence contracts/schema if separately authorized;
- current-form metadata;
- hashes/effective dates;
- stale-source engine;
- no packet generation.

### Slice 3 — authority-evidence persistence

Expected scope:

- workflow/party/actor/authority claim/evidence tables;
- immutable provenance;
- RLS and ownership isolation;
- no legal permission conclusion.

### Slice 4 — Phase C state machine + RiskPath integration

Expected scope:

- separate `ud100_state` machine;
- link to `riskpath_records`;
- neutral hold/event projection;
- no mutation of the locked 15-state RiskPath contract unless separately approved.

### Slice 5 — free-beta service/compensation gate

Expected scope:

- genuine no-compensation eligibility controls;
- no paid tier or hidden consideration;
- paid service remains hard-disabled.

### Slice 6 — natural-person fact path

Expected scope:

- factual intake;
- deterministic completeness;
- current natural-person verification route;
- no open-ended legal-form advice.

### Slice 7 — entity intake + attestation

Expected scope:

- entity name/type;
- signer identity/category/title;
- authorization attestation;
- factual authority basis;
- Secretary of State factual observation;
- exception-trigger architecture for documentary diligence.

### Slice 8 — entity verification/permission boundary

Expected scope:

- validated entity verification mechanism;
- granular permission evaluation;
- unresolved authority conflict hard stop;
- representation-boundary state.

Do not implement an `authorizedSigner=true` shortcut.

### Slice 9 — decision-to-file handoff

Expected scope:

- customer decision confirmation;
- legal-election snapshot;
- decision-object/version reference;
- one-way `ministerial_mode_entered` transition;
- deliberate exit-to-decision-intelligence control.

### Slice 10 — deterministic packet engine

Expected scope:

`validated facts + approved control + approved current form/source → populated fields`

No LLM legal-form/claim/remedy selection.

### Slice 11 — review/signature/export

Expected scope:

- factual review;
- track-appropriate disclosures;
- customer signature state;
- packet export;
- no autonomous filing.

### Slice 12 — post-filing factual tracking

Expected scope:

- append-only external filing event;
- contest-event framework;
- natural-person/entity divergence at validated representation boundary.

### Slice 13 — Preview acceptance and legal-boundary regression

Synthetic cases only unless separately authorized otherwise.

## 6. Target schemas/state objects

The target architecture uses Phase C-specific objects linked to the durable matter/RiskPath aggregate. Exact table names must follow repository conventions and require separate schema authorization.

Conceptual objects:

- `ud100_workflows`
- `ud100_parties`
- `ud100_actors`
- `ud100_authority_claims`
- `ud100_authority_evidence`
- `ud100_authority_verifications`
- `ud100_permission_snapshots`
- `ud100_packets`
- `ud100_packet_sources`
- `ud100_audit_events`
- optional future `ud100_reported_filing_events`

Do not implement schema from this document without Founder authorization for the relevant slice.

## 7. Required UI states

Natural-person target:

`ud100_not_started → party_identity_pending → party_track_determined → service_authority_gate_pending → facts_pending → document_selection_pending → preparation_eligible → draft_generated → factual_review_pending → owner_confirmation_pending → owner_signature_pending → packet_ready_for_owner_decision`

Entity target:

`ud100_not_started → party_identity_pending → party_track_determined → entity_identity_pending → actor_identity_pending → authority_basis_pending → authority_evidence_pending → authority_verification_pending → representation_boundary_pending → service_authority_gate_pending → preparation_eligible → draft_generated → factual_review_pending → entity_disclosure_pending → signature_permission_pending → submission_permission_pending → packet_ready_for_permitted_next_action`

Common fail-closed states:

- `unsupported_or_uncertain`
- `legal_control_hold`
- `stale_source_hold`
- `external_counsel_consultation_recommended`

The last state may only recommend consulting an independent attorney outside OwnerPilot. It must not route or match the user to counsel.

## 8. Proposed APIs

Exact route naming must follow repository conventions at implementation time. Candidate contracts:

- `GET /api/ud100/[workflowId]`
- `POST /api/ud100/[workflowId]/party`
- `POST /api/ud100/[workflowId]/actor`
- `POST /api/ud100/[workflowId]/authority-claim`
- `POST /api/ud100/[workflowId]/authority-evidence`
- `POST /api/ud100/[workflowId]/verification`
- `POST /api/ud100/[workflowId]/evaluate`
- `POST /api/ud100/[workflowId]/decision-to-file`
- `POST /api/ud100/[workflowId]/packets/draft`
- `POST /api/ud100/[workflowId]/factual-review`
- `POST /api/ud100/[workflowId]/confirmations`
- `POST /api/ud100/[workflowId]/permissions/evaluate`
- future factual-only `POST /api/ud100/[workflowId]/reported-filing`

Deliberately absent:

- `/api/ud100/file`
- `/api/ud100/efile`
- `/api/ud100/represent`
- `/api/ud100/attorney`
- `/api/ud100/request-attorney-review`
- `/api/route-to-counsel`

## 9. Secretary of State lookup behavior

When separately authorized, implement factual observation only:

- source identity/version recorded;
- query input recorded without exposing secrets;
- exact observed entity facts stored with timestamp/source hash where feasible;
- consistency comparison separated from legal conclusion;
- source unavailable/ambiguous = fail closed for controls that depend on it.

Do not treat registry presence/status/title as blanket litigation authority.

## 10. Decision-to-file and ministerial-mode enforcement

No packet generation until `decision_to_file_confirmed` exists for the current fact/control snapshot.

Store:

- actor;
- timestamp;
- plaintiff;
- filing path;
- customer-confirmed legal elections;
- decision-object/version;
- fact snapshot hash;
- control version.

After `ministerial_mode_entered`, the filing engine may not provide new cause-of-action, remedy, allegation, form, or litigation-strategy recommendations.

Any legally consequential election change invalidates the filing session and requires a new customer decision confirmation.

## 11. Verification routing

Natural person and entity verification are separate deterministic routes under the same durable matter.

Entity ordinary case:

`attestation → factual source verification → no conflict → continue`

Exception:

`factual ambiguity/conflict → authority document requested → factual verification → resolved or legal_control_hold`

Do not infer legal permission from an unresolved conflict.

## 12. Disclosure rendering

Render only Architect/Janna-approved current wording.

Always preserve:

- preparation from customer's facts/selections;
- customer review/sign/file decision;
- entity representation limitation;
- natural-person self-representation distinction;
- no OwnerPilot attorneys;
- no lawyer-reviewed/court-ready/legally-sufficient/guaranteed-acceptance implication.

## 13. Audit requirements

At minimum implement applicable events from the approved vocabulary:

- plaintiff type/name/status;
- signer identity/attestation;
- authority document request/receipt;
- decision-to-file confirmation;
- ministerial-mode entry;
- filing elections;
- packet generation/review;
- verification/signature;
- customer filing authorization;
- packet export;
- reported filing;
- contest detection;
- entity representation notice;
- natural-person pro se state;
- form/local-rule versions.

Each event must retain actor, timestamp, matter/workflow ID, artifact/version, previous/resulting state, evidence references, and governing-control version.

## 14. Source/form validation

Before any packet-generation Preview acceptance:

- verify current July 1, 2026 UD-100 or later authoritative edition;
- verify current MC-030 or authoritative replacement;
- verify Judicial Council library;
- verify applicable LA Superior Court local requirements;
- record hashes/effective dates;
- fail closed on stale/unverified source.

Do not silently update existing matters to new source/control versions.

## 15. Required tests for each implementation slice

As applicable:

- deterministic state-transition tests;
- fail-closed tests;
- permission-isolation tests;
- attestation/document-exception tests;
- source/effective-date/hash tests;
- stale-control tests;
- audit completeness tests;
- RLS/ownership tests;
- multi-plaintiff tests;
- no-attorney-routing regression;
- no-autonomous-form-selection regression;
- no legal-strategy regression;
- no-auto-filing regression;
- no customer/service-authority conflation;
- free-beta no-compensation tests;
- paid-phase hard-gate tests;
- Production-ineligibility tests until separately authorized.

## 16. Adversarial tests

Include cases such as:

- entity name mismatch;
- suspended/forfeited status;
- conflicting signer history;
- unsupported signer category;
- ambiguous multi-manager authority;
- authority document conflict;
- stale form/source;
- stale control version;
- decision object changed after filing confirmation;
- attempt to re-enter strategy inside ministerial mode;
- entity contested-stage trigger;
- natural-person contested matter;
- attempt to access retired counsel route;
- attempt to introduce compensation into free beta;
- attempt to create packet without decision-to-file confirmation.

## 17. Preview acceptance scenarios

Preview authorization is slice-specific and does not imply Production authority.

When authorized, synthetic scenarios must cover natural person, corporation, LLC, authority conflict, source conflict, stale form/control, closed paid-service gate, entity representation boundary, natural-person continued self-representation, reported external filing, and all no-attorney/no-auto-filing invariants.

## 18. CI requirements

Every implementation PR must run:

- focused Phase C tests;
- repository unit tests;
- TypeScript typecheck;
- edge-function typecheck if affected;
- RLS/security tests if schema affected;
- migration/topology guards if Supabase migrations are added;
- existing attorney-routing/legal-control guards;
- Production-configuration guards.

Disclose unrelated baseline lint debt separately; do not broaden a Phase C PR to clean unrelated debt.

## 19. Documentation/evidence updates

Each implementation PR must include or generate a bounded review packet containing:

- exact base/head;
- changed files;
- governing control version;
- applicable Janna ruling references;
- tests/results;
- Preview evidence if authorized;
- Production nonimpact;
- rollback;
- unresolved holds;
- exact next Founder/Architect gate.

Update institutional engineering records only after objective validation. Do not represent Draft/unmerged artifacts as canonical.

## 20. PR strategy

Use one objective per PR where practical. Recommended sequence follows Section 5.

Each PR remains Draft until its bounded acceptance evidence is complete.

No PR may self-authorize Ready, merge, Production, paid activation, filing integration, attorney routing, or legal-control expansion.

## 21. Must stop for Founder / Architect

Stop before:

- first Phase C runtime/schema implementation unless Founder has authorized the slice;
- Preview activation not already authorized;
- merge;
- Production activation;
- paid Phase C;
- UDA/LDA registration filing;
- direct/autonomous e-filing;
- filing-fee payment;
- new consequential external integration;
- 056/057 activation or unrelated database work;
- Production Supabase/Vercel mutation;
- attorney routing/matching/referral;
- legal-control expansion.

## 22. Immediate Engineer action under current authority

**READ-ONLY ONLY.**

Before Founder implementation authorization, the Engineer may:

1. verify live `main` and current Phase C PR state;
2. map the proposed modules to actual repository conventions;
3. identify exact files likely affected by Slice 1;
4. identify schema and migration implications for later slices;
5. prepare the first bounded implementation PR plan;
6. return a pre-implementation packet.

The Engineer must then state:

> **STOP — Phase C implementation requires explicit Founder authorization for the selected bounded slice.**

Do not create runtime/schema changes from this directive alone.