import Link from 'next/link'

const TAGLINE = 'The AI Advantage for California Property Owners'
const TRUST_BAR =
  'Backed by a California Licensed Attorney + California Licensed Real Estate Broker'

type LandingVariantProps = {
  /** Which persona/channel this page serves, e.g. "Crisis variant — Google Search". */
  variantLabel: string
}

/**
 * Shared placeholder shell for the UTM landing variants. Each route under
 * app/landing/* renders this with its own label. Built to the OwnerPilot design
 * rules: 16px+ text, 48px tap target, one primary CTA, trust bar above the fold.
 */
export function LandingVariant({ variantLabel }: LandingVariantProps) {
  return (
    <main className="flex min-h-screen flex-col bg-white text-gray-900">
      {/* Trust bar — kept above the fold on every page (non-negotiable). */}
      <div className="bg-blue-900 px-4 py-3 text-center text-base font-medium text-white">
        {TRUST_BAR}
      </div>

      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <p className="text-lg font-semibold uppercase tracking-wide text-blue-700">
          OwnerPilot AI
        </p>

        <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
          {TAGLINE}
        </h1>

        <span className="rounded-full bg-gray-100 px-4 py-2 text-base text-gray-700">
          {variantLabel}
        </span>

        <Link
          href="/signup"
          className="mt-4 flex min-h-[48px] items-center justify-center rounded-lg bg-blue-700 px-8 text-lg font-semibold text-white transition-colors hover:bg-blue-800"
        >
          Get started free
        </Link>
      </section>

      <footer className="border-t border-gray-200 px-6 py-8 text-center">
        <Link
          href="/our-approach"
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          About Our Approach → How we keep attorney services separate
        </Link>
        <p className="mt-3 text-xs text-gray-600">
          OwnerPilot AI is not a law firm and does not provide legal advice. For legal matters, consult a California licensed attorney of your choosing.
        </p>
      </footer>
    </main>
  )
}
