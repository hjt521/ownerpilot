#!/usr/bin/env node
// CBS-001 — Constitutional Build System
// The single governed pipeline that compiles canonical metadata (artifact front-matter)
// into all derived artifacts: indexes (CIX-001), dependency graph, repository inventory,
// coverage report, and STATUS stats. Validates first; generation is refused if validation fails.
//
// Usage:
//   node constitution/tools/cbs.mjs check     # validate only (exit 1 on error)
//   node constitution/tools/cbs.mjs build     # validate then write constitution/index/*
//   node constitution/tools/cbs.mjs status    # print STATUS stats block
//
// Zero dependencies. Repository is canonical; outputs are reproducible from it.
// No production DB/app/runtime effect — reads .md front-matter, writes JSON under constitution/index/.

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');           // constitution/
const REPO = join(ROOT, '..');                                              // repo root
const INDEX_DIR = join(ROOT, 'index');

// CRIDs that are planned (referenced before a file exists). Not errors when referenced.
const PLANNED_CRIDS = new Set(['EA-010', 'EA-011', 'REG-CAP-001', 'MODEL-BEH', 'MODEL-DEC', 'MODEL-NEG', 'BOOK-001', 'VOL-001']);
// Prefixes that denote a *constitutional* CRID (so we only reference-check these tokens).
const KNOWN_PREFIXES = ['CON', 'EA', 'ADR', 'STD', 'DOC', 'PROC', 'REG', 'MODEL', 'CAP', 'INFRA', 'BASE', 'VAL', 'MIG', 'SYS', 'BOOK', 'VOL', 'IMR', 'CIX', 'CKG', 'CK', 'CA', 'TM', 'CM', 'MAP', 'REC', 'ROAD', 'ARCH', 'CBS', 'ECAP', 'RPT'];
const CRID_TOKEN = new RegExp('\\b(?:' + KNOWN_PREFIXES.join('|') + ')-[0-9A-Za-z_]+(?:-[0-9A-Za-z_]+)*\\b', 'g');
const VALID_OBJECT_TYPES = new Set([
  'constitution', 'enterprise_architecture', 'adr', 'adr_log', 'standard', 'doctrine',
  'process', 'registry', 'constitutional_registry', 'model', 'constitutional_intelligence_model',
  'capability', 'constitutional_capability', 'infrastructure', 'constitutional_infrastructure',
  'baseline', 'validation', 'roadmap', 'mapping', 'canonical_architecture_mapping', 'dashboard', 'migration', 'architecture', 'report', 'enterprise_capability'
]);
const RELATION_FIELDS = ['depends_on', 'required_by', 'implements', 'governed_by', 'validated_by', 'supersedes', 'superseded_by', 'related_artifacts', 'governs'];
const REQUIRED_FIELDS = ['constitutional_id', 'object_type', 'title', 'canonical_owner', 'lifecycle_state', 'governed_by'];

// ---- tiny front-matter parser (scalars + inline [a, b] lists) ----
function parseFrontMatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = text.slice(3, end).trim();
  const obj = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim()).filter(s => s && s !== '—' && s !== '-');
    } else {
      val = val.replace(/^["']|["']$/g, '');
    }
    obj[key] = val;
  }
  return obj;
}

function cridsIn(value) {
  const s = Array.isArray(value) ? value.join(' ') : (value || '');
  return [...String(s).matchAll(CRID_TOKEN)].map(m => m[0]);
}

// ---- walk constitution/ for markdown with front-matter ----
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'index' || name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

function loadArtifacts() {
  const files = walk(ROOT);
  const artifacts = [];
  const noMeta = [];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    const fm = parseFrontMatter(text);
    const rel = relative(REPO, f);
    if (!fm || !fm.constitutional_id) { noMeta.push(rel); continue; }
    fm._path = rel;
    artifacts.push(fm);
  }
  return { artifacts, noMeta };
}

// ---- ADR sub-entries parsed from the ADR log headings ----
function parseAdrs() {
  const p = join(ROOT, 'adr', 'adr_log.md');
  if (!existsSync(p)) return [];
  const out = [];
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^##\s+(ADR-\d+)\s+—\s+(.*)$/);
    if (m) out.push({ constitutional_id: m[1], title: m[2].trim(), object_type: 'adr', _path: 'constitution/adr/adr_log.md' });
  }
  return out;
}

