import type {
  EligibleOption,
  EvidenceItem,
  ForecastSnapshot,
  MatterDecisionContext,
  OwnerPreferenceProfile,
  ScientificBoundary,
} from '@/lib/pdi/decisionOutput';
import { buildForecastOption } from '@/lib/pdi/decisionOutputDerivation';

export const SYNTHETIC_MATTER: MatterDecisionContext = {
  label: 'Synthetic California nonpayment matter',
  stage: 'Decision analysis only · no workflow action',
  representedBalance: 6400,
  evaluationLabel: 'Internal deterministic fixture',
};

export const SYNTHETIC_ELIGIBLE_OPTIONS: readonly EligibleOption[] = [
  {
    id: 'preserve_path',
    label: 'Preserve the current path while seeking an early resolution',
    shortLabel: 'Preserve path',
    eligible: true,
    provenance: {
      source: 'externally_supplied_eligible_set',
      sourceId: 'fixture-eligibility-preserve-path',
      evidenceRefs: ['stage_fact', 'balance_fact'],
    },
  },
  {
    id: 'structured_payment',
    label: 'Evaluate a structured payment arrangement',
    shortLabel: 'Structured payment',
    eligible: true,
    provenance: {
      source: 'externally_supplied_eligible_set',
      sourceId: 'fixture-eligibility-structured-payment',
      evidenceRefs: ['owner_goal', 'payment_capacity_unknown'],
    },
  },
  {
    id: 'voluntary_resolution',
    label: 'Evaluate a voluntary possession resolution',
    shortLabel: 'Voluntary resolution',
    eligible: true,
    provenance: {
      source: 'externally_supplied_eligible_set',
      sourceId: 'fixture-eligibility-voluntary-resolution',
      evidenceRefs: ['owner_goal', 'vacancy_estimate'],
    },
  },
] as const;

export const SYNTHETIC_FORECAST: ForecastSnapshot = {
  kind: 'synthetic_represented_outcomes',
  customerForecast: false,
  options: [
    buildForecastOption({
      optionId: 'preserve_path',
      workload: 'moderate',
      outcomes: [
        {
          id: 'preserve_early',
          label: 'Early voluntary resolution',
          probability: 0.45,
          recovery: 6000,
          daysToResolution: 24,
          possessionBy90Days: 0.8,
          narrative: 'Synthetic branch: an early resolution occurs while the represented fallback remains available.',
        },
        {
          id: 'preserve_continue',
          label: 'No early resolution; represented path continues',
          probability: 0.55,
          recovery: 4000,
          daysToResolution: 49,
          possessionBy90Days: 0.98,
          narrative: 'Synthetic branch: early resolution does not occur and the represented path remains available.',
        },
      ],
    }),
    buildForecastOption({
      optionId: 'structured_payment',
      workload: 'high',
      outcomes: [
        {
          id: 'payment_complete',
          label: 'Arrangement completes',
          probability: 0.65,
          recovery: 6500,
          daysToResolution: 52,
          possessionBy90Days: 0.05,
          narrative: 'Synthetic branch: the represented payment arrangement completes.',
        },
        {
          id: 'payment_partial',
          label: 'Partial performance before another decision point',
          probability: 0.35,
          recovery: 5357,
          daysToResolution: 80,
          possessionBy90Days: 0.335,
          narrative: 'Synthetic branch: partial performance occurs before a later, separately governed decision point.',
        },
      ],
    }),
    buildForecastOption({
      optionId: 'voluntary_resolution',
      workload: 'moderate',
      outcomes: [
        {
          id: 'voluntary_complete',
          label: 'Voluntary resolution completes',
          probability: 0.7,
          recovery: 4500,
          daysToResolution: 20,
          possessionBy90Days: 0.9,
          narrative: 'Synthetic branch: a voluntary possession resolution completes.',
        },
        {
          id: 'voluntary_no_agreement',
          label: 'No voluntary agreement',
          probability: 0.3,
          recovery: 3500,
          daysToResolution: 46.67,
          possessionBy90Days: 0.5,
          narrative: 'Synthetic branch: no voluntary agreement is reached and a later decision remains separate.',
        },
      ],
    }),
  ],
};

export const SYNTHETIC_PREFERENCE_PROFILES: readonly OwnerPreferenceProfile[] = [
  {
    id: 'balanced_control',
    label: 'Balanced control priorities',
    priorities: [
      { dimension: 'possession', label: 'Recover possession when needed', weight: 0.45 },
      { dimension: 'speed', label: 'Resolve sooner', weight: 0.25 },
      { dimension: 'recovery', label: 'Recover represented balance', weight: 0.2 },
      { dimension: 'workload', label: 'Reduce owner workload', weight: 0.1 },
    ],
  },
  {
    id: 'recovery_first',
    label: 'Recovery-first example',
    priorities: [
      { dimension: 'recovery', label: 'Recover represented balance', weight: 0.75 },
      { dimension: 'possession', label: 'Recover possession when needed', weight: 0.1 },
      { dimension: 'speed', label: 'Resolve sooner', weight: 0.05 },
      { dimension: 'workload', label: 'Reduce owner workload', weight: 0.1 },
    ],
  },
] as const;

export const SYNTHETIC_EVIDENCE: readonly EvidenceItem[] = [
  {
    id: 'balance_fact',
    label: 'Represented balance',
    kind: 'verified_fact',
    value: '$6,400 fixture value',
    whyItMatters: 'Provides one deterministic economic input for the synthetic comparison.',
  },
  {
    id: 'stage_fact',
    label: 'Represented matter stage',
    kind: 'owner_provided_fact',
    value: 'Decision-analysis fixture stage',
    whyItMatters: 'Shows the context supplied to the eligible-option set without creating eligibility inside the ranking function.',
  },
  {
    id: 'vacancy_estimate',
    label: 'Vacancy duration expectation',
    kind: 'owner_estimate',
    value: '31 days',
    whyItMatters: 'Represents an owner estimate that can affect how possession timing is valued.',
  },
  {
    id: 'branch_assumption',
    label: 'Synthetic outcome branch probabilities',
    kind: 'model_assumption',
    value: 'Fixed deterministic fixture values',
    whyItMatters: 'These values are represented outcomes only; they are not calibrated customer probabilities.',
  },
  {
    id: 'expected_recovery',
    label: 'Expected recovery arithmetic',
    kind: 'derived_value',
    value: 'Σ(probability × represented recovery)',
    whyItMatters: 'Keeps transparent arithmetic separate from source facts and assumptions.',
  },
  {
    id: 'payment_capacity_unknown',
    label: 'Near-term payment capacity',
    kind: 'material_unknown',
    value: 'Unknown',
    whyItMatters: 'A materially different fact could change the represented outcomes and trigger a new analysis.',
  },
] as const;

export const SYNTHETIC_SCIENTIFIC_BOUNDARY: ScientificBoundary = {
  syntheticFixture: true,
  internalPreview: true,
  customerForecast: false,
  numericalModel: 'not_connected',
  simulation: 'not_run',
  calibration: 'not_established',
  actionSendAuthority: false,
};
