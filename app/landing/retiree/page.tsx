import type { Metadata } from 'next'
import { LandingVariant } from '@/components/landing-variant'

export const metadata: Metadata = {
  title: 'Stress-Free Property Management for Retirees | OwnerPilot AI',
  description:
    'Own California rental property in retirement? OwnerPilot AI gives you clear answers, prepared under California Licensed Real Estate Broker supervision.',
}

export default function RetireeLandingPage() {
  return <LandingVariant variantLabel="Retiree variant — Facebook" />
}
