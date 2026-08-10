# OP-PDI-001 — OwnerPilot Nonpayment Predictive Decision & Negotiation Specialization

## Status

**FOUNDER-DIRECTED PRODUCT / ARCHITECTURE DRAFT — NONCANONICAL — DOCUMENTATION ONLY — NO RUNTIME, LEGAL-CONTROL, DATABASE, OR PRODUCTION AUTHORITY**

Exact OwnerPilot baseline at drafting:

`main`

`2d01488badafa3964ef3a6b8f71c502c5a6523b9`

This document specializes AEOS PDI-001 and PDI-N1 for California residential nonpayment. It does not implement or activate those AEOS capabilities inside OwnerPilot.

It does not modify `lib/decision2`, which remains an existing controlled jurisdiction/broker-review seam and is not the target home for the new strategy engine.

---

## 1. Product objective

OwnerPilot should move beyond telling the landlord what happened or generating a notice.

The target capability is:

> Given this Matter, the actions actually available under OwnerPilot's legal/product controls, the economic and factual uncertainty, the owner's explicit priorities, and the counterparty's observed behavior, compare plausible outcomes, identify what matters most, recommend what the owner should do next, and improve the recommendation as new evidence arrives.

The product should eventually be able to say:

> Here are your available options. Here is the favorable realistic case, central range, downside and tail risk for each. Here is what drives the result. Here is what could change the preferred option. Here is the one fact most worth learning next. Given your priorities, here is what OwnerPilot currently recommends and why.

When negotiation is appropriate, it should then be able to say:

> Here is the strongest next negotiating move, why these terms are favored, what the counterparty is estimated to do, what completion looks like if they accept, and what fact or response would cause us to change course.

Owner remains the decision-maker.

---

## 2. Permanent OwnerPilot separations

**Legal/control eligibility ≠ prediction.**

**Prediction ≠ recommendation.**

**Recommendation ≠ legal advice or authority.**

**Negotiation recommendation ≠ authority to communicate.**

**Communication draft ≠ authority to send.**

**Recommended agreement ≠ customer acceptance.**

**Customer acceptance ≠ OwnerPilot signature or representation.**

**Predicted cure/completion ≠ legal cure determination.**

**Predicted possession timeline ≠ legal deadline or guarantee.**

**Business BATNA ≠ legal entitlement.**

**Higher expected economic value ≠ permission to override legal/control or fairness constraints.**

The deterministic legal/product envelope always determines what OwnerPilot may operationally present as an available action.

---

## 3. Target architecture

OwnerPilot should eventually compose the following layers:

1. **Matter factual state** — what happened, what is known, provenance, freshness, conflicts and unknowns.
2. **Legal/product control layer** — deterministic rules for what actions/workflows are currently eligible or blocked.
3. **OwnerPilot PDI adapter** — maps eligible alternatives, facts, uncertainty, outcome functions and owner preferences into generic AEOS PDI contracts.
4. **AEOS PDI engine** — produces multi-dimensional forecasts, scenario ranges, sensitivity, decision-flip and value-of-information results.
5. **OwnerPilot negotiation adapter / PDI-N1** — when negotiation is an eligible business strategy, compares questions/offers/counteroffers against BATNA and final outcomes.
6. **Recommendation layer** — produces a qualitative, reasoned recommendation and tradeoff explanation.
7. **Communication renderer** — may later draft owner-directed communications from approved structured terms.
8. **Owner decision / confirmation** — explicit customer decision where required.
9. **Existing execution workflow** — notice, Serve & Track, factual outcome recording, Phase C or other separately authorized action.
10. **Outcome capture / calibration** — compare predicted vs actual and improve future models.

No upstream probabilistic layer may silently modify a downstream legal/control rule.

---

## 4. First decision family: California residential nonpayment

The first OwnerPilot adapter should focus on one bounded business decision family:

**What should the owner do next when rent is unpaid?**

Candidate alternatives may include only when separately determined eligible by existing controls:

- continue the current notice / documentation path;
- propose a structured payment arrangement;
- negotiate a voluntary move-out;
- wait for a defined period;
- gather one additional material fact before choosing;
- maintain current position / no new action;
- other owner-directed factual business alternatives later approved by product/legal architecture.

PDI does not create new remedies, legal elections, filing rights, service rules, or attorney-routing behavior.

