// lib/produce/__tests__/packetManifest.test.ts
// Lane W3 — packet-artifact disposition: only the notice PDF uploads to EFS; everything else is retained; the
// cover sheet is additionally mail/in-person-only. Descriptor mapping + the three-section split.

import { classifyArtifact, artifactKindFromDescriptor, buildManifestSections } from '../packetManifest';

let failed = 0;
function check(name: string, cond: boolean) {
  if (!cond) { failed++; console.error('FAIL:', name); } else { console.log('ok -', name); }
}

// descriptor → kind
check('cover sheet', artifactKindFromDescriptor('Eviction_Filing_Cover_Sheet_LIVE') === 'cover_sheet');
check('proof of service', artifactKindFromDescriptor('Proof_of_Service_3Day_Notice') === 'proof_of_service');
check('POS abbrev', artifactKindFromDescriptor('POS_declaration') === 'proof_of_service');
check('RTC english', artifactKindFromDescriptor('LAHD_RTC_Notice_English_2025-07') === 'rtc_english');
check('RTC spanish', artifactKindFromDescriptor('LAHD_RTC_Notice_Spanish_2025-07') === 'rtc_spanish');
check('exhibit', artifactKindFromDescriptor('Exhibit_A_posting_wide') === 'exhibit');
check('notice pdf', artifactKindFromDescriptor('3Day_Notice') === 'notice_pdf');
check('unknown → null', artifactKindFromDescriptor('random_file') === null);

// disposition
const notice = classifyArtifact('3Day_Notice');
check('notice: upload=Y retain=Y mailonly=N', notice.upload_to_lahd_online && notice.retain_landlord_records && !notice.mail_or_in_person_only);
const cover = classifyArtifact('Cover_Sheet');
check('cover: upload=N retain=Y mailonly=Y', !cover.upload_to_lahd_online && cover.retain_landlord_records && cover.mail_or_in_person_only);
const rtc = classifyArtifact('RTC_English');
check('rtc: upload=N retain=Y mailonly=N', !rtc.upload_to_lahd_online && rtc.retain_landlord_records && !rtc.mail_or_in_person_only);
const unknown = classifyArtifact('mystery');
check('unknown never auto-uploads', !unknown.upload_to_lahd_online && unknown.retain_landlord_records);

// three-section split (founding packet shape)
const sections = buildManifestSections([
  '3Day_Notice', 'Cover_Sheet', 'Proof_of_Service', 'RTC_English', 'RTC_Spanish', 'Exhibit_A_posting_wide',
]);
check('upload section = only the notice PDF', sections.uploadToLahdOnline.length === 1 && sections.uploadToLahdOnline[0] === '3Day_Notice');
check('retain section = all six', sections.retainInRecords.length === 6);
check('mail-only section = only the cover sheet', sections.mailOrInPersonOnly.length === 1 && sections.mailOrInPersonOnly[0] === 'Cover_Sheet');

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log('\nW3 packet manifest disposition: all passed');
