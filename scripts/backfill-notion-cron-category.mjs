#!/usr/bin/env node
// scripts/backfill-notion-cron-category.mjs
// Lane 7 Automation §P — one-time idempotent backfill of the new `Cron Category` Notion field.
// Byte-exact from master prompt §7. Run once after deploy: node scripts/backfill-notion-cron-category.mjs

import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_AUTOMATION_DB_ID;

const CATEGORY_MAP = {
  'CA 3-day notice statute watch': 'external_source_watch',
  'LAHD forms refresh': 'external_source_watch',
  'LA RTC packet refresh': 'external_source_watch',
  'Statewide rent-control jurisdictions watch': 'external_source_watch',
  'Judicial holiday table verification': 'external_source_watch',
  'LA City ZIP authority refresh': 'in_app_health',
  'ZIMAS endpoint health probe': 'in_app_health',
  'Locked-prose CI guard': 'in_app_health',
  'Geocode audit-log integrity check': 'in_app_health',
  'Decision 2 broker-confirm SLA cron': 'decision2_ops',
  'Decision 2 broker-confirm email purge sweep': 'decision2_ops',
};

let cursor;
do {
  const res = await notion.databases.query({ database_id: DB_ID, start_cursor: cursor });
  for (const page of res.results) {
    const cronName = page.properties?.Cron?.select?.name;
    const category = CATEGORY_MAP[cronName];
    const existing = page.properties?.['Cron Category']?.select?.name;
    if (category && !existing) {
      await notion.pages.update({
        page_id: page.id,
        properties: { 'Cron Category': { select: { name: category } } },
      });
      console.log(`Backfilled ${cronName} → ${category}`);
    }
  }
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);
