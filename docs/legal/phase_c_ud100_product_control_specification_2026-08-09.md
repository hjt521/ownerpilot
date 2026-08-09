# OwnerPilot Phase C UD-100 Product Control Specification

**Status:** NONCANONICAL DRAFT — IMPLEMENTATION-ORIENTED ARCHITECTURE — NO IMPLEMENTATION OR PRODUCTION AUTHORITY  
**Date:** 2026-08-09  
**Architect / ARB target:** Modified Option C — Ministerial Entity Packet Preparation with Authority Verification and Disclosed Representation Boundary  
**Repository baseline:** `00f53b6f02f88289341eb976d9f5bd449226cfa6`

## 1. Product objective

OwnerPilot Phase C must let a landlord move from a nonpayment matter into a completed UD filing packet without turning business intelligence into legal-form selection, litigation strategy, autonomous filing, or court representation.

The governing product principles are:

> **Preparation, submission, and representation are separate functions.**

> **Decision intelligence may recommend what the owner might want to do. The UD filing engine may only build what the owner has chosen to file.**

> **OwnerPilot should eliminate administrative burden without acquiring legal authority that belongs to the owner or licensed counsel.**

## 2. Scope and non-authority

This specification defines target architecture for:

- natural-person landlord packet preparation;
- corporation/LLC entity packet preparation;
- authority intake and verification;
- decision-to-file handoff;
- deterministic packet generation;
- customer review/signature/file-decision states;
- post-filing factual tracking;
- representation-boundary controls;
- free-beta compensation controls;
- source/form/version controls;
- audit and provenance.

It does not authorize:

- Production activation;
- paid Phase C;
- UDA/LDA registration filing;
- autonomous filing/e-filing;
- fee payment;
- OwnerPilot signature;
- court representation;
- attorney routing/matching/referral;
- LLM form/claim/remedy selection;
- Production Supabase/Vercel changes.

## 3. Plaintiff-type state model

`plaintiff_type = natural_person | corporation | llc`

Corporation and LLC use one entity-track architecture for current Phase C product controls. Internal legal-source metadata must preserve that the corporation rule has stronger published appellate footing and LLC treatment contains conservative OwnerPilot policy.

Multi-plaintiff matters must preserve each plaintiff independently. A mixed plaintiff set must not inherit the least restrictive track. Any entity plaintiff requires the entity controls applicable to that plaintiff.

## 4. Durable matter integration

Phase C must be part of the existing matter lifecycle, not an isolated PDF generator.

Target relationship:

`riskpath_records → ud100_workflows`

The existing locked RiskPath status contract is not silently expanded. Phase C uses a separately versioned state machine linked to RiskPath and emits neutral RiskPath/matter events.

Recommended root object:

`ud100_workflows`

Required conceptual fields:

- `id`
- `riskpath_id`
- `party_track`
- `jurisdiction_code`
- `current_state`
- `control_version`
- `legal_control_hold`
- `hold_reason_code`
- `created_at`
- `updated_at`

## 5. Entity authority schema

### 5.1 Party

Capture:

- exact legal plaintiff name;
- party type;
- entity type;
- state of formation;
- entity identifier where available;
- Secretary of State observation metadata.

### 5.2 Actor

Capture:

- signer/actor full name;
- title/relationship;
- signer category;
- user attestation that the actor is authorized;
- short factual basis for signing authority.

Organizational role is factual data only and must not independently populate legal permission fields.

### 5.3 Authority claim

Persist versioned claim evidence including:

- authority basis;
- claimed scope;
- attestation timestamp;
- evidence references;
- claim snapshot hash.

### 5.4 Documentary diligence by exception

Ordinary entity cases use attestation first. Documentary evidence is requested only when a validated exception condition is present, including:

- Secretary of State inconsistency;
- prior signer conflict;
- suspended/forfeited/canceled status;
- unclear multi-manager authority;
- inadequate "other authorized person" basis;
- disputed/inconsistent authority.

Unresolved authority conflict = `legal_control_hold`.

## 6. Secretary of State factual verification architecture

The product may capture and compare objective Secretary of State facts within approved source and privacy controls, such as:

- exact entity name;
- entity type;
- status label;
- jurisdiction/formation facts where available;
- agent/officer/manager facts only if the authoritative source exposes them and the legal-control package permits their use.

The system must distinguish:

