from pathlib import Path

root = Path('.')
notice = root / 'components/notice-flow.tsx'
text = notice.read_text()


def replace_once(old: str, new: str):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'expected exactly one occurrence, got {count}: {old[:120]!r}')
    text = text.replace(old, new, 1)

replace_once(
    "import { saveProfile, loadProfile, clearProfile, applyProfile } from '@/lib/flow/profile';",
    "import { saveProfile, loadProfile, clearProfile } from '@/lib/flow/profile';\nimport { resolveBrowserNoticeStart } from '@/lib/flow/matterHydration';",
)

replace_once(
    "  const [draftRestored, setDraftRestored] = useState(false);\n  const [profilePrefilled, setProfilePrefilled] = useState(false);",
    "  const [draftRestored, setDraftRestored] = useState(false);\n  const [profilePrefilled, setProfilePrefilled] = useState(false);\n  const [profilePrefillSections, setProfilePrefillSections] = useState({ landlordPayment: false, signerName: false });",
)

old_mount = """    const draft = loadDraft();
    if (draft) {
      setState((s) => ({ ...s, data: draft.data }));
      setPageIndex(Math.max(0, Math.min(draft.pageIndex, PAGES.length - 1)));
      setDraftRestored(true);
    } else {
      // No in-progress draft: prefill from a saved owner profile if one exists.
      const profile = loadProfile();
      if (profile) {
        setState((s) => ({ ...s, data: applyProfile(s.data, profile) }));
        setProfilePrefilled(true);
      }
    }
"""
new_mount = """    const draft = loadDraft();
    const profile = draft ? null : loadProfile();
    const fresh = createFlowState();
    const start = resolveBrowserNoticeStart(fresh.data, draft, profile);
    setState((s) => ({ ...s, data: start.data }));
    setPageIndex(Math.max(0, Math.min(start.pageIndex, PAGES.length - 1)));
    setDraftRestored(start.source === 'draft');
    setProfilePrefilled(start.source === 'profile');
    setProfilePrefillSections(start.profileSections);
"""
replace_once(old_mount, new_mount)

old_restart = """  const startOver = () => {
    clearDraft();
    const fresh = createFlowState();
    const profile = loadProfile();
    setState(profile ? { ...fresh, data: applyProfile(fresh.data, profile) } : fresh);
    setPageIndex(0);
    setShowIssues(false);
    setDraftRestored(false);
    setProfilePrefilled(!!profile);
"""
new_restart = """  const startOver = () => {
    clearDraft();
    const fresh = createFlowState();
    const profile = loadProfile();
    const start = resolveBrowserNoticeStart(fresh.data, null, profile);
    setState({ ...fresh, data: start.data });
    setPageIndex(0);
    setShowIssues(false);
    setDraftRestored(false);
    setProfilePrefilled(start.source === 'profile');
    setProfilePrefillSections(start.profileSections);
"""
replace_once(old_restart, new_restart)

old_timeout = """  useEffect(() => {
    if (!profilePrefilled) return;
    const t = setTimeout(() => setProfilePrefilled(false), 8000);
    return () => clearTimeout(t);
  }, [profilePrefilled]);
"""
replace_once(old_timeout, "")

replace_once(
    "              We restored your in-progress notice from this browser.",
    "              <span className=\"block font-semibold text-gray-900\">Continuing your in-progress notice</span>\n              <span className=\"mt-0.5 block\">We reopened the notice you were working on in this browser.</span>",
)
replace_once("                Start over", "                Restart this notice")

# Make the resume message inline rather than a transient overlay, while retaining dismiss/restart controls.
replace_once(
    'className="fixed top-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule bg-white px-4 py-3 shadow-lg sm:w-auto"',
    'className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule bg-white px-4 py-3"',
)

old_profile_comment = "        {/* Profile-prefilled toast: saved landlord/payment details were applied. */}\n        {profilePrefilled && ("
new_profile_comment = "        {/* Browser-local provenance appears only on sections that actually received saved defaults. */}\n        {profilePrefilled && ((pageIndex === 3 && profilePrefillSections.landlordPayment) || (pageIndex === 4 && profilePrefillSections.signerName)) && ("
replace_once(old_profile_comment, new_profile_comment)

