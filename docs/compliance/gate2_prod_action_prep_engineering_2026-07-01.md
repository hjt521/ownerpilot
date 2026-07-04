# Gate-2 Prod-Action Prep (engineering → broker) — drafts for broker execution

**Re:** `gate2_closure_errata_and_boundary_restoration_broker_ruling_2026-07-01.md` §2.5.
**Posture:** Drafts-for-broker-execution only (per §4.13, engineering does NOT execute prod migrations, branch-protection, or Vercel prod). No secrets here — file paths, SQL, and `gh` commands are all non-secret; they run under the broker's own authenticated `gh`/Supabase session. Engineering executes Preview-side only, after the §5-step-1 signal.
**Filed:** 2026-07-01

---

## §0 — Reconciliation first (blocks everything downstream, per errata §1.1)

The helper's expected list currently has **18** entries, ending in `verify-review-produce-parity` (landed in PR #121). Whether GitHub's *actual* Required set matches is unknown — that's the reconciliation.

**Broker GET (authoritative pre-daycount state):**
```bash
gh api repos/hjt521/ownerpilot/branches/main/protection --jq '.required_status_checks.contexts'
# newer shape, if contexts is empty:
gh api repos/hjt521/ownerpilot/branches/main/protection --jq '.required_status_checks.checks'
```
Interpretation:
- If the output **contains** `verify-review-produce-parity` → pre-daycount baseline = **18**; post-daycount = **19**.
- If it does **not** → the helper is drifted (§1.2 defect): it expects a check that isn't Required. Broker's choice (errata §1.2): either add `verify-review-produce-parity` to Required too, or drop it from the helper's `EXPECTED`. I've prepared both helper edits below (§4) so whichever you pick is a ready diff.

## §1 — Migrations (broker: apply preview → verify → prod → verify, per §2.4 steps 3–5)

All three are additive + idempotent (`if not exists`) with non-destructive rollback in each file header. Apply in order.

### 034 — `supabase/migrations/034_riskpath_produce_audit.sql`
```sql
alter table public.riskpath_records
  add column if not exists produce_audit jsonb;
```
Verify (expect 1 row):
```sql
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='riskpath_records' and column_name='produce_audit';
```

### 035 — `supabase/migrations/035_staleness_guard.sql`
Adds `produce_snapshot` column **and** the `staleness_acknowledgments` table (+ index + RLS + owner-read policy). Full up-block:
```sql
alter table public.riskpath_records
  add column if not exists produce_snapshot jsonb;

create table if not exists public.staleness_acknowledgments (
  id                uuid primary key default gen_random_uuid(),
  riskpath_id       uuid not null references public.riskpath_records(id) on delete cascade,
  chat_session_id   uuid references public.chat_sessions(id) on delete set null,
  acknowledged_at   timestamptz not null default now(),
  staleness_reason  text not null,
  changed_fields    jsonb not null default '[]'::jsonb,
  action_taken      text not null,
  created_at        timestamptz not null default now()
);
create index staleness_acks_riskpath_idx on public.staleness_acknowledgments (riskpath_id);
alter table public.staleness_acknowledgments enable row level security;
create policy staleness_acks_owner_read on public.staleness_acknowledgments
  for select using (
    exists (select 1 from public.riskpath_records r
            where r.id = staleness_acknowledgments.riskpath_id and r.user_id = auth.uid())
  );
```
Verify (expect: `produce_snapshot` column present AND table present AND rowsecurity = t):
```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='riskpath_records' and column_name='produce_snapshot';
select table_name from information_schema.tables
where table_schema='public' and table_name='staleness_acknowledgments';
select relrowsecurity from pg_class where relname='staleness_acknowledgments';
```

