/**
 * Owner-profile persistence (profile hook, 2026-06-17).
 *
 * A second versioned localStorage envelope, parallel to the draft
 * (persistence.ts), that remembers the landlord + payment details across notices
 * when the user opts in via "Save landlord and payment details for future
 * notices". The draft holds the CURRENT in-progress notice; the profile prefills
 * the NEXT one. Data never leaves the browser.
 *
 * Same design rules as the draft: fail-soft everywhere, versioned envelope
 * (discard on mismatch), injectable storage for tests.
 *
 * NEVER persisted: the bank account number, bank name/branch, EFT election, and
 * all per-notice data (tenants, rent, dispute, signer capacity/title, dates,
 * attestations). Only the reusable landlord/payment identity is kept.
 */
import type { NoticeFlowData } from './noticeFlowState';
import type { StorageLike } from './persistence';

export const PROFILE_KEY = 'op.noticeProfile.v1';
export const PROFILE_VERSION = 1;

/** The reusable subset saved across notices. Flat shape (payee contact fields
 *  flattened) so the envelope is explicit about exactly what is stored. */
export interface OwnerProfile {
  landlordIdentity?: NoticeFlowData['landlordIdentity'];
  landlordIdentityConfirmed?: boolean;
  mailingAddress?: string;
  mailingUnit?: string;
  payeeIsNonLandlord?: boolean;
  payeeOverrideName?: string;
  payeePhone?: string;
  payeeStreetAddress?: string;
  payeeUnit?: string;
  payeeStreetUserEdited?: boolean;
  payeeUnitUserEdited?: boolean;
  paymentBranch?: NoticeFlowData['paymentBranch'];
  personalDeliveryDays?: string;
  personalDeliveryHours?: string;
  signerName?: string;
}

export interface ProfileEnvelope {
  v: number;
  savedAt: string;
  profile: OwnerProfile;
}

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) return storage;
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Pull the reusable profile out of the full flow data. Excludes the bank
 *  account number, bank name/branch, EFT, and all per-notice fields. */
export function extractProfile(data: NoticeFlowData): OwnerProfile {
  const c = data.landlordContact ?? {};
  return {
    landlordIdentity: data.landlordIdentity,
    landlordIdentityConfirmed: data.landlordIdentityConfirmed,
    mailingAddress: data.mailingAddress,
    mailingUnit: data.mailingUnit,
    payeeIsNonLandlord: data.payeeIsNonLandlord,
    payeeOverrideName: data.payeeOverrideName,
    payeePhone: c.phone,
    payeeStreetAddress: c.streetAddress,
    payeeUnit: c.unit,
    payeeStreetUserEdited: data.payeeStreetUserEdited,
    payeeUnitUserEdited: data.payeeUnitUserEdited,
    paymentBranch: data.paymentBranch,
    personalDeliveryDays: data.personalDeliveryDays,
    personalDeliveryHours: data.personalDeliveryHours,
    signerName: data.signerName,
  };
}

/** Overlay a saved profile onto fresh flow data. Only the profile fields are
 *  set; per-notice fields are left as-is. Keeps the save-defaults box checked. */
export function applyProfile(data: NoticeFlowData, profile: OwnerProfile): NoticeFlowData {
  return {
    ...data,
    landlordIdentity: profile.landlordIdentity ?? data.landlordIdentity,
    landlordIdentityConfirmed:
      profile.landlordIdentityConfirmed ?? data.landlordIdentityConfirmed,
    mailingAddress: profile.mailingAddress ?? data.mailingAddress,
    mailingUnit: profile.mailingUnit ?? data.mailingUnit,
    payeeIsNonLandlord: profile.payeeIsNonLandlord ?? data.payeeIsNonLandlord,
    payeeOverrideName: profile.payeeOverrideName ?? data.payeeOverrideName,
    landlordContact: {
      ...(data.landlordContact ?? {}),
      ...(profile.payeePhone !== undefined ? { phone: profile.payeePhone } : {}),
      ...(profile.payeeStreetAddress !== undefined
        ? { streetAddress: profile.payeeStreetAddress }
        : {}),
      ...(profile.payeeUnit !== undefined ? { unit: profile.payeeUnit } : {}),
    },
    payeeStreetUserEdited: profile.payeeStreetUserEdited ?? data.payeeStreetUserEdited,
    payeeUnitUserEdited: profile.payeeUnitUserEdited ?? data.payeeUnitUserEdited,
    paymentBranch: profile.paymentBranch ?? data.paymentBranch,
    personalDeliveryDays: profile.personalDeliveryDays ?? data.personalDeliveryDays,
    personalDeliveryHours: profile.personalDeliveryHours ?? data.personalDeliveryHours,
    signerName: profile.signerName ?? data.signerName,
    saveLandlordPaymentDefaults: true,
  };
}

/** Persist the reusable profile. Returns false (silently) if unavailable. */
export function saveProfile(data: NoticeFlowData, storage?: StorageLike | null): boolean {
  const s = resolveStorage(storage);
  if (!s) return false;
  const envelope: ProfileEnvelope = {
    v: PROFILE_VERSION,
    savedAt: new Date().toISOString(),
    profile: extractProfile(data),
  };
  try {
    s.setItem(PROFILE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

/** Load a saved profile if present, valid, and current-version; otherwise null. */
export function loadProfile(storage?: StorageLike | null): OwnerProfile | null {
  const s = resolveStorage(storage);
  if (!s) return null;
  let raw: string | null;
  try {
    raw = s.getItem(PROFILE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const env = parsed as Partial<ProfileEnvelope>;
  if (env.v !== PROFILE_VERSION) return null;
  if (typeof env.profile !== 'object' || env.profile === null) return null;
  return env.profile as OwnerProfile;
}

/** Remove any stored profile. Never throws. */
export function clearProfile(storage?: StorageLike | null): void {
  const s = resolveStorage(storage);
  if (!s) return;
  try {
    s.removeItem(PROFILE_KEY);
  } catch {
    /* fail-soft */
  }
}