---

## 5. Matter input model

The first specialization should use information the Matter can eventually know, subject to provenance/freshness rules.

Candidate factual inputs include:

- property/unit reference;
- tenant/counterparty reference;
- current contract rent;
- unpaid amount by period;
- payment history;
- prior late-payment behavior;
- current tenant-stated ability/willingness to pay;
- actual payments received;
- prior payment-arrangement performance;
- owner communications/offers;
- tenant responses;
- notice status;
- actual service status when recorded;
- elapsed time in current Matter state;
- market-rent estimate;
- vacancy-duration estimate;
- turnover-cost estimate;
- re-leasing cost;
- owner administrative-time estimate;
- collectability/recovery estimate where a governed model supports it;
- owner priorities/preferences;
- material legal/product risk flags from deterministic controls.

Each input must preserve whether it is:

- observed/system fact;
- customer-confirmed fact;
- tenant/counterparty statement;
- owner estimate;
- external market observation;
- learned/calibrated estimate;
- explicit modeling assumption;
- unknown.

A counterparty statement is evidence, not automatically verified fact.

---

## 6. Protected / prohibited-feature firewall

The predictive and negotiation models must not use legally protected characteristics or prohibited proxies as business-optimization features.

The final legal/control registry should define the exact California/local prohibited-feature set and proxy policy before any real-data learning or Production inference.

At minimum the architecture must support:

- explicit allowed-feature registry;
- explicit prohibited-feature registry;
- provenance for every model feature;
- removal/refusal of prohibited fields before model evaluation;
- audit evidence showing which feature set/version was used;
- cohort/calibration analysis that does not reintroduce prohibited individualized decision features;
- human/legal review for proxy-risk questions.

PDI may not improve an economic metric by introducing discriminatory or retaliatory decision logic.

---

## 7. Uncertain inputs for the first model

Candidate uncertain variables include:

- probability and timing of near-term cure;
- probability of accepting a payment proposal;
- probability of completing an accepted payment arrangement;
- probability/timing of voluntary move-out acceptance;
- probability/timing of actual voluntary move-out completion;
- future payment behavior;
- vacancy duration;
- turnover cost;
- market re-rent;
- arrears recovery amount/probability;
- owner administrative burden;
- time to resolution under a business path;
- procedural duration only if later supplied by a separately governed legal/process model.

Legal validity, service sufficiency, cure, waiver, surrender, filing validity, representation requirements and similar legal conclusions are not probabilistic substitute variables for deterministic/legal review.

---

## 8. Multi-dimensional outcome model

OwnerPilot should preserve outputs separately rather than collapse them into one score.

Candidate outcome dimensions:

### Economic

- net economic outcome / loss;
- cash recovered;
- unpaid-balance exposure;
- turnover cost;
- vacancy cost;
- re-leasing cost;
- value of market-rent change;
- concession cost.

### Time

- days to financial resolution;
- days to possession change where applicable;
- days until Matter reaches a defined terminal/next state.

### Probability / state

- probability of cure/payment completion;
- probability tenancy is preserved by a horizon;
- probability possession changes by a horizon;
- probability of voluntary resolution before later procedural steps;
- probability a negotiated arrangement completes successfully.

### Owner burden

- administrative effort;
- expected communication/coordination load;
- number of expected follow-up actions.

### Non-averagable controls

- legal/product hard blocks;
- fairness/discrimination flags;
- stale/unknown critical facts;
- required human/legal review.

No universal **OwnerPilot Score** should average these into one correctness number.

---

## 9. Customer-facing scenario language

The OwnerPilot UI should use plain-language scenario summaries backed by explicit percentile semantics.

Preferred labels:

- **Favorable realistic case**
- **Central / most likely range**
- **Median / central estimate** where useful
- **Downside case**
- **Tail risk**
- **Probability of hitting an explicit target**

Avoid theoretical “best case” and “worst case” unless the system explicitly means mathematical extrema.

The displayed range must state or internally bind the percentile policy used.

Example future presentation:

> **Most likely range:** 21–38 days to financial resolution
>
> **Favorable realistic case:** cure within approximately 10 days
>
> **Downside:** arrangement fails after two weeks and arrears increase before the owner returns to the available alternative
>
> **Tail risk:** extended nonpayment and materially higher economic loss

