from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one replacement, found {count}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1))


# NoticeFlowData: narrow approval/prepared-generation state.
replace_once(
    'lib/flow/noticeFlowState.ts',
    "  /** ISO timestamp when the produce attestation was accepted (audit). */\n  produceAttestationAcceptedAt?: string;\n",
    "  /** ISO timestamp when the produce attestation was accepted (audit). */\n  produceAttestationAcceptedAt?: string;\n  /** UX2: exact deterministic create-state generation that the C6 approval covers. */\n  reviewApprovalGeneration?: string;\n",
)
replace_once(
    'lib/flow/noticeFlowState.ts',
    "  productionSnapshot?: ProductionSnapshot;\n",
    "  productionSnapshot?: ProductionSnapshot;\n  /** UX2: exact create generation that completed the deliberate Create Notice action. */\n  preparedNoticeGeneration?: string;\n",
)

# Draft envelope: reject pre-binding drafts carrying a bare C6 Boolean.
replace_once(
    'lib/flow/persistence.ts',
    'export const DRAFT_VERSION = 3;',
    "// Bumped 3 -> 4 with UX2 exact review/create approval binding. Pre-UX2\n// drafts may contain a persisted bare produceAttestationConfirmed=true with no\n// generation identity; discard them rather than allow that stale Boolean to\n// cross the new fail-closed approval boundary.\nexport const DRAFT_VERSION = 4;",
)

# Retire only duplicate Step-3 base-rent advancement testimony.
replace_once(
    'lib/flow/advancement.ts',
    "      // Base-rent-only confirmation: re-added as a Step-3 gate per broker\n      // direction (redesign 2026-06-16), reusing baseRentOnlyConfirmed.\n      // ADDITIVE to the C6 combined produce-gate attestation\n      // (produceAttestationConfirmed), which is unchanged and still binds at\n      // produce; the two coexist by design.\n      if (!data.baseRentOnlyConfirmed) {\n        issues.push('Confirm the amount entered is base rent only.');\n      }\n",
    "      // UX2: the duplicate Step-3 base-rent testimony is retired. Period\n      // structure/date/positive-amount validation remains above; the single\n      // consequential base-rent testimony remains C6 at final Create.\n",
)

# Gate C6 on exact current generation, preserving blocker code/copy.
replace_once(
    'lib/flow/gates.ts',
    "import { getSuccessfulAttempt, deriveComplianceInputs } from './escalation';\n",
    "import { getSuccessfulAttempt, deriveComplianceInputs } from './escalation';\nimport { hasCurrentReviewApproval } from './reviewApproval';\n",
)
replace_once(
    'lib/flow/gates.ts',
    "  if (data.produceAttestationConfirmed !== true) {\n",
    "  if (!hasCurrentReviewApproval(data)) {\n",
)

# Gate test fixture binds C6 to its exact valid state.
replace_once(
    'lib/flow/gates.v4.test.ts',
    "import { individualLandlord, entityLandlord } from './landlord.fixture';\n",
    "import { individualLandlord, entityLandlord } from './landlord.fixture';\nimport { bindReviewApproval } from './reviewApproval';\n",
)
replace_once(
    'lib/flow/gates.v4.test.ts',
    "  return setCaliforniaStatus(d, 'CONFIRMED_CALIFORNIA');\n",
    "  setCaliforniaStatus(d, 'CONFIRMED_CALIFORNIA');\n  Object.assign(d, bindReviewApproval(d, '2026-08-10T00:00:00.000Z'));\n  return d;\n",
)

# E2E produce-ready fixture also uses the real binding primitive.
replace_once(
    'lib/testing/e2eWizardFixture.ts',
    "import { individualLandlord } from '../flow/landlord.fixture';\n",
    "import { individualLandlord } from '../flow/landlord.fixture';\nimport { bindReviewApproval } from '../flow/reviewApproval';\n",
)
p = Path('lib/testing/e2eWizardFixture.ts')
text = p.read_text()
marker = 'export function e2eCharacterizationWizardData(): NoticeFlowData {'
start = text.index(marker)
body = text[start:]
if '  return {\n' not in body:
    raise SystemExit('e2e fixture return marker missing')
body = body.replace('  return {\n', '  const data: NoticeFlowData = {\n', 1)
tail = "    serviceMethod: 'personal',\n  };\n}"
if tail not in body:
    raise SystemExit('e2e fixture tail missing')
