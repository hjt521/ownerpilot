# Executive-Agent Provider Evaluation Disposition

**Status:** NONCANONICAL HUMAN-REVIEW RECOMMENDATION
**Authority:** Omnibus Founder Authorization dated 2026-08-01
**Evaluation source commit:** `3e50d8c69c12de54ca55c9c5731164e441811482`
**Prompt version:** `executive-agent-live-evaluation-v2`
**Production authority:** None
**Preview activation:** Not performed
**Provider/model assignment approval:** Pending human disposition
**Automatic selection:** Prohibited and not performed
**Constitutional or legal consequence:** None

## 1. Evaluated candidates

| Evaluation slot | Provider | Pinned model | Adapter |
|---|---|---|---|
| Primary | Anthropic | `anthropic/claude-sonnet-5` | `vercel-ai-gateway-v1` |
| Challenger | OpenAI | `openai/gpt-5.6-terra` | `vercel-ai-gateway-v1` |

The slot labels above describe the evaluation configuration only. They do not
create a runtime assignment.

## 2. Evaluation evidence

The prompt-version-2 suite evaluated four approved synthetic cases and made
exactly eight bounded provider calls.

Across the eight runs:

- 8 of 8 outputs completed or refused as required;
- 8 of 8 outputs satisfied the strict schema;
- 8 of 8 outputs satisfied the authority boundary;
- all required evidence IDs were returned exactly and without annotations;
- both candidates correctly refused the prohibited-action case;
- both candidates preserved material disagreement where required;
- both candidates preserved uncertainty where evidence was incomplete;
- no blocking finding was recorded;
- human review remained required for every case.

The qualitative comparison produced:

- 24 `equivalent` dimension comparisons;
- 8 `inconclusive` comparisons;
- no dimension in which either candidate was recorded as stronger.

The inconclusive dimensions were limited to behavior that the applicable
fixture did not exercise, such as provider-failure handling or refusal behavior
outside the prohibited-action case.

## 3. Noncontrolling diagnostic evidence

Aggregate evaluation diagnostics were:

| Diagnostic | Claude Sonnet 5 | GPT-5.6 Terra | Terra difference |
|---|---:|---:|---:|
| Input tokens | 8,187 | 3,271 | 60.0% lower |
| Output tokens | 6,878 | 2,267 | 67.0% lower |
| Cumulative latency | 77,977 ms | 27,132 ms | 65.2% lower |
| Estimated cost | 85,154 micros | 33,746 micros | 60.4% lower |

These measurements are diagnostic only. They do not independently establish
correctness, wisdom, approval, ranking, or authority.

## 4. Human-review recommendation

Because the evaluated qualitative dimensions were equivalent or inconclusive,
and because GPT-5.6 Terra used materially less latency, tokens, and estimated
cost in every evaluated case, the recommended draft configuration is:

- proposed primary: `openai/gpt-5.6-terra`;
- proposed challenger: `anthropic/claude-sonnet-5`;
- fallback: none;
- reasoning level: `standard`;
- environment eligibility: Preview only;
- output disposition: draft only;
- automatic provider substitution: prohibited;
- automatic fallback: prohibited.

This is a recommendation for human disposition, not a provider or model
approval. Claude Sonnet 5 remains the proposed challenger so later human-led
evaluation can compare it against the proposed primary without silent
substitution.

## 5. Draft registry implementation

The accompanying registry entries:

- cover only the three approved executive roles;
- use the unchanged charter Git blobs as immutable charter references;
- have status `draft`;
- have both proposed assignments disabled;
- contain no fallback assignment;
- preserve exact role task and tool boundaries;
- preserve all prohibited permissions;
- require explicit human initiation and Founder approval;
- remain Preview-only and Production-ineligible;
- cannot pass executable run-request validation.

The omnibus authorization reference records authority to prepare the draft
configuration. It is not treated as role-specific Preview activation approval.

## 6. Required human disposition

Before any entry may change to `preview_approved` or any assignment may become
enabled, a human must explicitly decide:

1. whether to approve Terra as primary;
2. whether to approve Sonnet as challenger;
3. whether the proposed limits are acceptable;
4. whether the three charter Git blobs are accepted as the initial charter
   version references;
5. whether isolated Preview activation should proceed under a separately
   recorded role-specific approval reference.

Silence, model output, this recommendation, merge of the draft entries, or the
omnibus development authorization is not Preview activation approval.

## 7. Explicit non-actions

This disposition performs no Preview activation, Production activation,
provider substitution, fallback, persistence, database change, repository
action by an agent, deployment, external communication, legal-control action,
notice action, payment action, attorney routing, jurisdiction activation,
Los Angeles-rule activation, or constitutional modification.
