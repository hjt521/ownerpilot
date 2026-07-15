# Marketing Tranche 1 — Accessibility Baseline Report (framework) · 2026-07-14

**Authority:** analytics/accessibility prompt §B, addendum §5B.3. **Target:** WCAG 2.2 AA.
**Status:** framework filed with slice 5. The automated numeric results are captured on the first CI run of the a11y jobs (they cannot be run from the engineering sandbox — they need a built + served site and network-bound tooling). Nothing below is fabricated; numeric cells read "captured in CI" until the first run fills them.

## Method + tools

| Tool | What it covers | How it runs |
|---|---|---|
| Lighthouse CI (`npm run a11y:lighthouse`, `lighthouserc.json`) | Accessibility ≥ 95, SEO ≥ 90, perf ≥ 75 per route | CI, `MARKETING_TRANCHE1=true` build served |
| Pa11y CI (`npm run a11y:pa11y`, `.pa11yci`) | axe-core + HTML_CodeSniffer, WCAG2AA | CI, served build |
| Manual protocol (`docs/marketing/accessibility_manual_audit_protocol.md`) | Keyboard, screen reader, zoom/reflow, motion, touch targets, WAVE | Human auditor |

The 6 marketing routes are flag-gated (404 when `MARKETING_TRANCHE1` is off), so every audit job sets the flag before serving.

## Automated results (captured in CI)

| Route | Lighthouse a11y | Lighthouse SEO | Pa11y (axe+wcag2aa) violations |
|---|---|---|---|
| /california-3-day-notice | captured in CI | captured in CI | captured in CI |
| /tenant-behind-on-rent-california | captured in CI | captured in CI | captured in CI |
| /serve-and-track-3-day-notice | captured in CI | captured in CI | captured in CI |
| /photo-proof-of-posting | captured in CI | captured in CI | captured in CI |
| /riskpath-records | captured in CI | captured in CI | captured in CI |
| /los-angeles-3-day-notice | captured in CI | captured in CI | captured in CI |

## Manual results (captured by auditor)

| Check (see protocol) | Result |
|---|---|
| Keyboard-only nav (all pages) | pending human run |
| Screen-reader spot-check (VoiceOver/NVDA) | pending human run |
| Zoom 200% / reflow / reduced-motion | pending human run |
| Touch targets ≥ 48px | enforced in `CtaLink`; confirm no page override |
| WAVE pass | pending human run |

## Structural notes already verified in build

- One `<h1>`, one `<main>`, one `contentinfo` footer landmark per marketing page (no nested landmarks — footer rendered once by the route-group layout).
- Every CTA + the back-link uses a 48px min target via `CtaLink`.
- JSON-LD (Service + FAQPage) on every page.

## Severity + remediation

Findings are triaged critical / serious / moderate / minor. Critical + serious block the Gate T1-A a11y sign-off; moderate + minor are tracked and land as normal PRs. The CI a11y jobs fail the build on any Lighthouse a11y < 95 or any Pa11y WCAG2AA error on a marketing route.

— Engineering · slice 5 · 2026-07-14 · numeric cells auto-fill on first CI a11y run
