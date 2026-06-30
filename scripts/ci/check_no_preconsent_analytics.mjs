#!/usr/bin/env node
// scripts/ci/check_no_preconsent_analytics.mjs
// Guard G — pre-consent analytics mount. Ruling: lane6_preexisting_ga4_mount_deletion_broker_ruling_2026-06-29.md §4.5.
// Fails the build if a pre-consent / ungated GA4 mount is (re)introduced. All GA4 must route through the
// consent-gated GTM path in app/layout.tsx (CookiebotBanner -> @next/third-parties GoogleTagManager).
//
// Blocks:
//   (a) any file matching **/GoogleAnalytics.tsx                 (the deleted legacy component shape)
//   (b) direct googletagmanager.com/gtag/js script loads          (ungated GA4 loader outside GTM)
//   (c) hardcoded GA4 measurement IDs (G-XXXXXXXXXX) in source    (legacy hardcode pattern)
// Scans app/ components/ lib/ (.ts/.tsx). Excludes *.test.*, /_core/, .env.example, node_modules.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const ROOTS = ['app', 'components', 'lib'];
const GA4_ID = /\bG-[A-Z0-9]{10}\b/;
const GTAG_JS = /googletagmanager\.com\/gtag\/js/;

const violations = [];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === '_core' || name === 'node_modules') continue;
      yield* walk(p);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) {
      yield p;
    }
  }
}

for (const root of ROOTS) {
  if (!existsSync(root)) continue;
  for (const file of walk(root)) {
    const rel = relative('.', file);
    // (a) component-shape match — prevents reintroduction
    if (basename(file) === 'GoogleAnalytics.tsx') {
      violations.push({ file: rel, line: 0, kind: 'legacy GoogleAnalytics.tsx component (deleted; do not reintroduce)' });
    }
    const src = readFileSync(file, 'utf8');
    src.split('\n').forEach((text, i) => {
      if (GTAG_JS.test(text)) {
        violations.push({ file: rel, line: i + 1, kind: 'direct gtag/js load (use consent-gated GTM container)', snippet: text.trim().slice(0, 140) });
      }
      if (GA4_ID.test(text)) {
        violations.push({ file: rel, line: i + 1, kind: 'hardcoded GA4 measurement ID (use NEXT_PUBLIC_GA4_MEASUREMENT_ID)', snippet: text.trim().slice(0, 140) });
      }
    });
  }
}

if (violations.length) {
  console.error('ci:verify-no-preconsent-analytics (Guard G) FAILED — ungated/pre-consent GA4 mount detected:\n');
  for (const v of violations) {
    console.error(`  ${v.file}${v.line ? ':' + v.line : ''}  ${v.kind}`);
    if (v.snippet) console.error(`    > ${v.snippet}`);
  }
  console.error('\nAll GA4 must load via the consent-gated GTM path in app/layout.tsx (Cookiebot blockingmode=auto).');
  process.exit(1);
}
console.log('ci:verify-no-preconsent-analytics (Guard G): OK (no ungated GA4 mount)');
process.exit(0);
