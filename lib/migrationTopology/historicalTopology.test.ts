// Historical migration topology guard for the non-Production reconciliation prototype.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const activeRoot = join(root, 'supabase', 'migrations');
const appArchiveRoot = join(root, 'supabase', 'migration-history', 'application');
const constitutionalArchiveRoot = join(root, 'supabase', 'migration-history', 'constitutional', 'recovered-production-ledger');
const stagedRoot = join(root, 'supabase', 'staged-migrations');

function gitBlobSha(path: string): string {
  const bytes = readFileSync(path);
  return createHash('sha1')
    .update(Buffer.from(`blob ${bytes.length}\0`))
    .update(bytes)
    .digest('hex');
}

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const noOpCompatibility = [
  ['20260627194653_city_zip_refresh_state.sql', '20260627194653', 'city_zip_refresh_state'],
  ['20260627194655_city_zip_refresh_cron.sql', '20260627194655', 'city_zip_refresh_cron'],
  ['20260630162020_027_automation_mirror_queue.sql', '20260630162020', '027_automation_mirror_queue'],
  ['20260630162307_026_chat_sessions.sql', '20260630162307', '026_chat_sessions'],
  ['20260630162324_028_riskpath_records.sql', '20260630162324', '028_riskpath_records'],
  ['20260630162340_029_courtesy_reminders.sql', '20260630162340', '029_courtesy_reminders'],
  ['20260630162352_030_magic_link_tokens.sql', '20260630162352', '030_magic_link_tokens'],
  ['20260630163231_023_broker_confirm_requests.sql', '20260630163231', '023_broker_confirm_requests'],
  ['20260630163250_024_broker_confirm_sla_cron.sql', '20260630163250', '024_broker_confirm_sla_cron'],
  ['20260630163312_025_broker_confirm_attestation_lookup.sql', '20260630163312', '025_broker_confirm_attestation_lookup'],
  ['20260630174444_031_chat_sessions_counsel_trigger.sql', '20260630174444', '031_chat_sessions_counsel_trigger'],
  ['20260630174500_032_privacy_requests.sql', '20260630174500', '032_privacy_requests'],
  ['20260630230349_033_e2e_test_tagging.sql', '20260630230349', '033_e2e_test_tagging'],
  ['20260701130400_034_riskpath_produce_audit.sql', '20260701130400', '034_riskpath_produce_audit'],
  ['20260701130401_035_staleness_guard.sql', '20260701130401', '035_staleness_guard'],
  ['20260701130402_036_lahd_filing_records.sql', '20260701130402', '036_lahd_filing_records'],
] as const;

const exactSupplemental = new Map<string, string>([
  ['20260630170022_025a_broker_confirm_attestation_view_grant_correction.sql', '27ec901eefe687faa9c8ceadb2ee0c398a1b477c'],
  ['20260630171954_025b_manual_review_queue_aging_view_grant_correction.sql', '6c5221891db6b02407e456800429befd9f36030d'],
  ['20260630174034_025c_broker_confirm_fn_exec_lockdown.sql', '1a335c677d7095bae951d918278aa8ee69b1351a'],
]);

const canonicalized032a = {
  file: '20260630175137_032a_privacy_requests_grant_lockdown.sql',
  blob: '65e6f2b0364e75c3838337255c087a8e9ef24f0d',
  archive: 'supabase/migration-history/application/recovered-production-ledger/20260630175137_032a_privacy_requests_grant_lockdown.sql',
};

