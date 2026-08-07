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
**Initial reviewed head:** `3a3e51a1e4048b015f2cb401943568b3e190b74e`


## 1. Review purpose

This packet supports review of the initial documentation-only OPEP-000 package
and the bounded Architecture Review Board amendment round.

The review question is whether it prepares an OwnerPilot receiving and
portability layer proposed for possible future placement beneath OPMA while
preserving:

- AEOS as the Founder-designated external source of reusable generic
  executives, without importing AEOS authority into OwnerPilot;
- OwnerPilot independent governance;
- the current validated OwnerPilot CAO;
- all Founder-reserved Generic CAO disposition options;
- nonauthority and fail-closed boundaries;
- source status and history;
- nonmechanical precedence and authorization review;
- no legal or jurisdictional expansion;
- no attorney routing;
- separate implementation/environment decisions; and
- no formal OPEP–OPMA parent-child relationship unless OPMA-000 is later
  created, reviewed, and approved.

## 2. Authorized package

Five existing OPEP Markdown files:

1. `docs/architecture/executive-portability/OPEP-000_ownerpilot_executive_portability_preparation_draft_2026-08-06.md`
2. `docs/architecture/executive-portability/OPEP-000_governing_reference_inventory_draft_2026-08-06.md`
3. `docs/architecture/executive-portability/OPEP-000_business_adapter_and_manifest_design_draft_2026-08-06.md`
4. `docs/architecture/executive-portability/OPEP-000_portability_test_and_defect_model_draft_2026-08-06.md`
5. `docs/architecture/executive-portability/OPEP-000_founder_review_packet_2026-08-06.md`

The ARB round modifies only these five already-added Markdown files. No new
file, TypeScript, JavaScript, schema, migration, configuration, workflow,
package, route, UI, database, Supabase, Vercel, legal-control, jurisdiction, or
runtime file is in scope.

## 3. Read-only source audit

### 3.1 Baseline

- repository: `hjt521/ownerpilot`;
- base: `main`;
- exact base:
  `35e6f256fa7103c1ed54d67c3fa64e65065d3e53`;
- initial PR #349 reviewed head:
  `3a3e51a1e4048b015f2cb401943568b3e190b74e`;
- PR #348 exact head:
  `20629162b71db6b9d7903d330210b048ae9d7a14`.

### 3.2 Sources reviewed

- `constitution/STATUS.md`;
- EA-000, MAP-001, EA-012, EA-101, EA-102;
- EA-100 and BTRM-001;
- `constitution/adr/adr_log.md`, including ADR-015, ADR-017, and ADR-019;
- `constitution/enterprise/RPT-014_RQS_OCM-001_reconciliation_memorandum.md`;
- Recommendation Object and Decision Graph implementation-spec drafts;
- generated constitutional indexes;
- Generic CAO contract, adapter, specialization, tests, review packet;
- current CAO Preview registry and referenced sources;
- PR #348 draft and review packet;
- `docs/legal/` and `docs/compliance/` inventories;
- Group 1 legal handoff;
- California nonpayment source-recovery files;
- Founder OPEP direction dated 2026-08-06; and
- ARB bounded revision direction dated 2026-08-06.

### 3.3 Findings

1. Generic CAO is nonexecuting and not consumed by current CAO runtime.
2. Current CAO Preview is separately governed, Preview-only, human-initiated,
   tool-denied, and Production-ineligible.
3. OPEP can be drafted without modifying current CAO.
4. The merged Generic CAO is a current compatibility and historical-reference
   model; preservation, coexistence, upstream contribution, differential
   portability testing, migration, or another disposition remains reserved.
5. PR #348 contains valuable nonauthority rules but remains Draft; no merge or
   conforming amendment is authorized in this round.
6. Generated constitutional indexes are not demonstrably complete for the
   audited commit.
7. Legal source status is heterogeneous; names are not authority proxies.
8. California nonpayment base/Revision 1 are source recovery.
9. No AEOS package, digest, certification, or RA-001 evidence was found in the
   OwnerPilot repository audit.
10. OCM-001/RQS controls are recorded through BTRM-001 §3.7/§3.7.1, RPT-014,
    ADR-015, and later ADR-017/ADR-019 constraints; Recommendation Object and
    Decision Graph implementation specs remain nonconstitutional drafting
    inputs.
11. No implementation is necessary or authorized for this package.

## 4. ARB amendment matrix

