from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one replacement, found {count}: {old[:140]!r}')
    p.write_text(text.replace(old, new, 1))


# Review approval identity stays exact; it is not a second staleness contract.
p = Path('lib/flow/reviewApproval.ts')
text = p.read_text()
text = text.replace("  'preparedNoticeGeneration',\n", '', 1)
marker = """/**
 * Prepared-notice identity ignores post-create service activity by construction
 * because those facts belong to the later Serve & Track task, not Create.
 */
export function preparedNoticeGeneration(data: NoticeFlowData): string {
  return reviewApprovalGeneration(data);
}

export function isPreparedNoticeGenerationCurrent(data: NoticeFlowData): boolean {
  return (
    typeof data.preparedNoticeGeneration === 'string' &&
    data.preparedNoticeGeneration === preparedNoticeGeneration(data)
  );
}
"""
if marker not in text:
    raise SystemExit('reviewApproval prepared-generation block missing')
text = text.replace(marker, '', 1)
p.write_text(text)

# ProductionSnapshot remains the only prepared/staleness projection.
replace_once(
    'lib/flow/noticeFlowState.ts',
    "  productionSnapshot?: ProductionSnapshot;\n  /** UX2: exact create generation that completed the deliberate Create Notice action. */\n  preparedNoticeGeneration?: string;\n",
    "  productionSnapshot?: ProductionSnapshot;\n",
)

# Wizard: exact approval generation governs Create only. Existing snapshot +
# evaluateStaleness continues to govern prepared/re-service state.
p = Path('components/notice-flow.tsx')
text = p.read_text()
text = text.replace('  isPreparedNoticeGenerationCurrent,\n', '', 1)
text = text.replace('  preparedNoticeGeneration,\n', '', 1)
text = text.replace(
    """  const noticePrepared =
    !!data.productionSnapshot &&
    !evaluateStaleness(data).reason &&
    isPreparedNoticeGenerationCurrent(data);
""",
    """  const noticePrepared = !!data.productionSnapshot && !evaluateStaleness(data).reason;
""",
    1,
)
text = text.replace(
    """      const finalizedHtml = buildNoticeDocumentHtml(rendered.model);
      const createdGeneration = preparedNoticeGeneration(frozen);
      if (createdGeneration !== generation) {
        throw new Error('The notice generation changed during creation. Please confirm again.');
      }

      setCreatedArtifact({
        generation: createdGeneration,
""",
    """      const finalizedHtml = buildNoticeDocumentHtml(rendered.model);

      setCreatedArtifact({
        generation,
""",
    1,
)
text = text.replace(
    """      update({
        productionSnapshot: captureProductionSnapshot(frozen),
        preparedNoticeGeneration: preparedNoticeGeneration(frozen),
      });
""",
    """      update({ productionSnapshot: captureProductionSnapshot(frozen) });
""",
    1,
)
text = text.replace(
    """  const artifact =
    noticePrepared &&
    createdArtifact &&
    createdArtifact.generation === data.preparedNoticeGeneration
      ? createdArtifact
      : null;
""",
    """  const artifact =
    noticePrepared &&
    createdArtifact &&
    createdArtifact.generation === data.reviewApprovalGeneration
      ? createdArtifact
      : null;
""",
    1,
)
p.write_text(text)

# Serve & Track returns to the existing ProductionSnapshot readiness/staleness
# contract. Print still cannot create the snapshot.
p = Path('components/serve-track.tsx')
text = p.read_text()
text = text.replace("import { isPreparedNoticeGenerationCurrent } from '@/lib/flow/reviewApproval';\n", '', 1)
old = """  const ready =
    data !== null &&
    result !== null &&
    result.canProduce &&
    !!data.productionSnapshot &&
    isPreparedNoticeGenerationCurrent(data);
"""
new = """  const ready =
    data !== null && result !== null && result.canProduce && !!data.productionSnapshot;
"""
if old not in text:
    raise SystemExit('serve-track prepared readiness block missing')
text = text.replace(old, new, 1)
p.write_text(text)

# Update approval tests: ProductionSnapshot is separate; no second generation.
p = Path('lib/flow/reviewApproval.test.ts')
text = p.read_text()
text = text.replace('  isPreparedNoticeGenerationCurrent,\n  preparedNoticeGeneration,\n', '', 1)
old = """  const snapshot = captureProductionSnapshot(frozen);
  const produced = {
    ...frozen,
    productionSnapshot: snapshot,
    preparedNoticeGeneration: preparedNoticeGeneration(frozen),
  };
  ok(isPreparedNoticeGenerationCurrent(produced), 'prepared generation is current for the same frozen create state');
  equal(
    reviewApprovalGeneration(produced),
    reviewApprovalGeneration(frozen),
    'ProductionSnapshot remains a separate contract and does not alter approval generation',
  );
"""
new = """  const snapshot = captureProductionSnapshot(frozen);
  const produced = { ...frozen, productionSnapshot: snapshot };
  equal(
    reviewApprovalGeneration(produced),
    reviewApprovalGeneration(frozen),
    'ProductionSnapshot remains a separate contract and does not alter approval generation',
  );
"""
if old not in text:
    raise SystemExit('reviewApproval snapshot-separation test block missing')