function validate(artifacts, adrs) {
  const errors = [], warnings = [];
  const byId = new Map();
  const known = new Set(PLANNED_CRIDS);
  for (const a of artifacts) known.add(a.constitutional_id);
  for (const a of adrs) known.add(a.constitutional_id);

  for (const a of artifacts) {
    const id = a.constitutional_id;
    if (byId.has(id)) errors.push(`duplicate CRID ${id} (${a._path} and ${byId.get(id)._path})`);
    else byId.set(id, a);
    for (const req of REQUIRED_FIELDS) if (!a[req] || (Array.isArray(a[req]) && a[req].length === 0)) warnings.push(`${id}: missing required field '${req}'`);
    if (a.object_type && !VALID_OBJECT_TYPES.has(a.object_type)) warnings.push(`${id}: unknown object_type '${a.object_type}'`);
    for (const field of RELATION_FIELDS) {
      if (!a[field]) continue;
      for (const tok of cridsIn(a[field])) if (!known.has(tok)) errors.push(`${id}.${field}: broken reference ${tok}`);
    }
  }
  // dependency cycle detection over depends_on CRID edges
  const graph = new Map();
  for (const a of artifacts) graph.set(a.constitutional_id, cridsIn(a.depends_on).filter(c => byId.has(c)));
  const state = new Map(); // 0=visiting,1=done
  const stack = [];
  const dfs = (n) => {
    if (state.get(n) === 1) return;
    if (state.get(n) === 0) { errors.push(`dependency cycle: ${[...stack, n].join(' -> ')}`); return; }
    state.set(n, 0); stack.push(n);
    for (const m of (graph.get(n) || [])) dfs(m);
    stack.pop(); state.set(n, 1);
  };
  for (const id of graph.keys()) dfs(id);
  return { errors, warnings, byId, known };
}

