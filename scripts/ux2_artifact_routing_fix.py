from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, found {count}")
    return text.replace(old, new, 1)

path = Path('components/notice-flow.tsx')
text = path.read_text()
text = replace_once(
    text,
    "  const noticePrepared = !!data.productionSnapshot && !evaluateStaleness(data).reason;\n  const laProduceRequired =\n    data.cachedResolverVerdict?.verdict === 'confirmed_la' &&\n    data.cachedResolverVerdict.addressKey === normalizeAddressKey(data.propertyAddress) &&\n    isLaProducePhase2dWired() &&\n    isLaProductionUnblocked();\n",
    "  const noticePrepared = !!data.productionSnapshot && !evaluateStaleness(data).reason;\n",
    'remove mutable LA routing source',
)
text = replace_once(
    text,
    "  const displayModel = artifactReady ? artifactModel : renderedModel;\n  const displayData = artifactReady && artifactData ? artifactData : data;\n",
    "  const displayModel = artifactReady ? artifactModel : renderedModel;\n  const displayData = artifactReady && artifactData ? artifactData : data;\n  // Artifact-use routing is part of artifact identity too: after Create, LAHD/RTC\n  // selection must come from exact artifact A, never later mutable draft B.\n  const laProduceRequired =\n    displayData.cachedResolverVerdict?.verdict === 'confirmed_la' &&\n    displayData.cachedResolverVerdict.addressKey === normalizeAddressKey(displayData.propertyAddress) &&\n    isLaProducePhase2dWired() &&\n    isLaProductionUnblocked();\n",
    'bind LA routing to display artifact data',
)
lines = text.splitlines()
while lines and lines[-1] == '':
    lines.pop()
path.write_text('\n'.join(line.rstrip() for line in lines) + '\n')

path = Path('lib/flow/createdNoticeArtifact.test.ts')
text = path.read_text()
needle = "ok(noticeFlow.includes('restoreCreatedNoticeArtifact(data)'), 'UI restores artifact identity from persisted envelope');\n"
addition = """ok(noticeFlow.includes('restoreCreatedNoticeArtifact(data)'), 'UI restores artifact identity from persisted envelope');
ok(
  noticeFlow.includes("displayData.cachedResolverVerdict?.verdict === 'confirmed_la'") &&
    noticeFlow.includes('normalizeAddressKey(displayData.propertyAddress)'),
  'LAHD/RTC artifact-use routing is selected from exact artifact data, not mutable current data',
);
"""
text = replace_once(text, needle, addition, 'artifact routing regression')
lines = text.splitlines()
while lines and lines[-1] == '':
    lines.pop()
path.write_text('\n'.join(line.rstrip() for line in lines) + '\n')
