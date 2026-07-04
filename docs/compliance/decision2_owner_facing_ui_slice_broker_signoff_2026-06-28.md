# Decision 2 Owner-Facing UI Slice — Scope + Copy · Broker Sign-Off

**Date:** 2026-06-28
**Author:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
**Status:** SIGNED OFF (with three small copy edits + one mechanism add)
**Responds to:** Engineering Sign-Off Request "Decision 2 Owner-Facing UI Slice (Scope + Copy)" (2026-06-28)
**Parents:**
- `decision2_broker_confirm_path_design_broker_ruling_2026-06-28.md`
- `decision2_backend_build_section0_flags_broker_ruling_2026-06-28.md`

---

## 0. Disposition summary

| Question | Disposition |
|---|---|
| 1. Scope (5 surfaces) | **APPROVED as proposed** |
| 2. Copy A–H | **APPROVED with 3 edits** — see §2 below |
| 3. Email optional + token fallback | **APPROVED** |
| 4. Produce-gate while pending | **APPROVED** (button disabled, form editable, copy E shown) |
| 5. Return-to-status mechanism | **APPROVED + add lightweight "check status with my link" surface** — see §3 |
| 6. Reference sweep to `/route-to-counsel` | **APPROVED** |

§5.5 ship gate from the prior ruling still applies.

---

## 1. Scope · APPROVED

Build the five surfaces exactly as scoped in the request:

1. "Request broker review" affordance (gated on eligible `manual_review`)
2. Request form (optional email + submit → `/api/notice/broker-confirm` → token in localStorage)
3. Pending status (polled via `/status`, produce disabled, form editable)
4. Cancel (owner-initiated, calls `/cancel`)
5. Resolution display (confirmed unblocks produce; denied/inconclusive/expired → `/route-to-counsel`)

Design constraints carry forward: 16px body min, 14px secondary, 48px tap targets, one primary CTA per section, mobile-first, 50+/stressed-audience plain English.

---

## 2. Copy approvals — three edits, otherwise verbatim

The strings below become locked-prose Tier B entries on sign-off. The three edits are flagged inline as **EDITED**.

### A. Request prompt — APPROVED with edit

**EDITED — proposed copy implied we'd be looking at "official county and city records" which is broader than what the broker actually does. Tightened to match the resolver's actual scope.**

```
We couldn't automatically confirm which city governs this address.
You can request a review by our California licensed real estate broker —
we'll check parcel and jurisdiction records and confirm whether this
property is in the City of Los Angeles.
```

### B. Request button label — APPROVED verbatim

```
Request broker review
```

### C. Email field label + helper (CCPA notice-at-collection) — APPROVED verbatim

```
Email (optional) — so we can tell you when the review is done.
We collect this email only to notify you when your broker review
completes. We do not sell or share it, and we do not add you to
marketing emails. We delete it 90 days after your request resolves.
```

This is the compliance-load-bearing string. Locked-prose CI guard must cover every word.

### D. "Save this link" notice on submit — APPROVED with edit

**EDITED — original wording read slightly thin given how serious the consequence is. Strengthened the consequence framing without scaring the user.**

```
Your request is in. Save this page — bookmark it, or copy the URL
somewhere safe. It's the only way to check your review status.
We can't resend the link if you lose it.
```

### E. Pending status — APPROVED verbatim

```
Broker review in progress. Expected by {deadline}. You can keep
editing your notice; producing is paused until the review completes.
```

### F. Confirmed — APPROVED verbatim

```
Confirmed — this property is in the City of Los Angeles.
You can continue.
```

### G. Denied / inconclusive / SLA-expired (route to counsel) — APPROVED with edit

**EDITED — original "we weren't able to confirm" works, but the user needs to know which outcome they got (denied vs inconclusive vs expired) because that affects what they do next. Splitting into three sub-strings under one umbrella pattern. The CTA copy and link target stay identical across all three.**

**G1. Denied:**
```
After review, we found this property is not in the City of Los Angeles.
For jurisdiction-specific guidance on the city or county that does govern,
please consult a California attorney.

[Find a California landlord-tenant attorney →]  (links to /route-to-counsel)
```

**G2. Inconclusive:**
```
Our broker review couldn't reach a clear conclusion on which city
governs this address. For jurisdiction-specific guidance, please
consult a California attorney.

[Find a California landlord-tenant attorney →]  (links to /route-to-counsel)
```