These are examples, not current forecasts.

---

## 10. Owner preference profile

Prediction and owner preference remain separate.

OwnerPilot should support explicit priorities such as:

- preserve the tenancy when economically reasonable;
- regain possession quickly;
- minimize expected economic loss;
- minimize downside/tail loss;
- maximize arrears recovery;
- minimize owner time/administrative burden;
- maintain flexibility / avoid irreversible steps where possible.

High-consequence preferences should be explicitly confirmed rather than silently inferred from browsing/chat behavior.

A local owner-specific utility calculation may support analysis, but the UI/audit record must preserve the underlying outcomes and tradeoffs.

---

## 11. Recommendation contract

An OwnerPilot decision recommendation should include:

- currently preferred eligible alternative, or `no_clear_preference`;
- why it is preferred;
- central expected outcomes;
- meaningful downside/tail outcomes;
- material tradeoffs versus at least the relevant competing alternatives;
- what assumptions matter most;
- what would change the recommendation;
- one highest-value missing fact/question where applicable;
- model-risk / calibration warning where appropriate;
- legal/control flags that remain separate;
- customer decision required before action.

The recommendation must never imply legal certainty or guaranteed outcome.

---

## 12. Negotiation specialization

When negotiation is an eligible business strategy, OwnerPilot should apply PDI-N1 rather than simply asking an LLM to “negotiate.”

The system should model three different predictions:

1. **response/acceptance probability** — will the tenant accept or counter the proposal?
2. **conditional completion probability** — if accepted, will the tenant actually perform?
3. **final outcome distribution** — what happens economically/operationally if the agreement succeeds or fails?

The negotiation policy optimizes the owner's final outcome under explicit preferences, not mere acceptance.

---

## 13. First negotiation families

### A. Structured payment proposal

Candidate controllable terms may include, subject to legal/product review:

- immediate payment amount;
- installment amount;
- number of installments;
- timing/cadence;
- defined factual payment milestones;
- owner-defined maximum acceptable duration.

The system should compare multiple feasible proposals rather than output one arbitrary plan.

It should be able to identify a region such as:

> Increasing the required immediate payment materially improves completion probability but begins to reduce acceptance sharply above this range.

The exact numbers must come from a governed model, not LLM intuition.

### B. Negotiated voluntary move-out

Candidate controllable business terms may include, only after legal/product review:

- target move-out date;
- owner concession amount/structure;
- factual performance milestones;
- timing/verification requirements;
- owner's maximum acceptable concession.

PDI should compare the negotiated path against the current BATNA rather than treating a concession as inherently good or bad.

### C. Ask-before-offer

The best move may be a factual question, for example determining realistic immediate payment capacity before selecting a proposal.

Value-of-information analysis should permit `ask_for_information` to beat an immediate offer when learning the fact has more expected decision value.

---

## 14. OwnerPilot BATNA

For each active negotiation, OwnerPilot should maintain the best currently available non-negotiated alternative under the deterministic control state.

BATNA forecast may include:

- expected economic outcome;
- downside distribution;
- time distribution;
- administrative burden;
- material procedural/business uncertainty.

BATNA must be re-evaluated when Matter state materially changes.

**Historical BATNA ≠ current BATNA.**

---

## 15. Reservation boundaries

OwnerPilot should require explicit owner boundaries where necessary, such as:

- minimum immediate payment;
- maximum acceptable repayment duration;
- maximum voluntary-move-out concession;
- maximum tolerated delay;
- hard preference to preserve/end tenancy where lawfully/product-appropriate;
- unacceptable downside conditions.

The system may recommend a boundary for owner consideration but cannot silently set a binding one.

---

## 16. Counterparty belief state

OwnerPilot may eventually maintain a probabilistic belief state about negotiation-relevant variables such as:

- near-term ability to perform;
- willingness to negotiate;
- probability of completing an agreed plan;
- likely timing flexibility;
- likelihood of voluntarily moving under a proposed arrangement;
- reliability of prior commitments.

These are estimates, not personal judgments or facts.

Every update must be tied to evidence and a versioned update method.

Examples of evidence strength:

- stated intent: weak/moderate evidence;
- specific counterproposal: stronger evidence about preference constraints;
- actual partial payment: stronger evidence about ability/willingness;
- kept prior promise: evidence about completion reliability;
- missed prior commitment: evidence that may reduce predicted completion.

