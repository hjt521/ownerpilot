# Executive-Agent Provider Evaluation Foundation

**Status:** NONCANONICAL IMPLEMENTATION NOTE
**Authority:** Omnibus Founder Authorization dated 2026-08-01
**Baseline:** `92b28c354df67da5485b9055cacb0792087a4d1d`
**Production authority:** None
**Preview activation authority:** None in this slice
**Provider/model-selection consequence:** None
**Persistence authority:** None
**Constitutional consequence:** None
**Legal consequence:** None

## Purpose

This slice creates a provider-neutral, human-initiated evaluation foundation
for the three approved roles:

- `executive.ceo`
- `executive.chief_of_staff`
- `executive.chief_architecture_officer`

It does not select or assign a real provider or model, create executable
registry entries, activate a Preview gate, or change Production behavior.

## Implemented scope

- provider-neutral evaluation contracts;
- strict injected AI SDK runner;
- synthetic role-boundary cases;
- primary-versus-challenger qualitative comparison;
- local deterministic evaluation suite and command;
- deterministic tests.

Evaluation dimensions remain separate: structured output, instruction
following, reasoning quality, evidence grounding, disagreement preservation,
uncertainty preservation, refusal behavior, and failure handling.

Latency, token usage, and estimated cost are diagnostic only. No composite
score, weighted score, ranking, vote, or automatic winner may determine a
material recommendation or model assignment.

## Safety posture

The runner requires an explicitly injected `LanguageModel` and performs no
provider lookup, Gateway lookup, environment-variable access, persistence,
database access, feature-gate access, automatic retry, provider substitution,
fallback, repair-model invocation, or model selection.

Moving model aliases are rejected. Fallback is not a comparison slot. Every
suite requires explicit human initiation and a Founder approval reference.
Every comparison requires human disposition.

Schema, provider, timeout, refusal, evidence, role, task, and boundary failures
fail closed and do not invoke another model.

## Local command

`npx tsx scripts/agents/run_executive_agent_synthetic_evaluation.ts`

The command uses synthetic fixtures and `MockLanguageModelV3` only.

## Deliberately unimplemented

No live-provider evaluation, real assignments, executable runtime registry,
operational prompts, agent orchestration, Preview route or gate, audit
persistence, Production execution, public access, autonomous operation,
repository/database writes, external communication, or legal, notice, payment,
attorney, jurisdiction, or Los Angeles authority is included.

## Next authorized stage

After merge, the omnibus sequence may continue with bounded live-provider
evaluation, documented evidence, human selection of pinned primary and
challenger assignments, executable registry entries, and versioned prompts.
All omnibus stop conditions remain controlling.
