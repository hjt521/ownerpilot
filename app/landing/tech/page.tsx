import type { Metadata } from 'next'
import { LandingVariant } from '@/components/landing-variant'

export const metadata: Metadata = {
  title: 'Smarter California Property Ownership | OwnerPilot AI',
  description:
    'Data-driven guidance for California property owners. OwnerPilot AI pairs AI with California Licensed Real Estate Broker supervision.',
}

export default function TechLandingPage() {
  return <LandingVariant variantLabel="Tech variant — LinkedIn" />
}
