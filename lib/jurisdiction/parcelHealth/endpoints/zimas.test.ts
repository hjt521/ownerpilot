// Boundary tests for the ZIMAS health probe (drip-003 §5).
// Five spec'd fixtures: byte-identical URL, healthy, OUTLA-sentinel rejection, ArcGIS
// error-envelope, HTTP non-200 — plus null-body (parse failure) and multi-parcel fail-closed.
// The probe's fetch is not exercised (no network); the pure evaluateZimasProbeResponse and the
// shared production URL encoder carry the assertions. The two-signal logic itself lives in
// zimasParcelAdapter (reused, not re-implemented) and is pinned by that adapter's own suite.

import assert from 'node:assert';
import { evaluateZimasProbeResponse } from './zimas';
import { buildZimasParcelQueryUrl, type ZimasArcgisResponse } from '../../geocode/zimasParcelAdapter';

let passed = 0;
function check(name: string, fn: () => void): void {
  fn();
  passed++;
  console.log(`  \u2713 ${name}`);
}

// #5 — byte-identical URL: the probe targets Central Library via the shared production encoder.
check('builds the byte-identical production query URL for Central Library', () => {
  const url = buildZimasParcelQueryUrl({ lng: -118.2428, lat: 34.0537 });
  assert.strictEqual(
    url,
    'https://zimas.lacity.org/arcgis/rest/services/zm4/landbase/MapServer/105/query' +
      '?geometry=' + encodeURIComponent('-118.2428,34.0537') +
      '&geometryType=esriGeometryPoint' +
      '&inSR=4326&spatialRel=esriSpatialRelIntersects' +
      '&outFields=' + encodeURIComponent('PIND,PIN,TRACT,PARCEL,CNCL_DIST,ENG_DIST,LST_MODF_DT') +
      '&returnGeometry=false&f=json',
  );
});

// #1 — healthy: one parcel, CNCL_DIST in [1..15], TRACT non-blank → confirms_la → shape valid.
check('healthy two-signal parcel -> responseShapeValid true', () => {
  const json: ZimasArcgisResponse = {
    features: [{ attributes: { PIND: 'p', PIN: 'q', TRACT: '12345', CNCL_DIST: '4' } }],
  };
  const r = evaluateZimasProbeResponse(200, json);
  assert.strictEqual(r.httpStatus, 200);
  assert.strictEqual(r.responseShapeValid, true);
});

// #2 — OUTLA sentinel: CNCL_DIST "OUTLA" fails the integer rule → inconclusive → shape invalid.
check('OUTLA sentinel parcel -> responseShapeValid false', () => {
  const json: ZimasArcgisResponse = {
    features: [{ attributes: { TRACT: '12345', CNCL_DIST: 'OUTLA' } }],
  };
  const r = evaluateZimasProbeResponse(200, json);
  assert.strictEqual(r.responseShapeValid, false);
});

// #3 — ArcGIS error-envelope: HTTP 200 with json.error → response_shape (checked before features).
check('200 with ArcGIS error envelope -> responseShapeValid false', () => {
  const json: ZimasArcgisResponse = { error: { code: 400, message: 'Invalid' } };
  const r = evaluateZimasProbeResponse(200, json);
  assert.strictEqual(r.responseShapeValid, false);
});

// #3b — unparseable body (null under 200) → response_shape, no throw.
check('200 with unparseable body (null) -> responseShapeValid false', () => {
  const r = evaluateZimasProbeResponse(200, null);
  assert.strictEqual(r.responseShapeValid, false);
});

// #4 — HTTP non-200: status preserved; responseShapeValid false (evaluateProbe → http_status).
check('non-200 status -> responseShapeValid false, status preserved', () => {
  const r = evaluateZimasProbeResponse(503, null);
  assert.strictEqual(r.httpStatus, 503);
  assert.strictEqual(r.responseShapeValid, false);
});

// Multi-parcel (should-not-happen for a point) → inconclusive → shape invalid (fail-closed §3.3).
check('multi-parcel -> responseShapeValid false (fail-closed)', () => {
  const json: ZimasArcgisResponse = {
    features: [
      { attributes: { TRACT: '1', CNCL_DIST: '4' } },
      { attributes: { TRACT: '2', CNCL_DIST: '5' } },
    ],
  };
  const r = evaluateZimasProbeResponse(200, json);
  assert.strictEqual(r.responseShapeValid, false);
});

// TRACT-blank with valid district → two-signal fails on TRACT → shape invalid.
check('valid district but blank TRACT -> responseShapeValid false', () => {
  const json: ZimasArcgisResponse = {
    features: [{ attributes: { TRACT: '   ', CNCL_DIST: '7' } }],
  };
  const r = evaluateZimasProbeResponse(200, json);
  assert.strictEqual(r.responseShapeValid, false);
});

console.log(`\n${passed} passed`);
