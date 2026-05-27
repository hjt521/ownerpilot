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

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

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

          {/* Required disclaimer */}
          <p className="mt-3 text-center text-sm text-gray-500">
            OwnerPilot provides information, not legal advice. For active legal
            matters, we&apos;ll connect you with our California licensed attorney.
          </p>
        </div>
      </div>
    </main>
  )
}
