import type { Metadata } from 'next'
import { LandingVariant } from '@/components/landing-variant'

export const metadata: Metadata = {
  title: 'Urgent Help for California Property Owners | OwnerPilot AI',
  description:
    'Facing a tenant or property crisis in California? Get clear, AI-guided next steps backed by a licensed attorney and real estate broker.',
}

export default function CrisisLandingPage() {
  return <LandingVariant variantLabel="Crisis variant — Google Search" />
}
