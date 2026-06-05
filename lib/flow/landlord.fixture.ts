// Shared TEST fixture for the landlord-identity schema (Defect #1; updated for
// Defect #3 close-out 2026-06-05). Lets the gate/advancement/render suites adopt
// the two-stage capture from one place. Defect #3 removed the legacy derived
// `signerRole`, so the slices now carry only the canonical `signerCapacity`
// (and `signerTitle` for entity signers); the renderer derives its face labels
// from those directly.
import {
  type EntityType,
  type NoticeFlowData,
  type SignerCapacity,
} from './noticeFlowState';

type IndividualSlice = Pick<
  NoticeFlowData,
  'landlordIdentity' | 'landlordIdentityConfirmed' | 'signerCapacity'
>;

/** Identity slice for an INDIVIDUAL landlord. Spread into a baseline. */
export function individualLandlord(
  capacity: Exclude<SignerCapacity, 'officer_member_trustee'> = 'owner',
  opts: { names?: string[] } = {},
): IndividualSlice {
  return {
    landlordIdentity: { type: 'individual', names: opts.names ?? ['Owner Name'] },
    landlordIdentityConfirmed: true,
    signerCapacity: capacity,
  };
}

type EntitySlice = Pick<
  NoticeFlowData,
  'landlordIdentity' | 'landlordIdentityConfirmed' | 'signerCapacity' | 'signerTitle'
>;

/** Identity slice for an ENTITY landlord. */
export function entityLandlord(
  capacity: Exclude<SignerCapacity, 'owner'> = 'officer_member_trustee',
  opts: { entityLegalName?: string; entityType?: EntityType; signerTitle?: string } = {},
): EntitySlice {
  return {
    landlordIdentity: {
      type: 'entity',
      entityLegalName: opts.entityLegalName ?? 'PTAG Properties, LLC',
      entityType: opts.entityType ?? 'llc',
    },
    landlordIdentityConfirmed: true,
    signerCapacity: capacity,
    signerTitle:
      capacity === 'officer_member_trustee' ? opts.signerTitle ?? 'Managing Member' : opts.signerTitle,
  };
}
