# FF-3 Gate-4 Remainder — Omnibus Broker-Authorization Ask — 2026-07-12

**Status:** AWAITING BROKER SIGNATURE. One document, one signature, unblocks the entire path from here to the
Preview flag flip. Every item carries a **[RECOMMENDED]** default; sign §10 to approve all defaults, or strike/
amend any line and sign the remainder.

**Authority chain:** `ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11` (Option 3) ·
`ff3_block_c_owner_facing_reconciliation_ui_broker_ruling_2026-07-11` · `ff3_block_c_locked_prose_amendment_ratification_2026-07-11` ·
`ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12`.

**Governance:** §4.13 — every Studio/Vercel/GitHub action below is **broker-executed**; engineering builds, verifies,
and hands git/apply blocks. Broker-only attribution throughout.

---

## §1 · Locked prose — ratify `chatFf3NoticeWrongPause` (manifest 129 → 130)

The selection-(2) "notice wrong" pause screen. Compliance intent (ruling §Gap-B): acknowledge, don't auto-correct,
one owner-driven action, no timeframe, no notification. The action-label **"Start a new session"** is already
authorized as a mechanical button label (not flow prose).

**Engineering DRAFT — broker authors/ratifies the final bytes:**

> Understood — I've left the notice amount as it stands and paused this case here. The amount on the notice is
> the figure that governs the filing, so the way forward is a corrected notice rather than an edit to this one.
> When you're ready, start a new session and we'll build the corrected notice from the right amount. Your details
> from this session stay saved.

Self-check: no banned terms; no timeframe; no notification-mechanism claim; "governs the filing" mirrors entry-14;
one owner action. Tier A, shape-B, new key `chatFf3NoticeWrongPause`.

- ☐ **[RECOMMENDED]** Ratify the draft verbatim → engineering hashes + appends → **floor 130**.
- ☐ Replace with broker-authored bytes: ________________________________________________

---

## §2 · Resume→produce override mechanism — ratify design + two specifics

Ratifies the PR B-server-resume design (the scoped, one-shot broker authorization from the 07-12 ruling §Gap-A).
Pure core (`buildResumeAuthorization` / `checkResumeScope`, six bound fields, fail-closed) is **built + green**.

**Flow to ratify:** `POST /api/chat/ff3/resume` (owner, claimed session) → rebuild live state → `checkResumeScope`;
drift → `ff3_resume_scope_mismatch` (no consume); already-consumed → `ff3_resume_already_consumed` (soft); match →
issue a short-TTL HMAC continuation token. Client re-POSTs produce with the token; the produce gate validates it
against the still-unconsumed authorization, stamps `broker_resume_consumed_at`, and skips the reconciliation math.
`reconciliation_resolution` stays `broker_review` — the consumed authorization is the "broker authorized and it was
used" audit fact, kept distinct from selection-(1) `records_incomplete`.

- ☐ **[RECOMMENDED]** Ratify the flow as written.
- **(a) `consumed_at` stamp timing:** ☐ **[RECOMMENDED]** at produce-consume (authorization spent only when
  actually used) ☐ at the resume call itself.
- **(b) token HMAC secret:** ☐ **[RECOMMENDED]** provision a dedicated `FF3_RESUME_SECRET` (blast-radius isolation)
  ☐ reuse existing `BROKER_RESOLVE_SECRET`.
- **Token TTL:** ☐ **[RECOMMENDED]** 5 minutes ☐ other: ______

---

## §3 · Migration 049 — authorize Studio apply (broker-executed)

`049_ff3_broker_resume_authorization.sql`: adds nullable `broker_resume_authorization jsonb` +
`broker_resume_consumed_at timestamptz` + a partial index on the authorized-but-unconsumed predicate. Additive,
nullable → no backfill, no soak. Apply **after** PR B-server-resume merges (columns are read by that code).

- ☐ **[RECOMMENDED]** Authorize applying 049 in Studio at the PR B-server-resume merge step; engineering supplies
  the exact SQL block + a post-apply verification query.

---

## §4 · Admin-auth E2E test endpoint — authorize a Preview-only, hard-locked surface

