export const OP_PDI_DECISION_OUTPUT_SCHEMA = 'op-pdi-decision-output.v1a' as const;

export type EvidenceKind =
  | 'verified_fact'
  | 'owner_provided_fact'
  | 'owner_estimate'
  | 'model_assumption'
  | 'derived_value'
  | 'material_unknown';

export type PreferenceDimension =
  | 'possession'
  | 'speed'
  | 'recovery'
  | 'workload';

export type WorkloadLevel = 'low' | 'moderate' | 'high';

export type EligibleOption = {
  id: string;
  label: string;
  shortLabel: string;
  eligible: true;
  provenance: {
    source: 'externally_supplied_eligible_set';
    sourceId: string;
    evidenceRefs: readonly string[];
  };
};

export type OutcomeBranch = {
  id: string;
  label: string;
  probability: number;
  recovery: number;
  daysToResolution: number;
  possessionBy90Days: number;
  narrative: string;
};

export type ForecastOption = {
  optionId: string;
  outcomes: readonly OutcomeBranch[];
  expectedRecovery: number;
  expectedDaysToResolution: number;
  possessionBy90Days: number;
  workload: WorkloadLevel;
};

export type ForecastSnapshot = {
  kind: 'synthetic_represented_outcomes';
  customerForecast: false;
  options: readonly ForecastOption[];
};

export type OwnerPriority = {
  dimension: PreferenceDimension;
  label: string;
  weight: number;
};

export type OwnerPreferenceProfile = {
  id: string;
  label: string;
  priorities: readonly OwnerPriority[];
};

export type RecommendationDimension = {
  dimension: PreferenceDimension;
  label: string;
  weight: number;
  normalizedValue: number;
  weightedContribution: number;
};

export type OptionPreferenceBreakdown = {
  optionId: string;
  dimensions: readonly RecommendationDimension[];
};

export type Recommendation = {
  optionId: string;
  optionLabel: string;
  headline: string;
  rationale: string;
  dimensions: readonly RecommendationDimension[];
  comparison: readonly OptionPreferenceBreakdown[];
};

export type EvidenceItem = {
  id: string;
  label: string;
  kind: EvidenceKind;
  value: string;
  whyItMatters: string;
};

export type ScientificBoundary = {
  syntheticFixture: true;
  internalPreview: true;
  customerForecast: false;
  numericalModel: 'not_connected';
  simulation: 'not_run';
  calibration: 'not_established';
  actionSendAuthority: false;
};

export type ModelQuality = {
  status: 'not_established';
  numericalModel: 'not_connected';
  calibration: 'not_established';
  note: string;
};

export type MatterDecisionContext = {
  label: string;
  stage: string;
  representedBalance: number;
  evaluationLabel: string;
};

export type DecisionOutputInput = {
  matter: MatterDecisionContext;
  eligibleOptions: readonly EligibleOption[];
  forecast: ForecastSnapshot;
  preferences: OwnerPreferenceProfile;
  evidence: readonly EvidenceItem[];
  scientificBoundary: ScientificBoundary;
};

export type DecisionOutput = {
  schema: typeof OP_PDI_DECISION_OUTPUT_SCHEMA;
  matter: MatterDecisionContext;
  eligibleOptions: readonly EligibleOption[];
  forecast: ForecastSnapshot;
  preferences: OwnerPreferenceProfile;
  recommendation: Recommendation;
  evidence: readonly EvidenceItem[];
  modelQuality: ModelQuality;
  scientificBoundary: ScientificBoundary;
};

export type OwnerDecision = {
  optionId: string;
  representedOnly: true;
  storage: 'local_preview_state';
  executionAuthority: 'none';
};

export type NextTaskRepresentation = {
  ownerDecisionOptionId: string;
  label: string;
  representationOnly: true;
  connected: false;
  invoked: false;
  executionAuthority: 'none';
};
