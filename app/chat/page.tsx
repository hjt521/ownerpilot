// app/chat/page.tsx — AI-first chat entry point (master prompt §C route /chat).
// Below-input trust line per Lane 8 Surface 10; the conversational surface is the client component.

import { SiteHeader } from '@/components/site-header';
import { ChatSurface } from '@/components/chat/ChatSurface';

export const metadata = { title: '3-Day Notice — OwnerPilot AI' };

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <ChatSurface />
      <p className="px-4 pb-3 text-center text-xs text-neutral-400">
        California broker-supervised. CalDRE B9445457. Not a law firm.
      </p>
    </div>
  );
}
