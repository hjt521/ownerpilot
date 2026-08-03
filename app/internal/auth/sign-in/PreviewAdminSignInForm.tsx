'use client'

import { FormEvent, useState } from 'react'

const NEUTRAL_MESSAGE =
  'If this address is eligible, authentication instructions will be sent.'

export function PreviewAdminSignInForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      await fetch('/api/internal/auth/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        cache: 'no-store',
      })
    } finally {
      setMessage(NEUTRAL_MESSAGE)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-800">
          Approved administrator email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Send authentication instructions'}
      </button>
      {message ? (
        <p role="status" className="text-sm text-zinc-700">
          {message}
        </p>
      ) : null}
    </form>
  )
}
