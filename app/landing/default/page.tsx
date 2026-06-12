// v2
import type { Metadata } from 'next'
import { LandingVariant } from '@/components/landing-variant'

export const metadata: Metadata = {
  title: 'The AI Advantage for California Property Owners | OwnerPilot AI',
  description:
    'Clear, AI-guided answers for California property owners, prepared under California Licensed Real Estate Broker supervision.',
}

export default function DefaultLandingPage() {
  return <LandingVariant variantLabel="Default variant — Organic / Direct" />
}
