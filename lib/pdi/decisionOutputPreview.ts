export const OP_PDI_DECISION_OUTPUT_PREVIEW_SCHEMA =
  'op-pdi-decision-output-preview.v1' as const;

export type OutcomeLeaf = {
  id: string;
  label: string;
  probability: number;
  recovery: number;
  daysToResolution: number;
  possessionBy90Days: number;
  narrative: string;
};

export type StrategyProjection = {
  id: string;
  label: string;
  shortLabel: string;
  outcomes: readonly OutcomeLeaf[];
  expectedRecovery: number;
  expectedDaysToResolution: number;
  possessionBy90Days: number;
  workload: 'low' | 'moderate' | 'high';
  preferredUnderCurrentPriorities: boolean;
};

export type NegotiationVariant = {
  id: string;
  label: string;
  responseProbability: number;
  acceptanceProbability: number;
  completionGivenAcceptance: number;
  expectedRecovery: number;
  expectedDaysToResolution: number;
  voluntaryResolutionProbability: number;
  recommended: boolean;
};

export type NegotiationResponseBranch = {
  id: string;
  label: string;
  probability: number;
  note: string;
};

export type DecisionFlip = {
  id: string;
  variable: string;
  currentValue: string;
  threshold: string;
  consequence: string;
};

export type EvidenceItem = {
  id: string;
  label: string;
  kind: 'verified' | 'owner_estimate' | 'model_assumption' | 'unknown';
  whyItMatters: string;
};

export type DecisionOutputPreviewFixture = {
  schema: typeof OP_PDI_DECISION_OUTPUT_PREVIEW_SCHEMA;
  synthetic: true;
  matter: {
    label: string;
    stage: string;
    balance: number;
    evaluationTime: string;
  };
  recommendation: {
    strategyId: string;
    headline: string;
    rationale: string;
    confidence: 'low' | 'moderate' | 'high';
  };
  ownerPriorities: readonly {
    label: string;
    weight: number;
  }[];
  strategies: readonly StrategyProjection[];
  negotiation: {
    baseline: NegotiationVariant;
    variants: readonly NegotiationVariant[];
    optimizedVariantId: string;
    responseTree: readonly NegotiationResponseBranch[];
    communication: {
      text: string;
      emailSubject: string;
      emailBody: string;
      strategyFeatures: readonly string[];
    };
  };
  decisionFlips: readonly DecisionFlip[];
  evidence: readonly EvidenceItem[];
  highestValueUnknown: {
    question: string;
    reason: string;
    possibleEffect: string;
  };
  provenance: {
    generationId: string;
    source: 'deterministic_synthetic_fixture';
    numericalEngine: 'not_connected';
    simulationRuns: 0;
    calibrationCohort: 'not_established';
  };
  authority: {
    advisoryOnly: true;
    customerForecast: false;
    communicationSendAuthority: false;
    actionAuthority: 'none';
    productionAuthority: false;
  };
};