function build(artifacts, adrs) {
  if (!existsSync(INDEX_DIR)) mkdirSync(INDEX_DIR, { recursive: true });
  const gen = { generated_by: 'CBS-001', generated_at: new Date().toISOString().slice(0, 10), source: 'constitution/ front-matter (canonical)' };
  const slim = a => ({
    crid: a.constitutional_id, title: a.title, object_type: a.object_type,
    lifecycle_state: a.lifecycle_state, canonical_owner: a.canonical_owner,
    ratification_authority: a.ratification_authority || null, path: a._path,
    depends_on: cridsIn(a.depends_on), required_by: cridsIn(a.required_by),
    implements: cridsIn(a.implements), governed_by: cridsIn(a.governed_by),
    validated_by: cridsIn(a.validated_by), supersedes: cridsIn(a.supersedes),
    superseded_by: cridsIn(a.superseded_by), related_artifacts: cridsIn(a.related_artifacts),
    registry_tags: Array.isArray(a.registry_tags) ? a.registry_tags : (a.registry_tags ? [a.registry_tags] : []),
    program_phase: a.program_phase || null, version: a.version || null,
    capability_class: a.capability_class || null, security_classification: a.security_classification || null,
    operational_maturity: a.operational_maturity || null,
    runtime_bindings: Array.isArray(a.runtime_bindings) ? a.runtime_bindings : (a.runtime_bindings ? [a.runtime_bindings] : [])
  });
  const all = artifacts.map(slim).sort((x, y) => x.crid.localeCompare(y.crid));
  const writeIdx = (name, arr) => writeFileSync(join(INDEX_DIR, name), JSON.stringify({ ...gen, count: arr.length, artifacts: arr }, null, 2) + '\n');

  writeIdx('artifact_index.json', all);
  writeIdx('ea_index.json', all.filter(a => a.object_type.includes('enterprise_architecture') || a.crid.startsWith('EA-')));
  writeIdx('standard_index.json', all.filter(a => a.object_type === 'standard'));
  writeIdx('doctrine_index.json', all.filter(a => a.object_type === 'doctrine'));
  writeIdx('registry_index.json', all.filter(a => a.object_type.includes('registry')));
  writeIdx('capability_index.json', all.filter(a => a.object_type.includes('capability') || a.capability_class));
  writeIdx('recovery_index.json', all.filter(a => a.crid === 'REC-001' || /recovery/.test(a.path)));
  writeIdx('validation_index.json', all.filter(a => a.object_type === 'validation' || a.crid.startsWith('VAL-')));
  writeIdx('roadmap_index.json', all.filter(a => a.object_type === 'roadmap' || /roadmap\//.test(a.path)));
  writeIdx('knowledge_index.json', all); // EA-010 library = the full metadata view
  // ADR index from the log headings
  writeFileSync(join(INDEX_DIR, 'adr_index.json'), JSON.stringify({ ...gen, count: adrs.length, adrs: adrs.map(a => ({ crid: a.constitutional_id, title: a.title, path: a._path })) }, null, 2) + '\n');
  // dependency graph (edges = depends_on / governed_by / implements)
  const nodes = all.map(a => ({ crid: a.crid, title: a.title, layer: layerOf(a) }));
  const edges = [];
  for (const a of all) {
    for (const d of a.depends_on) edges.push({ from: a.crid, to: d, rel: 'depends_on' });
    for (const g of a.governed_by) edges.push({ from: a.crid, to: g, rel: 'governed_by' });
    for (const i of a.implements) edges.push({ from: a.crid, to: i, rel: 'implements' });
  }
  writeFileSync(join(INDEX_DIR, 'dependency_graph.json'), JSON.stringify({ ...gen, nodes, edges }, null, 2) + '\n');
  // repository inventory
  const inv = walk(ROOT).map(f => relative(REPO, f)).sort();
  writeFileSync(join(INDEX_DIR, 'repository_inventory.json'), JSON.stringify({ ...gen, markdown_files: inv.length, files: inv }, null, 2) + '\n');
  // Constitution v1.1 Foundation Manifest (the closed foundation set — STD-004 / ADR-010,011)
  const FOUNDATION = ['EA-000', 'MAP-001', 'STD-003', 'CBS-001', 'EA-010'];
  writeFileSync(join(INDEX_DIR, 'foundation_manifest.json'), JSON.stringify({
    ...gen, constitution_version: 'v1.1', principle: 'STD-004 Constitutional Stability Principle',
    decision: 'ADR-010, ADR-011', note: 'Closed foundation set; material change requires new EA version + ADR + Founder ratification + validation + backward traceability.',
    foundation_artifacts: FOUNDATION.map(c => { const a = all.find(x => x.crid === c); return a ? { crid: a.crid, title: a.title, lifecycle_state: a.lifecycle_state, path: a.path } : { crid: c, missing: true }; })
  }, null, 2) + '\n');
  return all;
}

function layerOf(a) {
  const id = a.crid;
  if (['EA-000', 'STD-002', 'CIX-001', 'MAP-001', 'REC-001'].includes(id)) return 0;
  if (['CON-001'].includes(id) || a.object_type === 'adr' || a.object_type === 'adr_log' || a.object_type === 'doctrine' || a.object_type === 'process' || id === 'CA-001' || (id.startsWith('STD-')) || a.crid.startsWith('EA-')) return 1;
  if (['EA-010', 'CKG-001', 'REG-CAP-001'].includes(id) || a.object_type === 'baseline' || a.object_type === 'validation') return 2;
  if (['EA-012', 'IMR-001', 'TM-001', 'CM-001'].includes(id) || a.object_type === 'model') return 3;
  if (['CK-001'].includes(id)) return 4;
  return 1;
}

function statusBlock(all, adrs) {
  const byState = {}, byType = {};
  for (const a of all) { byState[a.lifecycle_state] = (byState[a.lifecycle_state] || 0) + 1; byType[a.object_type] = (byType[a.object_type] || 0) + 1; }
  const proposed = all.filter(a => a.lifecycle_state === 'Proposed').map(a => a.crid);
  const lines = [];
  lines.push(`<!-- CBS-001 GENERATED: do not edit by hand; run \`node constitution/tools/cbs.mjs build\` -->`);
  lines.push(`- **Artifacts (with metadata):** ${all.length} · **ADRs:** ${adrs.length}`);
  lines.push(`- **By lifecycle:** ${Object.entries(byState).sort().map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  lines.push(`- **Outstanding Proposed:** ${proposed.join(', ') || 'none'}`);
  lines.push(`- **Ratification queue (Proposed/Architecture Draft):** ${all.filter(a => ['Proposed', 'Architecture Draft'].includes(a.lifecycle_state)).map(a => a.crid).join(', ') || 'none'}`);
  return lines.join('\n');
}

// ---- main ----
const cmd = process.argv[2] || 'check';
const { artifacts, noMeta } = loadArtifacts();
const adrs = parseAdrs();
const { errors, warnings } = validate(artifacts, adrs);

if (cmd === 'status') {
  const all = artifacts.map(a => ({ crid: a.constitutional_id, lifecycle_state: a.lifecycle_state, object_type: a.object_type }));
  console.log(statusBlock(all, adrs));
  process.exit(0);
}

console.log(`CBS-001: ${artifacts.length} artifacts with metadata, ${adrs.length} ADRs, ${noMeta.length} markdown files without front-matter.`);
if (warnings.length) { console.log('\nWARNINGS:'); warnings.forEach(w => console.log('  - ' + w)); }
if (errors.length) { console.log('\nERRORS:'); errors.forEach(e => console.log('  - ' + e)); }
if (noMeta.length) { console.log('\nNo front-matter (coverage gaps):'); noMeta.forEach(n => console.log('  - ' + n)); }

if (errors.length) { console.log('\nFAIL — fix errors before build.'); process.exit(1); }

if (cmd === 'build') {
  const all = build(artifacts, adrs);
  // coverage report
  writeFileSync(join(INDEX_DIR, 'metadata_coverage.json'), JSON.stringify({
    generated_by: 'CBS-001', generated_at: new Date().toISOString().slice(0, 10),
    artifacts_with_metadata: artifacts.length, adrs: adrs.length,
    markdown_without_frontmatter: noMeta, warnings
  }, null, 2) + '\n');
  console.log(`\nBUILD OK — wrote ${readdirSync(INDEX_DIR).length} files to constitution/index/. STATUS stats:\n`);
  console.log(statusBlock(all, adrs));
}
process.exit(0);
