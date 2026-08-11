// lib/testing/e2eWizardFixture.ts
// Characterization-only fixture (2026-07-27) for e2e/beta-pathway-characterization.spec.ts and
// e2e/beta-pathway-cross-device-characterization.spec.ts. PREVIEW/test only; no production code path
// imports this at runtime.
//
// This mirrors the `validV4()` fixture already used by lib/flow/gates.v4.test.ts (same synthetic,
// clearly non-LA Fresno address, reused rather than inventing new fixture data) so the wizard can be
// placed directly into a produce-ready state without driving the address-autocomplete UI. That is a
// deliberate choice, not just a convenience: PropertyAddressAutocomplete is backed by the live
// jurisdiction/geocode resolver (lib/jurisdiction/geocode/*), and this PR must not exercise that
// resolver or any jurisdiction-activation path (Founder/Architect condition #7/#10, 2026-07-27). Every
// name, address, and identifier below is synthetic and used for test characterization only — no real
// owner, tenant, property, email, or phone number (condition #5).
import type { NoticeFlowData } from '../flow/noticeFlowState';
import { individualLandlord } from '../flow/landlord.fixture';
import { bindReviewApproval } from '../flow/reviewApproval';

/**
 * A fully valid, produce-ready NoticeFlowData for a synthetic, non-LA California address.
 * Deliberately mirrors lib/flow/gates.v4.test.ts's validV4() shape/address so this PR does not
 * introduce a second, drifting "valid config" fixture.
 */
export function e2eCharacterizationWizardData(): NoticeFlowData {
  const data: NoticeFlowData = {
    dispute: { tenantFiledComplaint: 'no', tenantWrittenWithholding: 'no', tenantBankruptcy: 'no' },
    propertyAddress: '442 Fresno St, Fresno, CA 93701',
    propertyCounty: 'Fresno',
    tenantNames: ['E2E Characterization Tenant'],
    rentPeriods: [{ periodStartDate: '2026-05-01', periodEndDate: '2026-05-31', amount: 3000 }],
    produceAttestationConfirmed: true,
    paymentMethods: ['by_mail'],
    landlordContact: {
      name: 'E2E Characterization Owner',
      phone: '(559) 555-0100',
      streetAddress: '1 Characterization Way, Fresno, CA 93701',
    },
    signerName: 'E2E Characterization Owner',
    ...individualLandlord('owner', { names: ['E2E Characterization Owner'] }),
    signingDate: '2026-06-02',
    serviceDate: '2026-06-02',
    serviceMethod: 'personal',
  };
  Object.assign(data, bindReviewApproval(data, '2026-08-10T00:00:00.000Z'));
  return data;
}
