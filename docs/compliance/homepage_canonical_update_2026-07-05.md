# Homepage Canonical Update — AI-first — 2026-07-05

**From:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457. **Build:** Engineering (Claude).

## Direction
The canonical served homepage (`landing-variant.tsx`, reached via `proxy.ts` `/` → `/landing/default`) repositions from a 3-Day-Notice generator to an **AI-first, broker-operated workflow system**. Lead: **"Ask OwnerPilot AI first."** Story: Ask AI → Generate Notice → Serve & Track → Resolve & Document → RiskPath Records.

## Routing (unchanged, per ruling)
- Root `/` still rewrites to `/landing/default`; `landing-variant.tsx` stays canonical; UTM/landing infrastructure preserved.
- `app/page.tsx` NOT repointed; its illustration sections harvested into `components/marketing/HomepageIllustrations.tsx` (consumed by the landing variant). `app/page.tsx` reduction/removal = follow-up.

## What shipped (this PR)
- Hero: "Ask OwnerPilot AI first." + eyebrow "Built for California property owners" + AI-first subhead; primary CTA **Ask OwnerPilot AI** (`/chat`), secondary **Start 3-Day Notice**. Functional product preview kept (not the abstract illustration).
- Workflow strip → 5 steps (Ask AI, Generate Notice, Serve & Track, Resolve & Document, RiskPath Records).
- "Ask OwnerPilot AI" section surfaced high (after the workflow strip) with 5 suggested prompts.
- Option-B illustration accents (AI-flow band w/ CTA, jurisdiction band w/ status card, resolve-document band w/ RiskPath helper).
- After-notice section retitled "Everything you need after the notice is created"; checklist adds Photo Proof of Posting, Resolve & Document, RiskPath Follow-Up.
- New **Serve & Track / Photo Proof of Posting** section (status pill **Timestamped**, never "Verified").
- New **Resolve & Document** product lane (Record Payment, Create Payment Plan, Create Move-Out Agreement, Record Surrender) + disclaimer.
- Bottom CTA: "Start with a question. Keep every next step organized." + dual CTAs.
- Header CTA → **Ask OwnerPilot AI**; logo swapped to SVG mark.
- **Sitewide footer disclaimer** updated verbatim + `California Licensed Real Estate Broker · CalDRE B9445457`.

## Copy audit
No banned terms (legally compliant / court-ready / enforceable / guarantee(d) / future-proof / AI lawyer / Verified / refers to counsel). CI banned-terms + attribution + locked-prose all PASS. tsc clean.

## Ship timing
§2.2 freeze applies — this changes the live homepage. **Build in preview; do NOT merge to production** until env checks pass, broker-confirm E2E passes, and mobile review is approved.