| ARB finding | Files and sections amended | Amendment class | Result |
|---|---|---|---|
| Preserve all Generic CAO disposition options | Main §§3.3, 3.4, 5, 10, 11, 13–14; Inventory §§4.1, 7.1, 11.1, 13; Review packet §§3.3, 6, 8 | Founder-decision preservation | Removes migration presumption and expressly reserves preservation, coexistence, upstream contribution, differential testing, migration, and other Founder-selected options |
| Qualify AEOS source status | Main §§2, 6, 10; Inventory §§3–4, 13; Adapter §§1, 11; Test §1; Review packet §§1, 3, 6 | Authority clarification | Distinguishes AEOS authority/canonical status within AEOS from OwnerPilot authority and adoption |
| Correct Stage B exception terminology | Main §8; Adapter §11.6; Test §§2, 4.1; Review packet §§6, 8–9 | Terminology correction | Exception is only to the certification prerequisite and grants no Preview, execution, implementation, environment, or activation authority |
| Keep OPEP–OPMA relationship proposed | Main §§1, 4, 10, 11, 13–14; Inventory §8, §13; Review packet §§1, 5–8 | Authority clarification | States possible future placement only; no current formal parent-child relationship |
| Add nonmechanical precedence rule | Main §7; Inventory §§1, 3, 12; Adapter §11; Test §4.3; Review packet §§1, 4, 5 | Conflict-rule clarification | Requires scope, applicability, jurisdiction, dates, supersession, Founder direction, and the specific question; no automatic precedence algorithm |
| Separate portability validation from legal approval | Main §9; Inventory §§9.4, 11.2; Test §9; Review packet §§1, 4, 6 | Authority clarification | Explicitly states portability does not establish legal correctness, sufficiency, product permission, or jurisdiction-specific guidance authority |
| Add exact recommendation-architecture references | Main §5.1; Inventory §§5, 5.1, 11.7; Adapter §7.6; Test §6; Review packet §§3.2–3.3, 4 | Missing-reference correction | Adds exact BTRM-001, RPT-014, ADR-015, ADR-017, ADR-019, Recommendation Object, and Decision Graph references with status treatment |
| Limit authority-intersection metaphor | Main §7; Adapter §12; Test §4.3; Review packet §§1, 4, 5 | Authority clarification | Clarifies that the intersection is a governance metaphor/validation rule, not an authorization algorithm |
| Preserve PR #348 without modifying it | Main §§3.5–3.6, 10, 13–14; Inventory §§8, 13; Review packet §§5–8, 11–12 | Founder-decision preservation | Keeps PR #348 Draft, unmerged, unchanged; no conforming addendum authorized; historical text must not be silently rewritten |

### 4.1 Boundedness confirmation

No design expansion occurred. The amendments clarify terminology, authority,
conflict handling, status, references, and Founder-reserved choices. They do not
add a new executive, architecture layer, runtime, package, schema, manifest
loader, orchestration capability, legal rule, jurisdiction rule, environment,
or implementation path.

All unresolved Founder decisions remain unresolved.

## 5. PR #348 recommendation

**Preserve and later conform only after separate Founder disposition.**

Reasoning:

- its reserved manifest/architecture boundary remains relevant;
- its nonauthority rules align with OPEP;
- its dated AEOS view is historically accurate;
- deleting or silently rewriting it would obscure history; and
- exact conforming language must be separately authorized after OPEP review.

Current rule:

- PR #348 remains Draft;
- no merge is authorized;
- no conforming addendum is authorized yet;
- no PR #348 file is changed by PR #349;
- historical text must not be silently rewritten; and
- no later action follows without a separate Founder disposition.

## 6. Architecture disposition

Proposes:

- OPEP for possible future placement beneath OPMA, with no current formal
  relationship;
- AEOS external package boundary and OwnerPilot independent authority boundary;
- OwnerPilot adapter/enforcement boundary;
- layered manifests;
- evidence/authority overlays;
- package/certification/digest pinning;
- Stage A–C validation;
- conservative upgrades;
- no permanent local fork;
- fail-closed revocation;
- nonmechanical precedence review;
- authority-intersection as a metaphor and validation rule only;
- Founder acceptance;
- current CAO preservation;
- all Generic CAO disposition options reserved;
- recommendation-architecture status controls; and
- CLO first serious trial with separate legal/product review.

## 7. Facts versus proposals