### 036 — `supabase/migrations/036_lahd_filing_records.sql`
Adds the `lahd_filing_records` table (+ index + RLS + owner-read policy). Full up-block:
```sql
create table if not exists public.lahd_filing_records (
  id                   uuid primary key default gen_random_uuid(),
  riskpath_id          uuid not null references public.riskpath_records(id) on delete cascade,
  chat_session_id      uuid references public.chat_sessions(id) on delete set null,
  filed_at             timestamptz not null default now(),
  filing_date          date not null,
  filing_channel       text not null,
  cover_sheet_revision text,
  created_at           timestamptz not null default now()
);
create index lahd_filing_records_riskpath_idx on public.lahd_filing_records (riskpath_id);
alter table public.lahd_filing_records enable row level security;
create policy lahd_filing_records_owner_read on public.lahd_filing_records
  for select using (
    exists (select 1 from public.riskpath_records r
            where r.id = lahd_filing_records.riskpath_id and r.user_id = auth.uid())
  );
```
Verify (expect 1 row):
```sql
select table_name from information_schema.tables
where table_schema='public' and table_name='lahd_filing_records';
```

## §2 — Prod schema inventory (broker: §2.4 step 6 — P2 evidence for the closure artifact)
```sql
-- New tables from 035/036:
select table_name from information_schema.tables
where table_schema='public' and table_name in ('staleness_acknowledgments','lahd_filing_records')
order by table_name;
-- New columns from 034/035 on riskpath_records:
select column_name from information_schema.columns
where table_schema='public' and table_name='riskpath_records'
  and column_name in ('produce_audit','produce_snapshot')
order by column_name;
```
Expected: two tables + two columns. Paste output into the closure artifact P2 fill.

## §3 — Branch-protection PATCH (broker: §2.4 step 7, AFTER the §0 baseline is authoritative)

The daycount workflow's check **context = `synthetic-daycount-jul2026`** (the job id; workflow file `daycount-synthetic.yml`, job `synthetic-daycount-jul2026`). Confirm the exact string GitHub reports:
```bash
gh api repos/hjt521/ownerpilot/commits/main/check-runs --jq '.check_runs[].name' | sort -u | grep -i daycount
```
Append it to Required (classic contexts sub-endpoint — append-only, no need to re-send the whole protection object):
```bash
gh api --method POST repos/hjt521/ownerpilot/branches/main/protection/required_status_checks/contexts \
  -f 'contexts[]=synthetic-daycount-jul2026'
```
Returns the full updated contexts list — archive it for the baseline-correction addendum.

## §4 — Helper edits (repo change; hand to engineering as a git block once §0 decides the baseline)

The helper's `EXPECTED` must match GitHub reality post-PATCH (errata §1.2). Two prepared diffs — pick per §0:

**(a) If `verify-review-produce-parity` IS Required (→ target 19):** add only the daycount check:
```
// in scripts/verify-branch-protection.mjs EXPECTED, after 'verify-review-produce-parity':
  'verify-review-produce-parity',
+ 'synthetic-daycount-jul2026',
```
…and bump the header comments 18 → 19.

**(b) If `verify-review-produce-parity` is NOT Required (helper drifted):** broker either PATCHes it on (then use (a)), or drops it from the helper. To drop:
```
- 'verify-review-produce-parity',
```
…leaving 17, then add daycount → 18.

I'll turn whichever you choose into a committed helper edit + git block on your signal.

## §5 — Pre-run sanity checks (broker can run these in prod; engineering runs them in Preview)
- `select count(*) from information_schema.tables where table_schema='public';` before/after the three migrations — expect +2 (staleness_acknowledgments, lahd_filing_records).
- Confirm no existing rows are touched: 034/035 add nullable columns (existing rows get NULL); 035/036 create new tables (no writes to existing tables). Zero-row-mutation on `riskpath_records` beyond the DDL.
- After migrations, hit `GET /api/riskpath` on Preview (claimed session) → should return `records[].staleness` + `records[].lahd` without error (proves the columns/tables resolve at runtime).

## §6 — What engineering does next (errata §5)
1. Handed off: this prep (§§0–5).
2. Waiting on broker signal files: `branch_protection_actual_baseline_2026-07-01.md`, `gate2_baseline_correction_addendum_broker_ruling_2026-07-01.md`, `gate2_prerequisites_complete_broker_signal_2026-07-01.md`.
3. On the prerequisites-complete signal: execute the Preview-side runbook (step 0 advisor baseline → P1–P5 → §4.1–§4.4 walk → ordered teardown), capture the evidence packet, hand back per amendment §5.4.

— Engineering · prep-for-broker-execution · 2026-07-01
