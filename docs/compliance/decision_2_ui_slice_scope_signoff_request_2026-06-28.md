# Sign-Off Request — Decision 2 Owner-Facing UI Slice (Scope + Copy)

**Date:** 2026-06-28
**Prepared by:** Engineering (for broker / compliance officer sign-off)
**Status:** OPEN — gates the owner-facing UI build (§6 step 7). Backend is complete and verified.
**Authority:** `decision2_broker_confirm_path_design_broker_ruling_2026-06-28.md` (§2.2, §1.4, §2.3, §4.2) and `decision2_backend_build_section0_flags_broker_ruling_2026-06-28.md` (§5).

---

## 0. Why this sign-off

The broker-confirm backend (migrations 023/024, routes, resolve tool, SLA cron, `/route-to-counsel`) is built and green. The ruling holds the **owner-facing UI slice** behind a separate sign-off because it introduces new owner-facing, legal-adjacent copy (CCPA notice-at-collection, a transactional-only disclosure, route-to-counsel messaging). This document proposes the UI scope and the **verbatim copy** for your approval. On sign-off, the approved strings become locked-prose entries and I build the slice.

Design constraints carried from CLAUDE.md: 16px body min / 14px secondary, 48px tap targets, one primary CTA per section, plain English, mobile-first, 50+/stressed audience.

---

## 1. Surfaces to build (scope)

1. **"Request broker review" affordance** — appears in the Review-step jurisdiction stub **only** when the resolver returned an eligible `manual_review` (`parcel_lookup_inconclusive` / `county_situs_gap` / `county_ambiguous`). Single secondary button; positive action only (§2.2.1) — never auto-triggers.
2. **Request form** — an optional email field + submit. On submit, POST `/api/notice/broker-confirm`, store the returned token in `localStorage` alongside the draft, show the "save this link" notice.
3. **Pending status** — "Broker review in progress · expected by {deadline}" (§1.4), polled via `/status`. Produce button disabled (with reason shown); the rest of the form stays editable (Fork 4).
4. **Cancel** — owner can cancel a pending request (§1.3) → calls `/cancel`.
5. **Resolution display** — `confirmed` → unblock produce; `denied`/`inconclusive`/`expired` → message + link to `/route-to-counsel`.

---

## 2. Proposed verbatim copy (for approval / edit / lock)

On sign-off these become locked-prose constants (Tier B), like the route-to-counsel copy.

**A. Request prompt (shown on an eligible manual_review):**
> We couldn't automatically confirm which city governs this address. You can request a review by our licensed broker — we'll check the official county and city records and confirm whether this property is in the City of Los Angeles.

**B. Request button label:**
> Request broker review

**C. Email field label + helper (CCPA notice-at-collection, §2.3.3):**
> Email (optional) — so we can tell you when the review is done.
> We collect this email only to notify you when your broker review completes. We do not sell or share it, and we do not add you to marketing emails. We delete it 90 days after your request resolves.

**D. "Save this link" notice on submit (Flag 1 consequence):**
> Your request is in. Save this page — it's the only way to check your review status, and we can't resend the link.

**E. Pending status:**
> Broker review in progress. Expected by {deadline}. You can keep editing your notice; producing is paused until the review completes.

**F. Confirmed:**
> Confirmed — this property is in the City of Los Angeles. You can continue.

**G. Denied / inconclusive / SLA-expired (route to counsel):**
> We weren't able to confirm City-of-Los-Angeles jurisdiction for this address. For jurisdiction-specific guidance, please consult a California attorney. [Find a California landlord-tenant attorney →]  (links to /route-to-counsel)

**H. Cancel confirmation:**
> Cancel this broker review request? You can submit a new one later.

---

## 3. Decisions requested (sign-off)

1. **Scope (§1)** — approve the five surfaces as described? Yes / adjust.
2. **Copy (§2 A–H)** — approve verbatim (then I lock them), or edit any string. (CCPA item C and route-to-counsel item G are the compliance-load-bearing ones.)
3. **Email optional** — confirm the email stays optional with a token-only fallback (per Decision A); the "save this link" notice (D) is the token-only safety net.
4. **Produce-gate while pending** — confirm the produce button is disabled but the form stays editable, with copy E shown (Fork 4).
5. **Return-to-status mechanism** — for an anonymous/token flow, the owner returns by reopening the same browser (token in `localStorage`) or via the saved link. Confirm this is acceptable, or do you want a "check status with my link" entry point as well?
6. **Reference sweep** — on this slice I'll point the existing footer/options/gate "consult counsel" references at `/route-to-counsel`. Confirm.

---

## 4. Out of scope for this slice

- The broker resolution workflow (already built as the broker-run tool); a broker dashboard UI is a later, separate item.
- Any change to the jurisdiction resolver, disposition logic, or the deployed County+ZIMAS behavior.

On your sign-off (or edits) to §3, I build the slice, add the approved copy to the locked-prose manifest, and stop for review before it ships. The §5.5 ship gate (page live + `BROKER_CONFIRM_COUNSEL_URL` set + locked-prose coverage) still applies.

— Engineering, 2026-06-28
