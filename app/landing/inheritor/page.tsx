import type { Metadata } from 'next'
import { LandingVariant } from '@/components/landing-variant'

export const metadata: Metadata = {
  title: 'California 3-Day Notice Tool + Service Tracking | OwnerPilot AI',
  description:
    'Create a broker-prepared California 3-Day Notice, separate tenant and owner copies, track service attempts, complete proof of service, and resume next steps with RiskPath™ Follow-Up.',
}

export default function InheritorLandingPage() {
  return <LandingVariant variantLabel="Inheritor variant — Facebook" />
}