const recoveredApp = new Map<string, string>([
  ['20260627194653_city_zip_refresh_state.sql', '7b297690bda0227bef60e6c55f3c3e216684ae94'],
  ['20260627194655_city_zip_refresh_cron.sql', '626943b765e36ce59d3f08eaac3cfd60f02258ca'],
  ['20260630162020_027_automation_mirror_queue.sql', '2eed2c35535258c99ecc30b98c29ffbaf2fbe19a'],
  ['20260630162307_026_chat_sessions.sql', '8dc9278ae0282517b611c43279b2c8ca002a5fb7'],
  ['20260630162324_028_riskpath_records.sql', 'cba1e776fdd4fd3ff6f0552b04708608d5a019f8'],
  ['20260630162340_029_courtesy_reminders.sql', '1e8da2d83dfb0dd3fd442893d875de41c200b150'],
  ['20260630162352_030_magic_link_tokens.sql', '77678b259b1787e47396efd6c9c777f8827ce3a1'],
  ['20260630163231_023_broker_confirm_requests.sql', '63a90d1ee5340c6b06c00b16407a146058431755'],
  ['20260630163250_024_broker_confirm_sla_cron.sql', '73b05d52050c3e7bae021576c5d8a59c856b5bb3'],
  ['20260630163312_025_broker_confirm_attestation_lookup.sql', '26f0aff6c81c331a5d6a35e0823a3044b79bb596'],
  ['20260630170022_025a_broker_confirm_attestation_view_grant_correction.sql', '27ec901eefe687faa9c8ceadb2ee0c398a1b477c'],
  ['20260630171954_025b_manual_review_queue_aging_view_grant_correction.sql', '6c5221891db6b02407e456800429befd9f36030d'],
  ['20260630174034_025c_broker_confirm_fn_exec_lockdown.sql', '1a335c677d7095bae951d918278aa8ee69b1351a'],
  ['20260630174444_031_chat_sessions_counsel_trigger.sql', 'cee0f973f3c46e06b763d68f44a2ea4ef60a3603'],
  ['20260630174500_032_privacy_requests.sql', '3789ea0fd0218e5cb042e6ee5b6e0600c4dddc69'],
  ['20260630175137_032a_privacy_requests_grant_lockdown.sql', '52ec336e27e06b3856f09f076ba66a3af4ebf564'],
  ['20260630230349_033_e2e_test_tagging.sql', 'fcf2b00cced6f6f9066ed9ef64052716e225ce8c'],
]);

const constitutional = new Map<string, string>([
  ['20260722101430_create_constitution_core_schema.sql', '72da365c28af7b881e08bf36fe421af856d48979'],
  ['20260722103318_create_constitution_agent_build_system.sql', '084029daeb68bdfe865afe407a68815627eb509f'],
  ['20260722121552_create_enterprise_digital_twin_v1.sql', '7eea33e868a6abf588d3797f5b8f513cd540f4c9'],
  ['20260722121716_harden_enterprise_digital_twin_v1.sql', 'a6e6827832c72a6162c380e1dea8a4d8ff912154'],
  ['20260722124951_create_digital_twin_discovery_agent.sql', '72c614d3ab87fa9d9f35ac64fb12b077cc0242f9'],
  ['20260722125119_fix_supabase_discovery_relkind_cast.sql', 'd0982a93884334040389c6aec28b881b686af882'],
  ['20260722133337_add_scheduled_discovery_and_missing_object_detection.sql', 'cbb7ead2074acbcbfa4d62842223240d26f611ab'],
  ['20260722133459_fix_discovery_snapshot_clock_timestamps.sql', 'c138355cf08e6c940a2e11e37b315c715e073de2'],
  ['20260722145623_create_behavioral_and_negotiation_intelligence_core.sql', '48bb1ba737dfa5e50f32affe7fb4628e2131b29d'],
  ['20260722165924_implement_esl_002_scenario_generation_engine.sql', '695bddb86c5facb4374b75296be0595a7811e764'],
  ['20260722171229_implement_esl_003_and_esl_004_adaptive_strategy_evolution.sql', '7d75be4114f584a3f3c7b3c041a721709a1e3dd9'],
  ['20260722175747_esl_006_tables.sql', '4e570e7a7d6fc8d1ae228819f75a2fdda84a3708'],
  ['20260722175815_esl_006_explainability_tables.sql', '36bf0ff61725bb32db51f3827e66fd0168dbadad'],
  ['20260722175849_esl_006_capability.sql', '4c4abd17f87782bc4aaa5429bd113c6749585c9f'],
  ['20260722175934_esl_006_recommendation_function.sql', '4c06c33192a6dd7ec6ab65a52b47c5a6cb8c68a9'],
]);

