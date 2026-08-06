# OPEP-000 — Business Adapter, Package Binding, and Governing Manifest Design

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


## 1. Purpose

This document proposes nonexecuting boundaries through which OwnerPilot may
later receive a version-pinned AEOS executive package.

It does not select a serialization format, create a schema, define executable
interfaces, install a dependency, or authorize a runtime consumer.

## 2. Governed AEOS package boundary

OPEP must not assume that an executive package is only source code or only a
compiled artifact.

The minimum complete package boundary should be evaluated as a governed
collection that may include:

- executive identity;
- source package;
- compiled/distributable artifact;
- shared executive-primitives version;
- role-specific contract and schemas;
- package manifest;
- exact version;
- immutable digest;
- certification record and digest;
- test evidence;
- compatibility metadata;
- model and tool boundaries;
- runtime compatibility;
- environment eligibility;
- expiration, suspension, and revocation state;
- known defects and limitations;
- provenance and signing evidence.

The Architect must recommend mandatory elements for Stage A, B, and C.

A partial package must be labeled partial. Missing elements may not be assumed.

## 3. Common and role-specific contracts

Preferred structure:

```text
Shared AEOS executive primitives
  - identity
  - evidence envelope
  - authority envelope
  - provenance
  - uncertainty
  - dissent
  - human review
  - prohibited actions
  - audit
  - lifecycle
  - revocation
             |
             +-- Generic CAO contract
             +-- Generic CLO contract
             +-- Generic CSO contract
             +-- Generic CFO contract
             +-- Generic CPO contract
             +-- Generic COO contract
             +-- Generic Recommendation Synthesizer contract
```

Roles should not be forced into one undifferentiated output schema. A shared
primitive does not create shared business authority.

## 4. OwnerPilot Business Adapter

Expected future direction:

> a declarative manifest plus narrowly bounded executable translation code
> where declarative configuration is insufficient.

This document defines only the conceptual boundary.

### 4.1 Declarative context

Candidate categories:

- adapter identity/version;
- enterprise and executive identity;
- mission reference;
- approved objectives;
- governing-manifest bindings;
- evidence-scope bindings;
- terminology;
- authority overlay;
- prohibited capabilities;
- escalation;
- human review;
- environment eligibility;
- audit;
- exact AEOS package binding.

### 4.2 Controlled retrieval bindings

A binding may identify:

- approved source systems;
- exact locators;
- approved evidence classes;
- retrieval boundaries;
- integrity/freshness requirements;
- unavailable-evidence policy;
- prohibited content;
- retention reference;
- audit requirements.

A binding does not authorize unrestricted retrieval.

### 4.3 Bounded executable translation

A future executable adapter may, only if separately authorized:

- transform OwnerPilot field names into an AEOS shape;
- normalize enumerations;
- map stable identifiers;
- attach approved references;
- validate compatibility;
- reject missing/conflicting inputs;
- preserve provenance.

It may not:

- contain generic executive reasoning;
- create business/legal authority;
- infer permission;
- bypass enforcement;
- select/call a model by itself;
- activate an environment;
- execute a tool;
- persist without separate authority;
- substitute missing evidence;
- retry or repair automatically;
- dispatch another executive;
- modify the AEOS package;
- hide incompatibility.

### 4.4 Prohibited business logic

The adapter must not become a local fork by embedding:

- generic executive algorithms;
- generic legal-risk frameworks;
- generic finance/strategy logic;
- reusable recommendation synthesis;
- business-neutral lifecycle/audit logic;
- package-level model/tool policy;
- patches compensating for an AEOS defect.

OwnerPilot-specific constraints and transformations are permitted only when
traceable to OwnerPilot sources.

## 5. Conceptual adapter record

