# Marketing Tranche 1 — Gate T1-0 Shipped-Surface Inventory · 2026-07-14

**Authority:** `marketing_tranche1_broker_ruling_2026-07-14a_addendum.md` §2A (Gate T1-0).
**Purpose:** Map every intended CTA and every product-capability claim across the six-artifact Tranche 1 package to exactly one disposition — **(a)** shipped production route, **(b)** "coming soon" in-draft, or **(c)** removal from Tranche 1 pending product ship. Default for confirmed-unshipped rows is **(c)** unless engineering recommends **(b)** with reasoning.
**Blocking:** No SEO page, blog, Canva asset, or video storyboard begins build until the broker acknowledges this inventory (non-signing acknowledgment).
**Method:** Verified against the production App Router and shipped components on 2026-07-14 (`app/**/page.tsx`, `components/serve-track.tsx`, `components/marketing/Features.tsx`).

---

## §1 · Ground-truth: what production serves today

Owner-facing routes served today (verified):

| Route | What it is | Notes |
|---|---|---|
| `/` | Homepage | Shipped |
| `/chat`, `/chat/review` | "Ask OwnerPilot AI" intake + review | **This is the real "ask" surface — there is no `/ask`.** Confirm beta-gating status for cold traffic. |
| `/notice/3-day`, `/notice/3-day/options`, `/notice/3-day/serve` | 3-day notice produce + options + **Serve & Track** | **Serve & Track is shipped at `/notice/3-day/serve`** — not `/serve-and-track`. |
| `/riskpath`, `/riskpath/courtesy-reminder` | Owner records dashboard + courtesy reminder | **Claimed-only** (requires a claimed session). Cold-traffic CTAs must route to `/chat`, not directly here. |
| `/route-to-counsel` | Counsel handoff | Shipped |
| `/our-approach` | Approach/explainer | Shipped |
| `/declaration-of-intent` | Declaration surface | Shipped |
| `/landing/{business,crisis,default,inheritor,inheritor-visual,retiree,tech}` | **Existing marketing-landing system (7 variants)** | New SEO pages must reconcile/dedupe against these, not duplicate them. |
| `/privacy`, `/privacy-request`, `/preferences/email` | Privacy + prefs | Shipped |
| `/waitlist` | Waitlist | Shipped |

Internal (never a marketing CTA target): `/admin/*`, `/broker-review/*`.

## §2 · Capability-shipped matrix

| Capability claimed in the package | Shipped? | Evidence / disposition basis |
|---|---|---|
| Ask OwnerPilot AI (chat intake) | ✅ shipped | `/chat` |
| 3-Day Notice preparation | ✅ shipped | `/notice/3-day` |
| Serve & Track (record service attempts, proof of service, service log) | ✅ shipped | `/notice/3-day/serve` + `components/serve-track.tsx` |
| **Timestamped photo capture / "photo proof of posting"** | ❌ **not shipped** | Serve surface has the attorney-verbatim proof-of-service form + service-log print; **no photo upload / timestamp capture exists.** |
| Courtesy reminder (owner-controlled draft) | ✅ shipped | `/riskpath/courtesy-reminder` (claimed-only) |
| RiskPath records | ✅ shipped | `/riskpath` (claimed-only) |
| LA overlay (LAHD / RTC / JCO) | ✅ shipped | LA produce path + LAHD filing record |
| **Resolve & Document (interactive: record payment, close notice, outcome flow)** | ❌ **not shipped** | Exists only as a homepage *illustration* (`feature_resolve_document.jpg`); no route, no interactive flow. |
| **Move-Out Agreement (create written agreement record)** | ❌ **not shipped** | No route, no component. |

## §3 · SEO landing pages (8) — dispositions