- **observed registry fact**;
- **customer assertion**;
- **factual consistency result**;
- **legal authority conclusion**.

It must never transform a registry match into an unreviewed legal conclusion such as `actor_legally_authorized`.

## 7. Entity-status gates

Target states include:

- `entity_status_consistent`
- `entity_status_conflict`
- `entity_status_unsupported`
- `entity_status_requires_review`
- `entity_status_source_unavailable`

Suspended/forfeited/dissolved/canceled/foreign-unqualified treatment remains implementation-verification controlled. Until an approved deterministic rule exists, such cases fail closed before packet release.

## 8. Signer-authority attestation

Default ordinary entity intake requires:

- signer identity confirmation;
- signer title/relationship;
- signer category;
- affirmative authorization attestation;
- concise factual basis;
- verification confirmation appropriate to the current control package.

Do not require universal operating-agreement/resolution upload.

Do not infer all permissions from attestation alone.

## 9. Permission model

The following permissions remain separate:

- `maySupplyFacts`
- `mayDirectPreparation`
- `maySign`
- `mayTenderOrSubmit`
- `mayCommence`
- `mayAppear`
- `mayArgue`
- `mayRepresent`

A deterministic, versioned control package may evaluate them only after the applicable legal controls are available. No generic `authorizedSigner=true` shortcut is permitted.

## 10. Natural-person verification route

Natural-person matters use the approved UD-100 natural-person verification architecture and may remain self-represented within separately approved OwnerPilot workflow boundaries.

Natural persons are not automatically placed into an attorney-required state because the matter becomes contested.

## 11. Corporation/LLC verification route

Entity matters use UD-100 plus the authoritative entity-appropriate verification mechanism.

Current target:

- MC-030 with validated entity-specific verification text as provisional default;
- reverify July 1, 2026 UD-100;
- reverify current MC-030;
- reverify current Judicial Council forms library;
- check for a dedicated replacement entity-verification form;
- verify applicable LA Superior Court requirements.

The official current source wins over this provisional architecture.

## 12. Decision-intelligence mode

Before filing mode, OwnerPilot may provide approved business decision intelligence such as:

- cost-of-delay analysis;
- nonpayment economics;
- settlement comparison;
- payment-plan analysis;
- negotiation analysis;
- tenant-behavior analysis;
- communication strategy;
- business-outcome comparison;
- business recommendations.

This mode must remain technically distinct from the filing engine.

## 13. Decision-to-file transition

Required one-way handoff:

`Decision Intelligence → Customer Decision → Decision-to-File Confirmation → Ministerial Filing Engine`

Required audit event:

`decision_to_file_confirmed`

Persist at minimum:

- actor;
- timestamp;
- plaintiff(s);
- filing path;
- customer-confirmed legal elections;
- decision-object/version reference;
- fact snapshot hash;
- control version.

The filing engine may begin only after this event.

## 14. Ministerial filing mode

Once entered, OwnerPilot may:

- populate;
- attach;
- calculate;
- organize;
- validate factual completeness;
- detect missing facts;
- surface factual inconsistencies;
- preview;
- export.

It may not:

- recommend a cause of action;
- recommend a different statutory theory;
- choose a remedy;
- optimize allegations;
- recommend a legally stronger checkbox;
- substitute claims;
- predict court acceptance of a legal theory;
- provide personalized litigation strategy through form interaction.

If the user wants to reconsider strategy, the user must intentionally leave filing mode and re-enter decision intelligence.

## 15. One-way filing-session gate

The filing session must bind to:

- decision-object/version;
- customer-confirmed elections;
- fact snapshot;
- control version;
- form/source versions.

Any change to a legally consequential election invalidates the filing session and requires a new explicit decision-to-file confirmation.

## 16. Factual consistency validation

Mechanical validation may include:

- required field presence;
- plaintiff/actor identity format;
- exact name matching rules;
- jurisdiction consistency;
- dates and arithmetic;
- source/version consistency;
- evidence linkage;
- packet/fact-snapshot equality;
- stale-control detection.

The engine must not convert a factual inconsistency into legal advice.

## 17. Form/attachment routing

Routing must be deterministic and control-package driven.

No LLM may independently select:

- UD-100 versus another cause-of-action form;
- legal claim/remedy;
- allegation theory;
- strategic attachment.

Any companion form must have an effective-dated registry entry and explicit applicability rule.

## 18. Packet-generation architecture

