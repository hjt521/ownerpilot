import type { Metadata } from 'next'
import { LandingVariant } from '@/components/landing-variant'

export const metadata: Metadata = {
  title: 'Inherited a California Property? Start Here | OwnerPilot AI',
  description:
    'Inherited a home or rental in California? OwnerPilot AI walks you through what to do next, prepared under California Licensed Real Estate Broker supervision.',
}

export default function InheritorLandingPage() {
  return <LandingVariant variantLabel="Inheritor variant — Facebook" />
}
