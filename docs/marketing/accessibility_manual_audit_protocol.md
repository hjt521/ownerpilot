# Marketing Accessibility — Manual Audit Protocol (WCAG 2.2 AA)

**Authority:** analytics/accessibility prompt §B.2–B.3, addendum §5B.3. The machine-executable audits (Lighthouse CI, Pa11y = axe-core + HTML_CodeSniffer) run in CI (`npm run a11y:lighthouse`, `npm run a11y:pa11y`). The checks below are the parts a machine cannot perform; a human executes them and records results in the baseline report.

**Scope:** the 6 marketing routes (build with `MARKETING_TRANCHE1=true` so they resolve) plus, as a regression check, the shipped homepage and `/chat`.

## 1 · Keyboard-only navigation

Unplug the mouse. For each page, using only Tab / Shift-Tab / Enter / Space / arrow keys:

- [ ] Every interactive element (links, CTAs, form fields) is reachable by Tab.
- [ ] Focus order follows visual/DOM order — no jumps.
- [ ] Every focused element has a visible focus indicator (never `outline: none` with no replacement).
- [ ] No keyboard trap — focus can always move forward and backward out of any component.
- [ ] The primary CTA and the "Back to home" link are operable with Enter.
- [ ] Skip-link (if present) moves focus to main content.

## 2 · Screen-reader spot-check

Run one of VoiceOver (macOS: Cmd-F5) or NVDA (Windows). On each marketing page + the homepage + `/chat`:

- [ ] The single `<h1>` is announced as the page heading; `<h2>` sections are navigable by heading.
- [ ] The footer is announced as a `contentinfo` landmark; `<main>` as the main landmark (confirm no nested/duplicate landmarks).
- [ ] Every link's purpose is clear from its text alone (no bare "click here").
- [ ] The sitewide disclaimer and broker license line are reachable and read correctly.
- [ ] FAQ questions/answers are announced as a description list.

## 3 · Zoom + reflow + motion

- [ ] Text readable at 200% browser zoom with no horizontal scroll (WCAG 1.4.10 reflow).
- [ ] Layout usable in both portrait and landscape on mobile.
- [ ] No auto-playing animation; `prefers-reduced-motion: reduce` is respected.

## 4 · Touch targets (WCAG 2.5.5 / CLAUDE.md 48px)

- [ ] Every CTA and link tap target is ≥ 48px tall (enforced in `CtaLink`; confirm no page overrides it).

## 5 · WAVE pass (manual, not CI)

Run the WAVE browser extension on each page; record any contrast, alt-text, or structure flags not already caught by Pa11y/Lighthouse.

## Recording

Log every finding into `docs/compliance/marketing_tranche1_accessibility_baseline_2026-07-14.md` under the matching page + severity. Remediation lands as normal PRs.
