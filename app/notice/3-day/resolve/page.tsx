import type { Metadata } from 'next';
import { ResolveRecord } from '@/components/resolve-record';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Resolve & Record | OwnerPilot AI',
  description:
    'Record factual post-service outcomes for the exact created California 3-day notice and completed service record on this browser.',
};

export default function ResolveRecordPage() {
  return (
    <>
      <SiteHeader />
      <ResolveRecord />
    </>
  );
}