No protected/prohibited characteristic may be used to infer willingness, reliability or ability.

---

## 17. Adaptive closed loop

The future OwnerPilot negotiation loop is:

**Matter state**
→ **control eligibility**
→ **forecast alternatives**
→ **choose recommended negotiation move**
→ **owner reviews/approves**
→ **separately authorized communication**
→ **counterparty response/payment/event**
→ **record evidence**
→ **update belief state**
→ **reforecast**
→ **new recommendation**

No step automatically authorizes the next.

A material new payment, response, service event, legal/control change or Matter event invalidates stale recommendations and requires re-evaluation.

---

## 18. Communication renderer boundary

A future LLM may draft a respectful message from a structured approved move.

It may not:

- change payment amounts;
- change dates/terms;
- invent deadlines;
- make legal threats not independently authorized;
- promise legal consequences;
- accept a counteroffer;
- create a settlement;
- send automatically under this architecture;
- add attorney routing.

The structured terms are source of truth; prose is a renderer.

---

## 19. Interaction with existing OwnerPilot controls

PDI must consume, not replace, existing deterministic control results.

Examples include:

- California eligibility;
- jurisdiction/local overlay resolution;
- notice-production eligibility;
- payment-event controls;
- notice prepared vs served state;
- actual service facts;
- stale/conflicting evidence;
- Phase C filing-control state when later integrated;
- attorney-routing prohibition.

A PDI forecast may explain the business consequence of an available path. It may not manufacture eligibility.

---

## 20. Relationship to current `lib/decision2`

The current `lib/decision2` package supports a specific controlled-launch broker/jurisdiction workflow.

OP-PDI-001 should not be implemented inside that package merely because its name contains “decision.”

Preferred future specialization boundary is conceptually separate, for example:

- `lib/decision-intelligence/` or equivalent OwnerPilot adapter layer; and
- generic numerical contracts/engine supplied through an AEOS package only after portability/adoption is separately authorized.

The exact paths are an Architect decision.

---

## 21. Matter architecture relationship

PDI becomes much more valuable when one durable Matter connects:

- tenant/property/lease facts;
- rent ledger;
- communications;
- offers/counteroffers;
- payments;
- notice/service events;
- evidence;
- next actions;
- final outcome.

However PDI Phase 0/1 architecture should not force a giant Matter rewrite.

The first OwnerPilot synthetic adapter can operate on explicit synthetic `MatterDecisionSnapshot` inputs.

A later real-data integration must define source precedence, freshness and immutable forecast snapshots before shadow mode.

---

## 22. Shadow-mode requirement before customer reliance

OwnerPilot should not immediately display learned probabilities to customers merely because the engine can generate them.

Preferred sequence:

### OP-PDI Phase A — synthetic adapter

No real customer data; deterministic test fixtures.

### OP-PDI Phase B — historical/backtest evaluation

Where lawful and data-quality permits, evaluate historical completed Matters without pretending the retrospective model was a contemporaneous forecast.

### OP-PDI Phase C — prospective shadow mode

Freeze forecasts on real eligible Matters before outcomes occur. Do not influence customer action. Compare forecast with actual outcome.

### OP-PDI Phase D — calibrated internal decision support

Use forecasts internally/admin-only under separate authorization after calibration evidence.

### OP-PDI Phase E — customer-facing decision support

Only after adequate calibration, legal/product review, UX testing and Founder authorization.

### OP-PDI Phase F — human-approved negotiation assistance

Structured proposal/question recommendation + drafting. Owner approves.

No phase automatically authorizes the next.

---

## 23. Calibration requirements

OwnerPilot should calibrate separately for:

- cure probability;
- payment-proposal acceptance;
- payment-plan completion;
- voluntary move-out acceptance;
- voluntary move-out completion;
- time-to-event forecasts;
- economic loss/range forecasts;
- negotiation-policy recommendations.

Forecasts must be immutable after creation.

Calibration should be segmented only by permitted and statistically meaningful cohorts. Sparse cohorts must not display false precision.

---

## 24. UX target

The eventual customer experience should remain simple.

Example structure:

### OwnerPilot recommendation

**Try a short structured payment proposal first.**

### Why

