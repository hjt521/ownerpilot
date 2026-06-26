import assert from 'node:assert';
import { buildCountyParcelQueryUrl, parseAddressForCounty } from './countyParcelAdapter';

let passed = 0;
function check(name: string, fn: () => void): void { fn(); passed++; console.log(`  \u2713 ${name}`); }

// Regression lock: buildCountyParcelQueryUrl must reproduce the EXACT URL the inline
// assembly produced before the extraction. If production's address parse or the
// where-clause shape ever drifts, these byte-pins fail loudly.

// Hall of Administration — canonical "St" form. parseAddressForCounty doesn't strip
// "St" (only the full word "Street" is in STREET_SUFFIXES), so the parsed coreStreet
// retains "ST" and the LIKE pattern is 'TEMPLE ST%'. This is the intended canonical
// form per the slice-2 divergence ruling §2.2 (broker, 2026-06-25).
check('Hall of Administration (St form) -> byte-identical URL', () => {
  const url = buildCountyParcelQueryUrl(parseAddressForCounty('500 W Temple St, Los Angeles, CA 90012'));
  assert.strictEqual(url, "https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query?where=SitusHouseNo%20%3D%20'500'%20AND%20SitusStreet%20LIKE%20'TEMPLE%20ST%25'%20AND%20SitusZIP%20LIKE%20'90012%25'&outFields=TaxRateCity%2CSitusCity%2CAIN%2CAPN&returnGeometry=false&resultRecordCount=10&f=json");
});

check('Normandie Avenue fixture -> byte-identical URL', () => {
  const url = buildCountyParcelQueryUrl(parseAddressForCounty('11460 Normandie Avenue, Los Angeles, CA 90044'));
  assert.strictEqual(url, "https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0/query?where=SitusHouseNo%20%3D%20'11460'%20AND%20SitusStreet%20LIKE%20'NORMANDIE%25'%20AND%20SitusZIP%20LIKE%20'90044%25'&outFields=TaxRateCity%2CSitusCity%2CAIN%2CAPN&returnGeometry=false&resultRecordCount=10&f=json");
});

console.log(`\n${passed} passed`);
