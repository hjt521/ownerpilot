// components/marketing/BlogArticle.tsx
// Marketing Tranche 1 slice 2 — renders one blog post from data (Article + FAQPage JSON-LD, one <h1>, sectioned
// <h2>s, FAQ, CTA "Ask OwnerPilot AI first" → /chat). Server component. Sitewide disclaimer + broker line come
// from MarketingFooter (route-group layout), so they are identical everywhere by construction.

import { CtaLink } from '@/components/marketing/CtaLink';
import { JsonLd } from '@/components/marketing/JsonLd';
import { articleJsonLd, faqPageJsonLd } from '@/lib/marketing/seo';
import type { BlogPost } from '@/lib/marketing/blogPosts';

export function BlogArticle({ post }: { post: BlogPost }) {
  const path = `/blog/${post.slug}`;
  return (
    <>
      <JsonLd data={articleJsonLd({ headline: post.title, description: post.description, path })} />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <a href="/blog" className="mb-8 inline-flex min-h-[48px] items-center text-base font-medium text-neutral-700 hover:text-neutral-900">
          ← All articles
        </a>

        <header className="mb-8">
          <h1 className="font-serif text-3xl font-bold leading-tight text-neutral-900 md:text-4xl">{post.title}</h1>
          <div className="mt-4 space-y-4">
            {post.intro.map((p, i) => (
              <p key={i} className="text-lg leading-relaxed text-neutral-700">{p}</p>
            ))}
          </div>
        </header>

        {post.sections.map((s) => (
          <section key={s.heading} className="mt-8">
            <h2 className="font-serif text-2xl font-semibold text-neutral-900">{s.heading}</h2>
            <div className="mt-3 space-y-4">
              {s.body.map((p, i) => (
                <p key={i} className="text-base leading-relaxed text-neutral-700">{p}</p>
              ))}
            </div>
          </section>
        ))}

        {post.faqs.length > 0 && (
          <section className="mt-10" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="font-serif text-2xl font-semibold text-neutral-900">Frequently asked questions</h2>
            <dl className="mt-4 space-y-6">
              {post.faqs.map((f) => (
                <div key={f.q}>
                  <dt className="text-lg font-semibold text-neutral-900">{f.q}</dt>
                  <dd className="mt-2 text-base leading-relaxed text-neutral-700">{f.a}</dd>
                </div>
              ))}
            </dl>
            <JsonLd data={faqPageJsonLd(post.faqs.map((f) => ({ q: f.q, a: f.a })))} />
          </section>
        )}

        <div className="mt-12 rounded-lg border border-neutral-200 bg-white p-6">
          <p className="text-lg font-semibold text-neutral-900">Ask OwnerPilot AI first.</p>
          <p className="mt-2 text-base leading-relaxed text-neutral-700">
            Talk through your situation in plain English and let the broker-supervised workflow guide the next step.
          </p>
          <div className="mt-4">
            <CtaLink href="/chat" ctaSlug="blog_cta" sectionId="article-cta" variant="primary">
              Ask OwnerPilot AI
            </CtaLink>
          </div>
        </div>
      </main>
    </>
  );
}
