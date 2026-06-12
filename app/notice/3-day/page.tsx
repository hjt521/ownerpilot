import type { Metadata } from 'next';
import { NoticeFlow } from '@/components/notice-flow';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: '3-Day Notice to Pay Rent or Quit | OwnerPilot AI',
  description:
    'Prepare a California 3-Day Notice to Pay Rent or Quit under broker supervision.',
};

export default function ThreeDayNoticePage() {
  return (
    <>
      <SiteHeader />
      <NoticeFlow />
    </>
  );
}