**G3. SLA-expired:**
```
Our broker review didn't resolve within the expected window. We're
sorry for the wait. For jurisdiction-specific guidance, please
consult a California attorney.

[Find a California landlord-tenant attorney →]  (links to /route-to-counsel)
```

All three CTAs link to `/route-to-counsel`. The CTA label is locked-prose; the three preamble sentences are also locked-prose. Engineering may pick which of G1/G2/G3 to show based on the `/status` response's outcome field.

### H. Cancel confirmation — APPROVED verbatim

```
Cancel this broker review request? You can submit a new one later.
```

---

## 3. Return-to-status mechanism — APPROVED + lightweight check-status surface

The token-in-localStorage + saved-link approach is the primary path. **Add a small "check status with my link" entry point** as a secondary safety net for users who lose their browser state but kept the link.

### 3.1 Why add it

The token-only fallback assumes the user either (a) keeps the same browser open with localStorage intact OR (b) navigates back to the exact saved URL. Both are reasonable in normal use; both break in real-world scenarios — phone lost, browser cleared, link copied to a notes app without the full path.

A lightweight "paste your link to check status" page costs almost nothing to build, removes the worst-case "I lost everything" failure mode, and doesn't change the security posture — the link itself is still the only authority.

### 3.2 Surface spec

- **Route:** `/broker-review/check-status` (or wherever fits the existing IA — engineering picks)
- **Single field:** "Paste the link you saved when you submitted your broker review"
- **Single button:** "Check status"
- **Behavior:** parse the token out of the pasted URL, redirect to the canonical status URL with the token in localStorage
- **Validation:** if the pasted text isn't a valid OwnerPilot broker-review link, show a short error and the locked-prose disclaimer below

### 3.3 Locked copy

**Page H1:**
```
Check your broker review status
```

**Intro:**
```
If you have the link we gave you when you requested a broker review,
paste it below to check the status.
```

**Field label:**
```
Your broker review link
```

**Button:**
```
Check status
```

**Error string (invalid/unparseable link):**
```
We couldn't read that link. Make sure you pasted the full URL we
sent when you submitted your request. If you lost the link entirely,
we can't recover it — you'll need to submit a new request.
```

### 3.4 Discoverability

Link to `/broker-review/check-status` from:
- The "Request broker review" affordance area (small secondary link: "Already submitted a request? Check status →")
- The site footer alongside the existing legal/compliance links

Not promoted on the homepage. This is a recovery surface, not a primary surface.

---

## 4. Reference sweep — APPROVED

Sweep the following existing surfaces to point at `/route-to-counsel`:

- Footer "consult counsel" link
- Options-page "find an attorney" reference
- Any jurisdiction-gate "consult counsel" copy
- Any refusal-pattern routing in the chat persona (per the architecture ruling's refusal bank)

Locked-prose CI guard should be updated at the same commit to enforce that any new "consult counsel" / "attorney referral" surface links to `/route-to-counsel`, not a custom URL.

---

## 5. Locked-prose manifest additions

On this slice's PR, add these entries to `locked_prose_manifest.json`:

- All of §2 A through H (with G split into G1/G2/G3)
- All of §3.3 (check-status page strings)

The manifest's Tier-B convention applies: exact match enforcement, whitespace-normalized, no inserted-character drift.

---

## 6. Ship gates that still apply

From `decision2_backend_build_section0_flags_broker_ruling_2026-06-28.md` §5.5:

- `/route-to-counsel` live in production
- `BROKER_CONFIRM_COUNSEL_URL` env var set in Vercel Production
- Locked-prose CI guard covers the page's disclaimer text

Plus, new from this ruling:

- All §2 + §3.3 strings in the locked-prose manifest before this slice ships
- The reference sweep (§4) completed in the same PR or a prior PR — not deferred

---

## 7. Out of scope (confirmed)

- Broker dashboard UI (separate later slice)
- Any change to jurisdiction resolver / disposition logic / County+ZIMAS behavior

---

## 8. Authorization to build

Build the slice with the §2 + §3.3 copy as written. Stop for review before merging the PR; I'll do a final read of the rendered UI on mobile (iPhone 12 Safari) and desktop before greenlight.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-28
