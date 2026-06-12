/**
 * Exact-equality pins for the RiskPath Phase 1 packet copy — most importantly
 * the THREE LOCKED tenant footer strings and the TENANT_QR_FOOTER_ENABLED
 * gate from the broker determination
 * tenant_face_additions_review_packet_2026-06-11_broker_determination.md.
 * Any string edit or gate flip fails loudly here.
 */
import {
  TENANT_QR_FOOTER_ENABLED,
  TENANT_QR_FOOTER_TITLE,
  TENANT_QR_FOOTER_BODY,
  TENANT_QR_FOOTER_DISCLAIMER,
  PAGE_LABELS,
  getPacketConfig,
} from './packetCopy';

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean) {
  if (cond) {
    passed += 1;
  } else {
    failures.push(name);
    console.error(`FAIL: ${name}`);
  }
}

// Gate (§6(d)) — Phase 1 ships with the tenant QR footer OFF.
check('gate: TENANT_QR_FOOTER_ENABLED is false', TENANT_QR_FOOTER_ENABLED === false);

// Locked strings (§6(c)) — verbatim.
check(
  'locked: footer title',
  TENANT_QR_FOOTER_TITLE === 'General Information About This Notice',
);
check('locked: footer body', TENANT_QR_FOOTER_BODY === 'Scan to learn more');
check(
  'locked: footer disclaimer',
  TENANT_QR_FOOTER_DISCLAIMER ===
    'OwnerPilot does not represent you or your landlord. This information is not legal advice.',
);

// Page labels — spec verbatim (em dashes intact).
check('label: tenant', PAGE_LABELS.tenant === 'TENANT SERVICE COPY');
check('label: owner', PAGE_LABELS.owner === 'OWNER RECORD COPY \u2014 DO NOT SERVE');
check(
  'label: service log',
  PAGE_LABELS.serviceLog === 'SERVICE LOG / PROOF OF SERVICE \u2014 OWNER RECORD',
);
check(
  'label: checklist',
  PAGE_LABELS.checklist === 'OWNERPILOT SERVICE CHECKLIST \u2014 OWNER RECORD',
);

// Config invariants — a tenant packet can never carry the secure owner QR or
// owner metadata; owner packets never carry the public tenant QR.
const tenant = getPacketConfig('tenant_service_copy');
check('config: tenant audience', tenant.intendedAudience === 'tenant');
check('config: tenant excludes secure owner QR', tenant.includeSecureOwnerQr === false);
check('config: tenant excludes owner metadata', tenant.includeOwnerMetadata === false);
check('config: tenant excludes service log', tenant.includeServiceLog === false);

const owner = getPacketConfig('owner_record_copy');
check('config: owner audience', owner.intendedAudience === 'owner');
check('config: owner excludes public tenant QR', owner.includePublicInfoQr === false);
check('config: owner includes owner metadata', owner.includeOwnerMetadata === true);

const log = getPacketConfig('service_log');
check('config: service log includes service log', log.includeServiceLog === true);
check('config: service log excludes public tenant QR', log.includePublicInfoQr === false);

if (failures.length > 0) {
  throw new Error(`packetCopy.test.ts: ${failures.length} check(s) failed, ${passed} passed`);
}
console.log(`packetCopy.test.ts: all ${passed} checks passed`);