text = text.replace(old, new, 1)
p.write_text(text)

# Update Notice Ready boundary tests to pin the directive's exact separation:
# Create writes the existing snapshot; existing staleness semantics remain.
p = Path('lib/flow/noticeReadyTaskBoundary.test.ts')
text = p.read_text()
text = text.replace(
    """import {
  bindReviewApproval,
  isPreparedNoticeGenerationCurrent,
  preparedNoticeGeneration,
} from './reviewApproval';
""",
    "import { bindReviewApproval } from './reviewApproval';\n",
    1,
)
text = text.replace(
    """ok(
  noticeFlow.includes('isPreparedNoticeGenerationCurrent(data)'),
  'Notice Ready is bound to the exact successfully created generation',
);
""",
    '',
    1,
)
text = text.replace(
    """ok(
  serveTrack.includes('isPreparedNoticeGenerationCurrent(data)'),
  'separate service task requires the currently prepared create generation',
);
""",
    """ok(
  serveTrack.includes('result.canProduce && !!data.productionSnapshot'),
  'separate service task retains the existing ProductionSnapshot readiness contract',
);
""",
    1,
)
text = text.replace(
    "ok(createBody.includes('preparedNoticeGeneration: preparedNoticeGeneration(frozen)'), 'Create records the exact prepared generation');\n",
    "ok(!createBody.includes('preparedNoticeGeneration'), 'Create does not redefine approval identity as a staleness/prepared contract');\n",
    1,
)
text = text.replace(
    """const produced = {
  ...approved,
  productionSnapshot: captureProductionSnapshot(approved),
  preparedNoticeGeneration: preparedNoticeGeneration(approved),
};
""",
    """const produced = {
  ...approved,
  productionSnapshot: captureProductionSnapshot(approved),
};
""",
    1,
)
text = text.replace("ok(isPreparedNoticeGenerationCurrent(produced), 'freshly created generation is current');\n", '', 1)
text = text.replace(
    """ok(
  isPreparedNoticeGenerationCurrent(failedOnly),
  'later failed service activity does not revoke the earlier prepared notice generation',
);
""",
    """equal(
  evaluateStaleness(failedOnly).reason,
  null,
  'later failed service activity preserves existing staleness semantics',
);
""",
    1,
)
text = text.replace(
    """ok(
  isPreparedNoticeGenerationCurrent(served),
  'actual service state remains a later task and does not rewrite Create identity',
);

const changed = { ...produced, propertyAddress: '200 Changed Ave, Los Angeles, CA 90001' };
ok(!!evaluateStaleness(changed).reason, 'changed notice fact preserves existing staleness invalidation');
ok(
  !isPreparedNoticeGenerationCurrent(changed),
  'material create-state edit invalidates the prior prepared generation',
);
""",
    """equal(
  evaluateStaleness(served).reason,
  null,
  'actual service state remains a later task and preserves existing staleness semantics',
);

const changedServiceDate = { ...produced, serviceDate: '2026-08-14' };
equal(
  evaluateStaleness(changedServiceDate).reason,
  null,
  'serviceDate change remains excluded from the existing ProductionSnapshot staleness contract',
);

const changed = { ...produced, propertyAddress: '200 Changed Ave, Los Angeles, CA 90001' };
ok(!!evaluateStaleness(changed).reason, 'changed snapshotted notice fact preserves existing staleness invalidation');
""",
    1,
)
p.write_text(text)

# Correct the now-obsolete component comment without touching locked prose.
p = Path('components/packet-print-options.tsx')
text = p.read_text()
old_comment = """ * Renders on Review once the produce gate passes: the notice preview (moved
 * verbatim from the previous Download PDF block) plus the four packet print
 * cards and the Full Packet confirmation modal (copy from packetCopy, spec
 * verbatim). Printing any document fires onProduced (the B1 stale-guard
 * snapshot in the parent).
"""
new_comment = """ * Artifact-use surface after a successful Create Notice action. The four packet
 * cards and Full Packet confirmation modal retain their existing builders/copy.
 * Printing never establishes production authority; Create captures the existing
 * ProductionSnapshot before this component becomes available.
"""
if old_comment not in text:
    raise SystemExit('packet print stale comment missing')
p.write_text(text.replace(old_comment, new_comment, 1))

print('UX2 approval/snapshot contract separation fix applied')
