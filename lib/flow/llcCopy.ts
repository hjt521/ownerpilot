// FIX 1 copy + trigger logic for the LLC management-type feature, extracted
// from components/notice-flow.tsx so the tsx-based test suites can assert
// against the strings and the Banner 1.2 predicate without importing the
// client component.
//
// ALL bracketed strings below are PLACEHOLDERS — final wording is pending and
// must be supplied by the user from a qualified source, then wired in
// verbatim. llcCopy.test.ts asserts EXACT equality with these placeholders so
// the suite fails loudly the moment real copy lands (update the test then).
// Structural labels (the question and option names) are product copy and are
// real. Do NOT add attorney attribution.
import type { LlcManagementType, NoticeFlowData } from './noticeFlowState';

export const LLC_MGMT_FIELD_LABEL = 'How is this LLC managed?';
export const LLC_MGMT_FIELD_HELPER =
  '[PLACEHOLDER — where to verify member- vs manager-managed. Final wording pending.]';
export const LLC_MGMT_OPTIONS: { value: LlcManagementType; label: string; helper: string }[] = [
  { value: 'member-managed', label: 'Member-managed', helper: '[PLACEHOLDER — member-managed description. Pending.]' },
  { value: 'manager-managed', label: 'Manager-managed', helper: '[PLACEHOLDER — manager-managed description. Pending.]' },
  { value: 'not-sure', label: "I'm not sure", helper: '' },
];
// Banner 1.3 (management-type unconfirmed) body — PLACEHOLDER, non-gating.
export const LLC_NOT_SURE_BANNER =
  '[PLACEHOLDER — management-type-unconfirmed notice body. Final wording pending.]';
// Banner 1.2 (manager-managed + non-manager signer) body — PLACEHOLDER.
export const LLC_MANAGER_WARNING_BANNER =
  '[PLACEHOLDER — signer-authority warning body. Final wording pending.]';

// Title is a manager role if it mentions a manager / managing member.
export function signerTitleLooksLikeManager(title: string | undefined): boolean {
  return /manager|managing\s+member/i.test(title ?? '');
}

/** Banner 1.2 trigger: manager-managed LLC + entity-insider capacity + a
 *  signer title that doesn't look like a manager role. Pure and side-effect
 *  free so the test suite can exercise it directly. */
export function shouldShowSignerAuthorityWarning(
  data: Pick<NoticeFlowData, 'landlordIdentity' | 'signerCapacity' | 'signerTitle'>,
): boolean {
  const li = data.landlordIdentity;
  return (
    li?.type === 'entity' &&
    li.entityType === 'llc' &&
    li.managementType === 'manager-managed' &&
    data.signerCapacity === 'officer_member_trustee' &&
    !signerTitleLooksLikeManager(data.signerTitle)
  );
}