The current Matter facts indicate that preserving the tenancy is economically favorable if the tenant can make a meaningful immediate payment, while turnover/vacancy costs are high.

### Compare your options

For each eligible alternative show:

- central outcome;
- favorable case;
- downside;
- tail risk;
- key target probabilities;
- owner effort;
- important tradeoff.

### What matters most

Rank the few assumptions driving the decision.

### What would change my recommendation

State one or more decision-flip thresholds in plain language.

### Best next question

Ask the highest-value missing factual question.

### Owner decision

Allow owner to choose, modify priorities, or request another scenario.

Do not expose Monte Carlo mechanics unless the user asks for detail.

---

## 25. Product-quality rules

- No unsupported decimal precision.
- No universal OwnerPilot score.
- No “AI says 78%” without model identity/provenance/calibration.
- No probabilistic legal conclusions masquerading as business forecasts.
- No hidden owner preference inference for high-consequence decisions.
- No negotiation recommendation based only on acceptance probability.
- No stale forecast after material Matter change.
- No protected/prohibited feature optimization.
- No user-facing probability until minimum calibration criteria are defined and met.
- No autonomous execution from a recommendation.

---

## 26. First synthetic acceptance scenarios

The first OwnerPilot adapter should include synthetic matters proving at least:

1. payment plan dominates economically when completion probability is high and turnover cost is high;
2. notice/current path becomes preferred when near-term performance probability falls below a defined threshold;
3. voluntary-move-out proposal dominates when time-to-possession value is high and the modeled acceptance/completion profile is favorable;
4. `ask_for_information` is preferred because one unknown could flip the decision;
5. two alternatives are effectively tied and the system says so;
6. an ineligible alternative has the highest simulated value but remains unavailable;
7. high expected value is rejected by owner preference because tail loss exceeds tolerance;
8. weak assumptions dominate and recommendation is withheld/qualified;
9. negotiation proposal has high acceptance but poor completion and is not favored;
10. a new actual payment changes the belief state and flips the recommended move;
11. a prohibited feature attempts to enter the model and is rejected;
12. customer preference changes and recommendation changes without changing the underlying forecast;
13. stale forecast is refused after Matter change;
14. post-outcome data cannot rewrite the original forecast.

---

## 27. Legal / governance review triggers

No new Janna/legal decision is required merely to document a synthetic decision-science architecture.

Separate legal review is required before real/customer-facing implementation where the system would:

- recommend specific landlord-tenant negotiation terms;
- use real tenant behavioral data to predict individual outcomes;
- define protected/prohibited feature policy;
- display procedural timing/probability estimates that could be interpreted as legal advice;
- draft binding settlement/payment-plan language;
- interpret cure, waiver, surrender, habitability, retaliation, fair-housing/accommodation, representation or filing consequences;
- activate paid regulated document-preparation services.

Existing Founder attorney-routing prohibition remains controlling.

---

## 28. Explicit non-authorizations

This documentation PR does not authorize:

- OwnerPilot runtime implementation;
- AEOS package adoption;
- database/schema migrations;
- RiskPath/Matter persistence changes;
- user-facing forecasts;
- real-data model training;
- shadow mode;
- automated negotiation;
- message sending;
- settlement/payment-plan acceptance;
- legal advice;
- legal-control changes;
- attorney routing;
- Phase C activation;
- billing/paid activation;
- Production deployment.

---

## 29. Required next Architect actions

The OwnerPilot Chief Architect / Product Architecture function should reconcile this document against:

- live OwnerPilot Matter/RiskPath/notice/service architecture;
- controlling legal/product boundaries;
- AEOS PDI-001 / PDI-N1 architecture;
- current data/provenance capabilities;
- existing recommendation-quality / qualitative-first controls;
- future AEOS portability/adoption boundary.

Return:

1. final OwnerPilot specialization disposition;
2. exact legal/control → PDI adapter boundary;
3. exact permitted first decision family;
4. exact synthetic input/output contract;
5. prohibited-feature/fairness architecture;
6. exact calibration gates before any customer-facing probability;
7. first bounded synthetic implementation slice;
8. file/module expectation;
9. adversarial matrix;
10. Integration / Engineer directive for the first OwnerPilot synthetic adapter only, if separately authorized.

Then **STOP for Founder disposition**.
