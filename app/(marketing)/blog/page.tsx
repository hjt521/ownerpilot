// app/(marketing)/blog/page.tsx — Marketing Tranche 1 slice 2. Blog index, flag-gated by the (marketing) layout.
import Link from 'next/link';
import { BLOG_POSTS } from '@/lib/marketing/blogPosts';
import { buildMarketingMetadata } from '@/lib/marketing/seo';

export const metadata = buildMarketingMetadata({
  title: 'OwnerPilot AI Blog — California Property Owners',
  description: 'Plain-English workflow education for California property owners: 3-day notices, service tracking, recordkeeping, and next steps.',
  path: '/blog',
});

export default function BlogIndexPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <a href="/" className="mb-8 inline-flex min-h-[48px] items-center text-base font-medium text-neutral-700 hover:text-neutral-900">
        ← Back to home
      </a>
      <h1 className="font-serif text-3xl font-bold leading-tight text-neutral-900 md:text-4xl">OwnerPilot AI Blog</h1>
      <p className="mt-4 text-lg leading-relaxed text-neutral-700">
        Plain-English workflow education for California property owners. Not legal advice.
      </p>
      <ul className="mt-10 space-y-6">
        {BLOG_POSTS.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`} className="inline-flex min-h-[48px] items-center font-serif text-xl font-semibold text-neutral-900 underline hover:text-neutral-700">
              {p.title}
            </Link>
            <p className="mt-1 text-base leading-relaxed text-neutral-600">{p.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