| Item | Current fact | Proposal or unresolved decision |
|---|---|---|
| AEOS | Founder-designated external generic source; no OwnerPilot authority through AEOS status | Exact package/certification interface and any later OwnerPilot adoption |
| Generic CAO | Current compatibility and historical-reference boundary | Preservation, coexistence, upstream contribution, differential testing, migration, or another Founder-selected disposition |
| Current CAO | Validated Preview runtime | No change |
| OPMA | No adopted OPMA-000 artifact in this package | Whether OPMA-000 is created and whether OPEP is later placed beneath it |
| OPEP | Authorized documentation initiative | Future artifact class/path and approval status |
| CLO | No implementation | First serious trial after prerequisites and separate legal/product review |
| Certification | RA-001 not assumed certified | Stage A for certification-eligible package; Stage B formal certification or bounded prerequisite exception only |
| Acceptance | Founder required | Exact record format |
| Manifests | No runtime manifest | Layered design only |
| Recommendation architecture | OCM-001/RQS rules controlling through exact sources; RCO/DECG content not ratified | Future RCO-001/DECG-001 drafting and ratification |
| PR #348 | Draft, unmerged, unchanged | Whether and when exact conforming language is separately authorized |

## 8. Founder decisions requested after ARB final review

1. Approve/revise/reject the amended OPEP architecture.
2. Confirm the five-file boundary.
3. Decide whether OPEP remains a standalone draft or is later proposed beneath
   a separately created and approved OPMA-000.
4. Confirm PR #348 preserve-and-conform posture without authorizing conforming
   work yet, or provide a separate exact authorization.
5. Select or continue to reserve the long-term Generic CAO disposition.
6. Confirm no current CAO migration.
7. Confirm layered manifests.
8. Confirm future bounded executable translation only under separate authority.
9. Confirm the nonmechanical precedence rule.
10. Confirm the authority-intersection limitation.
11. Confirm Stage thresholds and the narrow certification-prerequisite
    exception terminology.
12. Confirm CLO as the first serious trial while preserving separate legal and
    product-control review.
13. Confirm Founder final portability acceptance.
14. Direct Architect to define minimum package boundary.
15. Direct Architect to propose ADR grouping/numbering.
16. Decide whether an early mechanics trial uses CSO or CPO.
17. Decide whether later noncanonical Notion/Drive mirrors should be created.

None is resolved by this ARB amendment commit.

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
14. Evidence required before any bounded exception to the Stage B certification
    prerequisite is considered?
15. Existing Generic CAO candidates for upstream contribution, without
    presuming contribution or migration?

## 10. Verification plan

1. exact base remains
   `35e6f256fa7103c1ed54d67c3fa64e65065d3e53`;
2. one bounded ARB revision commit after the initial documentation commit;
3. exactly the five existing OPEP files changed;
4. all changed files `.md`;
5. no new file added in the revision;
6. whitespace/diff check passes;
7. documentation/link/reference checks pass where repository tooling exists;
8. status/no-authority labels remain present;
9. current CAO preservation remains present;
10. all Generic CAO disposition options remain reserved;
11. certification nonauthority remains present;
12. Stage A certification-eligible limit remains present;
13. Stage B exception is limited to certification prerequisite;
14. CLO no-attorney-routing and legal-review separation remain present;
15. exact recommendation references and status treatment remain present;
16. PR #348 remains unchanged and Draft;
17. no package/schema/parser/loader/compiler/validator/runtime;
18. no Notion/Drive write;
19. PR #349 remains Draft; and
20. GitHub checks and automatic Vercel Preview status are recorded for the
    revised head.

## 11. Failure stop

Stop if:

- a sixth file is added;
- a non-OPEP or non-Markdown file changes;
- package installation occurs;
- runtime/config changes;
- current CAO changes;
- Generic CAO TypeScript changes;
- executive activation occurs;
- legal/jurisdictional expansion occurs;
- attorney routing is introduced;
- silent status elevation occurs;
- canonical adoption occurs;
- PR #348 is changed;
- OPMA is created or changed;
- PR #349 is marked ready or merged;
- manual deployment or Production change occurs; or
- Notion/Google Drive publication occurs.

Do not automatically repair by broadening scope.

## 12. No-change attestation

This ARB revision does not change:

- current CAO;
- Generic CAO TypeScript, contracts, or runtime treatment;
- any selected long-term Generic CAO disposition;
- model/provider/tool;
- route/UI/registry;
- auth/environment;
- database/schema/RLS/Supabase/persistence;
- retry/repair/fallback/substitution/dispatch/continuation;
- repository-write/deployment authority;
- legal/broker/notice/payment/jurisdiction controls;
- legal correctness or product-control determinations;
- PR #348;
- OPMA;
- Notion/Drive;
- Preview activation;
- Production; or
- PR #349 Draft status.

No automatic continuation follows.