body = body.replace(
    tail,
    "    serviceMethod: 'personal',\n  };\n  Object.assign(data, bindReviewApproval(data, '2026-08-10T00:00:00.000Z'));\n  return data;\n}",
    1,
)
p.write_text(text[:start] + body)

# Advancement test: false/absent duplicate field no longer blocks.
replace_once('lib/flow/advancement.test.ts', '    baseRentOnlyConfirmed: true,\n', '')
replace_once(
    'lib/flow/advancement.test.ts',
    "console.log('\\n6. Amount: period shape + base-rent confirm');\n{\n  const ok = validateStep(FlowStep.AmountOwed, fullData());\n  check('valid period ok', ok.canAdvance === true, JSON.stringify(ok.issues));\n\n  const d1 = fullData(); d1.baseRentOnlyConfirmed = false;\n  check('Step 3 blocks without base-rent confirmation (gate re-added, redesign 2026-06-16)', validateStep(FlowStep.AmountOwed, d1).canAdvance === false);\n\n  const d2 = fullData(); d2.rentPeriods = [{ periodStartDate: '2026-04-30', periodEndDate: '2026-04-01', amount: 2000 }];\n  check('end-before-start fails', validateStep(FlowStep.AmountOwed, d2).canAdvance === false);\n\n  const d3 = fullData(); d3.rentPeriods = [{ periodStartDate: '2026-04-01', periodEndDate: '2026-04-30', amount: 0 }];\n  check('zero amount fails', validateStep(FlowStep.AmountOwed, d3).canAdvance === false);\n\n  const d4 = fullData(); d4.rentPeriods = [{ periodStartDate: 'bad', periodEndDate: '2026-04-30', amount: 100 }];\n  check('bad date fails', validateStep(FlowStep.AmountOwed, d4).canAdvance === false);\n}\n",
    "console.log('\\n6. Amount: period shape; duplicate base-rent testimony retired');\n{\n  const ok = validateStep(FlowStep.AmountOwed, fullData());\n  check('valid period ok', ok.canAdvance === true, JSON.stringify(ok.issues));\n\n  const d1 = fullData(); d1.baseRentOnlyConfirmed = false;\n  check('legacy baseRentOnlyConfirmed=false no longer blocks Step 3', validateStep(FlowStep.AmountOwed, d1).canAdvance === true);\n\n  const d1b = fullData(); delete d1b.baseRentOnlyConfirmed;\n  check('legacy baseRentOnlyConfirmed absent no longer blocks Step 3', validateStep(FlowStep.AmountOwed, d1b).canAdvance === true);\n\n  const d2 = fullData(); d2.rentPeriods = [{ periodStartDate: '2026-04-30', periodEndDate: '2026-04-01', amount: 2000 }];\n  check('end-before-start fails', validateStep(FlowStep.AmountOwed, d2).canAdvance === false);\n\n  const d3 = fullData(); d3.rentPeriods = [{ periodStartDate: '2026-04-01', periodEndDate: '2026-04-30', amount: 0 }];\n  check('zero amount fails', validateStep(FlowStep.AmountOwed, d3).canAdvance === false);\n\n  const d4 = fullData(); d4.rentPeriods = [{ periodStartDate: 'bad', periodEndDate: '2026-04-30', amount: 100 }];\n  check('bad date fails', validateStep(FlowStep.AmountOwed, d4).canAdvance === false);\n}\n",
)

# Packet printing becomes artifact use only; preview is reusable.
p = Path('components/packet-print-options.tsx')
text = p.read_text()
for old, new in [
    ('  noticeDocHtml,\n  onProduced,\n  disabledKeys,\n', '  disabledKeys,\n'),
    ('  noticeDocHtml: string;\n  onProduced: () => void;\n', ''),
    ('    onProduced();\n    openPrintable(html, pdfFilename);', '    openPrintable(html, pdfFilename);'),
]:
    if old not in text:
        raise SystemExit(f'PacketPrint marker missing: {old!r}')
    text = text.replace(old, new, 1)
preview_start = text.index('      {/* Notice preview (moved verbatim from the previous Download PDF block) */}')
preview_end = text.index('      {/* Full Packet confirmation modal */}', preview_start)
text = text[:preview_start] + text[preview_end:]
if 'function ScaledNoticePreview({ html }: { html: string }) {' not in text:
    raise SystemExit('ScaledNoticePreview marker missing')
text = text.replace(
    'function ScaledNoticePreview({ html }: { html: string }) {',
    'export function NoticePreview({ html }: { html: string }) {',
    1,
)
p.write_text(text)