The Option-3 E2E needs a second browser context authenticated as an `ADMIN_EMAILS` member to drive `/admin/ff3-review`.
There is no in-repo login flow to automate, so engineering will add a **Preview-only** test endpoint that mints a
Supabase-Auth session for a provisioned admin test user. This is a sensitive surface and gets the **same four
defense-in-depth locks** as the existing seed routes (prod→404; `E2E_RUN_ACTIVE=true` required; `TEST_SEED_SECRET`
bearer; strict empty input) and is scanned by `verify_e2e_seed_guard`.

- ☐ **[RECOMMENDED]** Authorize the Preview-only admin-session test endpoint under the four locks, restricted to a
  single provisioned test admin (`E2E_ADMIN_EMAIL`), never reachable in production runtime.

---

## §5 · Preview env provisioning (broker-executed in Vercel — Preview scope only)

Authorize provisioning the following in **Preview scope only** (never Production) for the E2E run:

| Var | Purpose | Note |
|---|---|---|
| `E2E_RUN_ACTIVE=true` | unlocks seed + admin-session routes | Preview only |
| `TEST_SEED_SECRET` | bearer for seed/admin-session routes | already provisioned |
| `E2E_TEST_USER_ID` | claimed owner session (public.users id) | Preview only |
| `E2E_ADMIN_EMAIL` | test admin; **must also be added to `ADMIN_EMAILS`** in Preview | Preview only |
| `FF3_RESUME_SECRET` | resume token HMAC (if §2(b) = dedicated) | Preview + later Prod |
| `E2E_BASE_URL` / `E2E_RUN_ID` | Playwright target + cleanup tag | run-time |

- ☐ **[RECOMMENDED]** Authorize the Preview-scope provisioning above; engineering hands exact key names/values to set.

---

## §6 · PR sequence — authorize the merge order (each self-attests, broker signs at merge)

1. **PR B-server-resume** — migration 049 SQL + `ff3ResumeAuthorization` lib + resume endpoint + admin-resolve
   authorization write (server-derived, no admin UI change) + produce-gate token check + unit tests.
2. **PR C-client** — reconciliation card (entry-14 verbatim + 3 regex-parsed buttons) + held state
   (`chatFf3AwaitingBrokerReviewHeld`) + pause (`chatFf3NoticeWrongPause` + "Start a new session") + `/chat` resume
   card (`…ContinueOnly` + Continue → resume endpoint) + telemetry + no client 409 retries.
3. **PR B-Playwright** — admin-auth endpoint + divergent-ledger seed + full escalate→resolve→resume spec + the
   negative scope-mismatch case.

- ☐ **[RECOMMENDED]** Authorize this sequence to merge to `main` through the 12/12 required-check gate, each PR
  carrying a broker-signed compliance line.

---

## §7 · Gate-4 Preview flag flip — CONDITIONAL authorization (not effective yet)

The flip of `FF3_CAPTURE_ENABLED=true` in **Preview scope only** remains gated on the completed attestation packet
(migration 048/049 column proofs; `/admin/ff3-review` screenshot; entry-13 `…ContinueOnly` owner-view; the full
Playwright run incl. the scope-mismatch negative, all green). This omnibus does **not** make the flip live.

- ☐ **[RECOMMENDED]** Pre-authorize the Preview flip to become effective **upon** engineering filing the completed
  Gate-4 attestation packet, countersigned on that packet — no separate ask needed if the packet is clean.
- ☐ Keep the flip as a fully separate countersign after packet review.

---

## §8 · Not authorized by this omnibus

Production `FF3_CAPTURE_ENABLED` flip (separate future ruling) · reply-to-broker seam (still deferred; entry-13
preserved unrendered) · edit-after-resolve · multi-shot resume · owner-facing `ff3_resume_already_consumed` screen ·
admin UI changes beyond the server-derived authorization write · `ADMIN_EMAILS` expansion beyond the single test
admin · any new migration beyond 049.

---

## §9 · Manifest / calendar effect

Manifest 129 → **130** (§1). Build: PR B-server-resume + PR C-client + PR B-Playwright, then packet + flip.
Corrected calendar from the 07-12 ruling: **4–6 working days to flag flip.** Not a slip against anything committed.

---

## §10 · Signature

☐ **Approve all [RECOMMENDED] defaults** (§§1–7), subject to the §8 carve-outs.
Amendments (if any): ____________________________________________

— Broker Compliance Review
— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 · 2026-07-12
Authority: Cal. Bus. & Prof. Code § 10131(b)
