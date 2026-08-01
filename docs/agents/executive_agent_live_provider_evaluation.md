# Executive-Agent Live-Provider Evaluation

**Status:** NONCANONICAL IMPLEMENTATION NOTE
**Authority:** Omnibus Founder Authorization dated 2026-08-01
**Baseline:** `29725db919dac324914cfb7c272cc46ffc28e505`
**Production authority:** None
**Preview activation authority:** None
**Persistence authority:** None
**Provider/model-selection consequence:** None
**Constitutional or legal consequence:** None

## Purpose

This slice prepares a human-invoked, local-only live-provider
evaluation of the three approved executive-agent roles. It uses
only the committed synthetic evaluation fixtures and produces one
bounded JSON report for human review.

It does not create a runtime agent, assign a model, activate a
Preview gate, write to a project database, activate Production, or
authorize any consequential action.

## Boundaries

- Explicit human confirmation is required once per command.
- The Git working tree must be clean.
- `--source-commit` must exactly match `Git Revision HEAD`.
- The Gateway key must be read from a regular file outside the
  repository.
- The credential file must grant no group or other permissions.
- The credential is never included in the report.
- Only explicitly named synthetic cases are evaluated.
- Each case makes exactly one primary and one challenger call.
- Automatic retries, fallback models, provider substitution, model
  repair, persistence, and automatic winner selection are prohibited.
- The report always requires human disposition.

## Initial evaluation pair

As of 2026-08-01, the initial bounded comparison pair is:

| Slot | Model ID | Gateway provider restriction | Diagnostic input price | Diagnostic output price |
|---|---|---|--:|--:
| Primary | `anthropic/claude-sonnet-5` | `anthropic` | $2.00/M = `2000000` micros | $10.00/M = `10000000` micros |
| Challenger | `openai/gpt-5.6-terra` | `openai` | $2.00/M = `2000000` micros | $12.00/M = `12000000` micros |

These are noncontrolling evaluation inputs. They do not represent
provider or model approval, assignment, ranking, or selection. Model
availability, provider slugs, and pricing must be reverified against
the official Vercel AI Gateway catalog before each live run.

The pair and diagnostic prices above were verified on 2026-08-01 through the
installed AI SDK Gateway metadata client using an explicit bounded evaluation
key. The metadata reported per-token prices equivalent to $2.00/M input and
$10.00/M output for Claude Sonnet 5, and $2.00/M input and $12.00/M output for
GPT 5.6 Terra. No model-generation request was made during that verification.

## Credential file

Prepare the credential file outside the repository and restrict it:

 ```bash
 chmod 600 /absolute/path/to/ai-gateway-key
 ```

The file must contain only the single Gateway token. The token
must not be pasted into the command line, a repository file, or the
report output.

## Initial smoke run

The first run should use one synthetic case only, producing two bounded
Data calls. The report should be written to a temporary path outside
the repository.

```bash
npx tsx scripts/agents/run_executive_agent_live_evaluation.ts \
  --confirm-live-provider-evaluation \
  --suite-id executive-agent-live-smoke-2026-08-01 \
  --source-commit "$(git rev-parse HEAD)" \
  --approval-reference founder-omnibus-authorization-2026-08-01 \
  --gateway-api-key-file /absolute/path/to/ai-gateway-key \
  --case-id synthetic-cao-architecture-dissent-v1 \
  --maximum-output-tokens 1200 \
  --timeout-ms 60000 \
  --primary-provider-id anthropic \
  --primary-model-id anthropic/claude-sonnet-5 \
  --primary-pinned-model-version anthropic/claude-sonnet-5 \
  --primary-reasoning-level standard \
  --primary-input-micros-per-million-tokens 2000000 \
  --primary-output-micros-per-million-tokens 10000000 \
  --challenger-provider-id openai \
  --challenger-model-id openai/gpt-5.6-terra \
  --challenger-pinned-model-version openai/gpt-5.6-terra \
  --challenger-reasoning-level standard \
  --challenger-input-micros-per-million-tokens 2000000 \
  --challenger-output-micros-per-million-tokens 12000000 \
  > "${TMPDIR:-/tmp}/ownerpilot-executive-agent-live-report.json"
```

## Report disposition

The report must be treated as evaluation evidence only. A human must
review each qualitative dimension, dissent, unknown, refusal, and
boundary finding. Latency, token usage, and estimated cost remain
diagnostic only.

No composite score, model vote, ranking, or automatic winner may be
derived from the report.

## Official references

- Vercel AI Gateway Pricing: https://vercel.com/docs/ai-gateway/pricing
- Claude Sonnet 5 on AI Gateway:
  https://vercel.com/changelog/claude-sonnet-5-ai-gateway
- GPT-5.6 Terra on AI Gateway:
  https://vercel.com/ai-gateway/models/gpt-5.6-terra
