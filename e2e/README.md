# E2E suite (Group 5) — deploy-run

Playwright specs for the AI-first rebuild. They run against a **deployed preview**, not the sandbox.

## Run
```bash
npm i -D @playwright/test && npx playwright install --with-deps
E2E_BASE_URL=https://<preview-url> npx playwright test
```

## Coverage (backlog §5.1)
- `chat-to-produce.spec.ts` — chat intake → review (account number masked, G8) → produce → RiskPath record.
- `counsel-route-hardstop.spec.ts` — G4: posture/subject/shared trigger each blocks produce (409) → `/route-to-counsel`; never a PDF.
- `consent-analytics.spec.ts` — Lane 6: zero GA4 before consent; fires after accept; zero after decline.

## To add before PR (deploy-dependent)
- `magic-link-claim.spec.ts` — request → (intercept Resend in preview) → redeem → session claimed → `/riskpath` populated.
- `documents.spec.ts` — each of the 6 paths renders its locked clause + disclaimer + broker attribution; reservation slot absent.
- All 22 triggers (parametrized) block produce.

## Preview prerequisites
- `NEXT_PUBLIC_PHASE2D_ASSEMBLY_ENGINE_WIRED=true`, GA4 + Cookiebot CBID set, Supabase preview branch with migrations applied.
- A preview-only `/api/test/seed-session` harness to seed sessions (complete / with-trigger) deterministically — must be disabled in production.
