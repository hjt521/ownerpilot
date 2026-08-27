import { strict as assert } from 'node:assert';
import { produceLeaseApplicabilityControl } from './ud100GovernedControls';

const noAgreement = produceLeaseApplicabilityControl({ state: 'KNOWN', value: 'NO_AGREEMENT' });
assert.equal(noAgreement.state, 'KNOWN');
if (noAgreement.state === 'KNOWN') {
  assert.equal(noAgreement.value, 'NO_AGREEMENT_FIELDS_NOT_APPLICABLE');
}
const agreement = produceLeaseApplicabilityControl({ state: 'KNOWN', value: 'OTHER' });
assert.equal(agreement.state, 'KNOWN');
if (agreement.state === 'KNOWN') {
  assert.equal(agreement.value, 'AGREEMENT_FIELDS_APPLICABLE');
}
assert.notEqual(produceLeaseApplicabilityControl({ state: 'UNKNOWN' }).state, 'KNOWN');
console.log('E2D1R1_GOVERNED_CONTROLS_SMOKE=PASS');
