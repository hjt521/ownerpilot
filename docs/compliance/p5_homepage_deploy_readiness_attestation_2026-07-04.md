# P5 — Homepage / Website Deploy Readiness — Attestation + Cutover Checklist

**Date:** 2026-07-04
**Built under:** BROKER STANDING ORDER — Productization 2026-07-03 §2 P5.
**Author:** Engineering (Claude Code).

---

## §1 — Discovery (P5 (a)/(b))

- **Deploy target:** Vercel. `.vercel/project.json` present — project **`ownerpilot`** (projectId + orgId set). No `wrangler.toml` / `netlify.toml` — single Vercel target.
- **Production domain:** **not configured in-repo** (`vercel.json` has crons only; no `alias`/`domains`; `next.config` has no domain). Domain binding is a Vercel-dashboard/DNS action — engineering has no access to confirm live DNS state.
- **Homepage:** **already built** (lane8 assembly). `app/page.tsx` composes the materialized lane8 marketing components: `SiteHeader`, `TrustStrip`, `Hero`, `HowItWorks`, `Features`, `NewFaqItems`, `SiteFooter`, `FooterLegal`. Copy is the lane8-materialized copy (`lane8_marketing_copy_materialized_2026-06-29.md`).

## §2 — Pre-deploy gate (P5 "do NOT skip the banned-term audit") ✅

`ci:verify-banned-terms` → **PASS** (no banned terms in owner-facing copy). tsc clean (homepage compiles). The G3 disclaimer + G5 footer are present via `SiteFooter` / `FooterLegal` / `TrustStrip` (broker-supervision credentials above the fold).

**The homepage is deploy-ready.**

## §3 — What engineering CANNOT do (broker/JT-executed — §2 P5 (c)/(d))

Deploying to production and binding DNS are dashboard/CLI actions requiring Vercel auth + DNS access that engineering does not have (same access boundary as env vars / GitHub settings). I also cannot check live DNS (web-fetch restricted). So this is the §2 P5 (d) path: **stage/deploy is your action; here is the exact checklist.**

## §4 — Deploy + DNS cutover checklist (JT / broker)

**A. Deploy to production (Vercel):**
1. Merging to `main` triggers the Vercel production build automatically (or `vercel --prod` from the repo). Confirm the build succeeds.
2. Confirm the CI banned-terms + build gates are green on the deploy commit (they are, per §2).

**B. Bind the production domain `ownerpilot.ai` (Vercel dashboard → Project `ownerpilot` → Settings → Domains):**
3. Add `ownerpilot.ai` (and `www.ownerpilot.ai`) to the project.
4. Set the DNS records Vercel prescribes at your registrar/DNS (Cloudflare per the email-incident record):
   - Apex `ownerpilot.ai`: **A → `76.76.21.21`** (Vercel's anycast) — or per the exact value Vercel shows.
   - `www`: **CNAME → `cname.vercel-dns.com`**.
   - Keep the existing Resend email DNS (DKIM `resend._domainkey`, SPF `send`, MX, DMARC) intact — do not overwrite.
5. Wait for Vercel to verify the domain (green), then set it as the Primary domain.

**C. Post-deploy verification:**
6. Load `https://ownerpilot.ai` — confirm the homepage renders, trust badges above the fold, no console errors.
7. Re-run the banned-term audit against the live copy (already green in CI; confirm no runtime drift).
8. Record the live URL in this attestation (§6).

## §5 — Flag: staging domain discrepancy

The order §2 P5 (d) references staging at a **`pplx.app`** subdomain. OwnerPilot's Vercel project produces `*.vercel.app` preview URLs by default (not `pplx.app`). If you want a `pplx.app` staging alias, that's a separate domain binding. **Recommend:** if `ownerpilot.ai` DNS is ready, deploy straight to production (§4); the default `*.vercel.app` preview already serves as staging. Confirm the intended staging domain if `pplx.app` was deliberate.

## §6 — Live URL (fill after cutover)

`ownerpilot.ai` → ______ (production) · preview: ______

## §7 — Omnibus §F additions

- **F17 · Production deploy + `ownerpilot.ai` DNS cutover** (§4) — broker/JT-executed.
- **F18 · Confirm staging-domain intent** (`pplx.app` vs default `*.vercel.app`, §5).

---

**Authorized under BROKER STANDING ORDER 2026-07-03 §2 (P5) — Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-04**
Engineering author: Claude Code. Homepage deploy-ready; deploy + DNS are broker-executed.