```yaml
ownerpilot_business_adapter:
  identity:
    adapter_id:
    adapter_version:
    executive_role:
    owner: OwnerPilot
    status: draft

  aeos_binding:
    package_id:
    package_version:
    package_digest:
    contract_version:
    shared_primitives_version:
    certification_record_id:
    certification_record_digest:
    certification_status:
    certification_scope:
    revocation_status:

  enterprise:
    enterprise_identity:
    mission_reference:
    approved_objective_references:

  governing_references:
    enterprise_manifest_id:
    role_manifest_id:
    package_binding_id:
    environment_overlay_id:
    required_reference_ids:

  evidence:
    scope_ids:
    source_allowlists:
    classification_requirements:
    integrity_requirements:
    freshness_requirements:
    unavailable_evidence_policy:

  terminology:
    vocabulary_version:
    preferred_terms:
    prohibited_terms:
    translation_rules:

  authority_overlay:
    authority_source_references:
    permitted_advisory_classes:
    prohibited_action_classes:
    authority_ceiling:
    adapter_grants_authority: false

  escalation:
    triggers:
    human_roles:
    no_resolution_by_silence: true

  human_review:
    explicit_initiation_required:
    pre_release_review_required:
    permitted_dispositions:
    implementation_requires_separate_authority: true

  environment:
    local_eligible:
    test_eligible:
    preview_eligible:
    production_eligible:
    adapter_activates_environment: false

  audit:
    required_fields:
    required_provenance:
    conflicts:
    unknowns:
    dissent:
    human_disposition:
    prohibited_content:
```

This is not a schema and cannot be loaded or executed.

## 6. Mandatory adapter invariants

1. The adapter references authority; it never grants authority.
2. It may narrow but never broaden.
3. It cannot change package code or digest.
4. A digest mismatch rejects the binding.
5. Missing certification remains `unknown`, not `certified`.
6. No floating version such as `latest`.
7. Eligibility is not activation.
8. A valid adapter is not implementation authority.
9. Missing evidence remains missing.
10. Conflicts remain explicit.
11. Human silence is not approval.
12. No self-approval, self-upgrade, or self-repair.
13. Enforcement remains independent of manifest assertions.
14. Generic capability remains in AEOS.
15. Temporary shims require a separate exception, isolation, expiry, owner,
    removal plan, and revalidation.

## 7. Layered Governing Reference Manifest

### 7.1 Enterprise manifest

- OwnerPilot identity and mission;
- Founder/constitutional baseline;
- enterprise-wide prohibitions;
- shared security/audit;
- shared terminology;
- human-authority rules.

### 7.2 Executive-role manifest

- role identity/charter;
- objectives/task classes;
- role-specific sources;
- prohibitions;
- escalation/human review;
- evidence classes.

### 7.3 Package-version binding

- exact package/version/digest;
- contract/primitives versions;
- certification identity/status;
- compatibility class;
- known defects/limits;
- revocation.

### 7.4 Environment overlay

- environment identity/eligibility;
- enforcement references;
- security/legal gates;
- model/tool restrictions;
- limits;
- activation authority;
- rollback requirements.

### 7.5 Invocation evidence envelope

- assignment identity;
- exact package/adapter/manifest/environment versions;
- evidence references;
- objective;
- applicable authority;
- conflicts/unknowns;
- human initiator;
- requested output;
- audit correlation.

The Architect should determine the minimum necessary layers.

## 8. Governing reference record

```yaml
governing_reference:
  reference_id:

  source_identity:
    system:
    repository_or_library:
    locator:
    artifact_id:
    artifact_kind:

  status:
    canonical_status:
    lifecycle_status:
    effective_status:
    source_recovery:
    superseded_by:

  version:
    version_label:
    commit_sha:
    content_digest:
    effective_date:
    expiration_date:
    retrieved_at:

  authority:
    authority_class:
    authority_scope:
    authority_source:
    creates_implementation_authority: false
    creates_activation_authority: false

  applicability:
    executive_roles:
    task_classes:
    product_lanes:
    environments:
    conditions:
    exclusions:

  jurisdiction:
    country:
    state:
    locality:
    subject_class:
    applicability_certainty:

  conflicts:
    declared_conflicts:
    unresolved_conflicts:
    precedence_reference:
    resolution_status:

  limitations:
    known_limitations:
    required_review:
    freshness_rule:
    prohibited_uses:
```

This is not executable.

## 9. Authority classes

- `founder_decision`;
- `ratified_constitutional_artifact`;
- `accepted_adr`;
- `approved_doctrine`;
- `approved_standard`;
- `approved_product_control`;
- `approved_legal_control`;
- `implemented_security_control`;
- `verified_implementation_record`;
- `operational_record`;
- `noncanonical_reviewed_handoff`;
- `noncanonical_draft`;
- `source_recovery`;
- `external_package_record`;
- `external_certification_record`;
- `external_test_evidence`;
- `disputed`;
- `unknown`.

`unknown` and `disputed` fail closed for consequence-bearing use.

## 10. Source identity and freshness

Every consequence-bearing reference binds:

