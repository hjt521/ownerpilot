// FIX 1 copy + trigger logic for the LLC management-type feature, extracted
// from components/notice-flow.tsx so the tsx-based test suites can assert
// against the strings and the Banner 1.2 predicate without importing the
// client component.
//
// WORDING LOCKED 2026-06-10 — supplied verbatim by the user (source noted as
// Broker Compliance Review, 2026-06-10), same locked-prose-constant pattern
// as the 13 v4 HOW-TO-PAY constants. Do NOT edit, paraphrase, or re-wrap
// these strings; llcCopy.test.ts pins them with exact-equality checks,
// including the full banner prose. The banner TITLE / BODY pairs exist only
// so the title can be bolded: TITLE + ' ' + BODY concatenates byte-for-byte
// to the locked verbatim string. Do NOT add attorney attribution.
import type { LlcManagementType, NoticeFlowData } from './noticeFlowState';

export const LLC_MGMT_FIELD_LABEL = 'How is this LLC managed?';
export const LLC_MGMT_FIELD_HELPER =
  `Check your Operating Agreement, or the Statement of Information (Form LLC-12) on file with the California Secretary of State. If you can't find either, choose "I'm not sure" and we'll flag it.`;
export const LLC_MGMT_OPTIONS: { value: LlcManagementType; label: string; helper: string }[] = [
  { value: 'member-managed', label: 'Member-managed', helper: 'Any member can sign on behalf of the LLC.' },
  {
    value: 'manager-managed',
    label: 'Manager-managed',
    helper: "Only designated managers can sign on behalf of the LLC. Members who aren't managers generally can't.",
  },
  { value: 'not-sure', label: "I'm not sure", helper: '' },
];

// Banner 1.3 (management-type unconfirmed), non-gating.
// LOCKED: TITLE + ' ' + BODY is the verbatim supplied string.
export const LLC_NOT_SURE_BANNER_TITLE = 'Heads up:';
export const LLC_NOT_SURE_BANNER =
  "Member-managed and manager-managed LLCs have different signing-authority rules, and using the wrong one can create a defect in the notice. Before serving, confirm the management type by checking your Operating Agreement or your Statement of Information (Form LLC-12) on file with the California Secretary of State. If you can't determine it, consult a California licensed attorney of your choosing before serving.";

// Banner 1.2 (manager-managed + non-manager signer), non-gating, dismissible.
// LOCKED: TITLE + ' ' + BODY is the verbatim supplied string.
export const LLC_MANAGER_WARNING_BANNER_TITLE = 'Heads up — signer authority check:';
export const LLC_MANAGER_WARNING_BANNER =
  `You've indicated this LLC is manager-managed, but the signer's title doesn't appear to be a manager role. In a manager-managed LLC, members who aren't managers generally can't sign notices that bind the entity, and a notice signed by an unauthorized person can be challenged in an unlawful-detainer action. Before continuing, confirm against your Operating Agreement or your Statement of Information (Form LLC-12) that this signer has authority to bind the LLC. If the signer is a manager, update the "Signer's capacity / title" field above (e.g., "manager" or "managing member"). If you're not sure, consult a California licensed attorney of your choosing before serving.`;

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
