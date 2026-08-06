# PR B Review Packet — Generic CAO Contract Boundary

**Date:** 2026-08-06

**Status:** DRAFT — Founder review required

**Canonical authority:** None

**Implementation authority:** Limited to the authorized PR B contract-extraction work

**Runtime authority:** None

**Production authority:** None

**Merge authority:** None

## 1. Purpose

PR B extracts and documents a business-neutral Generic Chief Architecture
Officer contract boundary while preserving the existing OwnerPilot CAO Preview
runtime and its behavior.

This packet is nonexecuting review material. It does not activate a role,
authorize a model run, grant authority, modify Production, or approve merge or
deployment.

## 2. Bounded PR B scope

PR B is limited to:

- business-neutral Generic CAO interfaces and closed vocabularies;
- a nonauthoritative business-adapter boundary;
- an OwnerPilot-specific specialization mapping;
- platform and security separation;
- behavior-preservation and boundary tests;
- nonexecuting context-field analysis; and
- documentation of future compatibility reservations.

PR B does not implement a new runtime, migrate the existing CAO Preview
runtime, or expand any existing authority.

## 3. Files introduced by the current patch

### Generic boundary

- `lib/agents/genericCaoContract.ts`
- `lib/agents/genericCaoContract.test.ts`
- `lib/agents/genericCaoBusinessAdapter.ts`
- `lib/agents/genericCaoBusinessAdapter.test.ts`

### OwnerPilot specialization

- `lib/agents/ownerPilotCaoSpecialization.ts`
- `lib/agents/ownerPilotCaoSpecialization.test.ts`

### Review documentation

- `docs/architecture/executive-agents/generic_cao_boundary_pr_b_review_packet_2026-08-06.md`
- `lib/agents/genericCaoReviewPacket.test.ts`

## 4. Layer A — Generic CAO Core

The Generic CAO contract is business-neutral and product-neutral.

It defines structural concepts for:

- bounded executive assignments;
- externally established authority and prohibition declarations;
- evidence references;
- facts, assumptions, and unknowns;
- alternatives, tradeoffs, risks, and dissent;
- advisory recommendations;
- required human decisions;
- lifecycle states;
- bounded failure states;
- termination records;
- audit references; and
- human-review disposition.

The Generic CAO contract:

- contains no OwnerPilot identity or terminology;
- contains no product, property-management, landlord, or tenant concepts;
- contains no California or Los Angeles controls;
- contains no OwnerPilot constitutional identifiers;
- contains no repository, provider, deployment-platform, or secret handling;
- performs no model, provider, tool, persistence, deployment, or network action;
- grants no implementation authority;
- permits no autonomous continuation; and
- authorizes no retry or repair behavior.

## 5. Business-adapter boundary

The Generic CAO business-adapter contract identifies the categories of context
that an enterprise specialization may supply:

- enterprise identity;
- executive identity;
- governing references;
- role charter;
- task classes;
- approved evidence scope;
- vocabulary;
- business capabilities;
- legal restrictions;
- jurisdictional restrictions;
- model requirements;
- environment eligibility;
- audit requirements; and
- human-approval requirements.

The adapter is reference-only.

It cannot:

- grant or expand authority;
- infer authorization from supplied data;
- activate an executive role;
- construct a runtime;
- load or execute an enterprise definition;
- select or call a model;
- configure credentials or provider transport;
- execute tools;
- persist records;
- initiate continuation; or
- deploy any artifact.

Every permission or eligibility declaration supplied through the adapter must
remain traceable to separately established governing authorization.

## 6. Layer B — OwnerPilot CAO Specialization

The OwnerPilot specialization maps the generic boundary to verified existing
OwnerPilot CAO Preview sources.

It supplies references for:

- the OwnerPilot enterprise identity;
- the Chief Architecture Officer role identity;
- the existing Founder approval reference;
- the existing CAO charter version;
- the existing approved CAO task classes;
- the existing bounded repository-evidence scope;
- the existing CAO Preview model requirement;
- Preview eligibility;
- Production ineligibility;
- existing advisory and draft-only labels;
- existing human-initiation and disposition requirements;
- existing legal, jurisdictional, operational, and governance prohibitions; and
- existing audit and traceability requirements.

The specialization is a data-only mapping. It does not become a caller or
consumer of the current runtime and does not alter current runtime behavior.

## 7. Evidence-based component classification

| Component or concern | Classification | PR B treatment |
|---|---|---|
| Generic lifecycle, evidence references, assumptions, unknowns, alternatives, dissent, advisory output, human disposition, failure, and termination concepts | Layer A — Generic CAO Core | Represented as business-neutral types |
| Generic business context categories and reference-only specialization boundary | Layer A — Generic boundary contract | Represented as nonexecuting types |
| OwnerPilot CAO role identity, Founder approval, charter, evidence scope, labels, task classes, model assignment, legal controls, jurisdiction controls, and audit requirements | Layer B — OwnerPilot specialization | Referenced from verified existing modules |
| Authentication, secrets, provider transport, environment isolation, route access, rate limits, browser/server boundaries, and deployment configuration | Layer C — Platform and Security Infrastructure | Excluded from Generic CAO contract |
| Existing CAO Preview workbench orchestration, response wrappers, route-specific payloads, PR A diagnostics, and presentation details | Layer D — Temporary or incidental implementation detail | Preserved; not promoted into Generic CAO |
| OPOS and OPIL | Layer B — OwnerPilot-governed architecture | Not imported, implemented, migrated, or reinterpreted by PR B |
| BTRM and OwnerPilot product reasoning engines | Layer B — OwnerPilot product and intelligence architecture | Not imported, implemented, migrated, or reinterpreted by PR B |
| Recommendation Object and Decision Graph artifacts | Layer B — OwnerPilot-governed recommendation architecture | Not imported into Generic CAO and not implemented by PR B |
| AEOS and future enterprise-definition or compiler concepts | Future architecture outside PR B | Reserved only; no dependency or implementation |

