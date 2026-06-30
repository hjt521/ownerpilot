// app/riskpath/courtesy-reminder/page.tsx — Courtesy Reminder builder (master prompt §I; claimed-only).
// record id via ?record=. Per-tone copy is RATIFIED locked-prose (COURTESY_REMINDER_{FRIENDLY,FIRM,FORMAL,DISCLAIMER}_V1
// in the shape-B assembly manifest) per deploy_readiness_capstone_acceptance_and_external_inputs_broker_ruling_2026-06-29.md §2.

import { SiteHeader } from '@/components/site-header';
import { CourtesyReminderBuilder } from '@/components/riskpath/CourtesyReminderBuilder';

export const metadata = { title: 'Courtesy reminder — OwnerPilot AI', robots: { index: false } };

export default function CourtesyReminderPage({ searchParams }: { searchParams: { record?: string } }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <CourtesyReminderBuilder riskpathRecordId={searchParams.record ?? ''} />
    </div>
  );
}