Target formula:

`validated facts + approved deterministic control + current approved form/source = populated document fields`

Packet generation prerequisites:

- decision-to-file confirmed;
- all mandatory facts complete;
- jurisdiction supported;
- current form/source validated;
- applicable verification route complete;
- no authority conflict;
- no stale-source hold;
- no legal-control hold;
- free-beta or paid-service authority gate satisfied for the active mode.

## 19. Customer review and signature

The customer must:

- review the packet;
- confirm facts;
- receive track-appropriate disclosures;
- sign personally or through the permitted entity actor;
- decide whether to file.

OwnerPilot never signs for the customer.

## 20. Filing authorization and export/submission state

Current approved posture = **customer-controlled filing**.

The customer decides whether, when, and how to file.

OwnerPilot may provide neutral filing information and export the packet.

Direct e-filing provider integration, automatic click-submit, fee payment, or autonomous submission remain separately Founder-gated and are not authorized by this specification.

## 21. Post-filing state

A filing may be captured as an append-only factual event, not inferred from packet generation.

Target event type:

`filing_submitted` or `reported_filing_event`

Persist actor, reported date/time, channel, external reference if available, artifact version, and evidence reference.

No automatic `packet_ready → filed` transition.

## 22. Contest-event detection and representation boundary

The system must support a distinct `tenant_contest_detected` / `representation_boundary_reached` framework.

Potential triggers include Answer, demurrer, motion, hearing, or other validated contested-stage event. Do not invent the final taxonomy beyond approved legal controls.

For corporation/LLC matters, display the approved representation-boundary notice when the validated trigger occurs.

For natural-person matters, preserve self-represented continuation where otherwise supported.

## 23. Attorney boundary

Do not create or restore:

- `/route-to-counsel`;
- attorney matching;
- attorney assignment;
- attorney marketplace;
- attorney referral flow;
- request-attorney-review;
- matter transmission to an attorney.

Permitted informational posture:

> The user may consult an independent California-licensed attorney outside OwnerPilot.

## 24. Required disclosures

### Entity disclosure concepts

Communicate that:

- OwnerPilot prepared the packet from the customer's facts and selections;
- the customer reviews, signs, and decides whether to file;
- the entity may initially submit within the validated architecture;
- if the case becomes contested, the entity will generally require licensed counsel to continue litigating;
- OwnerPilot does not provide or arrange attorneys.

### Natural-person disclosure concepts

Communicate that:

- OwnerPilot prepared the packet from the customer's facts and selections;
- the customer reviews, signs, and decides whether to file;
- the natural person may proceed without an attorney;
- the customer may independently consult an attorney if desired;
- OwnerPilot does not provide or arrange attorneys.

Prohibited implications:

- lawyer reviewed;
- court-ready;
- legally sufficient;
- guaranteed filing acceptance;
- guaranteed outcome.

## 25. Free-beta compensation controls

Free limited beta is approved with defined eligibility gates, provided it is genuinely uncompensated.

Disallow within Phase C free beta:

- preparation fee;
- premium filing tier;
- subscription prerequisite to use filing workflow;
- marked-up court/process-server fee;
- filing affiliate/referral compensation;
- expedited/convenience fee;
- UD-flow data monetization as consideration.

Any third-party pass-through cost requires a no-markup structure and separate operational authority.

## 26. Paid-launch UDA/LDA gate

Paid Phase C may not activate until the applicable compliance package is complete, including as applicable:

- UDA/LDA classification;
- registration footprint;
- bond;
- customer agreement;
- statutory disclosures;
- registration number/expiration display;
- advertising/website controls;
- prohibited-acts controls;
- continuing education;
- current forms/local rules.

Broker status must not be used as a generic exemption for ordinary third-party customers.

## 27. Source/form/version registry

Required registry concepts:

### `official_form_registry`

- form code/name;
- issuing authority;
- jurisdiction;
- track applicability;
- edition/effective dates;
- official source reference/hash;
- approved template hash;
- legal-control version;
- verification timestamp/status.

### `legal_source_registry`

- source identity/type;
- jurisdiction;
- effective dates;
- source hash;
- reviewed version;
- verification status.

### `control_package_registry`

- control version;
- jurisdiction;
- track;
- effective dates;
- Architect disposition reference;
- legal-review reference;
- status;
- hash.

Every packet must persist a source/control snapshot.