# Serve & Track recognizes Create identity; print cannot re-create.
replace_once(
    'components/serve-track.tsx',
    "import { captureProductionSnapshot } from '@/lib/flow/escalation';\n",
    "import { isPreparedNoticeGenerationCurrent } from '@/lib/flow/reviewApproval';\n",
)
replace_once(
    'components/serve-track.tsx',
    "  const ready =\n    data !== null && result !== null && result.canProduce && !!data.productionSnapshot;\n",
    "  const ready =\n    data !== null &&\n    result !== null &&\n    result.canProduce &&\n    !!data.productionSnapshot &&\n    isPreparedNoticeGenerationCurrent(data);\n",
)
replace_once(
    'components/serve-track.tsx',
    "  const onProduced = () => {\n    if (data) update({ productionSnapshot: captureProductionSnapshot(data) });\n  };\n\n",
    '',
)
replace_once(
    'components/serve-track.tsx',
    "                    noticeDocHtml={docHtml}\n                    onProduced={onProduced}\n                    disabledKeys={['tenant', 'owner', 'full']}\n",
    "                    disabledKeys={['tenant', 'owner', 'full']}\n",
)

# LA child no longer passes print-time production authority.
p = Path('components/la-produce-panel.tsx')
text = p.read_text()
for old in ['  noticeDocHtml,\n', '  noticeDocHtml: string;\n', '              noticeDocHtml={noticeDocHtml}\n']:
    if old not in text:
        raise SystemExit(f'LA panel marker missing: {old!r}')
    text = text.replace(old, '', 1)
p.write_text(text)

# Notice flow imports.
replace_once(
    'components/notice-flow.tsx',
    "import { PacketPrintOptions } from './packet-print-options';\n",
    "import { NoticePreview, PacketPrintOptions } from './packet-print-options';\n",
)
replace_once(
    'components/notice-flow.tsx',
    "} from '@/lib/flow/escalation';\n",
    "} from '@/lib/flow/escalation';\nimport {\n  bindReviewApproval,\n  clearReviewApproval,\n  freezeReviewCreateInput,\n  hasCurrentReviewApproval,\n  isPreparedNoticeGenerationCurrent,\n  preparedNoticeGeneration,\n  reviewApprovalGeneration,\n} from '@/lib/flow/reviewApproval';\n",
)

p = Path('components/notice-flow.tsx')
text = p.read_text()

# Remove duplicate visible Step-3 checkbox, retaining explanatory copy above.
duplicate_start = text.index('      {/* Step 3 base-rent-only confirmation.')
duplicate_end = text.index('      {/* Slice D:', duplicate_start)
text = text[:duplicate_start] + text[duplicate_end:]
text = text.replace(
    '          button on mobile only (lg:hidden). Normal flow, not sticky — never\n          covers the confirmation checkbox or the CTA. Mirrors the main Total\n',
    '          button on mobile only (lg:hidden). Normal flow, not sticky — never\n          covers the CTA. Mirrors the main Total\n',
    1,
)

# Generic update invalidates an existing C6 only when material generation drifts.
old_update = """  const update = (\n    patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>),\n  ) => {\n    setState((s) => {\n      const resolved = typeof patch === 'function' ? patch(s.data) : patch;\n      return { ...s, data: { ...s.data, ...resolved } };\n    });\n    setShowIssues(false);\n  };\n"""
new_update = """  const update = (\n    patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>),\n  ) => {\n    setState((s) => {\n      const resolved = typeof patch === 'function' ? patch(s.data) : patch;\n      let nextData: NoticeFlowData = { ...s.data, ...resolved };\n      const approvalWrite =\n        Object.prototype.hasOwnProperty.call(resolved, 'produceAttestationConfirmed') ||\n        Object.prototype.hasOwnProperty.call(resolved, 'produceAttestationAcceptedAt') ||\n        Object.prototype.hasOwnProperty.call(resolved, 'reviewApprovalGeneration');\n      if (\n        !approvalWrite &&\n        s.data.produceAttestationConfirmed === true &&\n        !hasCurrentReviewApproval(nextData)\n      ) {\n        nextData = { ...nextData, ...clearReviewApproval() };\n      }\n      return { ...s, data: nextData };\n    });\n    setShowIssues(false);\n  };\n"""
if old_update not in text:
    raise SystemExit('notice-flow update block missing')
text = text.replace(old_update, new_update, 1)

