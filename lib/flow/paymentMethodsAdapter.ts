/**
 * Adapter: build the payment-methods validator's object input from the C7a
 * selection (data.paymentMethods: OfferedMethod[]) plus the flat per-method
 * fields (Option A). One place that maps selection + flat data -> validator
 * shape, shared by the produce gate and the advancement step, so the rules stay
 * in the validator and are never duplicated.
 */
import type { NoticeFlowData } from './noticeFlowState';
import type {
  PaymentMethod,
  PaymentMethodsInput,
} from '../payments/validatePaymentMethods';

export function buildMethodsInput(data: NoticeFlowData): PaymentMethodsInput {
  const methods: PaymentMethod[] = [];
  for (const kind of data.paymentMethods) {
    switch (kind) {
      case 'in_person': {
        const days = data.personalDeliveryDays?.trim() ?? '';
        const hours = data.personalDeliveryHours?.trim() ?? '';
        methods.push({
          kind: 'in_person',
          daysHours: days && hours ? `${days}, ${hours}` : '',
        });
        break;
      }
      case 'by_mail':
        methods.push({ kind: 'by_mail', mailAddress: data.landlordContact?.streetAddress });
        break;
      case 'bank_deposit':
        methods.push({
          kind: 'bank_deposit',
          bankName: data.bankName,
          branchAddress: data.bankBranchAddress,
          accountNumber: data.bankAccountNumber,
          within5MilesConfirmed: data.bankBranchWithinFiveMilesAttested,
        });
        break;
      case 'eft':
        methods.push({
          kind: 'eft',
          previouslyEstablishedConfirmed: data.eftPreviouslyEstablishedConfirmed,
        });
        break;
      default: {
        const _exhaustive: never = kind;
        void _exhaustive;
      }
    }
  }
  return { methods };
}
