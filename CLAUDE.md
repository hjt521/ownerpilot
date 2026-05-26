# OwnerPilot AI — Claude Code Instructions

## Project context
California property owner AI guidance platform. Target users are 50+ property owners — non-technical, on mobile, potentially stressed. Every UI decision must prioritize clarity over cleverness.

## Brand
Name: OwnerPilot AI
Domain: ownerpilot.ai
Tagline: The AI Advantage for California Property Owners
Backed by: California Licensed Attorney + California Licensed Real Estate Broker (credentials appear on every page above the fold)

## Stack
Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase for auth + database, Stripe for payments, Anthropic Claude API for AI features, Resend for transactional email

## Design rules (always follow)
- Minimum font size: 16px body, 14px secondary
- Minimum tap target: 48px height on all interactive elements
- Maximum one primary CTA per section
- Trust badges (attorney + broker) above fold on every page
- Google SSO as primary signup, magic link secondary, password never first
- Error messages in plain English only
- Feature names use problem language not product language ("My tenant won't pay" not "Tenant Issue Assistant")

## Legal
- Every AI response must show ai disclaimer beneath it
- Never remove or hide attorney/broker credentials
- All notice templates are original OwnerPilot IP — never use CAR forms

## Code style
- Server components by default, client only when needed
- All API keys via environment variables, never hardcoded
- Every page needs proper meta tags for SEO
- Mobile-first responsive design always
