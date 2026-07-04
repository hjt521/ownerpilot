#!/usr/bin/env tsx
/**
 * broker_confirm_resolve.ts — broker-run resolution tool for the broker-confirm queue
 * (Decision 2 §1.1 / §2.2). Broker-only surface; runs LOCALLY with the broker's
 * service_role key (the audit_export precedent), NEVER in Vercel.
 *
 * §2.2 MUST FIX: every resolution records actor + timestamp + basis + outcome.
 * §2.2.4: the attestation must be source-based — `basis` is REQUIRED free-text
 * naming the sources the broker consulted (e.g. "County spatial confirms LA, AIN …;
 * ZIMAS CNCL_DIST 13"). The tool refuses to resolve without it.
 *
 * Usage (broker's machine, env loaded from .env.local):
 *   export $(grep -E 'SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_URL' .env.local | xargs)
 *   export BROKER_CONFIRM_ACTOR="Jack Taglyan, CalDRE B9445457"
 *   tsx scripts/broker_confirm_resolve.ts list
 *   tsx scripts/broker_confirm_resolve.ts resolve <id> confirmed_la "County spatial confirms LA; AIN 5536003018"
 *   tsx scripts/broker_confirm_resolve.ts resolve <id> denied_la "County TaxRateCity = SANTA MONICA"
 *   tsx scripts/broker_confirm_resolve.ts resolve <id> inconclusive "Assessor unresolved at unit granularity; route to counsel"
 */
import { createClient } from '@supabase/supabase-js';
import { outcomeToStatus, type BrokerConfirmOutcome } from '../lib/brokerConfirm/brokerConfirmCore';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ACTOR = process.env.BROKER_CONFIRM_ACTOR;

if (!URL || !KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required; this tool is broker-run and local only. Abort.');
  process.exit(1);
}
const supabase = createClient(URL, KEY);

const VALID_OUTCOMES: BrokerConfirmOutcome[] = ['confirmed_la', 'denied_la', 'inconclusive'];

async function list(): Promise<void> {
  const { data, error } = await supabase
    .from('broker_confirm_requests')
    .select('id, created_at, sla_due_at, address_input, prior_review_reason, requester_contact')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) { console.error(error.message); process.exit(1); }
  if (!data || data.length === 0) { console.log('No pending broker-confirm requests.'); return; }
  console.log(`${data.length} pending:\n`);
  for (const r of data) {
    const overdue = new Date(r.sla_due_at as string).getTime() < Date.now() ? '  ⚠ SLA BREACHED' : '';
    console.log(`  ${r.id}`);
    console.log(`    address : ${r.address_input}`);
    console.log(`    reason  : ${r.prior_review_reason}`);
    console.log(`    created : ${r.created_at}   due: ${r.sla_due_at}${overdue}`);
    console.log(`    contact : ${r.requester_contact ?? '(none — token-only)'}\n`);
  }
}

async function resolve(id: string, outcome: string, basis: string): Promise<void> {
  if (!id) { console.error('request id required'); process.exit(1); }
  if (!VALID_OUTCOMES.includes(outcome as BrokerConfirmOutcome)) {
    console.error(`outcome must be one of: ${VALID_OUTCOMES.join(', ')}`); process.exit(1);
  }
  if (!basis || basis.trim() === '') {
    console.error('basis is REQUIRED (§2.2.4 source-based attestation): name the sources you consulted.'); process.exit(1);
  }
  if (!ACTOR) {
    console.error('BROKER_CONFIRM_ACTOR env required (the attesting broker identity).'); process.exit(1);
  }
  const status = outcomeToStatus(outcome as BrokerConfirmOutcome);
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('broker_confirm_requests')
    .update({
      status,
      broker_confirm_outcome: outcome,
      broker_confirm_actor: ACTOR,
      broker_confirm_timestamp: nowIso,
      broker_confirm_basis: basis.trim(),
      resolved_at: nowIso,
    })
    .eq('id', id)
    .eq('status', 'pending') // only resolve a still-pending request
    .select('id');
  if (error) { console.error(error.message); process.exit(1); }
  if (!data || data.length === 0) {
    console.error('Not updated: request not found or no longer pending (already resolved/cancelled/expired).'); process.exit(1);
  }
  console.log(`Resolved ${id} → ${status} (${outcome}) by ${ACTOR}.`);
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'list') return list();
  if (cmd === 'resolve') return resolve(rest[0], rest[1], rest.slice(2).join(' '));
  console.error('Usage: broker_confirm_resolve.ts <list | resolve <id> <confirmed_la|denied_la|inconclusive> "<basis>">');
  process.exit(1);
}
main();
