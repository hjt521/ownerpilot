# OP-PDI-002 — Decision Output and Negotiation Preview

**Status:** Founder-directed bounded implementation candidate. Noncanonical until separately reviewed and integrated.

## 1. Purpose

OwnerPilot should not present decision intelligence as a short AI blurb or an opaque universal score. The intended product experience is a professional, businesslike and scientific decision-analysis surface that shows:

1. what decision is being evaluated;
2. which alternatives are currently represented as available under deterministic controls;
3. how each alternative branches into possible outcomes;
4. the represented probability and consequence of each branch;
5. transparent expected-value and expected-duration arithmetic;
6. the tradeoffs among recovery, speed, possession, owner workload and other explicit objectives;
7. which facts, estimates, assumptions and unknowns support the analysis;
8. what variables would flip the recommendation;
9. which missing fact has the highest represented value of information;
10. how a negotiation or communication intervention could change the represented outcome distribution;
11. the proposed communication for owner review;
12. the predicted response branches after that communication;
13. a fresh forecast after new counterparty evidence; and
14. the owner decision boundary before any action.

The conceptual visual ancestor is a decision/game tree: decision node → response/outcome branches → terminal consequences. OwnerPilot extends that structure with governed eligibility, probabilities, multi-dimensional outcomes, calculations, uncertainty provenance, negotiation intervention and sensitivity analysis.

## 2. Governing separations

The product must preserve:

> deterministic controls determine what may be represented as available; prediction estimates what may happen.

> prediction ≠ recommendation.

> recommendation ≠ authority.

> negotiation strategy ≠ communication.

> communication ≠ authority to send or bind the owner.

> acceptance probability ≠ completion probability ≠ final outcome quality.

> probability ≠ legal correctness.

> expected value ≠ universally best decision.

> a model-generated number may not silently create legal, product, service, filing, payment, Production or execution authority.

The system must optimize represented final outcomes rather than simply maximize the probability that the counterparty says yes.

## 3. Founder-facing output sequence

The target decision output should read in this order:

1. **Matter and decision context** — exact matter/task stage, evaluated balance/time, evidence-quality classification and forecast identity.
2. **Recommended path** — executive answer first, with separate expected recovery, time, possession and confidence measures.
3. **Available decision set** — only alternatives admitted by the external deterministic control envelope.
4. **Decision roadmap** — branching decision/game tree showing downstream outcomes and terminal consequences.
5. **Strategy comparison** — multi-dimensional comparison; no universal OwnerPilot score.
6. **Calculation sheet** — visible probability-weighted arithmetic and later distribution/simulation details where justified.
7. **Scenario range** — favorable realistic, central/median, downside and tail outcomes with explicit percentile/threshold definitions.
8. **Negotiation improvement analysis** — baseline forecast versus represented communication intervention.
9. **Communication frontier** — compare structured communication approaches and show why higher acceptance can still produce a worse final outcome.
10. **Negotiation draft** — text/email/letter proposed for owner review only.
11. **Response tree** — acceptance, counteroffer, no response, rejection/dispute and conditional completion branches.
12. **Key drivers and owner priorities** — keep forecasts separate from owner preference weights.
13. **Decision-flip analysis** — show thresholds at which another strategy becomes preferred.
14. **Highest-value unknown** — identify when the best next move is to ask one question rather than make another offer.
15. **Evidence/assumption ledger** — verified facts, owner estimates, model assumptions and material unknowns.
16. **Model quality and provenance** — model identity, generation, numerical method, run count, calibration evidence and limitations.
17. **Owner decision boundary** — analysis stops before send/execute unless a separately governed action workflow is authorized.
18. **Next task** — return to the Matter model: current task → completed task → next task.

## 4. Negotiation intervention model

The decision system should be able to represent two futures:

**Baseline forecast**

> what is likely to happen under the current/default communication posture?

**Intervention forecast**

> what is likely to happen if the owner uses a specific structured negotiation strategy and communication?

The output should compare, as separate dimensions where supported:

- probability of response;
- probability of proposal acceptance;
- probability of completion conditional on acceptance;
- expected recovery;
- expected time to resolution;
- probability of voluntary resolution;
- possession probability by an explicit horizon;
- owner workload;
- downside/tail exposure.

The preferred communication is not necessarily the communication with the highest acceptance probability. A highly accommodating offer may increase acceptance while reducing completion, recovery or another owner objective. The policy layer should therefore evaluate the final modeled outcome under explicit owner priorities and constraints.

For a proposal where completion is conditional on acceptance, the direct proposal-to-completion branch is represented as:

`P(accept and complete) = P(accept) × P(complete | accept)`

This formula does not replace the broader outcome model; it exists to make the conditional relationship auditable.

## 5. Adaptive loop

The target loop is:

**Control → Predict → choose negotiation strategy → draft communication → owner review → separately authorized send → observe response → bind new evidence → update forecast → choose next move → owner decision → outcome → learning/calibration.**

A counterparty response must be treated as new evidence, not merely a prompt for another generated message.

Example:

1. OwnerPilot proposes a structured payment communication.
2. Counterparty replies with a different payment capacity and schedule.
3. OwnerPilot records the response as evidence.
4. The outcome and response models are rerun prospectively.
5. OwnerPilot compares accept/counter/ask/hold/reject/end under the updated state.
6. A new communication may then be drafted for owner review.