## 28. Stale-source fail-closed behavior

Do not generate/release when:

- required official form is stale;
- source identity cannot be verified;
- approved template hash differs;
- applicable legal control is stale;
- jurisdiction/local rule package is unsupported;
- a matter spans an unresolved source/control transition.

Existing matters may not be silently upgraded to a new form/control version.

## 29. Audit events

Required event vocabulary must account for at least:

- `plaintiff_type_confirmed`
- `entity_name_confirmed`
- `entity_status_checked`
- `signer_identity_confirmed`
- `signer_authority_attested`
- `authority_document_requested`
- `authority_document_received`
- `filing_decision_confirmed`
- `decision_to_file_confirmed`
- `ministerial_mode_entered`
- `filing_elections_confirmed`
- `packet_generated`
- `packet_reviewed`
- `verification_signed`
- `filing_authorized_by_customer`
- `packet_exported`
- `filing_submitted`
- `tenant_contest_detected`
- `entity_counsel_notice_displayed`
- `natural_person_pro_se_status`
- `form_version_recorded`
- `local_rule_version_recorded`

Each event must preserve actor, timestamp, matter/workflow ID, artifact/version, source, previous/resulting state, evidence references, and governing-control version.

Audit events record facts; they do not manufacture legal meaning.

## 30. Privacy/security implications

Authority evidence may contain sensitive organizational and identity information. Implement later slices with minimum-necessary collection, tenant isolation, existing storage/security patterns, immutable audit metadata, and no model transmission of authority documents unless separately authorized and technically justified.

No cross-customer or tenant access is permitted.

## 31. Feature flags and holds

Unresolved or not-yet-activated controls must be individually fail-closed and observable.

Recommended flags/gates conceptually include:

- Phase C overall Preview eligibility;
- free-beta eligibility;
- entity track eligibility;
- Secretary of State verification availability;
- packet generation;
- signature workflow;
- reported filing tracking;
- direct filing integration (default OFF / not authorized);
- paid Phase C (default OFF / hard gate).

Configuration must not itself create legal or Founder authority.

## 32. Preview acceptance criteria

Preview acceptance must use synthetic/noncustomer cases and demonstrate:

- natural-person happy path;
- corporation happy path;
- LLC happy path;
- authority attestation path;
- authority conflict hard stop;
- Secretary of State inconsistency hold;
- suspended/unsupported status hold;
- stale form/source hold;
- stale control hold;
- no legal election inferred by model;
- one-way decision-to-file handoff;
- no packet generation before customer decision;
- no packet-ready-to-filed automation;
- correct natural/entity disclosures;
- contested entity representation-boundary state;
- natural-person continued self-represented path;
- no attorney-routing behavior;
- free-beta no-compensation controls;
- Production ineligibility unless separately authorized.

## 33. Test matrix

At minimum later implementation must include:

- state-transition tests;
- deterministic gate tests;
- permission-isolation tests;
- attestation/document-exception tests;
- registry/source/version tests;
- stale-source tests;
- packet snapshot/hash tests;
- multi-plaintiff tests;
- no-autonomous-form-selection tests;
- no legal-strategy tests;
- no-auto-filing tests;
- no-attorney-routing tests;
- free-beta compensation tests;
- paid-launch hard-gate tests;
- RiskPath/matter linkage tests;
- audit completeness tests;
- RLS/tenant isolation tests;
- Preview/Production eligibility tests.

## 34. Hold matrix

| Item | Required resolution point |
|---|---|
| UDA vs LDA vs dual registration | Before paid launch |
| County registration footprint | Before paid launch |
| Current bond/disclosure specifics | Before paid launch |
| Current UD-100 verification architecture | Before packet-generation Preview acceptance |
| MC-030 or replacement | Before entity verification Preview acceptance |
| LA local packet rules | Before LA beta eligibility |
| Entity capacity/status rules | Before entity-track Preview acceptance |
| Electronic verification/signature mechanics | Before signature workflow Preview acceptance |
| Direct e-filing automation | Separate future Founder gate |
| LLC appellate authority monitoring | Ongoing monitoring |
| CalDRE ID reconciliation | Before reliance in regulated paid compliance posture |

## 35. Canonical-status statement

This specification is a Draft Architect / ARB artifact. It does not make PR #357 canonical, does not authorize implementation, and does not activate Phase C. Engineering authority must be issued separately and remain slice-bounded.
