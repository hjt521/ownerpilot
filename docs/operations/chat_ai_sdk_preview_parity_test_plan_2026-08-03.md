# Customer Chat AI SDK Preview Parity Test Plan

**Status:** PREVIEW-ONLY ENGINEERING TEST PLAN  
**Founder authorization:** OwnerPilot Founder + Architect Session — Preview-Only Live AI SDK Chat Parity Test — 2026-08-03  
**Production authority:** None  
**Migration authority:** None  
**REST removal authority:** None

## Workstream boundary

This plan applies only to the existing customer-chat migration path controlled by `CHAT_AI_SDK_ENABLED`.

It does not use or expand Executive Agent roles, gates, routes, model assignments, workflow state, output contracts, authentication boundaries, or authority.

## Verified source baseline

- Main source commit: `c0d32998d7972163e402efc184506452bc0e2825`.
- AI SDK package: `ai@6.0.239`.
- Customer chat route: `POST /api/chat`.
- Default path: direct Perplexity REST adapter.
- Dark path: AI SDK v6 adapter through Vercel AI Gateway.
- Customer-visible response remains non-streaming JSON.
- Existing Supabase `chat_sessions` persistence remains unchanged.
- AI SDK failure does not invoke the REST adapter.

## Bounded correction in this branch

`chatAiSdkEnabled()` now requires both:

1. `VERCEL_ENV === 'preview'`; and
2. `CHAT_AI_SDK_ENABLED` equal to `1` or `true` after bounded normalization.

Production therefore remains on REST even if the flag is accidentally configured there.

## Citation blocker

The current validated model response contract contains:

- `reply`;
- `extracted_fields`;
- `intake_complete`;
- `refusal`.

It does not contain a citation collection or citation-reference contract. The existing customer response shape also does not expose citation metadata.

Accordingly, citation-required parity cases cannot be objectively evaluated without a separate bounded design decision defining:

- citation source identifiers;
- allowed URL or source-reference formats;
- reference-to-claim linkage;
- validation and rejection rules;
- persistence treatment;
- customer-visible compatibility.

This branch does not silently invent that contract. Citation parity is a migration blocker and Founder-review item for a later bounded slice.

## Deterministic test matrix

The repository tests must verify:

1. Preview plus flag off selects REST.
2. Preview plus flag on selects AI SDK.
3. Production plus flag on still selects REST.
4. Development plus flag on still selects REST.
5. Missing environment plus flag on still selects REST.
6. Preview E2E mock remains first in precedence.
7. AI SDK failure propagates to the sanitized route boundary.
8. AI SDK failure performs no REST fallback.
9. Structured output is accepted only after Zod validation.
10. Missing or malformed required fields are rejected.
11. Provider authentication, rate-limit, timeout, model, and unknown failures map to bounded categories.
12. Raw provider details, URLs, bearer tokens, and configured credentials are not returned to the browser.
13. Existing route response shape remains `{ reply, refusal, routeToReview, missingFields }` on success.
14. Existing persistence remains after complete validation and output gating.
15. No raw or partial model output is streamed.

## Live Preview plan

### Deployment

Use one isolated Vercel Preview deployment from this branch.

### Environment scope

- `CHAT_AI_SDK_ENABLED=true`: branch-scoped Preview only.
- `AI_GATEWAY_API_KEY`: existing Preview-only server secret, if already present and authorized.
- No Production environment-variable changes.
- No Executive Agent variables reused as authorization.

### Model

Use the existing customer-chat model selection encoded by the repository: `perplexity/sonar-pro` through Vercel AI Gateway.

No fallback model and no provider substitution are permitted.

### Synthetic execution order

1. Confirm branch deployment is Preview and Ready.
2. Confirm Production deployment and Production environment variables are unchanged.
3. Run focused deterministic tests and full repository tests.
4. Submit bounded synthetic ordinary factual prompts through the AI SDK Preview path.
5. Submit uncertainty and long-but-bounded synthetic prompts.
6. Exercise deterministic malformed, missing-field, authentication, rate-limit, timeout, and model-failure cases through injected tests rather than exposing live credentials or forcing provider abuse.
7. Compare successful AI SDK results to materially equivalent REST fixtures or a separate flag-off Preview deployment.
8. Record only bounded metrics and categorical findings.

### Evidence captured

- source commit;
- deployment ID and Preview environment;
- selected path;
- pinned model ID;
- structured-output pass/fail;
- response-shape compatibility;
- bounded latency;
- token usage when available;
- estimated cost when a verified pricing source is available;
- sanitized failure category;
- persistence success/failure category;
- fallback and substitution occurrence, expected `false`;
- citation test status, currently `blocked_no_contract`.

Do not record prompts or responses beyond bounded synthetic identifiers and categorical findings.

### Stop conditions

Stop before live execution if:

- the deployment is not Preview;
- the flag is not branch-scoped;
- Production configuration would change;
- `ai@6.0.239` changes;
- a new provider or fallback is required;
- citation work would require a new response or persistence contract;
- customer or tenant data is proposed;
- Supabase schema or persistence expansion is proposed;
- raw model streaming is proposed.

### Rollback

1. Remove the branch-scoped Preview `CHAT_AI_SDK_ENABLED` value.
2. Redeploy or delete the isolated Preview deployment.
3. Close or revert this bounded PR.

The default REST path remains intact throughout.

## Success criteria for this slice

- 100% deterministic path-selection tests pass.
- Production is forced to REST by code.
- AI SDK failures never call REST.
- Structured-output and sanitized-failure tests pass.
- Full repository test suite passes.
- One isolated Preview deployment can execute bounded synthetic AI SDK chat requests.
- No Production, dependency, UI, persistence, schema, or Executive Agent change occurs.

Citation success criteria remain blocked until a separate citation contract is approved and implemented.

## Migration disposition boundary

This test may support only one of these findings:

- not ready for migration; or
- ready for additional Preview testing; or
- ready for staged limited migration planning.

It cannot authorize Production migration or REST removal.