const canonicalizedConstitutionalClosure = {
  file: '20260722215547_esl_security_hardening_phase1.sql',
  blob: 'ffc8e78caf640a4d22b328f67e4f910c0ed47278',
  recoveredBlob: 'a68bf5aac3d8c6e4ecac4540da171b0b60246fe6',
  archive: 'supabase/migration-history/constitutional/recovered-production-ledger/20260722215547_esl_security_hardening_phase1.sql',
};

const constitutionalTriggerClosure = [
  ['trg_twin_discovery_rules_updated_at', 'twin_discovery_rules', 'touch_updated_at'],
  ['intelligence_model_registry_set_updated_at', 'intelligence_model_registry', 'set_updated_at'],
  ['behavioral_profiles_set_updated_at', 'behavioral_profiles', 'set_updated_at'],
  ['negotiation_cases_set_updated_at', 'negotiation_cases', 'set_updated_at'],
  ['intelligence_evaluation_suites_set_updated_at', 'intelligence_evaluation_suites', 'set_updated_at'],
  ['scenario_generation_requests_set_updated_at', 'scenario_generation_requests', 'set_updated_at'],
  ['scenario_templates_set_updated_at', 'scenario_templates', 'set_updated_at'],
  ['simulation_actors_set_updated_at', 'simulation_actors', 'set_updated_at'],
  ['strategy_evolution_experiments_set_updated_at', 'strategy_evolution_experiments', 'set_updated_at'],
  ['decision_intelligence_requests_set_updated_at', 'decision_intelligence_requests', 'set_updated_at'],
] as const;

const legacyLettered = new Map<string, string>([
  ['025a_broker_confirm_attestation_view_grant_correction.sql', 'eac473cc3740f5557aa87366d80522c31af3d5e5'],
  ['025b_manual_review_queue_aging_view_grant_correction.sql', '841e1a3b3a30e421b09def2dca78a9b975bed76e'],
  ['025c_broker_confirm_fn_exec_lockdown.sql', 'bc5fca1bea77d9fd5506b9b39b34b7cdeb4728e0'],
  ['032a_privacy_requests_grant_lockdown.sql', 'dcf5f4d5a71c579224be7a584d4f004e303249cc'],
]);

console.log('\n=== Historical Supabase migration topology ===\n');

for (const [file, version, historicalName] of noOpCompatibility) {
  const path = join(activeRoot, file);
  check(`${file} exists`, existsSync(path));
  if (!existsSync(path)) continue;
  const text = readFileSync(path, 'utf8');
  const executable = text.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('--'));
  check(`${file} is comment-only`, executable.length === 0, executable.join(' | '));
  check(`${file} preserves version identity`, text.includes(`Version: ${version}`));
  check(`${file} preserves historical name`, text.includes(`Historical name: ${historicalName}`));
  check(`${file} points to the historical SQL archive`, text.includes('supabase/migration-history/application/'));
}

for (const [file, expected] of exactSupplemental) {
  const path = join(activeRoot, file);
  check(`${file} is active under authoritative timestamp`, existsSync(path));
  if (existsSync(path)) check(`${file} matches Production-ledger SQL`, gitBlobSha(path) === expected, `expected ${expected}, got ${gitBlobSha(path)}`);
}

