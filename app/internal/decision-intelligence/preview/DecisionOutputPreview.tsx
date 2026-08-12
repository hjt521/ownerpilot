'use client';

import { useMemo, useState } from 'react';

import type {
  EvidenceKind,
  ForecastOption,
  OwnerDecision,
  OwnerPreferenceProfile,
} from '@/lib/pdi/decisionOutput';
import {
  createOwnerDecision,
  deriveDecisionOutput,
  representNextTask,
} from '@/lib/pdi/decisionOutputDerivation';

import {
  SYNTHETIC_ELIGIBLE_OPTIONS,
  SYNTHETIC_EVIDENCE,
  SYNTHETIC_FORECAST,
  SYNTHETIC_MATTER,
  SYNTHETIC_PREFERENCE_PROFILES,
  SYNTHETIC_SCIENTIFIC_BOUNDARY,
} from './fixtures';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const percent = (value: number) => `${Math.round(value * 100)}%`;

export function DecisionOutputPreview() {
  const [preferenceId, setPreferenceId] = useState(SYNTHETIC_PREFERENCE_PROFILES[0].id);
  const [explorationOptionId, setExplorationOptionId] = useState<string | null>(null);
  const [ownerDecision, setOwnerDecision] = useState<OwnerDecision | null>(null);

  const preferences =
    SYNTHETIC_PREFERENCE_PROFILES.find(profile => profile.id === preferenceId) ??
    SYNTHETIC_PREFERENCE_PROFILES[0];

  const output = useMemo(
    () =>
      deriveDecisionOutput({
        matter: SYNTHETIC_MATTER,
        eligibleOptions: SYNTHETIC_ELIGIBLE_OPTIONS,
        forecast: SYNTHETIC_FORECAST,
        preferences,
        evidence: SYNTHETIC_EVIDENCE,
        scientificBoundary: SYNTHETIC_SCIENTIFIC_BOUNDARY,
      }),
    [preferences],
  );

  const recommendedForecast = output.forecast.options.find(
    option => option.optionId === output.recommendation.optionId,
  );
  if (!recommendedForecast) {
    throw new Error('recommended option lacks represented outcomes');
  }

  const exploredOptionId = explorationOptionId ?? output.recommendation.optionId;
  const exploredOption = output.eligibleOptions.find(option => option.id === exploredOptionId);
  const exploredForecast = output.forecast.options.find(option => option.optionId === exploredOptionId);
  if (!exploredOption || !exploredForecast) {
    throw new Error('exploration selection must remain eligible and forecast-bound');
  }

  const decidedOption = ownerDecision
    ? output.eligibleOptions.find(option => option.id === ownerDecision.optionId) ?? null
    : null;
  const nextTask = ownerDecision ? representNextTask(ownerDecision) : null;

  const captureOwnerDecision = () => {
    setOwnerDecision(createOwnerDecision(exploredOption.id, output.eligibleOptions));
  };

  return (
    <div className="space-y-8">
      <BoundaryNotice />

      <Section eyebrow="Matter" title="Matter / Decision Context">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Matter" value={output.matter.label} />
          <Metric label="Stage" value={output.matter.stage} />
          <Metric label="Represented balance" value={money.format(output.matter.representedBalance)} />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">
          This context is a deterministic synthetic fixture. It does not create legal,
          workflow, service, communication, or execution authority.
        </p>
      </Section>

      <Section eyebrow="Recommendation" title="Recommended strategy">
        <div className="rounded-2xl border border-gold/50 bg-[#fffaf0] p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
            Recommended under the explicit priorities below
          </p>
          <h3 className="mt-3 font-serif text-2xl font-semibold text-brand sm:text-3xl">
            {output.recommendation.headline}
          </h3>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-ink sm:text-base">
            {output.recommendation.rationale}
          </p>
          <div className="mt-5 rounded-xl border border-rule bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Primary modeled consequences
            </p>
            <p className="mt-2 text-sm leading-6 text-ink">
              Expected recovery {money.format(recommendedForecast.expectedRecovery)} · expected resolution{' '}
              {recommendedForecast.expectedDaysToResolution.toFixed(0)} days · possession by 90 days{' '}
              {percent(recommendedForecast.possessionBy90Days)} · owner workload {recommendedForecast.workload}.
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              These are synthetic represented outcome measures, not a probability or confidence that the recommendation is correct.
            </p>
          </div>
        </div>
      </Section>

      <Section eyebrow="Outcomes" title="Primary modeled outcomes">
        <OutcomeSummary forecast={recommendedForecast} />
        <p className="mt-4 text-xs leading-5 text-muted">
          These are synthetic represented outcomes. Outcome probability is not model quality,
          and no customer forecast is being produced.
        </p>
      </Section>

      <Section eyebrow="Owner priorities" title="Your priorities">
        <p className="max-w-4xl text-sm leading-6 text-muted">
          The forecast object stays fixed when you change priorities. Only the deterministic
          recommendation ranking is recalculated from the explicit weights.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {SYNTHETIC_PREFERENCE_PROFILES.map(profile => (
            <button
              key={profile.id}
              type="button"
              onClick={() => setPreferenceId(profile.id)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold ${
                profile.id === preferences.id
                  ? 'border-brand bg-brand text-white'
                  : 'border-rule bg-white text-brand'
              }`}
            >
              {profile.label}
            </button>
          ))}
        </div>
        <PriorityList preferences={preferences} />
      </Section>

      <Section eyebrow="Eligibility" title="Eligible options">
        <p className="max-w-4xl text-sm leading-6 text-muted">
          Eligibility is externally supplied and provenance-bound before recommendation
          derivation. This Preview ranks only that supplied set; it cannot manufacture an
          eligible option.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {output.eligibleOptions.map(option => {
            const selected = option.id === exploredOption.id;
            const recommended = option.id === output.recommendation.optionId;
            return (
              <article
                key={option.id}
                className={`rounded-2xl border p-5 ${selected ? 'border-gold bg-[#fffaf0]' : 'border-rule bg-white'}`}
              >
                <div className="flex flex-wrap gap-2">
                  <Tag>ELIGIBLE</Tag>
                  {recommended ? <Tag>RECOMMENDED</Tag> : null}
                </div>
                <h3 className="mt-3 font-semibold text-brand">{option.label}</h3>
                <p className="mt-3 text-xs leading-5 text-muted">
                  Stable id: <code>{option.id}</code><br />
                  Provenance: <code>{option.provenance.sourceId}</code>
                </p>
                <button
                  type="button"
                  onClick={() => setExplorationOptionId(option.id)}
                  className="mt-4 rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand"
                >
                  Explore this option
                </button>
              </article>
            );
          })}
        </div>
        <p className="mt-4 rounded-xl bg-tint px-4 py-3 text-sm text-muted">
          Exploration selection is not an Owner Decision and does not create a next task.
        </p>
      </Section>

      <Section eyebrow="Sensitivity" title="What could change this recommendation?">
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard
            title="A different owner-priority profile"
            body="Changing the weights can change the recommendation while the represented outcome values remain unchanged."
          />
          <InfoCard
            title="A material fact or assumption change"
            body="A new fact would require a separately derived forecast object before recommendation is recalculated. The current material unknown remains visible below."
          />
        </div>
        <div className="mt-4 rounded-2xl border border-rule bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Material unknown</p>
          <p className="mt-2 font-semibold text-brand">Near-term payment capacity</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Unknown in this fixture. It may alter future represented outcomes, but it does not
            silently alter this fixed forecast object.
          </p>
        </div>
      </Section>

      <Section eyebrow="Deep analysis" title="Decision roadmap">
        <div className="space-y-4">
          {output.eligibleOptions.map(option => {
            const forecast = output.forecast.options.find(item => item.optionId === option.id);
            if (!forecast) return null;
            return (
              <article key={option.id} className="rounded-2xl border border-rule bg-white p-5">
                <p className="font-semibold text-brand">{option.shortLabel}</p>
                <div className="mt-4 space-y-3">
                  {forecast.outcomes.map(outcome => (
                    <div key={outcome.id} className="rounded-xl bg-tint p-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                        <p className="font-medium text-brand">{outcome.label}</p>
                        <p className="font-mono text-sm text-gold">{percent(outcome.probability)} synthetic branch</p>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <SmallMetric label="Recovery consequence" value={money.format(outcome.recovery)} />
                        <SmallMetric label="Time consequence" value={`${outcome.daysToResolution} days`} />
                        <SmallMetric label="Possession ≤90d" value={percent(outcome.possessionBy90Days)} />
                      </div>
                      <p className="mt-3 text-sm leading-5 text-muted">{outcome.narrative}</p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      <Section eyebrow="Deep analysis" title="Strategy comparison">
        <p className="mb-5 rounded-xl bg-tint px-4 py-3 text-xs leading-5 text-muted">
          Deterministic ranking math only. Normalized ranking values and preference-weighted ranking contributions are unitless comparison values; they are not forecast probabilities, likelihoods, or model confidence.
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          {output.eligibleOptions.map(option => {
            const forecast = output.forecast.options.find(item => item.optionId === option.id);
            const breakdown = output.recommendation.comparison.find(item => item.optionId === option.id);
            if (!forecast || !breakdown) return null;
            return (
              <article key={option.id} className="rounded-2xl border border-rule bg-white p-5">
                <p className="font-semibold text-brand">{option.shortLabel}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <SmallMetric label="Recovery" value={money.format(forecast.expectedRecovery)} />
                  <SmallMetric label="Resolution" value={`${forecast.expectedDaysToResolution.toFixed(0)} days`} />
                  <SmallMetric label="Possession ≤90d" value={percent(forecast.possessionBy90Days)} />
                  <SmallMetric label="Workload" value={forecast.workload} />
                </div>
                <div className="mt-4 space-y-2 border-t border-rule pt-4">
                  {breakdown.dimensions.map(dimension => (
                    <p key={dimension.dimension} className="text-xs leading-5 text-muted">
                      {dimension.label}: {Math.round(dimension.weight * 100)}% priority weight × normalized ranking value{' '}
                      {dimension.normalizedValue.toFixed(3)} = preference-weighted ranking contribution{' '}
                      {dimension.weightedContribution.toFixed(3)} (unitless)
                    </p>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </Section>

      <Section eyebrow="Deep analysis" title="Calculation detail">
        <CalculationDetail forecast={exploredForecast} />
      </Section>

      <Section eyebrow="Deep analysis" title="Evidence / assumptions / model quality">
        <EvidenceLedger />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Metric label="Numerical model" value="Not connected" />
          <Metric label="Simulation" value="Not run" />
          <Metric label="Calibration" value="Not established" />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">{output.modelQuality.note}</p>
      </Section>

      <Section eyebrow="Boundary" title="Your decision">
        <div className="rounded-2xl border border-brand/20 bg-brand p-5 text-white sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Owner Decision boundary</p>
          <h3 className="mt-3 font-serif text-2xl font-semibold">
            Recommendation and exploration remain separate from your decision.
          </h3>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-white/80">
            The Preview may represent a choice in local component state only. It creates no
            action, send, settlement, filing, persistence, external workflow, or execution authority.
          </p>
          <div className="mt-5 rounded-xl border border-white/20 p-4">
            <p className="text-xs uppercase tracking-wider text-white/60">Currently explored</p>
            <p className="mt-1 font-semibold">{exploredOption.label}</p>
          </div>
          <button
            type="button"
            onClick={captureOwnerDecision}
            className="mt-4 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-brand"
          >
            Represent as Owner Decision locally
          </button>
          {ownerDecision ? (
            <p className="mt-4 text-sm text-white/85">
              Local Owner Decision represented: {decidedOption?.label ?? ownerDecision.optionId}. Execution authority: NONE.
            </p>
          ) : (
            <p className="mt-4 text-sm text-white/70">No Owner Decision has been represented.</p>
          )}
        </div>
      </Section>

      <Section eyebrow="Boundary" title="Next task">
        {nextTask && decidedOption ? (
          <div className="rounded-2xl border border-rule bg-tint p-5">
            <p className="font-semibold text-brand">Representational seam only</p>
            <p className="mt-2 text-sm font-semibold text-brand">
              Based on your represented decision: {decidedOption.label}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">No operational task is connected in v1A.</p>
            <p className="mt-2 text-sm leading-6 text-muted">{nextTask.label}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted">
              CONNECTED: NO · INVOKED: NO · EXECUTION AUTHORITY: NONE
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-rule bg-tint p-5 text-sm leading-6 text-muted">
            No next-task representation exists until an explicit local Owner Decision is represented.
            Nothing is invoked from this Preview.
          </div>
        )}
      </Section>
    </div>
  );
}

function BoundaryNotice() {
  return (
    <aside className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-950">
      SYNTHETIC FIXTURE · INTERNAL PREVIEW · NO CUSTOMER FORECAST · NO ACTION / SEND AUTHORITY
    </aside>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-rule bg-white p-5 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-3xl font-semibold text-brand">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-tint p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-semibold text-brand">{value}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-semibold capitalize text-brand">{value}</p>
    </div>
  );
}

function OutcomeSummary({ forecast }: { forecast: ForecastOption }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Expected recovery" value={money.format(forecast.expectedRecovery)} />
      <Metric label="Expected resolution" value={`${forecast.expectedDaysToResolution.toFixed(0)} days`} />
      <Metric label="Possession by 90 days" value={percent(forecast.possessionBy90Days)} />
      <Metric label="Owner workload" value={forecast.workload} />
    </div>
  );
}

function PriorityList({ preferences }: { preferences: OwnerPreferenceProfile }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {preferences.priorities.map(priority => (
        <div key={priority.dimension} className="rounded-xl border border-rule bg-white p-4">
          <p className="text-sm font-semibold text-brand">{priority.label}</p>
          <p className="mt-2 text-2xl font-semibold text-gold">{Math.round(priority.weight * 100)}%</p>
        </div>
      ))}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-gold/50 bg-tint px-2.5 py-1 text-[10px] font-bold tracking-wider text-brand">
      {children}
    </span>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-white p-5">
      <p className="font-semibold text-brand">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}

function CalculationDetail({ forecast }: { forecast: ForecastOption }) {
  return (
    <div>
      <p className="text-sm leading-6 text-muted">
        Advanced arithmetic is the only core area allowed to scroll horizontally on narrow screens.
      </p>
      <div data-testid="calculation-scroll" className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-rule text-xs uppercase tracking-wider text-muted">
              <th className="px-3 py-3">Outcome</th>
              <th className="px-3 py-3">Probability</th>
              <th className="px-3 py-3">Recovery</th>
              <th className="px-3 py-3">Weighted recovery</th>
              <th className="px-3 py-3">Days</th>
              <th className="px-3 py-3">Weighted days</th>
            </tr>
          </thead>
          <tbody>
            {forecast.outcomes.map(outcome => (
              <tr key={outcome.id} className="border-b border-rule/70">
                <td className="px-3 py-4 font-medium text-brand">{outcome.label}</td>
                <td className="px-3 py-4">{percent(outcome.probability)}</td>
                <td className="px-3 py-4">{money.format(outcome.recovery)}</td>
                <td className="px-3 py-4">{money.format(outcome.probability * outcome.recovery)}</td>
                <td className="px-3 py-4">{outcome.daysToResolution}</td>
                <td className="px-3 py-4">{(outcome.probability * outcome.daysToResolution).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const evidenceLabels: Record<EvidenceKind, string> = {
  verified_fact: 'Verified fact',
  owner_provided_fact: 'Owner-provided fact',
  owner_estimate: 'Owner estimate',
  model_assumption: 'Model assumption',
  derived_value: 'Derived value',
  material_unknown: 'Material unknown',
};

function EvidenceLedger() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {SYNTHETIC_EVIDENCE.map(item => (
        <article key={item.id} className="rounded-2xl border border-rule bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gold">{evidenceLabels[item.kind]}</p>
          <p className="mt-2 font-semibold text-brand">{item.label}</p>
          <p className="mt-1 text-sm text-ink">{item.value}</p>
          <p className="mt-2 text-xs leading-5 text-muted">{item.whyItMatters}</p>
        </article>
      ))}
    </div>
  );
}
