import Link from 'next/link'
import { notFound } from 'next/navigation'
import { currentAdmin } from '@/lib/admin/isAdmin'
import { currentPreviewAuthBoundary } from '@/lib/auth/previewAdminAuth'

export const dynamic = 'force-dynamic'

export default async function PreviewAdminPage() {
  const boundary = currentPreviewAuthBoundary()
  if (!boundary.ok) notFound()

  const admin = await currentAdmin()
  if (!admin.isAdmin) notFound()

  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-16 text-zinc-950">
      <section className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          OwnerPilot Internal Preview
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Administrator backend</h1>
        <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 p-4">
            <dt className="font-medium text-zinc-500">Environment</dt>
            <dd className="mt-1 font-semibold">Preview only</dd>
          </div>
          <div className="rounded-lg border border-zinc-200 p-4">
            <dt className="font-medium text-zinc-500">Authentication tenant</dt>
            <dd className="mt-1 font-semibold">Dedicated non-Production</dd>
          </div>
        </dl>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/internal/executive-agents/preview"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Open CAO Preview
          </Link>
          <form action="/api/internal/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
