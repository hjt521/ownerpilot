# OPEP-000 — Founder and Architect Review Packet

**Status:** DRAFT
**Canonical status:** NONCANONICAL
**Implementation authority:** None
**Runtime authority:** None
**Preview authority:** None
**Production authority:** None
**Executive-activation authority:** None
**Repository-write consequence of this document:** None
**Constitutional consequence:** None
**AEOS RA-001 certification assumption:** None
**Current OwnerPilot CAO consequence:** None
**Human review:** Required
**Date:** 2026-08-06
**Repository audit base:** `35e6f256fa7103c1ed54d67c3fa64e65065d3e53`


## 1. Review purpose

This packet supports review of the initial documentation-only OPEP-000 package.

The review question is whether it prepares an OwnerPilot receiving and
portability layer beneath OPMA while preserving:

- AEOS as the source of reusable generic executives;
- OwnerPilot independent governance;
- the current validated OwnerPilot CAO;
- nonauthority and fail-closed boundaries;
- source status and history;
- no legal or jurisdictional expansion;
- no attorney routing;
- separate implementation/environment decisions.

## 2. Authorized package

Five new Markdown files:

1. `docs/architecture/executive-portability/OPEP-000_ownerpilot_executive_portability_preparation_draft_2026-08-06.md`
2. `docs/architecture/executive-portability/OPEP-000_governing_reference_inventory_draft_2026-08-06.md`
3. `docs/architecture/executive-portability/OPEP-000_business_adapter_and_manifest_design_draft_2026-08-06.md`
4. `docs/architecture/executive-portability/OPEP-000_portability_test_and_defect_model_draft_2026-08-06.md`
5. `docs/architecture/executive-portability/OPEP-000_founder_review_packet_2026-08-06.md`

No existing file is modified. No TypeScript, JavaScript, schema, migration,
configuration, workflow, package, route, UI, database, Supabase, Vercel, legal
control, jurisdiction, or runtime file is in scope.

## 3. Read-only source audit

### 3.1 Baseline

- repository: `hjt521/ownerpilot`;
- base: `main`;
- exact base:
  `35e6f256fa7103c1ed54d67c3fa64e65065d3e53`;
- PR #348 exact head:
  `20629162b71db6b9d7903d330210b048ae9d7a14`.

### 3.2 Sources reviewed

- `constitution/STATUS.md`;
- EA-000, MAP-001, EA-012, EA-101, EA-102;
- EA-100 and BTRM-001;
- `constitution/adr/adr_log.md`;
- generated constitutional indexes;
- Generic CAO contract, adapter, specialization, tests, review packet;
- current CAO Preview registry and referenced sources;
- PR #348 draft and review packet;
- `docs/legal/` and `docs/compliance/` inventories;
- Group 1 legal handoff;
- California nonpayment source-recovery files;
- Founder OPEP direction dated 2026-08-06.

### 3.3 Findings

1. Generic CAO is nonexecuting and not consumed by current CAO runtime.
2. Current CAO Preview is separately governed, Preview-only, human-initiated,
   tool-denied, and Production-ineligible.
3. OPEP can be drafted without modifying current CAO.
4. PR #348 contains valuable nonauthority rules.
5. PR #348 AEOS direction conflicts with later Founder direction.
6. Generated constitutional indexes are not demonstrably complete for the
   audited commit.
7. Legal source status is heterogeneous; names are not authority proxies.
8. California nonpayment base/Revision 1 are source recovery.
9. No AEOS package, digest, certification, or RA-001 evidence was found in the
   OwnerPilot repository audit.
10. No implementation is necessary or authorized for this package.

## 4. PR #348 recommendation

**Preserve and conform, rather than replace.**

Reasoning:

- its reserved manifest/architecture boundary remains relevant;
- its nonauthority rules align with OPEP;
- its dated AEOS view is historically accurate;
- deleting or silently rewriting it would obscure history;
- a dated conforming addendum can distinguish history from current direction.

Future revision, under separate authorization:

- add `Subsequent Founder Direction — AEOS and OPEP` to both files;
- identify the later decision date;
- preserve original text;
- mark external-comparison-only conclusion historical;
- point future integration to OPEP;
- retain no-authority/no-runtime/no-activation;
- update review packet decisions;
- rerun exact scope/verification.

Do not merge PR #348 before that review. No PR #348 mutation occurs here.

## 5. Architecture disposition

Proposes:

