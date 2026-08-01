# Executive-Agent Local Single-Role Execution

**Status:** NONCANONICAL IMPLEMENTATION NOTE
**Authority:** Omnibus Founder Authorization dated 2026-08-01
**Production authority:** None
**Preview activation authority:** None
**Persistence authority:** None
**Constitutional or legal consequence:** None

## Purpose

This slice adds a bounded, human-initiated local execution seam for one
executive role and one caller-injected model.

It reuses the strict structured-output evaluation runner. It creates no
provider lookup, fallback, persistence, application route, Preview gate,
Production capability, autonomous workflow, or state-changing tool.

## Preconditions

Execution fails closed unless the complete run request validates, the
registry entry is `preview_approved`, the selected primary or challenger
assignment is enabled, the role and task match, human initiation and
approval references are present, usage is bounded, and all tool lists are
empty.

The committed real registry entries remain `draft` and disabled and cannot
pass these execution preconditions.

## Behavior

The executor invokes exactly one injected model, uses zero automatic
retries, requires strict structured output, records bounded diagnostics,
checks actual limits, returns only a draft for human review, and leaves the
human disposition pending.

Actual token, cost, projected daily-cost, or latency overruns produce
`blocked_limit` and withhold the draft.

## Synthetic demonstration

Run:

`npx tsx scripts/agents/run_executive_agent_synthetic_single_role.ts`

The command uses one synthetic CEO case, the existing synthetic
`preview_approved` fixture, and one `MockLanguageModelV3`. It uses no real
provider, credential, network, customer, tenant, legal, payment, Preview,
or Production resource.

## Limitations

This slice does not approve or enable Terra or Sonnet, load repository
evidence, implement the three-role workflow, expose a route, activate a
Preview gate, or persist audit records.
