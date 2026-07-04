// components/marketing/Hero.tsx
// Lane 8 Surface 1 — homepage hero. Headline/subhead/CTA are locked-prose (HERO_* manifest entries).
// Secondary link label is non-locked marketing copy (Surface 1).

import { lockedProse } from '@/lib/compliance/lockedProse';

// LockedKey: HERO_HEADLINE
// LockedKey: HERO_SUBHEAD
// LockedKey: HERO_CTA

export function Hero() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 text-center">
      <h1 className="text-3xl font-semibold sm:text-4xl">{lockedProse('HERO_HEADLINE')}</h1>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-neutral-700 sm:text-lg">
        {lockedProse('HERO_SUBHEAD')}
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <a href="/chat" className="min-h-[48px] rounded-md bg-neutral-900 px-6 py-3 text-white">
          {lockedProse('HERO_CTA')}
        </a>
        <a href="#how-it-works" className="min-h-[48px] py-2 text-sm underline">
          See how it works
        </a>
      </div>
      {/* Lane 8 Fork 2 ruling: hero is an ABSTRACT editorial illustration (not a real /chat screenshot).
          Canva-generated per the ratified `hero_chat_first_flow` prompt — warm California palette, phone +
          chat bubbles, no people, no legible text. Decorative only (alt=""), so it adds no copy claims. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hero_chat_first_flow.jpg"
        alt=""
        className="mx-auto mt-12 w-full max-w-2xl rounded-xl"
      />
    </section>
  );
}
