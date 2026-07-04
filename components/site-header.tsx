import Link from 'next/link';

/** Shared site header — R1a design system (Concept #1). */
export function SiteHeader() {
  return (
    <header className="border-b border-rule bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ownerpilot-mark.svg" alt="OwnerPilot.AI" className="h-9 w-auto" />
          <span className="font-serif text-xl font-bold text-brand">
            OwnerPilot<span className="text-gold">.AI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="/notice/3-day" className="text-ink transition-colors hover:text-brand">
            3-Day Notice
          </Link>
          <Link href="/our-approach" className="text-ink transition-colors hover:text-brand">
            Our Approach
          </Link>
          <Link href="/chat" className="text-ink transition-colors hover:text-brand">
            Ask OwnerPilot
          </Link>
        </nav>
      </div>
    </header>
  );
}