const canonical032aPath = join(activeRoot, canonicalized032a.file);
check(`${canonicalized032a.file} is active under authoritative timestamp`, existsSync(canonical032aPath));
if (existsSync(canonical032aPath)) {
  const text = readFileSync(canonical032aPath, 'utf8');
  check(`${canonicalized032a.file} canonical representation is byte-locked`, gitBlobSha(canonical032aPath) === canonicalized032a.blob, `expected ${canonicalized032a.blob}, got ${gitBlobSha(canonical032aPath)}`);
  check(`${canonicalized032a.file} points to exact recovered SQL archive`, text.includes(canonicalized032a.archive));
  check(`${canonicalized032a.file} materializes service_role prerequisite`, text.includes('GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'));
  check(`${canonicalized032a.file} preserves privacy_requests lockdown`, text.includes('REVOKE ALL ON public.privacy_requests FROM authenticated;'));
  check(`${canonicalized032a.file} preserves analytics lockdown`, text.includes('REVOKE ALL ON public.analytics_suppression_list FROM authenticated;'));
  check(`${canonicalized032a.file} preserves fail-closed service_role assertion`, text.includes('service_role lost a required privilege after REVOKE'));
}

const activeNames = new Set(readdirSync(activeRoot));
for (const file of legacyLettered.keys()) {
  check(`${file} unsupported legacy filename is absent from active migrations`, !activeNames.has(file));
  const archive = join(appArchiveRoot, 'legacy-lettered', file);
  check(`${file} legacy source is archived`, existsSync(archive));
  if (existsSync(archive)) check(`${file} archived legacy source is byte-identical`, gitBlobSha(archive) === legacyLettered.get(file));
}

const recoveredRoot = join(appArchiveRoot, 'recovered-production-ledger');
for (const [file, expected] of recoveredApp) {
  const path = join(recoveredRoot, file);
  check(`${file} recovered Production SQL is archived`, existsSync(path));
  if (existsSync(path)) check(`${file} archive matches Production-ledger SQL`, gitBlobSha(path) === expected, `expected ${expected}, got ${gitBlobSha(path)}`);
}
check('NULL-ledger provenance gap is recorded', existsSync(join(appArchiveRoot, 'UNRECOVERABLE_LEDGER_STATEMENTS.md')));

for (const [file, expected] of constitutional) {
  const path = join(activeRoot, file);
  check(`${file} constitutional migration exists`, existsSync(path));
  if (existsSync(path)) check(`${file} is byte-identical to Production-ledger SQL`, gitBlobSha(path) === expected, `expected ${expected}, got ${gitBlobSha(path)}`);
}

