import type { Metadata } from 'next'
import { LandingVariant } from '@/components/landing-variant'

export const metadata: Metadata = {
  title: 'Run Your California Rentals Like a Business | OwnerPilot AI',
  description:
    'Manage your California property portfolio with confidence. OwnerPilot AI is backed by a licensed attorney and real estate broker.',
}

export default function BusinessLandingPage() {
  return <LandingVariant variantLabel="Business variant — Email" />
}
