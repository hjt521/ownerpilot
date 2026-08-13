import type { Metadata } from 'next';
import { FilingReadiness } from '@/components/filing-readiness';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Filing Readiness | OwnerPilot AI',
  description:
    'Review the deterministic preparation prerequisites OwnerPilot currently has for the next separately governed filing-packet review step.',
};

export default function FilingReadinessPage() {
  return (
    <>
      <SiteHeader />
      <FilingReadiness />
    </>
  );
}
