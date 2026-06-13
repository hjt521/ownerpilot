import type { Metadata } from 'next';
import { ServeTrack } from '@/components/serve-track';
import { SiteHeader } from '@/components/site-header';
export const metadata: Metadata = {
  title: 'Serve & Track | OwnerPilot AI',
  description:
    'Track service attempts and complete the proof of service for your California 3-day notice.',
};
export default function ServeTrackPage() {
  return (
    <>
      <SiteHeader />
      <ServeTrack />
    </>
  );
}