- OPEP beneath OPMA;
- AEOS package boundary;
- OwnerPilot adapter/enforcement boundary;
- layered manifests;
- evidence/authority overlays;
- package/certification/digest pinning;
- Stage A–C validation;
- conservative upgrades;
- no permanent local fork;
- fail-closed revocation;
- Founder acceptance;
- current CAO preservation;
- CLO first serious trial.

## 6. Facts versus proposals

| Item | Current fact | Proposal |
|---|---|---|
| AEOS | Founder approved future generic source | Exact package/certification interface |
| Generic CAO | Existing compatibility boundary | Future comparison/migration |
| Current CAO | Validated Preview runtime | No change |
| OPMA | Future parent direction | Exact artifact/numbering |
| OPEP | Authorized documentation initiative | Future artifact class/path |
| CLO | No implementation | First serious trial after prerequisites |
| Certification | RA-001 not assumed certified | Stage A for certification-eligible package |
| Acceptance | Founder required | Exact record format |
| Manifests | No runtime manifest | Layered design |
| PR #348 | Draft/unmerged | Later conforming addendum |

## 7. Proposed future ADR subjects

No ADR is created.

1. AEOS source exclusivity/no competing generic.
2. AEOS/OwnerPilot adapter separation.
3. Governing Reference Manifest.
4. Authority intersection/conflict handling.
5. Version/digest/certification/upgrade.
6. Stage A–C tests.
7. Defect taxonomy/no permanent fork.
8. CLO first serious trial.
9. Current CAO preservation.
10. OPMA/OPEP relationship.

Architect recommends grouping and numbering.

## 8. Founder decisions requested after review

1. Approve/revise/reject the architecture.
2. Confirm five-file initial boundary.
3. Confirm OPEP beneath OPMA.
4. Confirm PR #348 preserve-and-conform.
5. Confirm Generic CAO compatibility classification.
6. Confirm no current CAO migration.
7. Confirm layered manifests.
8. Confirm future bounded executable translation only under separate authority.
9. Confirm authority intersection/fail-closed treatment.
10. Confirm Stage thresholds.
11. Confirm CLO first serious trial.
12. Confirm Founder final acceptance.
13. Direct Architect to define minimum package boundary.
14. Direct Architect to propose ADR grouping/numbering.
15. Decide whether early mechanics trial uses CSO or CPO.
16. Decide when to authorize PR #348 conforming revision.
17. Decide whether later noncanonical Notion/Drive mirrors should be created.

## 9. Architect review questions

1. Mandatory package elements by stage?
2. Signing/digest model?
3. Certification/revocation status model?
4. Mandatory shared primitives?
5. Minimum role-specific contracts?
6. Narrowest safe executable adapter boundary?
7. Necessary manifest layers?
8. Index freshness/coverage validation?
9. Reduced-revalidation compatibility classes?
10. Neutral Stage A harness?
11. Upstream defect tracking?
12. In-flight containment after certification withdrawal?
13. Security/privacy evidence before Stage B?
14. Evidence before CLO Stage B exception?
15. Existing Generic CAO candidates for upstream contribution?

## 10. Verification plan

1. exact base remains
   `35e6f256fa7103c1ed54d67c3fa64e65065d3e53`;
2. one documentation commit;
3. exactly five added files;
4. all changed files `.md`;
5. no existing file changed;
6. whitespace/diff check passes;
7. status/no-authority labels present;
8. current CAO preservation present;
9. certification nonauthority present;
10. Stage A certification-eligible limit present;
11. CLO no-attorney-routing present;
12. PR #348 recommendation present;
13. no package/schema/parser/loader/compiler/validator/runtime;
14. no Notion/Drive write;
15. PR remains Draft.

## 11. Failure stop

Stop if:

- existing file modified;
- non-Markdown change;
- package installation;
- runtime/config change;
- current CAO change;
- executive activation;
- legal/jurisdictional expansion;
- attorney routing;
- silent status elevation;
- canonical adoption;
- merge/Production;
- unapproved sixth file;
- PR #348 mutation.

Do not automatically repair by broadening scope.

## 12. No-change attestation

This package does not change:

- current CAO;
- Generic CAO TypeScript;
- model/provider/tool;
- route/UI/registry;
- auth/environment;
- database/schema/RLS/Supabase/persistence;
- retry/repair/fallback/substitution/dispatch/continuation;
- repository-write/deployment authority;
- legal/broker/notice/payment/jurisdiction controls;
- PR #348;
- Notion/Drive;
- Production.

No automatic continuation follows.
