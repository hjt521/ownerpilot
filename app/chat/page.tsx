'use client'

import { useEffect, useRef, useState } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const GREETING: Message = {
  role: 'assistant',
  content:
    "Hi — I'm OwnerPilot. I help California property owners think through the tricky stuff. What's going on?",
}

// Best-effort mirror of the prompt's DISCLAIMER TRIGGER. Re-expands the standing
// disclosure when a message looks attorney-scope. Over-inclusion is harmless (it
// just re-shows the disclosure); under-inclusion is the risk we avoid. This is a
// keyword heuristic, NOT a classifier — see the note to the attorney.
const ATTORNEY_SCOPE_PATTERN =
  /\b(sued?|suing|lawsuit|litigation|summons|subpoena|served|court\s*date|unlawful\s*detainer|evict|fair\s*housing|discriminat|harass|retaliat|criminal|bankruptc|personal\s*injury|injured|FEHA|attorney|lawyer)\b/i

function looksAttorneyScope(text: string): boolean {
  return ATTORNEY_SCOPE_PATTERN.test(text)
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  // Q5 standing disclosure: open on session entry, collapsible to a one-line
  // form (never to zero), and auto-re-expanded once on the first attorney-scope
  // message of the session.
  const [disclosureOpen, setDisclosureOpen] = useState(true)
  const [disclosureAutoReExpanded, setDisclosureAutoReExpanded] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  // Keep the latest message in view as the conversation grows / streams.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return

    // Mirror the prompt's DISCLAIMER TRIGGER: surface the standing disclosure
    // again on the first attorney-scope message of the session.
    if (!disclosureAutoReExpanded && looksAttorneyScope(text)) {
      setDisclosureOpen(true)
      setDisclosureAutoReExpanded(true)
    }

    const userMessage: Message = { role: 'user', content: text }
    const history = [...messages, userMessage]

    // Add the user turn plus an empty assistant turn we'll stream into.
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setIsStreaming(true)

    try {
      // Drop the on-load greeting: the Anthropic API requires the first
      // message to be from the user.
      const apiMessages = history.slice(1)

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (!res.ok || !res.body) {
        throw new Error('The request failed. Please try again.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: acc }
          return next
        })
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = {
          role: 'assistant',
          content:
            "Sorry — I couldn't get a response just now. Please try sending that again.",
        }
        return next
      })
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <main className="flex flex-1 flex-col bg-white text-gray-900">
      {/* Q5 standing disclosure — persistent, above the fold, collapsible to a
          one-line form but never to zero. Wording per attorney ruling 2026-06-02;
          do not shorten past the three required elements. */}
      <div className="border-b border-gray-200 bg-blue-50">
        <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
          {disclosureOpen ? (
            <div className="flex items-start gap-3">
              <p className="flex-1 text-sm leading-relaxed text-gray-700">
                <strong className="font-semibold text-gray-900">
                  OwnerPilot is an AI tool, not a lawyer.
                </strong>{' '}
                It provides general information from a California-licensed real
                estate broker. It is not legal advice. For legal advice about your
                situation, you choose and engage your own California-licensed
                attorney directly.{' '}
                <a
                  href="/our-approach"
                  className="font-medium text-blue-700 underline hover:text-blue-800"
                >
                  Learn more →
                </a>
              </p>
              <button
                type="button"
                onClick={() => setDisclosureOpen(false)}
                aria-label="Dismiss disclosure"
                title="Dismiss"
                className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setDisclosureOpen(true)}
              className="flex w-full items-center justify-center gap-1.5 text-sm text-gray-600 hover:text-gray-800"
              aria-label="Show full disclosure"
            >
              <strong className="font-semibold text-gray-800">
                AI tool, not a lawyer
              </strong>
              <span className="text-gray-500">— more</span>
            </button>
          )}
        </div>
      </div>

      {/* Message history */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === 'user' ? 'flex justify-end' : 'flex justify-start'
              }
            >
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] whitespace-pre-wrap rounded-2xl bg-blue-700 px-5 py-3 text-lg leading-relaxed text-white'
                    : 'max-w-[85%] whitespace-pre-wrap rounded-2xl bg-gray-100 px-5 py-3 text-lg leading-relaxed text-gray-900'
                }
              >
                {m.content ||
                  (isStreaming && i === messages.length - 1 ? (
                    <span className="text-gray-400">Thinking…</span>
                  ) : (
                    ''
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
          <form onSubmit={sendMessage} className="flex items-end gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              aria-label="Type your question"
              disabled={isStreaming}
              className="min-h-[48px] flex-1 rounded-lg border border-gray-300 px-4 text-lg text-gray-900 placeholder:text-gray-400 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700 disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={isStreaming || input.trim() === ''}
              className="min-h-[48px] rounded-lg bg-blue-700 px-6 text-lg font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isStreaming ? 'Sending…' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
