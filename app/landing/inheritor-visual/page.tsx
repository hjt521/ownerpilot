import type { Metadata } from 'next'
import { LandingVariant } from '@/components/landing-variant'

export const metadata: Metadata = {
  title: 'Just Inherited Property? We Make It Simple | OwnerPilot AI',
  description:
    'Inherited California property and not sure where to begin? OwnerPilot AI gives you a clear plan, prepared under California Licensed Real Estate Broker supervision.',
}

export default function InheritorVisualLandingPage() {
  return <LandingVariant variantLabel="Inheritor (visual) variant — Instagram" />
}
