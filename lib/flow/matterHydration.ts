import type { NoticeFlowData } from './noticeFlowState';
import type { RestoredDraft } from './persistence';
import { applyProfile, type OwnerProfile } from './profile';

export type BrowserNoticeStartSource = 'draft' | 'profile' | 'empty';

export interface ProfilePrefillSections {
  landlordPayment: boolean;
  signerName: boolean;
}

export interface BrowserNoticeStart {
  source: BrowserNoticeStartSource;
  data: NoticeFlowData;
  pageIndex: number;
  profileSections: ProfilePrefillSections;
}

const noProfileSections = (): ProfilePrefillSections => ({
  landlordPayment: false,
  signerName: false,
});

/** Ephemeral provenance only; this is not a third persistence domain. */
export function profilePrefillSections(profile: OwnerProfile | null): ProfilePrefillSections {
  if (!profile) return noProfileSections();
  const landlordPayment = [
    profile.landlordIdentity,
    profile.mailingAddress,
    profile.mailingUnit,
    profile.payeeIsNonLandlord,
    profile.payeeOverrideName,
    profile.payeePhone,
    profile.payeeStreetAddress,
    profile.payeeUnit,
    profile.paymentBranch,
    profile.personalDeliveryDays,
    profile.personalDeliveryHours,
  ].some((value) => value !== undefined && value !== '');
  const signerName = typeof profile.signerName === 'string' && profile.signerName.trim() !== '';
  return { landlordPayment, signerName };
}

/**
 * Browser-local start precedence for the five-page notice wizard:
 * restored current draft > saved defaults > fresh defaults.
 * Customer edits occur after this one-time start resolution and therefore win.
 * Saved profile values are convenience defaults only and grant no confirmation authority.
 */
export function resolveBrowserNoticeStart(
  freshData: NoticeFlowData,
  draft: RestoredDraft | null,
  profile: OwnerProfile | null,
): BrowserNoticeStart {
  if (draft) {
    return {
      source: 'draft',
      data: draft.data,
      pageIndex: draft.pageIndex,
      profileSections: noProfileSections(),
    };
  }
  if (profile) {
    const profiled = applyProfile(freshData, profile);
    return {
      source: 'profile',
      // The legacy profile envelope may contain the prior notice's landlord
      // identity confirmation bit. Reuse the identity as a convenience default,
      // never the confirmation: the new notice keeps its fresh confirmation state.
      data: {
        ...profiled,
        landlordIdentityConfirmed: freshData.landlordIdentityConfirmed,
      },
      pageIndex: 0,
      profileSections: profilePrefillSections(profile),
    };
  }
  return {
    source: 'empty',
    data: freshData,
    pageIndex: 0,
    profileSections: noProfileSections(),
  };
}
