import type {
  NoticeFlowData,
} from '../flow/noticeFlowState';
import type { PaymentMethod } from './validatePaymentMethods';

/**
 * C7a multi-select (broker determination 2026-06-15): derive the validator's
 * `PaymentMethod[]` from the SELECTED method kinds plus the canonical top-level
 * flow-data fields.
 *
 * Design (M1): the top-level fields (`personalDeliveryDays`/`Hours`,
 * `landlordContact.streetAddress`, `bankName`/`bankBranchAddress`/
 * `bankAccountNumber`, the bank attestations, `eftPreviouslyEstablishedConfirmed`)
 * are the SINGLE SOURCE OF TRUTH. The renderer (`composeFaceText`) reads them
 * directly. This array is a DERIVED MIRROR that the validator
 * (`validatePaymentMethods`) reads, rebuilt from top-level state on every change
 * so the two representations never diverge.
 *
 * Selection is the set of kinds passed in `selectedKinds`; detail values are
 * pulled from `data`. Pure function — no side effects.
 */
export function syncMethods(
  selectedKinds: ReadonlyArray<PaymentMethod['kind']>,
  data: NoticeFlowData,
): PaymentMethod[] {
  const out: PaymentMethod[] = [];
  // Stable canonical order (matches the §3.5 face ordering; cash is never
  // surfaced by the multi-select UI per determination §5).
  // Cash is never surfaced by the multi-select (determination §5); the four
  // offerable kinds, in §3.5 face order.
  const ORDER: Exclude<PaymentMethod['kind'], 'cash'>[] = [
    'in_person',
    'mail',
    'bank_deposit',
    'eft',
  ];
  for (const kind of ORDER) {
    if (!selectedKinds.includes(kind)) continue;
    switch (kind) {
      case 'in_person': {
        const days = (data.personalDeliveryDays ?? '').trim();
        const hours = (data.personalDeliveryHours ?? '').trim();
        // Validator checks isBlank(daysHours); compose from the two top-level
        // fields. Blank only when BOTH are blank.
        const daysHours = days || hours ? `${days}, ${hours}` : '';
        out.push({ kind: 'in_person', daysHours });
        break;
      }
      case 'mail': {
        // Mail address mirrors the payee street address already captured in the
        // payee block above the method picker (single field, no duplicate input).
        out.push({
          kind: 'mail',
          mailAddress: (data.landlordContact?.streetAddress ?? '').trim(),
        });
        break;
      }
      case 'bank_deposit': {
        out.push({
          kind: 'bank_deposit',
          bankName: (data.bankName ?? '').trim(),
          branchAddress: (data.bankBranchAddress ?? '').trim(),
          accountNumber: (data.bankAccountNumber ?? '').trim(),
          // Mirrors the top-level within-five-miles attestation (M1).
          within5MilesConfirmed: data.bankBranchWithinFiveMilesAttested === true,
        });
        break;
      }
      case 'eft': {
        out.push({
          kind: 'eft',
          previouslyEstablishedConfirmed:
            data.eftPreviouslyEstablishedConfirmed === true,
        });
        break;
      }
      default: {
        const _exhaustive: never = kind;
        void _exhaustive;
      }
    }
  }
  return out;
}

/** The kinds currently selected, read off the derived array. */
export function selectedKindsOf(
  data: NoticeFlowData,
): PaymentMethod['kind'][] {
  return (data.paymentMethods ?? []).map((m) => m.kind);
}