function round(value: number, places = 2): number {
  const multiplier = 10 ** places;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

export function buildStrategyProjection(input: {
  id: string;
  label: string;
  shortLabel: string;
  outcomes: readonly OutcomeLeaf[];
  workload: StrategyProjection['workload'];
  preferredUnderCurrentPriorities?: boolean;
}): StrategyProjection {
  const probabilityTotal = input.outcomes.reduce(
    (total, outcome) => total + outcome.probability,
    0,
  );

  if (Math.abs(probabilityTotal - 1) > 1e-9) {
    throw new Error(
      `strategy ${input.id} probability total must equal 1; received ${probabilityTotal}`,
    );
  }

  const expectedRecovery = input.outcomes.reduce(
    (total, outcome) => total + outcome.probability * outcome.recovery,
    0,
  );
  const expectedDaysToResolution = input.outcomes.reduce(
    (total, outcome) =>
      total + outcome.probability * outcome.daysToResolution,
    0,
  );
  const possessionBy90Days = input.outcomes.reduce(
    (total, outcome) =>
      total + outcome.probability * outcome.possessionBy90Days,
    0,
  );

  return {
    id: input.id,
    label: input.label,
    shortLabel: input.shortLabel,
    outcomes: input.outcomes,
    expectedRecovery: round(expectedRecovery),
    expectedDaysToResolution: round(expectedDaysToResolution),
    possessionBy90Days: round(possessionBy90Days, 4),
    workload: input.workload,
    preferredUnderCurrentPriorities:
      input.preferredUnderCurrentPriorities ?? false,
  };
}

export function directProposalCompletionProbability(
  variant: Pick<
    NegotiationVariant,
    'acceptanceProbability' | 'completionGivenAcceptance'
  >,
): number {
  return round(
    variant.acceptanceProbability * variant.completionGivenAcceptance,
    4,
  );
}

export function percentagePointDelta(
  baseline: number,
  improved: number,
): number {
  return round((improved - baseline) * 100, 1);
}

const noticeOutcomes: readonly OutcomeLeaf[] = [
  {
    id: 'notice_cure',
    label: 'Full cure after structured contact',
    probability: 0.28,
    recovery: 6400,
    daysToResolution: 12,
    possessionBy90Days: 0.05,
    narrative: 'Balance resolves early and the tenancy continues.',
  },
  {
    id: 'notice_negotiated_resolution',
    label: 'Negotiated resolution while notice path is preserved',
    probability: 0.3,
    recovery: 5600,
    daysToResolution: 32,
    possessionBy90Days: 0.45,
    narrative: 'A structured resolution is reached without abandoning the current path.',
  },
  {
    id: 'notice_no_cure',
    label: 'No cure; next procedural stage remains available',
    probability: 0.27,
    recovery: 3900,
    daysToResolution: 58,
    possessionBy90Days: 0.84,
    narrative: 'The matter continues after the cure window without an early resolution.',
  },
  {
    id: 'notice_dispute_delay',
    label: 'Dispute or complication extends resolution',
    probability: 0.15,
    recovery: 2200,
    daysToResolution: 96,
    possessionBy90Days: 0.64,
    narrative: 'A material complication increases duration and downside exposure.',
  },
];

const paymentPlanOutcomes: readonly OutcomeLeaf[] = [
  {
    id: 'plan_complete',
    label: 'Plan completes',
    probability: 0.42,
    recovery: 6400,
    daysToResolution: 45,
    possessionBy90Days: 0.05,
    narrative: 'The tenant performs the agreed schedule.',
  },
  {
    id: 'plan_partial_default',
    label: 'Partial performance, then default',
    probability: 0.36,
    recovery: 4700,
    daysToResolution: 75,
    possessionBy90Days: 0.55,
    narrative: 'Some recovery occurs before the matter returns to a possession path.',
  },
  {
    id: 'plan_early_default',
    label: 'Early default',
    probability: 0.22,
    recovery: 3200,
    daysToResolution: 82,
    possessionBy90Days: 0.72,
    narrative: 'The plan fails early and adds delay before the next step.',
  },
];

const negotiatedMoveOutOutcomes: readonly OutcomeLeaf[] = [
  {
    id: 'moveout_accept',
    label: 'Accepts structured move-out proposal',
    probability: 0.54,
    recovery: 3900,
    daysToResolution: 29,
    possessionBy90Days: 0.9,
    narrative: 'The counterparty accepts and performs a defined move-out arrangement.',
  },
  {
    id: 'moveout_counter',
    label: 'Counters before agreement',
    probability: 0.28,
    recovery: 4300,
    daysToResolution: 41,
    possessionBy90Days: 0.78,
    narrative: 'A counteroffer produces a later but still voluntary resolution.',
  },
  {
    id: 'moveout_decline',
    label: 'Declines; notice path continues',
    probability: 0.18,
    recovery: 3500,
    daysToResolution: 72,
    possessionBy90Days: 0.62,
    narrative: 'No voluntary agreement is reached and the fallback path continues.',
  },
];

const waitOutcomes: readonly OutcomeLeaf[] = [
  {
    id: 'wait_late_cure',
    label: 'Late cure without structured intervention',
    probability: 0.22,
    recovery: 6400,
    daysToResolution: 30,
    possessionBy90Days: 0.05,
    narrative: 'The matter resolves without a new intervention.',
  },
  {
    id: 'wait_partial',
    label: 'Partial recovery',
    probability: 0.28,
    recovery: 4300,
    daysToResolution: 68,
    possessionBy90Days: 0.2,
    narrative: 'Some payment arrives, but the matter remains open longer.',
  },
  {
    id: 'wait_no_resolution',
    label: 'No timely resolution',
    probability: 0.5,
    recovery: 2600,
    daysToResolution: 105,
    possessionBy90Days: 0.62,
    narrative: 'Delay compounds and the owner eventually returns to an active path.',
  },
];

const baselineNegotiation: NegotiationVariant = {
  id: 'baseline',
  label: 'Current / unoptimized communication',
  responseProbability: 0.52,
  acceptanceProbability: 0.38,
  completionGivenAcceptance: 0.57,
  expectedRecovery: 4750,
  expectedDaysToResolution: 51,
  voluntaryResolutionProbability: 0.44,
  recommended: false,
};

const negotiationVariants: readonly NegotiationVariant[] = [
  {
    id: 'firm_procedural',
    label: 'Firm / procedural',
    responseProbability: 0.46,
    acceptanceProbability: 0.35,
    completionGivenAcceptance: 0.62,
    expectedRecovery: 4820,
    expectedDaysToResolution: 50,
    voluntaryResolutionProbability: 0.41,
    recommended: false,
  },
  {
    id: 'cooperative_structured',
    label: 'Cooperative but structured',
    responseProbability: 0.71,
    acceptanceProbability: 0.53,
    completionGivenAcceptance: 0.64,
    expectedRecovery: 5310,
    expectedDaysToResolution: 43,
    voluntaryResolutionProbability: 0.58,
    recommended: true,
  },
  {
    id: 'highly_accommodating',
    label: 'Highly accommodating',
    responseProbability: 0.76,
    acceptanceProbability: 0.62,
    completionGivenAcceptance: 0.43,
    expectedRecovery: 4690,
    expectedDaysToResolution: 49,
    voluntaryResolutionProbability: 0.55,
    recommended: false,
  },
];

export const SYNTHETIC_DECISION_OUTPUT_PREVIEW: DecisionOutputPreviewFixture = {
  schema: OP_PDI_DECISION_OUTPUT_PREVIEW_SCHEMA,
  synthetic: true,
  matter: {
    label: 'Synthetic California nonpayment matter',
    stage: 'Notice prepared · not served',
    balance: 6400,
    evaluationTime: '2026-08-11T18:00:00.000Z',
  },
  recommendation: {
    strategyId: 'notice_with_structured_resolution',
    headline:
      'Preserve the notice path while using a structured resolution communication',
    rationale:
      'This synthetic scenario keeps the existing fallback available while improving the modeled chance of an earlier voluntary resolution under the stated owner priorities.',
    confidence: 'moderate',
  },
  ownerPriorities: [
    { label: 'Recover possession when needed', weight: 0.35 },
    { label: 'Resolve sooner', weight: 0.3 },
    { label: 'Recover arrears', weight: 0.25 },
    { label: 'Reduce owner workload', weight: 0.1 },
  ],
  strategies: [
    buildStrategyProjection({
      id: 'notice_with_structured_resolution',
      label: 'Notice path + structured resolution communication',
      shortLabel: 'Notice + structured resolution',
      outcomes: noticeOutcomes,
      workload: 'moderate',
      preferredUnderCurrentPriorities: true,
    }),
    buildStrategyProjection({
      id: 'payment_plan_first',
      label: 'Payment plan first',
      shortLabel: 'Payment plan',
      outcomes: paymentPlanOutcomes,
      workload: 'high',
    }),
    buildStrategyProjection({
      id: 'negotiated_move_out',
      label: 'Negotiated move-out first',
      shortLabel: 'Negotiated move-out',
      outcomes: negotiatedMoveOutOutcomes,
      workload: 'moderate',
    }),
    buildStrategyProjection({
      id: 'wait_monitor',
      label: 'Wait / monitor',
      shortLabel: 'Wait / monitor',
      outcomes: waitOutcomes,
      workload: 'low',
    }),
  ],
  negotiation: {
    baseline: baselineNegotiation,
    variants: negotiationVariants,
    optimizedVariantId: 'cooperative_structured',
    responseTree: [
      {
        id: 'accept',
        label: 'Accepts proposed structure',
        probability: 0.53,
        note: 'If accepted, modeled completion is 64% in this synthetic fixture.',
      },
      {
        id: 'counter',
        label: 'Counters',
        probability: 0.21,
        note: 'New terms become evidence and should trigger a fresh forecast before the next move.',
      },
      {
        id: 'no_response',
        label: 'No response',
        probability: 0.18,
        note: 'The preserved fallback remains available under existing controls.',
      },
      {
        id: 'reject_or_dispute',
        label: 'Rejects or disputes',
        probability: 0.08,
        note: 'OwnerPilot should reassess rather than automatically escalate or send another message.',
      },
    ],
    communication: {
      text:
        "Hi Alex — I'd like to see whether we can resolve the outstanding balance with clear terms. In this synthetic example the current balance is $6,400. If $2,500 by Friday and the remainder on defined dates is workable, please reply by 5:00 PM tomorrow. If it isn't, tell me what amount you can reliably pay within the next seven days so I can evaluate whether a structured plan makes sense. If we don't reach an agreement, the current notice process continues.",
      emailSubject: 'Proposed structured resolution of the outstanding balance',
      emailBody:
        "Alex,\n\nI'd like to see whether we can resolve the outstanding balance under clear, workable terms. In this synthetic example the current balance is $6,400. One option would be $2,500 by Friday with the remaining balance paid on defined dates.\n\nPlease let me know by 5:00 PM tomorrow whether that structure is workable. If it is not, please tell me what amount you can reliably pay within the next seven days and what schedule you can realistically complete. I can then evaluate whether a structured plan makes sense.\n\nIf we do not reach an agreement, the current notice process continues.\n\nThank you.",
      strategyFeatures: [
        'Concrete terms instead of an open-ended request',
        'Defined response window',
        'One high-value question if the proposed structure is not workable',
        'Fallback preserved without unnecessary escalation language',
        'Acceptance probability kept separate from completion probability',
      ],
    },
  },
  decisionFlips: [
    {
      id: 'plan_completion',
      variable: 'Payment-plan completion probability',
      currentValue: '42%',
      threshold: '47%+',
      consequence: 'Payment-plan-first becomes materially more competitive under the synthetic priority profile.',
    },
    {
      id: 'moveout_acceptance',
      variable: 'Voluntary move-out acceptance',
      currentValue: '54%',
      threshold: '69%+',
      consequence: 'Negotiated move-out becomes the preferred speed/possession tradeoff.',
    },
    {
      id: 'vacancy_duration',
      variable: 'Expected post-possession vacancy',
      currentValue: '31 days',
      threshold: '58+ days',
      consequence: 'The value of faster possession falls materially relative to preserving tenancy/recovery.',
    },
  ],
  evidence: [
    {
      id: 'balance',
      label: 'Outstanding balance',
      kind: 'verified',
      whyItMatters: 'Directly affects the economic outcome range.',
    },
    {
      id: 'stage',
      label: 'Current workflow stage',
      kind: 'verified',
      whyItMatters: 'Defines which alternatives may be represented before prediction.',
    },
    {
      id: 'payment_capacity',
      label: 'Immediate payment capacity',
      kind: 'unknown',
      whyItMatters: 'Could materially change payment-plan acceptance and completion assumptions.',
    },
    {
      id: 'vacancy',
      label: 'Expected vacancy duration',
      kind: 'owner_estimate',
      whyItMatters: 'Changes the economic value of recovering possession sooner.',
    },
    {
      id: 'response_behavior',
      label: 'Counterparty response behavior',
      kind: 'model_assumption',
      whyItMatters: 'Drives the synthetic communication-response branches.',
    },
  ],
  highestValueUnknown: {
    question:
      'What amount can the counterparty reliably pay within the next seven days?',
    reason:
      'The answer has the greatest represented potential to change the payment-plan and structured-resolution branches in this synthetic fixture.',
    possibleEffect:
      'A strong answer could move the recommended negotiation move from proposing terms to evaluating a counterproposal; a weak answer can preserve the fallback without spending another offer.',
  },
  provenance: {
    generationId: 'OP-PDI-SYNTHETIC-2026-08-11-001',
    source: 'deterministic_synthetic_fixture',
    numericalEngine: 'not_connected',
    simulationRuns: 0,
    calibrationCohort: 'not_established',
  },
  authority: {
    advisoryOnly: true,
    customerForecast: false,
    communicationSendAuthority: false,
    actionAuthority: 'none',
    productionAuthority: false,
  },
};
