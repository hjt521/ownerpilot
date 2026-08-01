# Runtime Model Assignment Registry — Noncanonical Design Draft

**Status:** NONCANONICAL DESIGN DRAFT
**Environment:** Preview only
**Production authority:** None
**Implementation authority:** None
**Constitutional consequence:** None
**Legal-control authority:** None
**Founder approval required before implementation:** Yes

## 1. Purpose

This document proposes a provider-neutral Runtime Model Assignment Registry
for assigning foundation-model infrastructure to bounded OwnerPilot roles.

It is intentionally separate from proposed constitutional registry IMR-001.
IMR-001 concerns OwnerPilot intelligence capabilities. This document concerns
runtime infrastructure assignments: which provider model may support a role,
under which task, tool, cost, latency, substitution, and approval constraints.

This draft does not amend, extend, interpret, ratify, or implement IMR-001.

## 2. Repository placement

Documentation:

- Registry design: `docs/agents/runtime_model_assignment_registry_design.md`
- Executive charters: `docs/agents/charters/`
- Future operational runbooks: `docs/runbooks/`

Possible future implementation, not authorized by this draft:

- Registry types and validation: `lib/ai/modelRegistry.ts`
- Executive-role controls: `lib/agents/`
- Preview gate: `lib/agents/previewGate.ts`
- Audit-record assembly: `lib/agents/auditRecord.ts`
- Typed fixtures: `lib/agents/__fixtures__/`
- Colocated tests under `lib/ai/` and `lib/agents/`

No runtime file, database row, feature flag, provider call, or agent is created
by this documentation phase.

## 3. Design principles

1. Provider and model identifiers are data, not hard-coded authority.
2. Every eligible assignment uses a pinned model version.
3. Unlisted task classes and tools are denied.
4. Every role is Preview-only and disabled in Production.
5. Every run requires explicit human initiation.
6. Every output is a draft, recommendation, or review artifact.
7. Provider or model substitution is never silent.
8. A fallback inherits no authority beyond the primary assignment.
9. Model output is never approval, ratification, release authority, or a
   Production instruction.
10. Registry entries cannot activate or alter legal, notice, payment,
    attorney, jurisdictional, Los Angeles, or constitutional controls.
11. Audit records use bounded metadata rather than unrestricted prompts,
    documents, transcripts, credentials, or provider error bodies.
12. A role cannot expand its own permissions, task classes, limits, or status.

## 4. Proposed registry entry

Each registry entry must contain:

- `roleId`
- `registryVersion`
- `charterVersion`
- `status`
- `primaryModel`
- `challengerModel`
- `fallbackModel`
- `allowedTaskClasses`
- `toolPermissions`
- `reasoningLevel`
- latency, token, and cost limits
- human-approval requirements
- provider-substitution policy
- audit metadata

Allowed status values:

- `draft`
- `preview_approved`
- `suspended`
- `retired`

## 5. Role IDs

Initial proposed role identifiers:

- `executive.ceo`
- `executive.chief_of_staff`
- `executive.chief_architecture_officer`

Role IDs are stable identifiers. A display-name change cannot silently alter
authority. Adding another role requires Founder approval before Preview use.

## 6. Model assignments

Each primary, challenger, or fallback assignment must include:

- `providerId`
- `modelId`
- `pinnedModelVersion`
- `adapterId`
- `enabled`
- `intendedUse`

Rules:

- Provider, model, adapter, and pinned version must be explicit.
- Moving aliases without a pinned revision are ineligible.
- Challenger output is evaluation-only.
- A challenger cannot silently become primary.
- Fallback assignment is optional and disabled by default.
- No eligible fallback produces a bounded failure.
- Model failure cannot invoke an unregistered provider.
- Assignment changes require Founder approval before Preview use.

## 7. Allowed task classes

Initial closed vocabulary:

- `strategic_analysis`
- `operating_priority_draft`
- `executive_brief`
- `cross_function_synthesis`
- `dependency_review`
- `architecture_analysis`
- `architecture_option_draft`
- `risk_register_draft`
- `decision_memo_draft`
- `meeting_agenda_draft`
- `follow_up_register_draft`
- `evaluation_only`

Explicitly excluded:

- legal determination or legal-control activation;
- notice generation, production, service, or release;
- payment acceptance, rejection, waiver, refund, or consequence;
- attorney selection, assignment, connection, referral, or routing;
- jurisdiction activation or classification;
- Los Angeles rule activation;
- Production deployment, configuration, or data modification;
- autonomous customer communication;
- autonomous negotiation, commitment, or execution.

Each role charter must narrow this vocabulary further.

## 8. Tool permissions

The future permission policy must be deny-by-default.

Candidate read-only and draft-only permissions:

- `repository.read`
- `approved_documents.read`
- `preview_logs.read_sanitized`
- `evaluation.run_local`
- `draft.memo`
- `draft.plan`
- `draft.architecture_option`
- `draft.work_item_proposal`

Prohibited in the initial phase:

