#!/usr/bin/env node
/**
 * DOCUMENTS interim-language sunset tripwire (correction 2026-06-07 §3.2).
 *
 * The help-chatbox DOCUMENTS notice-response paragraph is attorney-signed INTERIM
 * language. It sunsets only when BOTH conditions hold:
 *   (a) v4 payment-fields wording signed off   -> V4_WORDING_SIGNED_OFF
 *   (b) broker-supervised workflow production-live -> BROKER_WORKFLOW_PRODUCTION_LIVE
 *
 * (a) is already true. (b) is false today (dev-only). The risk is forgetting to
 * revisit the prompt the day (b) flips. This guard makes that impossible to forget:
 * if both flags are true while the deployed prompt STILL contains the interim
 * language, it fails — forcing an attorney-reviewed DOCUMENTS revision before ship.
 *
 * It does NOT decide what the new language should be (that is the attorney's call);
 * it only refuses to let the live-flag flip past an un-revisited interim paragraph.
 *
 * Composes with check_system_prompt_lock.mjs: that guard catches ANY prompt edit
 * (hash drift); this one catches the flag-flip-without-sunset. Removing the interim
 * marker to silence this guard is itself a prompt edit and trips the lock guard
 * until re-locked with attorney attribution.
 *
 * Dependency-free (Node built-ins). Run from the repo root.
 *   node scripts/check_documents_sunset.mjs
 */

import { readFileSync } from 'node:fs';

const FLAGS_PATH = 'lib/flow/templateVersion.ts';
const ROUTE_PATH = 'lib/chat/persona.ts';
const ANCHOR = 'const OWNERPILOT_PERSONA_SYSTEM_PROMPT = ';

// Stable, verbatim substring unique to the SIGNED-OFF INTERIM DOCUMENTS paragraph
// (absent from the v4-final version). Presence == interim language still deployed.
const INTERIM_MARKER = "I'm not going to draft the actual notice here in chat";

function fail(msg) {
  console.error(`\n\u2717 DOCUMENTS sunset check FAILED\n\n${msg}\n`);
  process.exit(1);
}

function readFlag(src, name) {
  const m = src.match(new RegExp(`${name}\\s*=\\s*(true|false)`));
  if (!m) fail(`Could not read flag ${name} in ${FLAGS_PATH}.`);
  return m[1] === 'true';
}

let flagsSrc, routeSrc;
try {
  flagsSrc = readFileSync(FLAGS_PATH, 'utf8');
  routeSrc = readFileSync(ROUTE_PATH, 'utf8');
} catch {
  fail('Could not read source files (run from the repo root).');
}

const wordingSignedOff = readFlag(flagsSrc, 'V4_WORDING_SIGNED_OFF');
const workflowLive = readFlag(flagsSrc, 'BROKER_WORKFLOW_PRODUCTION_LIVE');

const i = routeSrc.indexOf(ANCHOR);
if (i === -1) fail(`Could not find SYSTEM_PROMPT in ${ROUTE_PATH}.`);
const open = routeSrc.indexOf('`', i);
const close = routeSrc.indexOf('`', open + 1);
const promptBody = routeSrc.slice(open + 1, close);
const interimPresent = promptBody.includes(INTERIM_MARKER);

const sunsetConditionsMet = wordingSignedOff && workflowLive;

if (sunsetConditionsMet && interimPresent) {
  fail(
    `Both DOCUMENTS sunset conditions are now met:\n` +
      `  (a) V4_WORDING_SIGNED_OFF            = ${wordingSignedOff}\n` +
      `  (b) BROKER_WORKFLOW_PRODUCTION_LIVE  = ${workflowLive}\n\n` +
      `…but the deployed prompt STILL contains the DOCUMENTS interim language.\n\n` +
      `Per correction 2026-06-07 §3.2, the interim notice-response paragraph must now\n` +
      `be revisited in an ATTORNEY-REVIEWED prompt revision before this ships (the\n` +
      `interim language currently routes owners to "your broker or attorney"; once the\n` +
      `broker-supervised workflow is live, the routing should point there instead — but\n` +
      `the new wording is the attorney's call, not the build side's).\n\n` +
      `Action: route the DOCUMENTS revision to the attorney of record, apply her wording,\n` +
      `re-lock the prompt (check_system_prompt_lock.mjs --write …), then this passes.`
  );
}

if (sunsetConditionsMet && !interimPresent) {
  console.log('\u2713 DOCUMENTS sunset complete (both conditions met; interim language no longer present).');
  process.exit(0);
}

console.log(
  `\u2713 DOCUMENTS interim language correctly in force.\n` +
    `  (a) V4_WORDING_SIGNED_OFF           = ${wordingSignedOff}\n` +
    `  (b) BROKER_WORKFLOW_PRODUCTION_LIVE = ${workflowLive}\n` +
    `  interim language present            = ${interimPresent}\n` +
    `  Sunset triggers automatically when (b) flips to true — see lib/flow/templateVersion.ts.`
);
