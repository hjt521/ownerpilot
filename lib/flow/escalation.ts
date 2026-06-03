/**
 * A2 escalation helpers — staleness detection for re-serve.
 *
 * Pure functions, no UI, no persistence. Foundation for the "come back and
 * serve by the next method" flow (attorney ruling 2026-06-02, Section A2):
 *
 *   - captureProductionSnapshot(data): record the face-determining values at
 *     the moment a notice is produced.
 *   - evaluateStaleness(data, snapshot): on re-serve, detect whether the amount
 *     or any face field has changed since production. If it has, the same
 *     notice may NOT be re-served — it is legally a NEW notice (attorney A2
 *     exceptions: amount changed (i), or any other face field changed (ii)).
 *
 * DELIBERATELY EXCLUDED from the comparison: serviceDate and serviceMethod.
 * Re-serving by a new method on a new date is the normal escalation path, not
 * a "stale" change. Per A2, failed attempts establish reasonable diligence and
 * the clock recomputes from the successful method's service date; none of that
 * makes the notice stale.
 *
 * SCOPE NOTE: this module does not recompute dates and does not touch the
 * notice face. The recompute-on-re-serve behavior is blocked pending the
 * attorney's ruling on separating the notice "Dated:" line (currently derived
 * from serviceDate) from the service date.
 *
 * Not legal advice; product workflow logic.
 */

import type {
  NoticeFlowData,
  ProductionSnapshot,
} from './noticeFlowState';

/** Sum of base-rent amounts demanded. */
function totalAmount(data: NoticeFlowData): number {
  return (data.rentPeriods || []).reduce(
    (sum, p) => sum + (typeof p.amount === 'number' ? p.amount : 0),
    0,
  );
}

/**
 * Capture the face-determining values at production time. Call this when the
 * notice is produced (e.g. on the produce / download action). serviceDate and
 * serviceMethod are intentionally not captured (see module doc).
 */
export function captureProductionSnapshot(
  data: NoticeFlowData,
): ProductionSnapshot {
  const c = data.landlordContact ?? {};
  return {
    producedAtISO: new Date().toISOString(),
    propertyAddress: (data.propertyAddress ?? '').trim(),
    propertyCounty: (data.propertyCounty ?? '').trim(),
    tenantNames: (data.tenantNames || []).map((t) => t.trim()).filter(Boolean),
    totalAmount: totalAmount(data),
    rentPeriods: (data.rentPeriods || [])
      .filter((p) => p.periodStartDate || p.periodEndDate || p.amount)
      .map((p) => ({
        start: p.periodStartDate,
        end: p.periodEndDate,
        amount: p.amount,
      })),
    payeeName: (c.name ?? '').trim(),
    payeePhone: (c.phone ?? '').trim(),
    payeeStreetAddress: (c.streetAddress ?? '').trim(),
    paymentBranch: data.paymentBranch,
    personalDeliveryDays: data.personalDeliveryDays,
    personalDeliveryHours: data.personalDeliveryHours,
    bankName: data.bankName,
    bankBranchAddress: data.bankBranchAddress,
    bankAccountNumber: data.bankAccountNumber,
    eftElectionAvailable: data.eftElectionAvailable,
    signerName: (data.signerName ?? '').trim(),
    signerRole: data.signerRole,
  };
}

export interface StalenessResult {
  /** True if the amount or any face field changed since the snapshot. */
  stale: boolean;
  /** True specifically if the demanded amount changed (attorney A2 exception i). */
  amountChanged: boolean;
  /** Human-readable labels of every face field that changed. */
  changedFields: string[];
}

/** Compare two normalized string values for change. */
function differs(a: string, b: string): boolean {
  return a.trim() !== b.trim();
}

/**
 * Evaluate whether the current data has drifted from what was produced.
 *
 * Returns `stale: true` if the amount or any face field differs from the
 * snapshot. The caller (UI) uses this to warn the landlord and require an
 * explicit confirmation to start a NEW notice (the same notice may not be
 * re-served once its face has changed). serviceDate / serviceMethod are NOT
 * compared — changing them is the normal re-serve path.
 *
 * If no snapshot exists (notice never produced), returns stale: false — there
 * is nothing to be stale against yet.
 */
export function evaluateStaleness(
  data: NoticeFlowData,
  snapshot: ProductionSnapshot | undefined = data.productionSnapshot,
): StalenessResult {
  if (!snapshot) {
    return { stale: false, amountChanged: false, changedFields: [] };
  }

  const changedFields: string[] = [];
  const c = data.landlordContact ?? {};

  const amountChanged = totalAmount(data) !== snapshot.totalAmount;
  if (amountChanged) changedFields.push('Amount demanded');

  // Rent-period structure (periods added/removed/edited, even if total matches).
  const currentPeriods = (data.rentPeriods || [])
    .filter((p) => p.periodStartDate || p.periodEndDate || p.amount)
    .map((p) => `${p.periodStartDate}|${p.periodEndDate}|${p.amount}`)
    .join(';');
  const snapshotPeriods = snapshot.rentPeriods
    .map((p) => `${p.start}|${p.end}|${p.amount}`)
    .join(';');
  if (currentPeriods !== snapshotPeriods && !amountChanged) {
    changedFields.push('Rent period details');
  }

  if (differs(data.propertyAddress ?? '', snapshot.propertyAddress)) {
    changedFields.push('Property address');
  }
  if (differs(data.propertyCounty ?? '', snapshot.propertyCounty)) {
    changedFields.push('Property county');
  }

  const currentTenants = (data.tenantNames || [])
    .map((t) => t.trim())
    .filter(Boolean)
    .join('|');
  if (currentTenants !== snapshot.tenantNames.join('|')) {
    changedFields.push('Tenant names');
  }

  if (differs(c.name ?? '', snapshot.payeeName)) changedFields.push('Payee name');
  if (differs(c.phone ?? '', snapshot.payeePhone)) changedFields.push('Payee telephone');
  if (differs(c.streetAddress ?? '', snapshot.payeeStreetAddress)) {
    changedFields.push('Payee address');
  }

  if ((data.paymentBranch ?? '') !== (snapshot.paymentBranch ?? '')) {
    changedFields.push('Payment method');
  } else {
    // Same branch — compare that branch's fields.
    if (data.paymentBranch === 'in_person_and_mail') {
      if (differs(data.personalDeliveryDays ?? '', snapshot.personalDeliveryDays ?? '')) {
        changedFields.push('Personal-delivery days');
      }
      if (differs(data.personalDeliveryHours ?? '', snapshot.personalDeliveryHours ?? '')) {
        changedFields.push('Personal-delivery hours');
      }
    } else if (data.paymentBranch === 'bank_deposit') {
      if (differs(data.bankName ?? '', snapshot.bankName ?? '')) {
        changedFields.push('Bank name');
      }
      if (differs(data.bankBranchAddress ?? '', snapshot.bankBranchAddress ?? '')) {
        changedFields.push('Bank branch address');
      }
      if (differs(data.bankAccountNumber ?? '', snapshot.bankAccountNumber ?? '')) {
        changedFields.push('Bank account number');
      }
    }
  }

  if ((data.eftElectionAvailable ?? false) !== (snapshot.eftElectionAvailable ?? false)) {
    changedFields.push('Electronic funds transfer option');
  }

  if (differs(data.signerName ?? '', snapshot.signerName)) {
    changedFields.push('Signer name');
  }
  if ((data.signerRole ?? '') !== (snapshot.signerRole ?? '')) {
    changedFields.push('Signer role');
  }

  return {
    stale: changedFields.length > 0,
    amountChanged,
    changedFields,
  };
}