const constitutionalClosurePath = join(activeRoot, canonicalizedConstitutionalClosure.file);
const constitutionalClosureArchivePath = join(constitutionalArchiveRoot, canonicalizedConstitutionalClosure.file);
check(`${canonicalizedConstitutionalClosure.file} canonical constitutional closure exists`, existsSync(constitutionalClosurePath));
check(`${canonicalizedConstitutionalClosure.file} recovered source is archived`, existsSync(constitutionalClosureArchivePath));
if (existsSync(constitutionalClosureArchivePath)) {
  check(
    `${canonicalizedConstitutionalClosure.file} recovered source remains byte-identical`,
    gitBlobSha(constitutionalClosureArchivePath) === canonicalizedConstitutionalClosure.recoveredBlob,
    `expected ${canonicalizedConstitutionalClosure.recoveredBlob}, got ${gitBlobSha(constitutionalClosureArchivePath)}`,
  );
}
if (existsSync(constitutionalClosurePath)) {
  const text = readFileSync(constitutionalClosurePath, 'utf8');
  check(
    `${canonicalizedConstitutionalClosure.file} canonical representation is byte-locked`,
    gitBlobSha(constitutionalClosurePath) === canonicalizedConstitutionalClosure.blob,
    `expected ${canonicalizedConstitutionalClosure.blob}, got ${gitBlobSha(constitutionalClosurePath)}`,
  );
  check(`${canonicalizedConstitutionalClosure.file} points to immutable recovered archive`, text.includes(canonicalizedConstitutionalClosure.archive));
  check(`${canonicalizedConstitutionalClosure.file} separates recovered historical SQL`, text.includes('-- Recovered historical SQL'));
  check(`${canonicalizedConstitutionalClosure.file} labels canonical end-state closure`, text.includes('-- Canonical Production-observed end-state closure'));
  check(
    `${canonicalizedConstitutionalClosure.file} preserves provenance disclaimer`,
    text.includes('The trigger source migration and original creation timing are unrecoverable from current evidence.') &&
      text.includes('It is not represented as recovered historical SQL attributable to this timestamp.'),
  );

  const marker = '-- Canonical Production-observed end-state closure';
  const markerIndex = text.indexOf(marker);
  const closureText = markerIndex >= 0 ? text.slice(markerIndex) : '';
  const createdTriggers = [...closureText.matchAll(/CREATE TRIGGER\s+([a-zA-Z0-9_]+)/g)].map((match) => match[1]);
  const expectedTriggers = constitutionalTriggerClosure.map(([trigger]) => trigger);
  check(
    `${canonicalizedConstitutionalClosure.file} creates exactly the 10 authorized closure triggers`,
    createdTriggers.length === expectedTriggers.length &&
      createdTriggers.every((trigger) => expectedTriggers.includes(trigger as (typeof expectedTriggers)[number])) &&
      expectedTriggers.every((trigger) => createdTriggers.includes(trigger)),
    `expected ${expectedTriggers.join(', ')}, got ${createdTriggers.join(', ')}`,
  );

  for (const [trigger, relation, fn] of constitutionalTriggerClosure) {
    const exactCreate =
      `CREATE TRIGGER ${trigger}\n` +
      `BEFORE UPDATE ON constitution.${relation}\n` +
      `FOR EACH ROW EXECUTE FUNCTION constitution.${fn}();`;
    check(`${trigger} closure target/function is exact`, closureText.includes(exactCreate));
  }
}

const activeMigrationFiles = [...activeNames].filter((file) => file.endsWith('.sql'));
check('active migration count remains exactly 90', activeMigrationFiles.length === 90, `got ${activeMigrationFiles.length}`);
const constitutionalTimestampFiles = activeMigrationFiles.filter((file) => /^20260722\d{6}_.*\.sql$/.test(file));
check('constitutional lineage remains exactly 16 timestamp versions', constitutionalTimestampFiles.length === 16, `got ${constitutionalTimestampFiles.length}`);

const stagedControls = new Map<string, string>([
  ['056_owner_tables_grant_tidy.sql', '2071f466ef91ab24415a680d5b0a405c26b022ea'],
  ['057_btrm_enr_evidence_schema.sql', '2de55447a541720cf27f9dd4d7e1bc789f73ac4f'],
]);
for (const [file, expected] of stagedControls) {
  const path = join(stagedRoot, file);
  check(`${file} remains staged`, existsSync(path));
  if (existsSync(path)) check(`${file} remains byte-identical`, gitBlobSha(path) === expected);
  check(`${file} remains absent from active migrations`, !activeNames.has(file));
  const activeBlobMatches = activeMigrationFiles.filter((activeFile) => gitBlobSha(join(activeRoot, activeFile)) === expected);
  check(`${file} staged blob has no hidden active duplicate`, activeBlobMatches.length === 0, activeBlobMatches.join(', '));
}

const draftPath = join(stagedRoot, 'constitutional-drafts', 'esl005_phase5a_monte_carlo_persistence.sql');
check('non-ledger ESL-005 draft remains staged', existsSync(draftPath));
if (existsSync(draftPath)) check('non-ledger ESL-005 draft remains byte-identical', gitBlobSha(draftPath) === '063a22610e6a4425510803b4351591f40308e447');
check('non-ledger ESL-005 draft is absent from active discovery', !existsSync(join(activeRoot, 'constitution', 'esl005_phase5a_monte_carlo_persistence.sql')));

console.log(`\n${'-'.repeat(56)}`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(56)}\n`);
if (failed > 0) process.exit(1);
