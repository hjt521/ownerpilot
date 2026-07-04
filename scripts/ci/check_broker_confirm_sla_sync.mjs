#!/usr/bin/env node
/**
 * check_broker_confirm_sla_sync.mjs — SLA-constant drift guard (Decision 2 §0 ruling, Flag 4).
 *
 * The broker-confirm SLA Edge function (supabase/functions/broker-confirm-sla/index.ts)
 * INLINES date constants that are canonically defined in lib/brokerConfirm/brokerConfirmCore.ts
 * (the ruling accepted inline over a full _core mirror, on condition of this lint guard).
 *
 * Both files tag the shared numeric constants with:
 *     // SYNC-WITH(SLA_CONSTANTS): <key>
 * This guard extracts each tagged constant's numeric value from both files and asserts that
 * every key present in BOTH files has an identical value. Keys present in only one file
 * (e.g. sla_window_ms is core-only) are allowed. Drift → exit 1 (PR blocked).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CORE = resolve(ROOT, 'lib/brokerConfirm/brokerConfirmCore.ts');
const EDGE = resolve(ROOT, 'supabase/functions/broker-confirm-sla/index.ts');

const LINE_RE = /=\s*([0-9*+\s]+?)\s*;\s*\/\/\s*SYNC-WITH\(SLA_CONSTANTS\):\s*([a-z_]+)/g;

function extract(file) {
  const src = readFileSync(file, 'utf8');
  const out = {};
  let m;
  while ((m = LINE_RE.exec(src)) !== null) {
    const expr = m[1].trim();
    const key = m[2];
    if (!/^[0-9*+\s]+$/.test(expr)) {
      console.error(`[sla-sync] ${file}: key ${key} has a non-numeric expression "${expr}"`);
      process.exit(1);
    }
    // Safe: expr is restricted to digits, *, +, whitespace.
    out[key] = Function(`return (${expr})`)();
  }
  return out;
}

const core = extract(CORE);
const edge = extract(EDGE);

const shared = Object.keys(core).filter((k) => k in edge);
if (shared.length === 0) {
  console.error('[sla-sync] no shared SYNC-WITH(SLA_CONSTANTS) keys found — markers missing? Refusing to pass silently.');
  process.exit(1);
}

let drift = 0;
for (const k of shared) {
  if (core[k] !== edge[k]) {
    drift++;
    console.error(`[sla-sync] DRIFT on "${k}": core=${core[k]} ms, edge=${edge[k]} ms`);
  } else {
    console.log(`[sla-sync] ok  ${k} = ${core[k]} ms`);
  }
}

if (drift > 0) {
  console.error(
    `\n[sla-sync] ${drift} constant(s) drifted between the Edge function and brokerConfirmCore. ` +
      `Reconcile both, or remove the SYNC-WITH marker if the duplication is intentional.`,
  );
  process.exit(1);
}
console.log(`[sla-sync] ${shared.length} shared SLA constant(s) in sync.`);
