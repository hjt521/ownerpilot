import {
  directProposalCompletionProbability,
  percentagePointDelta,
  type DecisionOutputPreviewFixture,
  type EvidenceItem,
  type NegotiationVariant,
  type StrategyProjection,
} from '@/lib/pdi/decisionOutputPreview';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const percent = (value: number) => `${Math.round(value * 100)}%`;
const signedPoints = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)} pts`;
const signedMoney = (value: number) => `${value > 0 ? '+' : ''}${money.format(value)}`;
const signedDays = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(0)} days`;

export function DecisionOutputPreview({
  fixture,
}: {
  fixture: DecisionOutputPreviewFixture;
}) {
  const preferred = fixture.strategies.find(
    strategy => strategy.id === fixture.recommendation.strategyId,
  );
  const optimized = fixture.negotiation.variants.find(
    variant => variant.id === fixture.negotiation.optimizedVariantId,
  );

  if (!preferred || !optimized) {
    throw new Error('synthetic decision preview fixture is internally inconsistent');
  }

  return (
    <div className="space-y-8">
      <SyntheticBoundary />

      <section className="rounded-3xl border border-rule bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
              Decision context
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-brand">
              {fixture.matter.label}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Pill>{fixture.matter.stage}</Pill>
              <Pill>Balance {money.format(fixture.matter.balance)}</Pill>
              <Pill>Single-business synthetic fixture</Pill>
            </div>
          </div>
          <div className="rounded-2xl border border-rule bg-tint p-4 text-sm lg:max-w-sm">
            <p className="font-semibold text-brand">Evidence quality</p>
            <p className="mt-2 leading-6 text-muted">
              Mixed fixture: verified facts, owner estimates, model assumptions and
              material unknowns are shown separately. No real customer forecast is
              produced by this Preview.
            </p>
          </div>
        </div>
      </section>

      <Section
        eyebrow="Executive answer"
        title="Recommended path"
        description="Answer first, then show the roadmap, calculations, assumptions and the exact conditions that could change the recommendation."
      >
        <div className="rounded-3xl border border-gold/40 bg-[#fffaf0] p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold">
            Preferred under the synthetic owner priorities
          </p>
          <h3 className="mt-3 max-w-4xl font-serif text-3xl font-semibold leading-tight text-brand sm:text-4xl">
            {fixture.recommendation.headline}
          </h3>
          <p className="mt-4 max-w-4xl text-base leading-7 text-ink">
            {fixture.recommendation.rationale}
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Expected recovery"
              value={money.format(preferred.expectedRecovery)}
              detail="Probability-weighted synthetic terminal outcomes"
            />
            <MetricCard
              label="Expected resolution"
              value={`${preferred.expectedDaysToResolution.toFixed(0)} days`}
              detail="Probability-weighted synthetic duration"
            />
            <MetricCard
              label="Possession by 90 days"
              value={percent(preferred.possessionBy90Days)}
              detail="Separate from recovery and speed"
            />
            <MetricCard
              label="Forecast confidence"
              value={fixture.recommendation.confidence.toUpperCase()}
              detail="Not a probability that OwnerPilot is correct"
            />
          </div>
        </div>
      </Section>

      <Section
        eyebrow="Control envelope"
        title="Options represented in this decision"
        description="Eligibility comes before prediction. A future live implementation must receive governed alternatives from deterministic controls rather than allowing the probability model to create its own legal or operational option set."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {fixture.strategies.map(strategy => (
            <div
              key={strategy.id}
              className={`rounded-2xl border p-5 ${
                strategy.preferredUnderCurrentPriorities
                  ? 'border-gold/60 bg-[#fffaf0]'
                  : 'border-rule bg-white'
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-muted">
                {strategy.preferredUnderCurrentPriorities
                  ? 'Currently preferred'
                  : 'Available alternative'}
              </p>
              <p className="mt-2 font-semibold text-brand">{strategy.label}</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                Workload: {strategy.workload}. No option is activated by appearing
                in this comparison.
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Decision roadmap"
        title="How the modeled paths branch"
        description="A game-tree style map makes the reasoning inspectable: strategy choice first, downstream response/outcome branches second, terminal probabilities and consequences last."
      >
        <DecisionTree fixture={fixture} />
      </Section>

      <Section
        eyebrow="Strategy comparison"
        title="Compare the modeled tradeoffs"
        description="No universal OwnerPilot score is used. Recovery, time, possession and workload remain separate so the landlord can see the actual tradeoff."
      >
        <StrategyTable strategies={fixture.strategies} />
      </Section>

      <Section
        eyebrow="Calculation sheet"
        title="How the preferred-path expected values are calculated"
        description="The Preview exposes the arithmetic instead of hiding the result behind a single AI-generated number."
      >
        <CalculationSheet strategy={preferred} />
      </Section>

      <Section
        eyebrow="Negotiation model"
        title="Can better communication improve the modeled outcome?"
        description="The negotiation layer compares the baseline communication posture with a structured communication intervention, then re-forecasts the represented outcomes. Communication is an intervention to model—not authority to send."
      >
        <NegotiationUplift
          baseline={fixture.negotiation.baseline}
          optimized={optimized}
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <CommunicationVariants
            variants={fixture.negotiation.variants}
          />
          <ResponseTree
            optimized={optimized}
            branches={fixture.negotiation.responseTree}
          />
        </div>
      </Section>

      <Section
        eyebrow="Negotiation communication"
        title="Optimized draft for owner review"
        description="A future response model may estimate how wording and terms affect response behavior. This Preview only displays deterministic synthetic drafts; it does not send, schedule or persist a communication."
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <CommunicationCard
            title="Text"
            body={fixture.negotiation.communication.text}
          />
          <CommunicationCard
            title="Email"
            subject={fixture.negotiation.communication.emailSubject}
            body={fixture.negotiation.communication.emailBody}
          />
        </div>
        <div className="mt-5 rounded-2xl border border-rule bg-tint p-5">
          <p className="font-semibold text-brand">Why this version is modeled differently</p>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink md:grid-cols-2">
            {fixture.negotiation.communication.strategyFeatures.map(feature => (
              <li key={feature} className="flex gap-2">
                <span aria-hidden="true" className="text-gold">◆</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <div className="grid gap-8 xl:grid-cols-2">
        <Section
          eyebrow="Sensitivity"
          title="What would change the recommendation?"
          description="Decision-flip thresholds show where the current preferred path stops leading."
        >
          <div className="space-y-3">
            {fixture.decisionFlips.map(flip => (
              <div key={flip.id} className="rounded-2xl border border-rule bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="font-semibold text-brand">{flip.variable}</p>
                  <p className="text-sm font-bold text-gold">
                    {flip.currentValue} → {flip.threshold}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{flip.consequence}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          eyebrow="Value of information"
          title="What should OwnerPilot learn next?"
          description="Sometimes the best negotiation move is to ask one high-value question instead of immediately making another offer."
        >
          <div className="rounded-2xl border border-gold/40 bg-[#fffaf0] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
              Highest-value unknown in this fixture
            </p>
            <p className="mt-3 font-serif text-2xl font-semibold text-brand">
              {fixture.highestValueUnknown.question}
            </p>
            <p className="mt-4 text-sm leading-6 text-ink">
              {fixture.highestValueUnknown.reason}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              <strong className="text-brand">Possible effect:</strong>{' '}
              {fixture.highestValueUnknown.possibleEffect}
            </p>
          </div>
        </Section>
      </div>

      <Section
        eyebrow="Evidence ledger"
        title="Facts, estimates, assumptions and unknowns"
        description="The user should be able to inspect what the model used and what remains uncertain without exposing private chain-of-thought."
      >
        <EvidenceLedger evidence={fixture.evidence} />
      </Section>

      <Section
        eyebrow="Model provenance"
        title="Scientific audit boundary"
        description="A serious decision product must disclose when a numerical engine, simulation and calibration cohort do not yet exist rather than manufacturing precision."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Generation"
            value={fixture.provenance.generationId}
            detail="Deterministic fixture identity"
            compact
          />
          <MetricCard
            label="Numerical engine"
            value="NOT CONNECTED"
            detail="No live Monte Carlo or learned model in this Preview"
          />
          <MetricCard
            label="Simulation runs"
            value="0"
            detail="The displayed arithmetic uses fixed synthetic branches"
          />
          <MetricCard
            label="Calibration cohort"
            value="NOT ESTABLISHED"
            detail="No retrospective cohort is claimed"
          />
        </div>
      </Section>

      <section className="rounded-3xl border border-brand/20 bg-brand p-6 text-white shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
          Owner decision boundary
        </p>
        <h2 className="mt-3 font-serif text-3xl font-semibold">
          Analysis can inform the next move. It does not take the next move.
        </h2>
        <p className="mt-4 max-w-4xl leading-7 text-white/80">
          This Preview creates no communication-send authority, no legal effect, no
          workflow activation and no Production authority. A future live product
          must preserve: control → predict → negotiate → communicate → observe →
          update → owner decision.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold tracking-wide">
          <span className="rounded-full border border-white/30 px-3 py-1.5">ADVISORY ONLY</span>
          <span className="rounded-full border border-white/30 px-3 py-1.5">NO SEND AUTHORITY</span>
          <span className="rounded-full border border-white/30 px-3 py-1.5">NO ACTION AUTHORITY</span>
          <span className="rounded-full border border-white/30 px-3 py-1.5">NO PRODUCTION AUTHORITY</span>
        </div>
      </section>
    </div>
  );
}

function SyntheticBoundary() {
  return (
    <aside className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
      <strong>Synthetic decision-output Preview:</strong>{' '}
      Every probability, dollar value, threshold and communication-effect estimate
      on this page is a deterministic demonstration fixture. It is not trained,
      calibrated or approved for customer reliance. No real tenant, property,
      payment or legal-case data is used.
    </aside>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-rule bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-3xl font-semibold text-brand">{title}</h2>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-muted sm:text-base">
        {description}
      </p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-rule bg-tint px-3 py-1.5 font-medium text-brand">
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  compact = false,
}: {
  label: string;
  value: string;
  detail: string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-rule bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 font-semibold text-brand ${compact ? 'break-all text-sm' : 'text-2xl'}`}>
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
    </div>
  );
}

function DecisionTree({ fixture }: { fixture: DecisionOutputPreviewFixture }) {
  const treeStrategies = fixture.strategies.slice(0, 3);
  const branchY = [80, 225, 370];

  return (
    <div className="overflow-x-auto rounded-2xl border border-rule bg-[#fbfbf8] p-3">
      <svg
        aria-label="Synthetic decision tree showing three strategies and their primary outcome branches"
        className="min-w-[920px]"
        role="img"
        viewBox="0 0 1020 455"
      >
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
          </filter>
        </defs>
        <line x1="120" y1="225" x2="260" y2="80" stroke="#B18A3B" strokeWidth="3" />
        <line x1="120" y1="225" x2="260" y2="225" stroke="#B18A3B" strokeWidth="3" />
        <line x1="120" y1="225" x2="260" y2="370" stroke="#B18A3B" strokeWidth="3" />
        <circle cx="110" cy="225" r="12" fill="#102018" />
        <text x="20" y="205" fontSize="14" fontWeight="700" fill="#102018">CURRENT</text>
        <text x="20" y="224" fontSize="14" fontWeight="700" fill="#102018">MATTER</text>
        <text x="20" y="247" fontSize="12" fill="#606763">Choose strategy</text>

        {treeStrategies.map((strategy, strategyIndex) => {
          const y = branchY[strategyIndex];
          const outcomes = strategy.outcomes.slice(0, 3);
          const outcomeY = [y - 46, y, y + 46];
          return (
            <g key={strategy.id}>
              <rect
                x="260"
                y={y - 30}
                width="250"
                height="60"
                rx="14"
                fill={strategy.preferredUnderCurrentPriorities ? '#fff7df' : '#ffffff'}
                stroke={strategy.preferredUnderCurrentPriorities ? '#B18A3B' : '#d8d9d4'}
                filter="url(#shadow)"
              />
              <text x="278" y={y - 4} fontSize="13" fontWeight="700" fill="#102018">
                {strategy.shortLabel}
              </text>
              <text x="278" y={y + 16} fontSize="11" fill="#606763">
                {money.format(strategy.expectedRecovery)} · {strategy.expectedDaysToResolution.toFixed(0)}d expected
              </text>
              {outcomes.map((outcome, outcomeIndex) => {
                const leafY = outcomeY[outcomeIndex];
                return (
                  <g key={outcome.id}>
                    <line
                      x1="510"
                      y1={y}
                      x2="642"
                      y2={leafY}
                      stroke="#8a8f89"
                      strokeWidth="2"
                    />
                    <circle cx="642" cy={leafY} r="5" fill="#B18A3B" />
                    <rect
                      x="660"
                      y={leafY - 26}
                      width="330"
                      height="52"
                      rx="12"
                      fill="#ffffff"
                      stroke="#e1e2de"
                    />
                    <text x="674" y={leafY - 5} fontSize="11" fontWeight="700" fill="#102018">
                      {outcome.label.length > 42
                        ? `${outcome.label.slice(0, 42)}…`
                        : outcome.label}
                    </text>
                    <text x="674" y={leafY + 13} fontSize="11" fill="#606763">
                      {percent(outcome.probability)} · {money.format(outcome.recovery)} · {outcome.daysToResolution}d
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function StrategyTable({ strategies }: { strategies: readonly StrategyProjection[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-rule text-xs uppercase tracking-wider text-muted">
            <th className="px-3 py-3">Strategy</th>
            <th className="px-3 py-3">Expected recovery</th>
            <th className="px-3 py-3">Expected days</th>
            <th className="px-3 py-3">Possession by 90d</th>
            <th className="px-3 py-3">Owner workload</th>
          </tr>
        </thead>
        <tbody>
          {strategies.map(strategy => (
            <tr key={strategy.id} className="border-b border-rule/70 align-top">
              <td className="px-3 py-4 font-semibold text-brand">
                {strategy.label}
                {strategy.preferredUnderCurrentPriorities ? (
                  <span className="ml-2 rounded-full bg-[#fff4d2] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
                    Preferred
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-4 tabular-nums">{money.format(strategy.expectedRecovery)}</td>
              <td className="px-3 py-4 tabular-nums">{strategy.expectedDaysToResolution.toFixed(0)}</td>
              <td className="px-3 py-4 tabular-nums">{percent(strategy.possessionBy90Days)}</td>
              <td className="px-3 py-4 capitalize">{strategy.workload}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalculationSheet({ strategy }: { strategy: StrategyProjection }) {
  return (
    <div className="space-y-5">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-rule text-xs uppercase tracking-wider text-muted">
              <th className="px-3 py-3">Terminal scenario</th>
              <th className="px-3 py-3">Probability</th>
              <th className="px-3 py-3">Recovery</th>
              <th className="px-3 py-3">Weighted recovery</th>
              <th className="px-3 py-3">Days</th>
              <th className="px-3 py-3">Weighted days</th>
            </tr>
          </thead>
          <tbody>
            {strategy.outcomes.map(outcome => (
              <tr key={outcome.id} className="border-b border-rule/70">
                <td className="px-3 py-4 font-medium text-brand">{outcome.label}</td>
                <td className="px-3 py-4 tabular-nums">{percent(outcome.probability)}</td>
                <td className="px-3 py-4 tabular-nums">{money.format(outcome.recovery)}</td>
                <td className="px-3 py-4 tabular-nums">
                  {money.format(outcome.probability * outcome.recovery)}
                </td>
                <td className="px-3 py-4 tabular-nums">{outcome.daysToResolution}</td>
                <td className="px-3 py-4 tabular-nums">
                  {(outcome.probability * outcome.daysToResolution).toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold text-brand">
              <td className="px-3 py-4" colSpan={3}>Probability-weighted expectation</td>
              <td className="px-3 py-4">{money.format(strategy.expectedRecovery)}</td>
              <td className="px-3 py-4" />
              <td className="px-3 py-4">{strategy.expectedDaysToResolution.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="rounded-xl bg-tint px-4 py-3 font-mono text-xs leading-5 text-ink">
        Expected recovery = Σ(probability × terminal recovery). Expected time = Σ(probability × terminal days).
        These are transparent fixture calculations, not a live calibrated forecast.
      </p>
    </div>
  );
}

function NegotiationUplift({
  baseline,
  optimized,
}: {
  baseline: NegotiationVariant;
  optimized: NegotiationVariant;
}) {
  const rows = [
    {
      label: 'Response probability',
      before: percent(baseline.responseProbability),
      after: percent(optimized.responseProbability),
      delta: signedPoints(percentagePointDelta(baseline.responseProbability, optimized.responseProbability)),
    },
    {
      label: 'Proposal acceptance',
      before: percent(baseline.acceptanceProbability),
      after: percent(optimized.acceptanceProbability),
      delta: signedPoints(percentagePointDelta(baseline.acceptanceProbability, optimized.acceptanceProbability)),
    },
    {
      label: 'Completion if accepted',
      before: percent(baseline.completionGivenAcceptance),
      after: percent(optimized.completionGivenAcceptance),
      delta: signedPoints(percentagePointDelta(baseline.completionGivenAcceptance, optimized.completionGivenAcceptance)),
    },
    {
      label: 'Expected recovery',
      before: money.format(baseline.expectedRecovery),
      after: money.format(optimized.expectedRecovery),
      delta: signedMoney(optimized.expectedRecovery - baseline.expectedRecovery),
    },
    {
      label: 'Expected resolution',
      before: `${baseline.expectedDaysToResolution} days`,
      after: `${optimized.expectedDaysToResolution} days`,
      delta: signedDays(optimized.expectedDaysToResolution - baseline.expectedDaysToResolution),
    },
    {
      label: 'Voluntary resolution',
      before: percent(baseline.voluntaryResolutionProbability),
      after: percent(optimized.voluntaryResolutionProbability),
      delta: signedPoints(percentagePointDelta(baseline.voluntaryResolutionProbability, optimized.voluntaryResolutionProbability)),
    },
  ];

  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
            Projected outcome improvement — synthetic
          </p>
          <h3 className="mt-2 font-serif text-2xl font-semibold text-brand">
            Better communication is modeled as a change to the future, not just nicer wording.
          </h3>
        </div>
        <p className="text-sm font-semibold text-emerald-900">
          Optimized variant: {optimized.label}
        </p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-emerald-200 text-left text-xs uppercase tracking-wider text-emerald-900/70">
              <th className="px-3 py-3">Measure</th>
              <th className="px-3 py-3">Baseline</th>
              <th className="px-3 py-3">With structured communication</th>
              <th className="px-3 py-3">Projected change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label} className="border-b border-emerald-100">
                <td className="px-3 py-4 font-medium text-brand">{row.label}</td>
                <td className="px-3 py-4 tabular-nums">{row.before}</td>
                <td className="px-3 py-4 font-semibold tabular-nums text-brand">{row.after}</td>
                <td className="px-3 py-4 font-semibold tabular-nums text-emerald-800">{row.delta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommunicationVariants({ variants }: { variants: readonly NegotiationVariant[] }) {
  return (
    <div className="rounded-2xl border border-rule p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
        Communication frontier
      </p>
      <h3 className="mt-2 font-serif text-2xl font-semibold text-brand">
        More acceptance is not always a better final outcome
      </h3>
      <div className="mt-4 space-y-3">
        {variants.map(variant => (
          <div
            key={variant.id}
            className={`rounded-xl border p-4 ${variant.recommended ? 'border-gold/50 bg-[#fffaf0]' : 'border-rule bg-white'}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-brand">{variant.label}</p>
              {variant.recommended ? (
                <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  Best represented tradeoff
                </span>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <SmallStat label="Response" value={percent(variant.responseProbability)} />
              <SmallStat label="Accept" value={percent(variant.acceptanceProbability)} />
              <SmallStat label="Complete | accept" value={percent(variant.completionGivenAcceptance)} />
              <SmallStat label="Expected recovery" value={money.format(variant.expectedRecovery)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResponseTree({
  optimized,
  branches,
}: {
  optimized: NegotiationVariant;
  branches: DecisionOutputPreviewFixture['negotiation']['responseTree'];
}) {
  const completion = directProposalCompletionProbability(optimized);
  return (
    <div className="rounded-2xl border border-rule p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
        Response tree
      </p>
      <h3 className="mt-2 font-serif text-2xl font-semibold text-brand">
        What happens after the communication?
      </h3>
      <div className="mt-4 space-y-3">
        {branches.map(branch => (
          <div key={branch.id} className="relative border-l-2 border-gold/50 pl-5">
            <div className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-gold" />
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold text-brand">{branch.label}</p>
              <p className="font-mono text-sm font-bold text-gold">{percent(branch.probability)}</p>
            </div>
            <p className="mt-1 text-sm leading-5 text-muted">{branch.note}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-xl bg-tint p-4">
        <p className="font-mono text-xs leading-5 text-ink">
          P(direct proposal → completion) = P(accept) × P(complete | accept) = {optimized.acceptanceProbability.toFixed(2)} × {optimized.completionGivenAcceptance.toFixed(2)} = {(completion * 100).toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

function CommunicationCard({
  title,
  subject,
  body,
}: {
  title: string;
  subject?: string;
  body: string;
}) {
  return (
    <article className="rounded-2xl border border-rule bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-serif text-2xl font-semibold text-brand">{title}</h3>
        <span className="rounded-full border border-rule px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
          Draft only
        </span>
      </div>
      {subject ? (
        <p className="mt-4 border-b border-rule pb-3 text-sm">
          <strong className="text-brand">Subject:</strong> {subject}
        </p>
      ) : null}
      <p className="mt-4 whitespace-pre-line text-sm leading-7 text-ink">{body}</p>
      <p className="mt-5 rounded-xl bg-tint px-4 py-3 text-xs leading-5 text-muted">
        No send control exists in this Preview. The owner would review, modify or reject a future live draft before any separately authorized communication action.
      </p>
    </article>
  );
}

function EvidenceLedger({ evidence }: { evidence: readonly EvidenceItem[] }) {
  const order: EvidenceItem['kind'][] = [
    'verified',
    'owner_estimate',
    'model_assumption',
    'unknown',
  ];
  const labels: Record<EvidenceItem['kind'], string> = {
    verified: 'Verified facts',
    owner_estimate: 'Owner estimates',
    model_assumption: 'Model assumptions',
    unknown: 'Material unknowns',
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {order.map(kind => (
        <div key={kind} className="rounded-2xl border border-rule bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">{labels[kind]}</p>
          <div className="mt-4 space-y-4">
            {evidence.filter(item => item.kind === kind).map(item => (
              <div key={item.id}>
                <p className="font-semibold text-brand">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{item.whyItMatters}</p>
              </div>
            ))}
            {evidence.some(item => item.kind === kind) ? null : (
              <p className="text-sm text-muted">None in this fixture.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-semibold tabular-nums text-brand">{value}</p>
    </div>
  );
}