- `repository.write`
- `git.commit`
- `git.push`
- `github.merge`
- `deployment.create`
- `production.read_secret`
- `production.write`
- `environment.modify`
- `database.write`
- `external_message.send`
- `notice.release`
- `payment.action`
- `attorney.route`
- `jurisdiction.activate`
- `los_angeles_rules.activate`
- `constitutional_record.modify`
- `legal_record.modify`
- `authority.self_expand`

A tool not expressly allowed is denied.

## 9. Reasoning level

Supported levels:

- `minimal`: extraction, formatting, and simple status assembly.
- `standard`: bounded synthesis, prioritization, and comparison.
- `deep`: architecture or strategy analysis requiring evidence,
  alternatives, uncertainty, limitations, and dissent recording.

Reasoning level cannot expand task, tool, environment, or approval authority.

## 10. Latency and cost limits

Every entry must declare:

- hard timeout;
- target p95 latency;
- maximum input tokens;
- maximum output tokens;
- maximum estimated cost per run;
- maximum estimated cost per day.

A hard-limit breach ends the run as `blocked_limit`.

It cannot trigger an unapproved retry loop, provider substitution, fallback,
or limit bypass.

Limit increases require Founder approval before Preview use.

## 11. Human-approval requirements

Every run must require an explicit human request.

Every output must remain `draft_only`.

Founder approval is required before:

- first Preview activation of a role;
- first primary, challenger, or fallback assignment;
- provider, model, adapter, or pinned-version change;
- adding a task class or tool permission;
- increasing cost or latency limits;
- changing substitution or fallback policy;
- changing a charter in a way that affects authority;
- movement beyond Preview;
- repository-writing, deployment, database-writing, or external-message
  capability;
- any legal, notice, payment, attorney, jurisdiction, Los Angeles,
  constitutional, or Production capability.

Silence, inactivity, model output, or approval of another role is not approval.

## 12. Provider-substitution policy

Initial policy:

- automatic primary-to-fallback substitution: prohibited;
- automatic provider change: prohibited;
- equivalent or stricter limits required;
- identical task and tool boundaries required;
- bounded substitution reason required in the audit record;
- Founder approval required before substitution;
- provider outage does not create substitution authority.

A fallback cannot expand authority beyond the primary assignment.

## 13. Audit metadata

A future run should assemble bounded metadata including:

- run ID;
- role ID;
- charter and registry versions;
- registry-entry hash;
- environment and source commit;
- requester and approval reference;
- task class;
- model slot;
- provider, model, pinned version, and adapter;
- reasoning level;
- effective tool permissions;
- tool calls;
- substitution or fallback reason class;
- start, completion, and latency;
- token counts and estimated cost;
- evidence references;
- unknowns and disagreements;
- outcome and human disposition.

The audit record must not contain:

- credentials or authentication headers;
- unrestricted provider responses or errors;
- raw secrets;
- unnecessary personal information;
- an unbounded transcript;
- legal-control payloads;
- tenant notices;
- payment instructions.

Audit persistence is not authorized in this phase.

## 14. Preview-only gate

A future gate must be default-off and fail closed.

All of these conditions must be true:

- Vercel environment is exactly `preview`;
- the Preview feature flag is explicitly enabled;
- the particular role has recorded Founder approval for Preview.

Production must remain disabled even when a flag is accidentally present.

Proposed future flag name:

`EXECUTIVE_AGENTS_PREVIEW_ENABLED`

This document does not create or enable that flag.

It does not modify or enable `CHAT_AI_SDK_ENABLED`.

## 15. Evaluation fixtures

Recommended future location:

`lib/agents/__fixtures__/`

Typed synthetic fixtures should cover:

- allowed task and allowed tool;
- unlisted task rejection;
- prohibited tool rejection;
- Production-environment rejection;
- missing Founder approval;
- pinned-version mismatch;
- cost-limit breach;
- latency-limit breach;
- provider-substitution attempt;
- fallback-authority non-expansion;
- disagreement preservation;
- unknown-evidence escalation;
- attempted legal-control activation;
- attempted notice release;
- attempted payment consequence;
- attempted attorney routing;
- attempted Los Angeles activation.

Fixtures must contain no customer, tenant, credential, or Production data.

## 16. Proposed implementation sequence

Every stage requires separate authorization:

1. Founder reviews this design and the three charters.
2. Documentation is revised without runtime implementation.
3. Founder approves or rejects the design.
4. Pure TypeScript types and validators are proposed.
5. Synthetic fixtures and unit tests are proposed.
6. A Preview-only, default-off gate is proposed.
7. One read-only role is evaluated locally and in isolated Preview.
8. Evidence is presented to the Founder.
9. Production remains out of scope absent new explicit authorization.

## 17. Current disposition

This document creates no agent, runtime authority, provider assignment,
environment setting, database row, constitutional artifact, legal artifact,
Production path, notice authority, payment authority, attorney-routing
authority, jurisdiction authority, or Los Angeles-rule authority.