- stable identity;
- exact locator;
- version/commit;
- digest where available;
- effective status;
- supersession;
- verification time;
- freshness policy;
- authority source.

A path without a version is insufficient. A generated index without coverage
and freshness checks is insufficient. A title containing `approved`,
`ratified`, `ruling`, `attorney`, `canonical`, or `final` is insufficient.
Implementation records cannot create constitutional authority.

## 11. Conflict handling

### 11.1 OwnerPilot source conflict

Apply an established hierarchy only when status, class, scope, applicability,
effective date, supersession, and jurisdiction are determinable.

Otherwise:

1. record conflict;
2. stop consequence-bearing use;
3. route human review;
4. preserve both sources;
5. do not infer resolution from recency or specificity.

### 11.2 AEOS versus OwnerPilot

- If OwnerPilot is stricter, its overlay narrows.
- If AEOS is stricter, OwnerPilot cannot broaden.
- If narrowing cannot resolve the conflict, reject the package/specialization.
- Do not patch or fork AEOS.

### 11.3 Canonical versus noncanonical

A noncanonical source cannot override a canonical source. Preserve it as
history/proposal. If canonical applicability is uncertain, do not substitute
the noncanonical source.

### 11.4 Missing evidence

Apply declared `reject`, `escalate`, or `reject_or_escalate`. Never fabricate
or silently substitute.

### 11.5 Unresolved authority

- unresolved legal authority blocks legal consequence;
- unresolved implementation authority blocks runtime change;
- unresolved environment authority blocks activation;
- unresolved certification blocks Stage B absent express exception;
- unresolved Founder disposition blocks acceptance.

## 12. Version-pinning record

```text
AEOS package ID
+ exact package version
+ immutable package digest
+ contract version
+ shared primitives version
+ certification record ID/digest/status/scope
+ OwnerPilot adapter ID/version
+ enterprise manifest version
+ role manifest version
+ package binding version
+ environment overlay version
+ evidence binding version
+ authority overlay version
+ portability-test version
+ OwnerPilot validation-record ID
+ implementation commit, only if later authorized
```

Any changed component creates a new binding.

## 13. Upgrade compatibility classes

Possible future classes:

1. no behavioral/authority effect;
2. evidence or metadata only;
3. backward-compatible implementation;
4. contract-affecting;
5. model-boundary;
6. tool-boundary;
7. authority-sensitive;
8. security-sensitive;
9. revocation/emergency.

Until approved policy exists, every change defaults to conservative
revalidation. No patch is automatically exempt and no automatic update is
allowed.

## 14. Upgrade sequence

1. Retrieve exact package.
2. Verify version, digest, provenance, certification.
3. Determine compatibility class.
4. Compare contracts, restrictions, models, tools, revocation.
5. Run required validation.
6. Revalidate unchanged adapter.
7. Classify incompatibilities.
8. Issue new validation record.
9. Obtain review.
10. Obtain Founder disposition where required.
11. Separately authorize implementation.
12. Separately validate Preview.
13. Separately decide Production.

## 15. Defect containment and upstream correction

```text
Detect and contain
        |
        v
Disable or narrow affected capability
        |
        v
Record defect with exact evidence
        |
        v
Submit upstream AEOS issue or proposal
        |
        v
Receive corrected exact version/digest
        |
        v
Revalidate portability
        |
        v
Founder disposition
```

No permanent local fork.

A temporary shim requires written exception, exact defect reference, isolation,
no authority expansion, tests, owner, expiry/removal trigger, removal plan, and
revalidation.

## 16. Revocation

If certification is withdrawn, suspended, expired, or disputed:

- package becomes ineligible for new invocation by default;
- bindings are marked affected;
- no fallback/substitution;
- audit history remains;
- containment and human disposition are required.

If an OwnerPilot source is superseded, expired, or disputed:

- bindings become stale;
- new invocations fail closed;
- material outputs are marked for review;
- no automatic reinterpretation;
- audit history remains;
- human disposition is required.

Revocation is not deletion.

## 17. Platform enforcement

```text
AEOS executive contract
+
AEOS package restrictions
+
OwnerPilot authority overlay
+
OwnerPilot runtime enforcement
+
OwnerPilot security and legal gates
+
explicit human authorization
```

A manifest assertion is not enforcement.

No credential, authentication header, unrestricted environment value, provider
secret, database string, or deployment credential belongs in an adapter or
manifest.
