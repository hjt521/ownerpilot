import Link from 'next/link'
import { notFound } from 'next/navigation'
import { currentPreviewAuthBoundary } from '@/lib/auth/previewAdminAuth'

export const dynamic = 'force-dynamic'

export default function PreviewAuthErrorPage() {
  const boundary = currentPreviewAuthBoundary()
  if (!boundary.ok) notFound()

  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-16 text-zinc-950">
      <section className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          OwnerPilot Internal Preview
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Authentication unavailable</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-700">
          The authentication attempt could not be completed. No account, allowlist, or provider details are available from this page.
        </p>
        <Link
          href="/internal/auth/sign-in"
          className="mt-6 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Return to sign in
        </Link>
      </section>
    </main>
  )
}
