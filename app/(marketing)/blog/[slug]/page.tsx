// app/(marketing)/blog/[slug]/page.tsx — Marketing Tranche 1 slice 2. Dynamic blog route, flag-gated by the
// (marketing) layout. Statically generates the 12 known slugs; unknown slugs 404.
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BLOG_POSTS, blogPostBySlug } from '@/lib/marketing/blogPosts';
import { buildMarketingMetadata } from '@/lib/marketing/seo';
import { BlogArticle } from '@/components/marketing/BlogArticle';

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPostBySlug(slug);
  if (!post) return {};
  return buildMarketingMetadata({ title: post.title.slice(0, 60), description: post.description.slice(0, 155), path: `/blog/${post.slug}` });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPostBySlug(slug);
  if (!post) notFound();
  return <BlogArticle post={post} />;
}
