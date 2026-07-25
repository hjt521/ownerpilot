#!/usr/bin/env node
// constitution/tools/notion_sync.mjs
// One-way sync: constitution/index/artifact_index.json (CBS-001, GitHub canonical) -> the
// "OwnerPilot Constitutional Index" Notion database. Read-only against GitHub, write-only against
// Notion (create-or-update by CRID). Never the other direction: Notion is a mirror, per DOC-003 §1/§4.
//
// Usage: node constitution/tools/notion_sync.mjs
// Requires env NOTION_TOKEN (a Notion internal integration secret, shared with the target database).
// Optional env NOTION_DATABASE_ID to override the default below.
//
// Zero dependencies (Node 18+ global fetch). Run `node constitution/tools/cbs.mjs build` first so
// artifact_index.json reflects the current commit.

import { readFileSync } from 'node:fs';

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID || 'd9baacc2-4a9a-42b7-8e18-d136fcd134ec'; // OwnerPilot Constitutional Index
const NOTION_VERSION = '2022-06-28';
const REPO_BASE = 'https://github.com/hjt521/ownerpilot/blob/main/';

if (!NOTION_TOKEN) {
  console.error('notion_sync: NOTION_TOKEN is not set. Refusing to run (would fail auth anyway).');
  process.exit(1);
}

function category(path) {
  const seg = path.split('/')[1];
  const m = {
    adr: 'ADR', architecture: 'Architecture', audit: 'Audit', baseline: 'Baseline',
    database: 'Database', doctrines: 'Doctrine', enterprise: 'Enterprise', process: 'Process',
    recovery: 'Recovery', research: 'Research', roadmap: 'Roadmap', standards: 'Standards',
    tools: 'Tools', validation: 'Validation',
  };
  return m[seg] || 'Core';
}

function notionFetch(path, options = {}) {
  return fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  }).then(async (r) => {
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`Notion API ${r.status} on ${path}: ${JSON.stringify(body)}`);
    return body;
  });
}

async function fetchExistingPages() {
  const byCrid = new Map();
  let cursor;
  do {
    const body = await notionFetch(`/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      body: JSON.stringify({ page_size: 100, start_cursor: cursor }),
    });
    for (const page of body.results) {
      const titleProp = page.properties?.CRID?.title;
      const crid = titleProp?.[0]?.plain_text;
      if (crid) byCrid.set(crid, page.id);
    }
    cursor = body.has_more ? body.next_cursor : undefined;
  } while (cursor);
  return byCrid;
}

function buildProperties(a) {
  const text = (v) => [{ text: { content: (v || '-').slice(0, 2000) } }];
  return {
    CRID: { title: [{ text: { content: a.crid } }] },
    'Full Title': { rich_text: text(a.title) },
    Status: { select: { name: a.lifecycle_state } },
    Category: { select: { name: category(a.path) } },
    'Object Type': { select: { name: a.object_type } },
    'Canonical Owner': { select: { name: a.canonical_owner } },
    'Program Phase': { select: { name: a.program_phase || 'none' } },
    'GitHub Path': { url: REPO_BASE + a.path },
    'Depends On': { rich_text: text(a.depends_on.join(', ')) },
    'Required By': { rich_text: text(a.required_by.join(', ')) },
    'Related Artifacts': { rich_text: text(a.related_artifacts.join(', ')) },
    'Registry Tags': { rich_text: text(a.registry_tags.join(', ')) },
    'Last Synced': { date: { start: new Date().toISOString().slice(0, 10) } },
  };
}

async function main() {
  const index = JSON.parse(readFileSync('constitution/index/artifact_index.json', 'utf8'));
  const existing = await fetchExistingPages();
  let created = 0;
  let updated = 0;

  for (const a of index.artifacts) {
    const properties = buildProperties(a);
    const pageId = existing.get(a.crid);
    if (pageId) {
      await notionFetch(`/pages/${pageId}`, { method: 'PATCH', body: JSON.stringify({ properties }) });
      updated++;
    } else {
      await notionFetch('/pages', {
        method: 'POST',
        body: JSON.stringify({ parent: { database_id: DATABASE_ID }, properties }),
      });
      created++;
    }
  }

  console.log(`notion_sync: OK — ${index.artifacts.length} artifacts processed (${created} created, ${updated} updated).`);
}

main().catch((err) => {
  console.error('notion_sync: FAILED —', err.message);
  process.exit(1);
});
