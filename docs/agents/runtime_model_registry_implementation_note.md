# Runtime Model Registry Implementation Foundation

**Status:** NONCANONICAL IMPLEMENTATION NOTE
**Authority:** Founder-authorized development and pull-request preparation only
**Production authority:** None
**Preview activation authority:** None
**Constitutional consequence:** None
**Legal consequence:** None
**Persistence authority:** None

## 1. Purpose

This note describes the bounded implementation foundation prepared from the
noncanonical Runtime Model Assignment Registry design and the three
noncanonical executive-agent charters merged through PR #321.

It does not amend, replace, reconcile, reinterpret, or canonically adopt those
design drafts. It does not amend or reinterpret IMR-001.

## 2. Implemented foundation

The implementation consists only of:

- provider-neutral TypeScript registry types;
- closed role, task, tool, authority, environment, and status vocabularies;
- role-specific task and tool boundaries;
- fail-closed deterministic registry-entry validation;
- fail-closed deterministic run-request validation;
- explicit Preview-only eligibility validation;
- explicit human-initiation and Founder-approval-reference validation;
- pinned model-version and moving-alias validation;
- provider-substitution and automatic-fallback prohibitions;
- fallback non-expansion validation;
- latency, timeout, token, per-run cost, and projected daily-cost limits;
- disagreement, uncertainty, and incomplete-evidence preservation controls;
- bounded audit-metadata validation;
- typed synthetic fixtures;
- deterministic unit tests.

The implementation uses pure TypeScript and adds no dependency.

## 3. Initial closed role set

Only these role identifiers are represented:

- `executive.ceo`
- `executive.chief_of_staff`
- `executive.chief_architecture_officer`

No additional executive, director, departmental, specialist, or worker role is
implemented or authorized.

## 4. Provider and model neutrality

The types contain fields for provider, model, pinned version, and adapter
identifiers because those fields are required by the approved design.

No real provider, model, adapter, primary assignment, challenger assignment,
or fallback assignment is configured.

Synthetic fixtures use synthetic identifiers only. They do not express a
selection, recommendation, preference, or eligibility determination for any
provider or model.

## 5. Deny-by-default behavior

Unlisted role IDs, task classes, tool permissions, authority categories,
fields, environments, and values are rejected by default.

The validator rejects or blocks, among other things:

- Production eligibility or execution;
- non-Preview execution;
- missing explicit human initiation;
- missing or mismatched Founder approval references;
- unpinned or moving model versions;
- automatic provider substitution;
- automatic primary-to-fallback substitution;
- fallback authority expansion;
- limit bypasses;
- role self-expansion;
- repository or database writes;
- deployment or release capabilities;
- external-message sending;
- legal-control capabilities;
- notice capabilities;
- payment capabilities;
- attorney-routing capabilities;
- jurisdiction activation;
- Los Angeles-rule activation;
- constitutional-record modification;
- legal-record modification.

A prohibited tool may appear in bounded audit metadata only as a denied tool
attempt.

## 6. Synthetic fixtures and tests

The fixture library contains synthetic-only accepted and rejected examples for
the authorized validation scenarios.

The test suites cover:

- closed vocabulary and deny-by-default behavior;
- exact role-specific task boundaries;
- exact role-specific tool boundaries;
- Preview-only eligibility;
- Production prohibition;
- explicit human initiation;
- Founder approval references;
- pinned model versions;
- provider substitution and fallback prohibitions;
- fallback non-expansion;
- token, latency, timeout, per-run cost, and projected daily-cost enforcement;
- disagreement and uncertainty preservation;
- incomplete or unknown evidence escalation;
- bounded audit metadata;
- prohibited authority categories;
- assertion-helper failure behavior.

Tests make no live model, provider, Gateway, database, external API, network,
Preview service, or Production service call.

## 7. Runtime and activation boundary

No agent execution path is created.

No application route, API route, user interface, orchestration layer, prompt,
provider client, model call, adapter call, persistence layer, deployment
control, or external communication mechanism imports or invokes this
foundation.

The reserved design name `EXECUTIVE_AGENTS_PREVIEW_ENABLED` is not created,
read, enabled, or connected to an executable gate.

`CHAT_AI_SDK_ENABLED` is not modified.

The existence or merge of these files cannot make an executive-agent behavior
reachable.

## 8. Audit and persistence boundary

The implementation defines a bounded audit-metadata structure and validates
synthetic audit records in memory.

It does not:

- persist audit records;
- create database tables or migrations;
- write sessions;
- retain provider requests or responses;
- store unrestricted prompts, transcripts, responses, or errors;
- create operational logs;
- create authoritative timestamps;
- connect to Supabase or another persistence service.

## 9. Files added

- `lib/ai/modelRegistry.ts`
- `lib/ai/modelRegistry.test.ts`
- `lib/agents/registryValidator.ts`
- `lib/agents/registryValidator.test.ts`
- `lib/agents/__fixtures__/registryFixtures.ts`
- `docs/agents/runtime_model_registry_implementation_note.md`

The four PR #321 design drafts remain unchanged.

## 10. Rollback

Rollback consists of reverting the pull-request commit that introduces the six
files listed above.

Because the foundation has no runtime import, route, environment variable,
database schema, persistence, deployment configuration, or feature-flag
connection, rollback requires no data migration, provider action, secret
rotation, deployment switch, or user-facing remediation.

## 11. Unimplemented and unauthorized work

The following remain unimplemented and unauthorized:

- provider selection or assignment;
- model selection or assignment;
- adapter selection or assignment;
- registry-entry configuration;
- live agent execution;
- agent prompts;
- orchestration;
- agent-to-agent initiation;
- scheduled operation;
- application or API integration;
- agent user interface;
- feature-flag creation;
- Preview activation;
- Production activation;
- persistence;
- audit storage;
- database changes;
- environment-variable changes;
- external communication;
- constitutional adoption;
- legal-control activation;
- notice generation, production, service, sending, or release;
- payment action or consequence;
- attorney recommendation, connection, referral, assignment, or routing;
- jurisdiction classification or activation;
- Los Angeles-rule activation.

## 12. Next required Founder decision

A separate Founder authorization is required before any work may:

- assign a provider, model, adapter, or model slot;
- create a registry entry for execution;
- create or read an executable Preview feature gate;
- connect the foundation to an agent, route, prompt, user interface, or
  orchestration layer;
- run an executive agent locally or in Preview;
- persist audit or session data;
- expand the role, task, tool, environment, or authority vocabulary;
- modify any constitutional, legal, compliance, jurisdiction, notice, payment,
  attorney, or Production control.

Merge of the implementation pull request also requires separate Founder
review and approval.