| # | Page | Intended CTA | Disposition | Action |
|---|---|---|---|---|
| 1 | `/california-3-day-notice` | "Start 3-Day Notice → `/3-day-notice`"; "Ask AI → `/ask`" | **(a)** proceed | Retarget CTAs → `/notice/3-day` and `/chat`. |
| 2 | `/tenant-behind-on-rent-california` | "Ask AI → `/ask`" | **(a)** proceed | Retarget → `/chat`. Courtesy-reminder claim OK (shipped). |
| 3 | `/serve-and-track-3-day-notice` | "Open Serve & Track → `/serve-and-track`" | **(a)** proceed | Retarget → `/notice/3-day/serve` (shipped). Describe the shipped POS + service-log capability only. |
| 4 | `/photo-proof-of-posting` | "Track Service → `/serve-and-track`" | **(a) reframe** (was going to be (c)) | **Drop all "timestamped photo capture" claims — that capability is not shipped.** Reframe around the shipped proof-of-service + service-log discipline, retarget → `/notice/3-day/serve`. If the page thesis can't survive without photo capture, downgrade to **(c) removal**. |
| 5 | `/tenant-paid-after-3-day-notice` | "Resolve & Document → `/resolve-and-document`" | **(c) removal** | No shipped Resolve & Document surface. Remove from Tranche 1 pending product ship. (Blog #8 covers the education angle without a product link.) |
| 6 | `/move-out-agreement-after-notice` | "Create Move-Out Agreement → `/move-out-agreement`" | **(c) removal** | No shipped surface. Remove from Tranche 1. (Blog #10 covers education.) |
| 7 | `/riskpath-records` | "Ask AI → `/ask`" | **(a)** proceed | Retarget → `/chat`. RiskPath is claimed-only — frame as "start in chat, records save to RiskPath," do not imply a public RiskPath browse. |
| 8 | `/los-angeles-3-day-notice` | "Start 3-Day Notice → `/3-day-notice`" | **(a)** proceed | Retarget → `/notice/3-day`. LA overlay shipped. |

**SEO net: 6 build (1–4 with retarget/reframe, 7, 8), 2 removed (5, 6).** Also reconcile #1/#2/#8 against the existing `/landing/*` variants to avoid keyword cannibalization/duplication.

## §4 · Blog articles (12) — dispositions

Blogs are workflow *education* and do not require a shipped route to exist — but every internal link and product-capability reference must resolve honestly.

- **Proceed as-is (education), CTA "Ask OwnerPilot AI first" → `/chat`:** #1, #2, #3, #4, #5, #6, #7, #11, #12.
- **Proceed with product-link guard:** #8 (tenant paid — no link to a Resolve & Document surface; education only), #9 (payment plan — same), #10 (Move-Out Agreement — education only, no link to a non-existent `/move-out-agreement`; keep the UD-filed carve-out).
- **All internal links** restricted to shipped routes (§1). No blog links to `/ask`, `/serve-and-track`, `/resolve-and-document`, `/move-out-agreement`, `/3-day-notice`.

**Blog net: 12 proceed as education; internal links retargeted; three (#8–#10) stripped of unshipped-product links.**

## §5 · Canva assets — dispositions

| Asset | Disposition | Action |
|---|---|---|
| Carousel 1 "Tenant Behind on Rent?" | **(a)** proceed | Slides 4–6 use product screenshots of Serve & Track / RiskPath (shipped) — OK. Any "Resolve & Document" slide → cut. |
| Carousel 2 "Notice Does Not End at Printing" | **(a) reframe** | **Cut the "timestamped photo proof" slide** (unshipped). Keep track-service / proof-of-service / service-log / RiskPath slides. |
| Carousel 3 "Tenant Paid After Notice?" (Resolve & Document end card) | **(c) removal** | Describes unshipped Resolve & Document. Remove pending product ship. |
| Carousel 4 "Tenant Agreed to Move Out?" (Move-Out Agreement) | **(c) removal** | Unshipped. Remove. |
| Lead Magnet 1 (Late Rent Checklist) | **(a)** proceed | Education; courtesy-reminder + notice flow shipped. |
| Lead Magnet 2 (Service Tracking Checklist) | **(a) reframe** | Keep service-log/POS discipline; **soften photo page to "posting photo for your own records," not a product "photo proof" feature.** |
| Lead Magnet 3 (Tenant Paid — What to Document) | **(b) coming soon** or education-only | No product link to Resolve & Document; keep as a generic recordkeeping checklist or hold. Recommend **education-only** (no product-surface claim). |
| Lead Magnet 4 (Move-Out Agreement Checklist) | **(c) removal** | Describes unshipped product. Remove. |
| Screenshots of unshipped surfaces (Resolve & Document, Move-Out Agreement) | **(c)** | **Cannot exist — do not fabricate screenshots of unshipped surfaces** (base ruling imagery rule + gate 12). |
| Google Ads Display / Meta placement folders (empty scaffold) | **(a)** proceed | Scaffold only, no creative. |
| Launch deck / brochure skeletons, blog header images | **(a)** proceed | Placeholder copy; header images only for blogs that survive §4. |

## §6 · AI video storyboards (5) — dispositions

| Video | Disposition | Action |
|---|---|---|
| V1 "Ask First" | **(a)** proceed | Screens: chat → 3-day notice → Serve & Track → RiskPath (all shipped). End-card retargets to `/chat`. |
| V2 "After Notice" | **(a) reframe** | **Remove the "timestamped posting photo" beat and the Resolve & Document screenshot** (both unshipped). Keep serve/POS/service-log/RiskPath. |
| V3 "Move-Out Agreement" | **(c) removal** | Whole video is an unshipped-product claim. Remove. |
| V4 "Photo Proof" | **(c) removal** | Entire premise is unshipped photo capture. Remove (or hold for (b) if product commits to shipping photo capture). |
| V5 "RiskPath" | **(a)** proceed | RiskPath shipped; screen-tour is real. |

**Video net: 2 proceed (V1, V5), 1 reframe (V2), 2 removed (V3, V4).**

## §7 · Cross-cutting global fixes

1. **Global CTA retargets** (apply everywhere): `/ask` → `/chat`; `/3-day-notice` → `/notice/3-day`; `/serve-and-track` → `/notice/3-day/serve`. There is no `/resolve-and-document` or `/move-out-agreement` to retarget to — those are removals.
2. **RiskPath claimed-only:** never send cold marketing traffic straight to `/riskpath`; route to `/chat` first (records land in RiskPath after a session is claimed).
3. **Existing `/landing/*` system:** the surviving SEO pages must be reconciled against the 7 shipped landing variants for keyword overlap before build.
4. **Out-of-Tranche-1 finding (flag, do not fix here):** the **current production homepage** (`components/marketing/Features.tsx`) already presents a "Resolve & Document" feature illustration for a capability that isn't a shipped interactive surface. Under base §4 / gate 12 that is arguably an existing "surface describing unshipped capability." It is outside Tranche 1 build scope — flagging for broker awareness / a possible separate ticket, not touching it here.

## §8 · Net effect

The inventory shrinks the build and removes every 404/unshipped-claim risk before a single page is written:

- **SEO pages:** 8 → **6** (remove #5, #6; reframe #4).
- **Blogs:** 12 → **12** (education; links retargeted; #8–#10 de-producted).
- **Carousels:** 4 → **2** (remove C3, C4; reframe C2).
- **Lead magnets:** 4 → **2–3** (remove LM4; LM3 education-only; reframe LM2).
- **Videos:** 5 → **2–3** (remove V3, V4; reframe V2).
- **Global:** all CTAs retargeted to shipped routes; no screenshots of unshipped surfaces; homepage Resolve & Document illustration flagged as an out-of-scope finding.

Every removed item is a disposition-**(c)** "pending product ship" — it returns automatically to a future tranche if/when Resolve & Document, Move-Out Agreement, or photo capture ship.

## §9 · Attestation + broker acknowledgment

Engineering attests this inventory maps every CTA and product-capability claim in the six-artifact package to a disposition against the verified production surface as of 2026-07-14. Recommend the broker **acknowledge** (non-signing) so build proceeds against §3–§8; recommend explicit broker direction on the three judgment calls: **page #4 reframe-vs-remove**, **LM3 education-only-vs-hold**, and **V4 remove-vs-(b)-hold**.

— Engineering · Gate T1-0 · 2026-07-14 · for broker acknowledgment (non-signing)

Broker acknowledgment: ____________________________  Date: __________