# The remaining identical fixed-toast class belongs to profile provenance.
replace_once(
    'className="fixed top-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule bg-white px-4 py-3 shadow-lg sm:w-auto"',
    'className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rule bg-tint px-4 py-3"',
)
replace_once(
    "              We prefilled your saved landlord and payment details. Review and edit as needed.",
    "              <span className=\"block font-semibold text-gray-900\">From your saved details on this browser</span>\n              <span className=\"mt-0.5 block\">{pageIndex === 4 ? 'We filled in the signer name you chose to save. Change it if this notice is different.' : \"We filled these in from information you chose to save. Change anything that's different for this notice.\"}</span>",
)

old_control_comment = """      {/* C2b: optional \"save my details\" preference at the end of Step 4.
          Records intent only; no profile storage exists yet.
          TODO(profile-persistence): when an owner profile exists, on produce
          persist the landlord identity + payment payee/phone/address if
          saveLandlordPaymentDefaults is true, and prefill future notices.
          NEVER persist data.bankAccountNumber — it is sensitive and is
          re-entered per notice. */}"""
new_control_comment = """      {/* Optional browser-local defaults. Profile persistence is separate from
          the current Notice draft and never includes bank/EFT or notice-specific facts. */}"""
replace_once(old_control_comment, new_control_comment)
replace_once(
    "            Save landlord and payment details for future notices",
    "            Save landlord and payment details on this browser for future notices",
)
replace_once(
    "            This can make future notices faster. You can update it anytime.",
    "            Reuses supported landlord, payee/contact, payment availability, and signer-name details in this browser only. Bank account information and notice-specific facts are not saved.",
)

notice.write_text(text)

hydration = root / 'lib/flow/matterHydration.ts'
hydration.write_text("""import type { NoticeFlowData } from './noticeFlowState';
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
    profile.landlordIdentityConfirmed,
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
    return {
      source: 'profile',
      data: applyProfile(freshData, profile),
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
""")