# Replace ReviewStep as one bounded unit; Step 7/service implementation is untouched.
review_start = text.index('function ReviewStep({')
review_end = text.index('// --- Step 7: Service instructions', review_start)
new_review = r'''function ReviewStep({
  data,
  update,
  goToPage,
  jurisdictionResolving,
  jurisdictionSlow,
  onRetryJurisdiction,
}: {
  data: NoticeFlowData;
  update: (patch: Partial<NoticeFlowData> | ((d: NoticeFlowData) => Partial<NoticeFlowData>)) => void;
  goToPage?: (pageIndex: number) => void;
  jurisdictionResolving?: boolean;
  jurisdictionSlow?: boolean;
  onRetryJurisdiction?: () => void;
}) {
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdArtifact, setCreatedArtifact] = useState<{
    generation: string;
    data: NoticeFlowData;
    model: NoticeModel;
    html: string;
  } | null>(null);

  const result = evaluateCanProduceV4(data);
  const approvalCurrent = hasCurrentReviewApproval(data);
  const noticePrepared =
    !!data.productionSnapshot &&
    !evaluateStaleness(data).reason &&
    isPreparedNoticeGenerationCurrent(data);
  const laProduceRequired =
    data.cachedResolverVerdict?.verdict === 'confirmed_la' &&
    data.cachedResolverVerdict.addressKey === normalizeAddressKey(data.propertyAddress) &&
    isLaProducePhase2dWired() &&
    isLaProductionUnblocked();

  // Informational preview may render before C6. Final Create never trusts this
  // earlier render; it freezes, re-gates, and re-renders independently below.
  let docHtml: string | null = null;
  let renderedModel: NoticeModel | null = null;
  let renderError: string | null = null;
  const onlyAttestationLeft =
    result.blockers.length === 0 ||
    (result.blockers.length === 1 &&
      result.blockers[0].code === 'PRODUCE_ATTESTATION_MISSING');
  const isRenderable = onlyAttestationLeft && !!result.computedDates;
  const visibleBlockers = result.blockers.filter(
    (b) => b.code !== 'PRODUCE_ATTESTATION_MISSING',
  );
  const otherStepBlockers = visibleBlockers.filter(
    (b) => pageForBlocker(b.code) !== 4,
  );
  if (isRenderable && result.computedDates) {
    try {
      const rendered = renderNotice({
        data,
        dates: {
          compliancePeriodStartDate: result.computedDates.commencementDate,
          compliancePeriodEndDate: result.computedDates.expirationDate,
        },
      });
      docHtml = buildNoticeDocumentHtml(rendered.model);
      renderedModel = rendered.model;
    } catch (e) {
      renderError =
        e instanceof NoticeRenderError
          ? e.message
          : 'The notice could not be generated. Please review your entries.';
    }
  }

  // UX2 consequential boundary: approved input = gate input = render input =
  // create input. The frozen object is the only input consumed after selection.
  const createNotice = () => {
    setCreateError(null);
    try {
      const frozen = freezeReviewCreateInput(data);
      const generation = reviewApprovalGeneration(frozen);
      if (
        !hasCurrentReviewApproval(frozen) ||
        frozen.reviewApprovalGeneration !== generation
      ) {
        throw new Error('Your Review & Confirm approval is no longer current. Please confirm again.');
      }

      const finalResult = evaluateCanProduceV4(frozen);
      if (!finalResult.canProduce || !finalResult.computedDates) {
        throw new Error('The notice is not ready to create. Review the remaining items first.');
      }

      const rendered = renderNotice({
        data: frozen,
        dates: {
          compliancePeriodStartDate: finalResult.computedDates.commencementDate,
          compliancePeriodEndDate: finalResult.computedDates.expirationDate,
        },
      });
      const finalizedHtml = buildNoticeDocumentHtml(rendered.model);
      const createdGeneration = preparedNoticeGeneration(frozen);
      if (createdGeneration !== generation) {
        throw new Error('The notice generation changed during creation. Please confirm again.');
      }

      setCreatedArtifact({
        generation: createdGeneration,
        data: frozen,
        model: rendered.model,
        html: finalizedHtml,
      });
      update({
        productionSnapshot: captureProductionSnapshot(frozen),
        preparedNoticeGeneration: preparedNoticeGeneration(frozen),
      });
    } catch (e) {
      setCreateError(
        e instanceof Error
          ? e.message
          : 'The notice could not be created. Please review your entries.',
      );
    }
  };

  // Slice E: always-visible calm readiness/status presentation. Deterministic
  // checks appear as product status; only C6 remains the final general testimony.
  const artifact =
    noticePrepared &&
    createdArtifact &&
    createdArtifact.generation === data.preparedNoticeGeneration
      ? createdArtifact
      : null;
  const artifactModel = artifact?.model ?? (noticePrepared ? renderedModel : null);
  const artifactData = artifact?.data ?? data;

  return (
    <div className="space-y-6">
      {noticePrepared ? (
        <NoticeReadyState />
      ) : (
        <>
          {jurisdictionResolving && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-lg border border-rule bg-tint px-4 py-3 text-sm text-gray-700"
            >
              <span
                aria-hidden="true"
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-brand"
              />
              <span>
                {jurisdictionSlow
                  ? 'Confirming jurisdiction. This can take a few seconds.'
                  : 'Confirming jurisdiction…'}
              </span>
            </div>
          )}
          <StepIntro>
            Here&apos;s where your notice stands. Review the details, make the one final
            confirmation, then create your notice.
          </StepIntro>

          {visibleBlockers.length === 0 ? (
            <div className="rounded-lg border border-green-300 bg-green-50 px-5 py-4">
              <p className="font-semibold text-green-900 mb-3">Everything&apos;s ready.</p>
              <ul className="space-y-2 text-sm text-green-900">
                <li className="flex items-start gap-2"><span aria-hidden="true" className="mt-0.5 font-semibold">&#10003;</span><span>Property and tenant complete</span></li>
                <li className="flex items-start gap-2"><span aria-hidden="true" className="mt-0.5 font-semibold">&#10003;</span><span>Rent periods and amount complete</span></li>
                <li className="flex items-start gap-2"><span aria-hidden="true" className="mt-0.5 font-semibold">&#10003;</span><span>Payment person, phone, and address complete</span></li>
                <li className="flex items-start gap-2"><span aria-hidden="true" className="mt-0.5 font-semibold">&#10003;</span><span>Signer and planned service date complete</span></li>
                <li className="flex items-start gap-2"><span aria-hidden="true" className="mt-0.5 font-semibold">&#10003;</span><span>California eligibility and jurisdiction complete</span></li>
              </ul>
              {result.computedDates && (
                <p className="mt-3 text-sm text-green-900 leading-relaxed">
                  Using your planned service date, the notice shows{' '}
                  <strong>{formatNoticeDate(result.computedDates.expirationDate)}</strong> as the
                  pay-or-vacate deadline (period begins{' '}
                  {formatNoticeDate(result.computedDates.commencementDate)}). Service has not been
                  recorded.
                </p>
              )}
              <div className="mt-4 space-y-3 border-t border-green-200 pt-4">
                <p className="text-sm font-semibold text-green-900">Review &amp; Confirm</p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={approvalCurrent}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      update(
                        e.target.checked
                          ? bindReviewApproval(data, new Date().toISOString())
                          : clearReviewApproval(),
                      )
                    }
                    className="mt-1"
                  />
                  <span className="text-sm text-green-900 leading-relaxed">
                    By producing this notice, I confirm: the amounts entered are base rent only (no late fees, utilities, or other charges); the tenants and landlord(s) named are correct; and the signer is authorized.
                  </span>
                </label>
                {!approvalCurrent && (
                  <p className="text-xs text-green-800">
                    This confirmation applies only to the exact notice details shown now. If a
                    material detail changes, you&apos;ll confirm the updated notice again.
                  </p>
                )}
              </div>
            </div>
          ) : otherStepBlockers.length > 0 ? (
            <div className="rounded-lg border border-rule bg-tint px-5 py-4">
              <p className="font-semibold text-brand mb-1">Almost there — a few things to finish first.</p>
              <p className="text-sm text-gray-700 leading-relaxed mb-3">No rush. Take care of these and your notice will be ready to create.</p>
              <ul className="space-y-2 text-sm text-gray-800">
                {otherStepBlockers.map((b) => {
                  const targetPage = pageForBlocker(b.code);
                  return (
                    <li key={b.code} className="flex items-start gap-2">
                      <span aria-hidden="true" className="mt-0.5 text-brand">&#9675;</span>
                      <span>
                        <span>{b.message}</span>
                        {targetPage !== null && goToPage && (
                          <button type="button" onClick={() => goToPage(targetPage)} className="ml-2 align-baseline text-xs font-semibold text-brand underline whitespace-nowrap">Fix this &rarr;</button>
                        )}
                        {b.code === 'JURISDICTION_RESOLUTION_FAILED' && onRetryJurisdiction && (
                          <button type="button" onClick={onRetryJurisdiction} className="ml-2 align-baseline text-xs font-semibold text-brand underline whitespace-nowrap">Try again</button>
                        )}
                        {b.code === 'PAYMENT_CONFIG_INVALID' && result.paymentErrors.length > 0 && (
                          <ul className="mt-1 space-y-0.5 pl-5 list-disc text-gray-700">
                            {result.paymentErrors.map((pe) => (<li key={pe.code}>{pe.message}</li>))}
                          </ul>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <ReviewSummaryCards data={data} result={result} goToPage={goToPage} />

          {!result.canProduce &&
            (data.paymentMethods ?? []).includes('bank_deposit') &&
            (data.bankDepositPaperInstrumentConfirmed !== true || data.bankBranchWithinFiveMilesAttested !== true) && (
              <div className="space-y-3 rounded-lg border border-gray-200 px-5 py-4">
                <p className="text-sm font-semibold text-gray-900">Confirm these to finish the bank-deposit method</p>
                <p className="text-sm text-gray-600 leading-relaxed">These are the same confirmations from the payment step. Check them here to clear the items above without going back.</p>
                <BankDepositAttestations data={data} update={update} />
              </div>
            )}
        </>
      )}

      {renderError && (<div className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">{renderError}</div>)}
      {createError && (<div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">{createError}</div>)}

      {docHtml && !noticePrepared && (
        <section className="space-y-4 rounded-lg border border-rule bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Notice preview</h2>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">This is a broker-prepared draft for your review. Sign it in ink before serving, and serve it on the date shown. The proof of service is completed after you serve — not before.</p>
          </div>
          <NoticePreview html={docHtml} />
        </section>
      )}

      {renderedModel && docHtml && laProduceRequired ? (
        <LaProducePanel
          model={artifactModel ?? renderedModel}
          data={artifactData}
          baseName={buildNoticePdfFilename({ tenantNames: artifactData.tenantNames, streetAddress: artifactData.propertyAddress, unit: artifactData.propertyUnit })}
          verdictSource={artifactData.cachedResolverVerdict?.source ?? 'live_resolver'}
          noticePrepared={noticePrepared}
          canCreate={approvalCurrent && result.canProduce}
          onCreateNotice={createNotice}
          onAudit={(f) => update({ laProduceAudit: f })}
        />
      ) : renderedModel && docHtml && !laProduceRequired ? (
        noticePrepared && artifactModel ? (
          <>
            <div className="rounded-lg border border-rule bg-white px-5 py-4">
              <h3 className="font-semibold text-gray-900">Download / Print Notice</h3>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">Use the existing notice documents below whenever you need another copy.</p>
            </div>
            <PacketPrintOptions model={artifactModel} data={artifactData} disabledKeys={['serviceLog']} />
          </>
        ) : (
          <section className="rounded-lg border border-rule bg-white px-5 py-4">
            <h3 className="font-semibold text-gray-900">Create Notice</h3>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed">Create the notice after the final confirmation is current. Download and print become available after creation.</p>
            <button
              type="button"
              data-testid="create-notice-button"
              onClick={createNotice}
              disabled={!approvalCurrent || !result.canProduce}
              className="mt-4 inline-flex min-h-[48px] items-center rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-bar disabled:cursor-not-allowed disabled:opacity-50"
            >
              Create Notice
            </button>
          </section>
        )
      ) : null}

      {/* C6: posture line (locked) on the produce screen. */}
      {docHtml && renderedModel && (
        <div className="rounded-lg border border-rule bg-white px-5 py-4">
          <p className="text-xs text-gray-500 leading-relaxed">OwnerPilot AI is not a law firm and does not provide legal advice. This is a broker-prepared workflow produced under California Licensed Real Estate Broker supervision. For legal matters specific to your situation, consult a California licensed attorney of your choosing.</p>
        </div>
      )}

      {noticePrepared && (
        <section data-testid="record-service-later-task" className="rounded-xl border border-rule bg-white px-5 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 mb-2">Later task</p>
          <h3 className="font-semibold text-gray-900 mb-1">Record service later</h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">Service has not been recorded. After someone actually serves the notice, open the separate Serve &amp; Track task and record what happened.</p>
          <a href="/notice/3-day/serve" className="inline-flex text-sm font-semibold text-brand underline">Record service later &rarr;</a>
        </section>
      )}
    </div>
  );
}

'''
text = text[:review_start] + new_review + text[review_end:]
p.write_text(text)

print('UX2 bounded patch applied')