No automatic continuation is implied by this architecture.

## 6. Value of information

The system should not always generate an offer. If one missing fact has greater expected decision value than another negotiation move, the recommended advisory move may be **Ask**.

The output should identify:

- the highest-value unknown;
- why it could change the current decision;
- which branches it affects;
- what decision could flip after the answer.

The first bounded Preview may use a deterministic synthetic fixture. A future numerical VOI model requires its own evidence and calibration rather than an LLM silently assigning numeric value.

## 7. Model provenance and scientific posture

A professional-looking result must not imply scientific validity that has not been established.

Therefore every future live forecast should be able to disclose, where applicable:

- exact forecast generation;
- exact bound matter/input generation;
- deterministic control-envelope identity;
- outcome-model identity/version;
- response-model identity/version;
- negotiation-policy identity/version;
- numerical method;
- deterministic seed where used;
- simulation run count;
- input provenance;
- aleatory versus epistemic/model uncertainty where justified;
- calibration cohort and date range;
- prospective forecast timestamp;
- later actual outcome;
- calibration result without retrospective forecast rewriting.

If no numerical engine, simulation or calibration cohort exists, the UI must say so. It must not fabricate run counts, historical cohorts, confidence intervals or precision.

## 8. Current bounded Preview implementation

The first implementation is intentionally smaller than the target architecture.

It is:

- internal;
- Vercel Preview-only;
- administrator-gated through the existing OwnerPilot admin boundary;
- deterministic;
- synthetic-fixture only;
- read-only;
- provider-free;
- network-free from the decision model itself;
- persistence-free;
- connector-free;
- customer-data-free;
- non-authorizing;
- non-sending;
- non-Production.

The first Preview demonstrates:

- executive recommendation layout;
- explicit decision alternatives;
- game-tree style branch map;
- multi-dimensional strategy comparison;
- expected-recovery and expected-time calculations;
- baseline versus structured-communication projected outcome deltas;
- communication variants where highest acceptance is intentionally not the represented best final outcome;
- text and email drafts for review only;
- response tree;
- conditional acceptance/completion arithmetic;
- decision-flip thresholds;
- highest-value unknown;
- evidence/assumption/unknown ledger;
- explicit disclosure that the numerical engine is not connected, simulation runs are zero and no calibration cohort is established;
- explicit no-send/no-action/no-Production authority.

Every displayed probability, dollar amount, threshold and communication-effect estimate in this Preview is synthetic demonstration data.

## 9. Explicitly not implemented or authorized

This increment does not implement or authorize:

- live PDI model execution;
- AEOS PDI package adoption into OwnerPilot runtime;
- live Monte Carlo simulation;
- learned counterparty-response probabilities;
- real customer forecasts;
- customer-facing decision intelligence;
- negotiation communication sending;
- SMS/email provider calls;
- autonomous follow-up;
- background monitoring;
- real tenant/property/payment/legal-case data use;
- persistence or schema changes;
- Matter persistence;
- calibration storage;
- historical training;
- real-data learning;
- Phase C;
- filing;
- attorney routing;
- legal-control changes;
- jurisdiction changes;
- service-rule changes;
- Production configuration or deployment.

## 10. Relationship to OP-PDI-001 / AEOS PDI

The parked OwnerPilot OP-PDI-001 Draft remains source material and should not be silently rebased or treated as integrated architecture merely because this Preview exists.

This increment implements a presentation/contract prototype against the durable OwnerPilot/AEOS PDI principles already established by the Founder:

- deterministic controls before prediction;
- multidimensional outcomes;
- no universal score;
- explicit owner preferences;
- sensitivity and decision-flip analysis;
- value of information;
- forecast-before-outcome calibration posture;
- separate outcome, counterparty-response and negotiation-policy concepts;
- owner approval before binding communication or action.

A later Architect/ARB reconciliation must determine the exact adoption path from the integrated AEOS PDI core and the final OwnerPilot specialization before any live numerical or negotiation runtime is activated.

## 11. Review acceptance questions

Before progressing beyond this synthetic Preview, Architect/Product review should answer:

1. Does the page make the recommendation immediately understandable without hiding the roadmap?
2. Can the Founder/landlord see which alternatives were considered and why?
3. Are the branch probabilities and terminal consequences visually inspectable?
4. Are expected-value calculations transparent enough to audit?
5. Are recovery, time, possession, workload and confidence kept separate?
6. Does the negotiation section clearly show baseline versus intervention forecast?
7. Does it demonstrate that higher acceptance can still produce a worse final outcome?
8. Is communication visibly draft-only and owner-controlled?
9. Are decision-flip points and the highest-value unknown easy to find?
10. Are verified facts, estimates, assumptions and unknowns clearly distinguished?
11. Does the scientific-provenance section avoid implying live calibration that does not exist?
12. Is the path from decision analysis back to Matter → next task clear enough for the later product increment?

## 12. Stop boundary

The synthetic Preview should return for exact-head Product/Architect review before any live model, real data, customer surface, communication send action, persistence, calibration pipeline, provider integration or Production activation is added.
