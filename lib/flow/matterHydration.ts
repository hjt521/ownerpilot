import type { NoticeFlowData } from './noticeFlowState';
import { clearReviewApproval } from './reviewApproval';

/**
 * Browser-local reusable defaults that may prefill a new/current Notice matter.
 * This type deliberately excludes per-notice facts, legal/jurisdictional state,
 * service state, production artifacts, and customer attestations.
 */
export interface SavedNoticeDefaults {
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

export interface MatterHydrationLayers {
  defaults: NoticeFlowData;
  savedDefaults?: SavedNoticeDefaults | null;
  restoredDraft?: NoticeFlowData | null;
  /**
   * Optional highest-precedence in-session patch. The mounted wizard hydrates
   * before ordinary customer interaction; this hook keeps the headless contract
   * explicit/testable for any caller that already has current edits.
   */
  currentEdits?: Partial<NoticeFlowData> | null;
}

function clonePlain<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => clonePlain(entry)) as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = clonePlain(entry);
    }
    return out as T;
  }
  return value;
}

/**
 * Overlay one Notice layer without treating an absent nested payee-contact field
 * as an instruction to erase a lower-precedence reusable value. Arrays and all
 * other top-level values replace lower layers exactly; explicit empty strings,
 * false, empty arrays, and in-memory undefined values remain explicit edits.
 */
function overlayNoticeLayer(
  base: NoticeFlowData,
  overlay: Partial<NoticeFlowData>,
): NoticeFlowData {
  const target = clonePlain(base) as unknown as Record<string, unknown>;
  const source = overlay as unknown as Record<string, unknown>;

  for (const [key, rawValue] of Object.entries(source)) {
    if (
      key === 'landlordContact' &&
      rawValue !== undefined &&
      rawValue !== null &&
      typeof rawValue === 'object' &&
      !Array.isArray(rawValue)
    ) {
      const existing = target.landlordContact;
      const lowerContact =
        existing !== undefined && existing !== null && typeof existing === 'object' && !Array.isArray(existing)
          ? (existing as Record<string, unknown>)
          : {};
      target.landlordContact = {
        ...lowerContact,
        ...clonePlain(rawValue as Record<string, unknown>),
      };
      continue;
    }
    target[key] = clonePlain(rawValue);
  }

  return target as unknown as NoticeFlowData;
}

function assignDefined<K extends keyof NoticeFlowData>(
  target: Partial<NoticeFlowData>,
  key: K,
  value: NoticeFlowData[K] | undefined,
): void {
  if (value !== undefined) target[key] = value;
}

/** Apply only the explicitly reusable browser-local profile subset. */
export function applySavedNoticeDefaults(
  data: NoticeFlowData,
  profile: SavedNoticeDefaults,
): NoticeFlowData {
  const patch: Partial<NoticeFlowData> = {};

  assignDefined(patch, 'landlordIdentity', profile.landlordIdentity);
  assignDefined(patch, 'landlordIdentityConfirmed', profile.landlordIdentityConfirmed);
  assignDefined(patch, 'mailingAddress', profile.mailingAddress);
  assignDefined(patch, 'mailingUnit', profile.mailingUnit);
  assignDefined(patch, 'payeeIsNonLandlord', profile.payeeIsNonLandlord);
  assignDefined(patch, 'payeeOverrideName', profile.payeeOverrideName);
  assignDefined(patch, 'payeeStreetUserEdited', profile.payeeStreetUserEdited);
  assignDefined(patch, 'payeeUnitUserEdited', profile.payeeUnitUserEdited);
  assignDefined(patch, 'paymentBranch', profile.paymentBranch);
  assignDefined(patch, 'personalDeliveryDays', profile.personalDeliveryDays);
  assignDefined(patch, 'personalDeliveryHours', profile.personalDeliveryHours);
  assignDefined(patch, 'signerName', profile.signerName);

  const contact: NonNullable<NoticeFlowData['landlordContact']> = {};
  if (profile.payeePhone !== undefined) contact.phone = profile.payeePhone;
  if (profile.payeeStreetAddress !== undefined) contact.streetAddress = profile.payeeStreetAddress;
  if (profile.payeeUnit !== undefined) contact.unit = profile.payeeUnit;
  if (Object.keys(contact).length > 0) patch.landlordContact = contact;

  // Presence of a persisted profile means the user previously opted in.
  patch.saveLandlordPaymentDefaults = true;
  return overlayNoticeLayer(data, patch);
}

/**
 * Matter Hydration v1A — one deterministic headless precedence boundary:
 *
 *   defaults -> saved browser-local reusable defaults -> restored current draft
 *   -> current in-session customer edits
 *
 * Prefill is not confirmation. Regardless of what a persisted draft contains,
 * hydration never revives a C6 Review & Confirm approval. The existing exact-
 * generation approval contract must be completed again against the current
 * hydrated Create input.
 *
 * ProductionSnapshot, CreatedNoticeArtifactEnvelope, jurisdiction state, and
 * service state are never synthesized here. If they already exist in the
 * restored current draft, ordinary layer overlay preserves them as separate
 * state; otherwise they remain absent.
 */
export function hydrateMatterData({
  defaults,
  savedDefaults,
  restoredDraft,
  currentEdits,
}: MatterHydrationLayers): NoticeFlowData {
  let hydrated = clonePlain(defaults);
  if (savedDefaults) hydrated = applySavedNoticeDefaults(hydrated, savedDefaults);
  if (restoredDraft) hydrated = overlayNoticeLayer(hydrated, restoredDraft);
  if (currentEdits) hydrated = overlayNoticeLayer(hydrated, currentEdits);

  return overlayNoticeLayer(hydrated, clearReviewApproval());
}