## 8. Universality test

A concept is included in the Generic CAO boundary only when it:

1. has business-neutral meaning;
2. does not depend on OwnerPilot’s mission, product, law, jurisdiction,
   Constitution, repository, provider, or deployment platform;
3. can be expressed without importing OwnerPilot modules or values;
4. remains valid when the enterprise specialization is replaced; and
5. does not itself grant authority.

Concepts whose meaning, evidence, constraints, or authority depend on
OwnerPilot remain in the OwnerPilot specialization.

A concept must remain unresolved rather than being forced into the Generic CAO
layer when repository evidence is incomplete.

## 9. Layer C — Platform and security separation

The Generic CAO contract and business-adapter contract contain no:

- authentication logic;
- bearer-secret handling;
- browser or server access policy;
- environment-variable reads;
- provider transport;
- credentials;
- rate limiting;
- request-size enforcement;
- route behavior;
- persistence;
- deployment configuration; or
- Production access.

Those concerns remain outside the Generic CAO contract.

## 10. Runtime and behavior preservation

The current patch does not modify:

- the existing CAO Preview registry;
- the existing CAO assignment contract;
- the existing CAO output contract;
- the existing evaluation runner;
- the existing single-role execution seam;
- the existing Preview gate;
- the existing route or UI contracts;
- the existing Gateway adapter;
- the existing live-run composition;
- the existing workbench;
- evidence collection;
- retry, repair, fallback, substitution, or continuation behavior;
- persistence;
- deployment configuration; or
- Production behavior.

No existing runtime module imports the new Generic CAO files.

The new tests are deterministic and local. They verify that:

- the generic files remain nonexecuting;
- OwnerPilot and platform terms remain absent from the generic files;
- authority remains externally established;
- the adapter cannot grant authority;
- the OwnerPilot specialization maps to existing constants;
- Preview remains eligible only through existing controls;
- Production remains ineligible; and
- no future enterprise-definition architecture is adopted.

## 11. Nonexecuting context-field analysis

The business-adapter field categories are conceptual contract fields only.

They are not:

- an executable manifest;
- a language schema;
- a parser input;
- a compiler input;
- generated runtime configuration;
- an enterprise loader;
- a role-construction instruction;
- a model-assignment instruction;
- a tool-assignment instruction;
- an environment-activation instruction; or
- a deployment instruction.

## 12. Future Enterprise-Definition Compatibility — Reservation Only

The Generic CAO contract is being designed so business context can be
externally supplied.

No enterprise-definition language is selected.

No AEDL or AML adoption is occurring.

No compiler or generator is authorized.

No manifest runtime is authorized.

No executable enterprise construction is authorized.

Future compatibility will require separate reconciliation against stable AEOS
artifacts.

OwnerPilot remains independently governed and operationally independent.

This reservation is:

- draft-only;
- nonexecuting;
- noncanonical;
- nonauthoritative; and
- independent of any named future language.

It does not authorize:

- an AEDL parser or schema;
- an AML rename or adoption;
- OPML or another OwnerPilot-specific language;
- an enterprise-definition loader;
- compilation or code generation;
- manifest-driven executive construction;
- automatic department or role creation;
- automatic policy activation;
- automatic model or tool assignment;
- automatic environment eligibility;
- automatic deployment; or
- a runtime dependency on AEOS.

Any future enterprise-definition or compiler architecture requires separate
Founder-authorized reconciliation after the relevant AEOS standards stabilize.

## 13. Explicit exclusions

PR B does not authorize or implement:

- AEOS migration;
- a new executive runtime;
- a new CAO run;
- a live Founder acceptance run;
- Production access;
- Production configuration changes;
- schema or persistence changes;
- provider or model changes;
- limit changes;
- retry, repair, fallback, substitution, continuation, or dispatch changes;
- repository-write or deployment authority;
- legal-control activation;
- jurisdiction activation;
- Los Angeles control activation;
- attorney routing;
- RDO activation;
- ECAP Phase B;
- Recommendation Object migration;
- Decision Graph migration;
- OPOS or OPIL implementation; or
- any change to PR #338 or PR #335.

## 14. Review posture

This PR must remain Draft.

Before any merge consideration, the Founder should confirm:

- the Generic CAO contract is sufficiently business-neutral;
- the business-adapter contract is nonauthoritative;
- the OwnerPilot specialization boundary is complete but not overbroad;
- platform and security concerns remain outside the Generic CAO;
- existing runtime behavior is unchanged;
- future enterprise-definition compatibility is reservation-only; and
- no unauthorized architecture or authority has been introduced.

No merge or Production deployment is authorized by this packet.
