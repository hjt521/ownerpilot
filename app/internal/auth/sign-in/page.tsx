import { notFound, redirect } from 'next/navigation'
import { currentAdmin } from '@/lib/admin/isAdmin'
import { currentPreviewAuthBoundary, PREVIEW_AUTH_SUCCESS_PATH } from '@/lib/auth/previewAdminAuth'
import { PreviewAdminSignInForm } from './PreviewAdminSignInForm'

export const dynamic = 'force-dynamic'

export default async function PreviewAdminSignInPage() {
  const boundary = currentPreviewAuthBoundary()
  if (!boundary.ok) notFound()

  const admin = await currentAdmin()
  if (admin.isAdmin) redirect(PREVIEW_AUTH_SUCCESS_PATH)

  return (
    <main className="min-h-screen bg-zinc-100 px-6 py-16 text-zinc-950">
      <section className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          OwnerPilot Internal Preview
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Administrator sign in</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-700">
          Restricted to Founder-approved administrators in the dedicated non-Production Preview authentication tenant.
        </p>
        <PreviewAdminSignInForm />
      </section>
    </main>
  )
}
