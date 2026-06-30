-- 028_privacy_requests.sql
-- Lane 6 / open_items_consolidated_broker_ruling §4 — CCPA/CPRA privacy-request intake + suppression registry.
-- RLS: broker-only via service role; NO public read. Submissions land via /api/privacy-request (service-role insert).
-- Numbering: 028 = next global slot after 027_automation_mirror_queue (cross-branch; reconcile to unique at merge).
-- NOT authorized (ruling §4): public read, self-service status UI, Notion mirroring of these rows, 3rd-party imports.

create table privacy_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('know','delete','correct','opt_out','limit_sensitive')),
  contact_email text not null,
  submitted_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  responded_at timestamptz,
  status text not null default 'received'
    check (status in ('received','acknowledged','in_review','responded','closed')),
  notes jsonb not null default '{}'::jsonb,                 -- free-text scrubbed by mirrorScrubber/scanFreeText before write
  requester_authorization_uploaded boolean not null default false,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected'))
);

create index privacy_requests_status_idx on privacy_requests (status);
create index privacy_requests_pending_ack_idx on privacy_requests (submitted_at) where acknowledged_at is null;

alter table privacy_requests enable row level security;
create policy privacy_requests_service_role on privacy_requests
  for all to service_role using (true) with check (true);
-- NO public/anon policy. Broker reads via Supabase Studio only (ruling §4).

-- Analytics suppression registry — HASH-keyed (never raw email). Written on opt_out (ruling §4.4).
create table analytics_suppression_list (
  email_hash text primary key,        -- sha256(lowercased email); raw email lives only in privacy_requests
  created_at timestamptz not null default now(),
  source text not null default 'privacy_request_opt_out'
);

alter table analytics_suppression_list enable row level security;
create policy analytics_suppression_service_role on analytics_suppression_list
  for all to service_role using (true) with check (true);
