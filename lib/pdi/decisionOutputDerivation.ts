import {
  OP_PDI_DECISION_OUTPUT_SCHEMA,
  type DecisionOutput,
  type DecisionOutputInput,
  type EligibleOption,
  type ForecastOption,
  type NextTaskRepresentation,
  type OptionPreferenceBreakdown,
  type OwnerDecision,
  type OwnerPreferenceProfile,
  type OutcomeBranch,
  type PreferenceDimension,
  type Recommendation,
  type RecommendationDimension,
  type WorkloadLevel,
} from './decisionOutput';

function round(value: number, places = 4): number {
  const multiplier = 10 ** places;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function assertProbability(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${label} must be between 0 and 1`);
  }
}

export function buildForecastOption(input: {
  optionId: string;
  outcomes: readonly OutcomeBranch[];
  workload: WorkloadLevel;
}): ForecastOption {
  if (input.outcomes.length === 0) {
    throw new Error(`forecast option ${input.optionId} requires at least one outcome`);
  }

  const probabilityTotal = input.outcomes.reduce((sum, outcome) => {
    assertProbability(outcome.probability, `${input.optionId}.${outcome.id}.probability`);
    assertProbability(
      outcome.possessionBy90Days,
      `${input.optionId}.${outcome.id}.possessionBy90Days`,
    );
    return sum + outcome.probability;
  }, 0);

  if (Math.abs(probabilityTotal - 1) > 1e-9) {
    throw new Error(
      `forecast option ${input.optionId} probability total must equal 1; received ${probabilityTotal}`,
    );
  }

  return {
    optionId: input.optionId,
    outcomes: input.outcomes,
    expectedRecovery: round(
      input.outcomes.reduce(
        (sum, outcome) => sum + outcome.probability * outcome.recovery,
        0,
      ),
      2,
    ),
    expectedDaysToResolution: round(
      input.outcomes.reduce(
        (sum, outcome) => sum + outcome.probability * outcome.daysToResolution,
        0,
      ),
      2,
    ),
    possessionBy90Days: round(
      input.outcomes.reduce(
        (sum, outcome) => sum + outcome.probability * outcome.possessionBy90Days,
        0,
      ),
      4,
    ),
    workload: input.workload,
  };
}

function validateEligibleOptions(options: readonly EligibleOption[]): void {
  if (options.length === 0) throw new Error('at least one eligible option is required');
  const ids = new Set<string>();
  for (const option of options) {
    if (!option.id.trim()) throw new Error('eligible option id is required');
    if (ids.has(option.id)) throw new Error(`duplicate eligible option id: ${option.id}`);
    ids.add(option.id);
    if (option.eligible !== true) throw new Error(`${option.id} is not eligible`);
    if (option.provenance.source !== 'externally_supplied_eligible_set') {
      throw new Error(`${option.id} lacks external eligibility provenance`);
    }
    if (!option.provenance.sourceId.trim()) {
      throw new Error(`${option.id} requires a stable provenance sourceId`);
    }
  }
}

function validatePreferences(preferences: OwnerPreferenceProfile): void {
  const seen = new Set<PreferenceDimension>();
  const total = preferences.priorities.reduce((sum, priority) => {
    if (seen.has(priority.dimension)) {
      throw new Error(`duplicate owner-priority dimension: ${priority.dimension}`);
    }
    seen.add(priority.dimension);
    if (!Number.isFinite(priority.weight) || priority.weight < 0 || priority.weight > 1) {
      throw new Error(`invalid owner-priority weight: ${priority.dimension}`);
    }
    return sum + priority.weight;
  }, 0);

  if (Math.abs(total - 1) > 1e-9) {
    throw new Error(`owner-priority weights must equal 1; received ${total}`);
  }
}

function workloadValue(level: WorkloadLevel): number {
  if (level === 'low') return 1;
  if (level === 'moderate') return 0.6;
  return 0.25;
}

function dimensionValue(input: {
  dimension: PreferenceDimension;
  forecast: ForecastOption;
  eligibleForecasts: readonly ForecastOption[];
}): number {
  const { dimension, forecast, eligibleForecasts } = input;
  if (dimension === 'possession') return forecast.possessionBy90Days;
  if (dimension === 'workload') return workloadValue(forecast.workload);

  if (dimension === 'recovery') {
    const max = Math.max(...eligibleForecasts.map(item => item.expectedRecovery));
    return max <= 0 ? 1 : forecast.expectedRecovery / max;
  }

  const days = eligibleForecasts.map(item => item.expectedDaysToResolution);
  const min = Math.min(...days);
  const max = Math.max(...days);
  if (Math.abs(max - min) < 1e-9) return 1;
  return (max - forecast.expectedDaysToResolution) / (max - min);
}

function dimensionLabel(dimension: PreferenceDimension): string {
  const labels: Record<PreferenceDimension, string> = {
    possession: 'Recover possession when needed',
    speed: 'Resolve sooner',
    recovery: 'Recover represented balance',
    workload: 'Reduce owner workload',
  };
  return labels[dimension];
}

function buildBreakdown(input: {
  forecast: ForecastOption;
  eligibleForecasts: readonly ForecastOption[];
  preferences: OwnerPreferenceProfile;
}): { breakdown: OptionPreferenceBreakdown; internalFit: number } {
  const dimensions: RecommendationDimension[] = input.preferences.priorities.map(priority => {
    const normalizedValue = round(
      dimensionValue({
        dimension: priority.dimension,
        forecast: input.forecast,
        eligibleForecasts: input.eligibleForecasts,
      }),
      4,
    );
    return {
      dimension: priority.dimension,
      label: priority.label || dimensionLabel(priority.dimension),
      weight: priority.weight,
      normalizedValue,
      weightedContribution: round(normalizedValue * priority.weight, 4),
    };
  });

  return {
    breakdown: { optionId: input.forecast.optionId, dimensions },
    internalFit: round(
      dimensions.reduce((sum, dimension) => sum + dimension.weightedContribution, 0),
      6,
    ),
  };
}

export function deriveRecommendation(input: {
  eligibleOptions: readonly EligibleOption[];
  forecast: DecisionOutputInput['forecast'];
  preferences: OwnerPreferenceProfile;
}): Recommendation {
  validateEligibleOptions(input.eligibleOptions);
  validatePreferences(input.preferences);

  const eligibleIds = new Set(input.eligibleOptions.map(option => option.id));
  const forecastById = new Map(input.forecast.options.map(option => [option.optionId, option]));
  const eligibleForecasts = input.eligibleOptions.map(option => {
    const forecast = forecastById.get(option.id);
    if (!forecast) throw new Error(`eligible option ${option.id} lacks represented outcomes`);
    return forecast;
  });

  const ranked = eligibleForecasts.map(forecast => {
    const built = buildBreakdown({
      forecast,
      eligibleForecasts,
      preferences: input.preferences,
    });
    return { ...built, optionId: forecast.optionId };
  });

  ranked.sort((a, b) => {
    if (Math.abs(b.internalFit - a.internalFit) > 1e-9) {
      return b.internalFit - a.internalFit;
    }
    return a.optionId.localeCompare(b.optionId);
  });

  const winner = ranked[0];
  if (!winner || !eligibleIds.has(winner.optionId)) {
    throw new Error('recommendation must resolve to an externally supplied eligible option');
  }
  const option = input.eligibleOptions.find(item => item.id === winner.optionId);
  if (!option) throw new Error('recommended option lost eligibility identity');

  const strongest = [...winner.breakdown.dimensions]
    .sort((a, b) => b.weightedContribution - a.weightedContribution)
    .slice(0, 2)
    .map(item => `${item.label} (${Math.round(item.weight * 100)}% priority weight)`);

  return {
    optionId: option.id,
    optionLabel: option.label,
    headline: option.label,
    rationale: `This option ranks first under the explicit owner priorities, led by ${strongest.join(' and ')}. Changing those priorities can change the recommendation without changing the represented outcomes.`,
    dimensions: winner.breakdown.dimensions,
    comparison: ranked.map(item => item.breakdown),
  };
}

export function deriveDecisionOutput(input: DecisionOutputInput): DecisionOutput {
  const recommendation = deriveRecommendation({
    eligibleOptions: input.eligibleOptions,
    forecast: input.forecast,
    preferences: input.preferences,
  });

  return {
    schema: OP_PDI_DECISION_OUTPUT_SCHEMA,
    matter: input.matter,
    eligibleOptions: input.eligibleOptions,
    forecast: input.forecast,
    preferences: input.preferences,
    recommendation,
    evidence: input.evidence,
    modelQuality: {
      status: 'not_established',
      numericalModel: 'not_connected',
      calibration: 'not_established',
      note: 'Numerical model is not connected, simulation has not been run, and calibration has not been established for this synthetic internal Preview.',
    },
    scientificBoundary: input.scientificBoundary,
  };
}

export function createOwnerDecision(
  optionId: string,
  eligibleOptions: readonly EligibleOption[],
): OwnerDecision {
  validateEligibleOptions(eligibleOptions);
  if (!eligibleOptions.some(option => option.id === optionId)) {
    throw new Error('Owner Decision must reference an externally supplied eligible option');
  }
  return {
    optionId,
    representedOnly: true,
    storage: 'local_preview_state',
    executionAuthority: 'none',
  };
}

export function representNextTask(decision: OwnerDecision): NextTaskRepresentation {
  return {
    ownerDecisionOptionId: decision.optionId,
    label: 'A separately governed future task would require its own authorization before anything can happen.',
    representationOnly: true,
    connected: false,
    invoked: false,
    executionAuthority: 'none',
  };
}
