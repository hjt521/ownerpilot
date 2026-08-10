from pathlib import Path

# Keep the existing chat LA mount source-compatible without moving the wizard
# back to print-time creation semantics. The legacy props remain accepted only
# as compatibility inputs; the chat branch retains its existing post-ack print UI.
p = Path('components/la-produce-panel.tsx')
text = p.read_text()
old_types = """  /** True only when this exact prepared generation has completed Create. */
  noticePrepared: boolean;
  /** Current final C6 + deterministic gate eligibility for the current generation. */
  canCreate: boolean;
  onCreateNotice: () => void;
  onAudit: (fields: LaProduceAuditFields) => void;
}) {
"""
new_types = """  /** True only when this exact prepared generation has completed Create (wizard UX2). */
  noticePrepared?: boolean;
  /** Current final C6 + deterministic gate eligibility for the current generation (wizard UX2). */
  canCreate?: boolean;
  onCreateNotice?: () => void;
  /** Legacy chat-mount compatibility only; wizard UX2 does not use print as Create authority. */
  noticeDocHtml?: string;
  /** Legacy chat-mount compatibility only; existing chat caller's state is observational. */
  onProduced?: () => void;
  onAudit: (fields: LaProduceAuditFields) => void;
}) {
"""
if text.count(old_types) != 1:
    raise SystemExit('LA panel UX2 prop block marker missing')
text = text.replace(old_types, new_types, 1)

marker = "  const [acked, setAcked] = useState(false);\n"
if text.count(marker) != 1:
    raise SystemExit('LA panel ack marker missing')
text = text.replace(
    marker,
    marker + "  const ux2CreateMode =\n    typeof noticePrepared === 'boolean' &&\n    typeof canCreate === 'boolean' &&\n    typeof onCreateNotice === 'function';\n",
    1,
)

old_conditional = """          {!noticePrepared ? (
            <section className=\"rounded-lg border border-rule bg-white px-5 py-4\">
              <h3 className=\"font-semibold text-gray-900\">Create Notice</h3>
              <p className=\"mt-1 text-sm text-gray-600 leading-relaxed\">
                Create the notice after the final confirmation above is current. Download and
                print remain available after creation.
              </p>
              <button
                type=\"button\"
                data-testid=\"create-notice-button\"
                onClick={onCreateNotice}
                disabled={!canCreate}
                className=\"mt-4 inline-flex min-h-[48px] items-center rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-bar disabled:cursor-not-allowed disabled:opacity-50\"
              >
                Create Notice
              </button>
              {!canCreate && (
                <p className=\"mt-2 text-xs text-gray-500\">
                  Complete the final Review &amp; Confirm step before creating.
                </p>
              )}
            </section>
          ) : (
            <PacketPrintOptions
              model={model}
              data={data}
              disabledKeys={['serviceLog']}
            />
          )}
"""
new_conditional = """          {!ux2CreateMode ? (
            <PacketPrintOptions
              model={model}
              data={data}
              disabledKeys={['serviceLog']}
            />
          ) : !noticePrepared ? (
            <section className=\"rounded-lg border border-rule bg-white px-5 py-4\">
              <h3 className=\"font-semibold text-gray-900\">Create Notice</h3>
              <p className=\"mt-1 text-sm text-gray-600 leading-relaxed\">
                Create the notice after the final confirmation above is current. Download and
                print remain available after creation.
              </p>
              <button
                type=\"button\"
                data-testid=\"create-notice-button\"
                onClick={() => onCreateNotice?.()}
                disabled={!canCreate}
                className=\"mt-4 inline-flex min-h-[48px] items-center rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-bar disabled:cursor-not-allowed disabled:opacity-50\"
              >
                Create Notice
              </button>
              {!canCreate && (
                <p className=\"mt-2 text-xs text-gray-500\">
                  Complete the final Review &amp; Confirm step before creating.
                </p>
              )}
            </section>
          ) : (
            <PacketPrintOptions
              model={model}
              data={data}
              disabledKeys={['serviceLog']}
            />
          )}
"""
if text.count(old_conditional) != 1:
    raise SystemExit('LA panel create/print conditional marker missing')
text = text.replace(old_conditional, new_conditional, 1)
p.write_text(text)

# Test typing only: keep paymentMethods mutable like NoticeFlowData.
p = Path('lib/flow/noticeReadyTaskBoundary.test.ts')
text = p.read_text()
old = """const planned = {
  ...base,
  serviceDate: '2026-08-12',
  paymentMethods: ['by_mail'] as const,
};
"""
new = """const planned: typeof base = {
  ...base,
  serviceDate: '2026-08-12',
  paymentMethods: ['by_mail'],
};
"""
if text.count(old) != 1:
    raise SystemExit('Notice Ready mutable paymentMethods marker missing')
p.write_text(text.replace(old, new, 1))

print('UX2 bounded integration fixes applied')
