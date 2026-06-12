import type { Metadata } from 'next'
import { LandingVariant } from '@/components/landing-variant'

export const metadata: Metadata = {
  title: 'Run Your California Rentals Like a Business | OwnerPilot AI',
  description:
    'Manage your California property portfolio with confidence. OwnerPilot AI is prepared under California Licensed Real Estate Broker supervision.',
}

export default function BusinessLandingPage() {
  return <LandingVariant variantLabel="Business variant — Email" />
}