hydration_test = root / 'lib/flow/matterHydration.test.ts'
hydration_test.write_text("""import { strict as assert } from 'node:assert';
import { createFlowState, type NoticeFlowData } from './noticeFlowState';
import { bindReviewApproval, hasCurrentReviewApproval } from './reviewApproval';
import { resolveBrowserNoticeStart } from './matterHydration';
import { clearProfile, extractProfile, loadProfile, saveProfile, type OwnerProfile } from './profile';
import { DRAFT_VERSION, loadDraft, saveDraft, type StorageLike } from './persistence';

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

const profile: OwnerProfile = {
  landlordIdentity: { type: 'individual', names: ['Saved Landlord'] },
  landlordIdentityConfirmed: true,
  mailingAddress: '10 Saved Ave, Los Angeles, CA 90001',
  payeePhone: '2135550101',
  payeeStreetAddress: '20 Payee Ave, Los Angeles, CA 90001',
  paymentBranch: 'in_person_and_mail',
  personalDeliveryDays: 'Monday-Friday',
  personalDeliveryHours: '9:00 AM-5:00 PM',
  signerName: 'Saved Signer',
};

// Draft beats conflicting profile, including page position and current C6 binding.
const draftBase: NoticeFlowData = {
  ...createFlowState().data,
  propertyAddress: '111 Draft St, Los Angeles, CA 90001',
  tenantNames: ['Draft Tenant'],
  rentPeriods: [{ periodStartDate: '2026-07-01', periodEndDate: '2026-07-31', amount: 2400 }],
  signerName: 'Draft Signer',
  dispute: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' },
};
const approvedDraft = { ...draftBase, ...bindReviewApproval(draftBase, '2026-08-10T20:00:00.000Z') };
const restored = resolveBrowserNoticeStart(createFlowState().data, {
  pageIndex: 4,
  savedAt: '2026-08-10T20:00:00.000Z',
  data: approvedDraft,
}, profile);
assert.equal(restored.source, 'draft');
assert.equal(restored.pageIndex, 4);
assert.equal(restored.data.propertyAddress, draftBase.propertyAddress);
assert.equal(restored.data.signerName, 'Draft Signer');
assert.equal(restored.data.landlordIdentity, draftBase.landlordIdentity);
assert.equal(hasCurrentReviewApproval(restored.data), true, 'resume alone must not invalidate current C6');
assert.deepEqual(restored.profileSections, { landlordPayment: false, signerName: false });

// A later customer edit occurs after hydration and wins over every start source.
const edited = { ...restored.data, signerName: 'Customer Edit' };
assert.equal(edited.signerName, 'Customer Edit');
assert.equal(hasCurrentReviewApproval(edited), false, 'existing UX2 material-edit invalidation remains active');

// No draft + profile fills only the supported reusable subset into a fresh notice.
const fresh = createFlowState().data;
const profiled = resolveBrowserNoticeStart(fresh, null, profile);
assert.equal(profiled.source, 'profile');
assert.equal(profiled.pageIndex, 0);
assert.equal(profiled.data.signerName, 'Saved Signer');
assert.equal(profiled.data.paymentBranch, 'in_person_and_mail');
assert.equal(profiled.data.landlordContact?.phone, '2135550101');
assert.equal(profiled.data.tenantNames[0], '');
assert.equal(profiled.data.rentPeriods[0].amount, 0);
assert.deepEqual(profiled.data.dispute, {});
assert.equal(profiled.data.serviceDate, undefined);
assert.equal(profiled.data.signerCapacity, undefined);
assert.equal(profiled.data.signerAuthorityEvidenceOnFile, undefined);
assert.equal(profiled.data.cachedResolverVerdict, undefined);
assert.equal(profiled.data.bankAccountNumber, undefined);
assert.equal(profiled.data.bankName, undefined);
assert.equal(profiled.data.bankBranchAddress, undefined);
assert.equal(profiled.data.eftElectionAvailable, undefined);
assert.equal(profiled.data.eftPreviouslyEstablishedAttested, undefined);
assert.deepEqual(profiled.profileSections, { landlordPayment: true, signerName: true });

// No draft + no profile is the ordinary empty/default notice.
const empty = resolveBrowserNoticeStart(fresh, null, null);
assert.equal(empty.source, 'empty');
assert.equal(empty.pageIndex, 0);
assert.strictEqual(empty.data, fresh);

// Projection boundary: sensitive/current/legal facts never enter the reusable profile.
const noticeSpecific = {
  ...draftBase,
  bankAccountNumber: 'SECRET',
  bankName: 'Sensitive Bank',
  bankBranchAddress: '1 Bank St',
  eftElectionAvailable: true,
  eftPreviouslyEstablishedAttested: true,
  signerCapacity: 'authorized_agent' as const,
  signerAuthorityEvidenceOnFile: true,
  serviceDate: '2026-08-12',
  cachedResolverVerdict: { verdict: 'confirmed_la', addressKey: 'x', source: 'live_resolver' } as NoticeFlowData['cachedResolverVerdict'],
};
const projected = extractProfile(noticeSpecific) as Record<string, unknown>;
for (const key of [
  'propertyAddress', 'tenantNames', 'rentPeriods', 'dispute', 'bankAccountNumber', 'bankName',
  'bankBranchAddress', 'eftElectionAvailable', 'eftPreviouslyEstablishedAttested', 'signerCapacity',
  'signerAuthorityEvidenceOnFile', 'serviceDate', 'cachedResolverVerdict',
]) {
  assert.equal(key in projected, false, `${key} must never cross into saved profile`);
}

// Existing two localStorage domains remain fail-soft and independent.
const storage = memoryStorage();
assert.equal(saveDraft(3, approvedDraft, storage), true);
assert.equal(saveProfile(noticeSpecific, storage), true);
const loadedDraft = loadDraft(storage);
const loadedProfile = loadProfile(storage);
assert.equal(loadedDraft?.pageIndex, 3);
assert.equal(loadedDraft?.data.propertyAddress, draftBase.propertyAddress);
assert.equal(loadedProfile?.signerName, noticeSpecific.signerName);
clearProfile(storage);
assert.equal(loadProfile(storage), null, 'profile opt-out keeps existing clearing behavior');
assert.equal(loadDraft(storage)?.pageIndex, 3, 'clearing profile must not clear current draft');

const corruptStorage: StorageLike = {
  getItem: () => '{broken',
  setItem: () => { throw new Error('unavailable'); },
  removeItem: () => { throw new Error('unavailable'); },
};
assert.equal(loadDraft(corruptStorage), null);
assert.equal(loadProfile(corruptStorage), null);
assert.equal(saveProfile(fresh, corruptStorage), false);
clearProfile(corruptStorage);

assert.equal(DRAFT_VERSION, 4, 'v1A must not create a new draft persistence version/domain');
console.log('matterHydration.test.ts: PASS');
""")

# Normalize trailing whitespace and final newline for touched files.
for path in [notice, hydration, hydration_test]:
    normalized = '\n'.join(line.rstrip() for line in path.read_text().splitlines()) + '\n'
    path.write_text(normalized)
