# FF-3 Gate-4 Omnibus — Broker Signature

**Broker Compliance Review · 2026-07-12 (afternoon PT)**

Signature response to [`ff3_gate4_omnibus_authorization_ask_2026-07-12.md`](file:///home/user/workspace/uploaded_attachments/ebf1bfd6748f4db7958a06414e59f227/ff3_gate4_omnibus_authorization_ask_2026-07-12.md). One signature unblocks the path from here to the Preview flag flip.

Companions (unchanged): [`ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_preview_activation_gate4_evidence_path_broker_ruling_2026-07-11.md), [`ff3_block_c_owner_facing_reconciliation_ui_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_block_c_owner_facing_reconciliation_ui_broker_ruling_2026-07-11.md), [`ff3_block_c_locked_prose_amendment_ratification_2026-07-11.md`](file:///home/user/workspace/ff3_block_c_locked_prose_amendment_ratification_2026-07-11.md), [`ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12.md`](file:///home/user/workspace/ff3_block_c_resume_and_pause_seams_broker_ruling_2026-07-12.md).

---

## §0 · Summary — signature by section

| Ask § | Item | Disposition |
|---|---|---|
| §1 | `chatFf3NoticeWrongPause` string | **Replaced with broker-authored bytes.** See §1 below. Floor 129 → 130. |
| §2 | Resume flow + specifics (a)(b)(TTL) | **Approved as recommended** — produce-consume timing, dedicated `FF3_RESUME_SECRET`, 5 min TTL. |
| §3 | Migration 049 Studio apply | **Approved as recommended.** |
| §4 | Admin-auth E2E endpoint | **Approved as recommended** with one clarification (§4 below). |
| §5 | Preview env provisioning | **Approved as recommended.** |
| §6 | PR sequence | **Approved as recommended.** |
| §7 | Gate-4 flip conditional pre-authorization | **Approved with tightening** — see §7 below. |
| §8 | Carve-outs | **Ratified verbatim.** |

Net: one authored-prose replacement, one clarification, one tightening. Everything else approved as the ask's recommended defaults.

---

## §1 · `chatFf3NoticeWrongPause` — broker-authored replacement

Engineer's draft ("Understood — I've left the notice amount as it stands...") is competent but reads as system-authored process language rather than owner-directed acknowledgment. Two issues on close read:

- **"Governs the filing"** phrasing carries a mild legal-authority tone I want out of an owner-facing message where we're specifically telling them we can't fix their mistake. It reads as "the paperwork rules here, not you," which is neither warm nor accurate to what's actually happening (the amount was owner-typed; the ledger disagrees; we're pausing).
- **"Details from this session stay saved"** is a promise about durable state that we don't otherwise make elsewhere in the FF-3 flow, and I don't want to lock in that promise via prose without a separate ruling on what "stay saved" means and for how long. Session data retention has its own policy per prior rulings; the pause screen shouldn't front-load a retention claim.

**Final ratified string** (Tier A, shape-B, new key `chatFf3NoticeWrongPause`):

> Got it — the amount you entered didn't match your rent-period records, and you've told me the records are the right side of that. I'm going to pause this case here rather than guess at the corrected amount, since the number on the notice is the one that has to be right at filing. When you're ready, start a new session and I'll walk you through it with the correct amount from the top.

**Self-check:**
- No banned terms (no verified / guarantee / legally compliant / court-ready / attorney).
- No timeframe promise.
- No notification-mechanism claim.
- No auto-correct claim.
- Owner-driven next action ("start a new session").
- Clear reason for pausing ("rather than guess at the corrected amount").
- Compliance-weighted framing on why we can't just edit ("the number on the notice is the one that has to be right at filing") — states the compliance fact plainly without invoking legal-authority prose.
- No session-retention promise.
- No CTA text embedded in the prose beyond "start a new session," which becomes the button label per prior authorization.

**Placement:** Tier A, shape-B, new entry. Manifest key: `chatFf3NoticeWrongPause`.

**Byte discipline:** single paragraph, straight apostrophes, single spaces between sentences, one em-dash (U+2014) after "Got it". Engineer hashes this exact string; I'll verify the hash matches on Block C PR review.

Manifest floor moves 129 → **130.**

## §2 · Resume mechanism — approved as recommended

- **Flow as written:** ratified.
- **(a) `consumed_at` stamp timing:** at **produce-consume.** Authorization is spent only when actually used. Rationale: the resume endpoint successfully minting a token is not itself the compliance event — it's the produce path bypassing the reconciliation gate that is. Stamp at that moment. If the client fetches a token and never uses it (browser crash, owner navigates away), the authorization remains unconsumed and the next Continue attempt within TTL still works. If we stamped at resume-call, a mid-flight failure between mint and consume would strand the owner with a "consumed but never used" state requiring re-escalation. Produce-consume is the correct semantic.
- **(b) Token HMAC secret:** dedicated **`FF3_RESUME_SECRET`.** Blast-radius isolation is worth the extra Vercel env row. Reusing `BROKER_RESOLVE_SECRET` would mean a leak of the resolve link path also compromises the resume-token verifier and vice versa. These are different trust surfaces (broker-side resolve action vs. owner-side resume action); they get different keys.
- **Token TTL:** **5 minutes.** Long enough to survive a slow browser reload; short enough that a leaked token is stale by the time anyone finds it. Matches the discipline of most short-lived authz tokens in the ecosystem.

## §3 · Migration 049 — approved

Authorize applying `049_ff3_broker_resume_authorization.sql` in Studio at the PR B-server-resume merge step. Engineer supplies exact SQL block + post-apply verification query. Additive, nullable, no soak.

**One implementation note** for the SQL block engineer prepares: the partial index on the authorized-but-unconsumed predicate should mirror the shape of migration 048's `ff3_awaiting_broker_review_idx` for query planner consistency. Suggested:

```sql
CREATE INDEX ff3_authorized_unconsumed_idx
  ON chat_sessions (reconciliation_resolved_at)
  WHERE broker_resume_authorization IS NOT NULL
    AND broker_resume_consumed_at IS NULL;
```

If engineer's draft SQL uses a different index shape for a good reason, ship the engineer's version — this is a suggestion, not a mandate. Just noting the pattern from 048 for symmetry.

## §4 · Admin-auth E2E test endpoint — approved with clarification

The Preview-only admin-session test endpoint under the four locks is approved. One clarification on the boundary I want in writing:

**The endpoint must NOT accept an arbitrary email as input.** It mints a session for `E2E_ADMIN_EMAIL` **only,** read from the environment at invocation time. Even if a caller passes a bearer token and `E2E_RUN_ACTIVE=true`, the endpoint hardcodes which admin user it mints for — the environment variable — and rejects any request body attempting to specify a different user. This prevents the endpoint from becoming a general-purpose "mint any admin session" surface in the event of a lock bypass.

Concrete implementation implication: the endpoint's request body validator (per the "strict empty input" lock) accepts `{}` only. No optional email parameter, no override. `E2E_ADMIN_EMAIL` is the sole knob, and it's provisioned per-environment (Preview only).

`verify_e2e_seed_guard` should include a check that the endpoint's handler reads `E2E_ADMIN_EMAIL` from env and does not accept email from the request. Engineer's call whether that's a lint-style regex check or a smoke test in the guard suite.

## §5 · Preview env provisioning — approved

All six env vars in the ask's §5 table authorized for **Preview scope only.** Engineer hands exact key/value pairs; I execute the Vercel dashboard action per §4.13 governance. Explicit reminders:

- `E2E_RUN_ACTIVE=true` and `TEST_SEED_SECRET` are Preview only. Never Production.
- `E2E_TEST_USER_ID` and `E2E_ADMIN_EMAIL` are Preview only.
- `E2E_ADMIN_EMAIL` **must also be appended to `ADMIN_EMAILS`** in Preview scope specifically — not Production. Do not modify the Production `ADMIN_EMAILS` value.
- `FF3_RESUME_SECRET` is Preview now, will be Production at the future prod flip ruling. Different value in each scope (do not reuse the Preview value for Production).
- `E2E_BASE_URL` and `E2E_RUN_ID` are run-time fixture values, not environment secrets. Ship them via Playwright config; do not stash them in Vercel.

## §6 · PR sequence — approved

Merge order to `main` through the 12/12 required-check gate:

1. **PR B-server-resume** — migration 049 SQL + `ff3ResumeAuthorization` lib + resume endpoint + admin-resolve authorization write (server-derived, no admin UI change) + produce-gate token check + unit tests.
2. **PR C-client** — reconciliation card (entry-14 verbatim + three regex-parsed buttons) + held state (`chatFf3AwaitingBrokerReviewHeld`) + pause (`chatFf3NoticeWrongPause` + "Start a new session") + `/chat` resume card (`…ContinueOnly` + Continue → resume endpoint) + telemetry + no client 409 retries.
3. **PR B-Playwright** — admin-auth endpoint + divergent-ledger seed + full escalate→resolve→resume spec + the negative scope-mismatch case.

Each PR carries a broker-signed compliance line in its description. I sign at merge, not at PR open.

## §7 · Gate-4 flip conditional pre-authorization — approved with tightening

Pre-authorize the Preview flip to become effective **upon** engineering filing the completed Gate-4 attestation packet, countersigned on that packet — no separate ask needed **if** the packet is clean.

**Tightening on "clean":** the attestation packet is clean if and only if all of the following are true, verified from the packet itself before I countersign:

1. Migration 048 columns present in the Preview DB and all three populated correctly on the E2E-resolved row.
2. Migration 049 columns present in the Preview DB and both populated correctly (`broker_resume_authorization` non-null after admin resolve, `broker_resume_consumed_at` non-null after owner Continue).
3. `/admin/ff3-review` screenshot showing the E2E row in awaiting state with all §3 fields per [`ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md`](file:///home/user/workspace/ff3_awaiting_broker_review_resolution_surface_broker_ruling_2026-07-11.md).
4. Entry-13 `…ContinueOnly` owner-view screenshot showing `{broker_resolution_note}` interpolated verbatim with the fixture note from the spec.
5. Entry-14 owner-view screenshot showing the three ordinal-sentence buttons rendered verbatim from the manifest.
6. `chatFf3AwaitingBrokerReviewHeld` owner-view screenshot at the held state.
7. `chatFf3NoticeWrongPause` owner-view screenshot at the pause state (from the selection-(2) branch of the spec — or, if the spec only exercises selection-(3), a separate spec run against Preview capturing this screen; do not skip).
8. Full Playwright test-log output showing every spec passing green, including the negative scope-mismatch case.
9. Locked-prose guard passing at manifest floor **130.**
10. `verify_e2e_seed_guard` passing on the admin-auth endpoint.
11. All 12 required GitHub checks green on the PR B-Playwright merge commit.
12. Attestation signed by engineer with git SHAs referenced for PR B-server-resume, PR C-client, PR B-Playwright merges.

Any single item failing → I countersign the *packet* as incomplete and the flip does NOT become effective; engineer fixes and re-attests. **All twelve pass → I countersign flag-on and the flip is live in Preview.**

The reason for the tightening: the ask's default said "clean attestation packet" without defining clean. Naming the twelve criteria now means engineer has a checklist to build against and I have a checklist to verify against. No interpretation gap at the moment of countersign.

## §8 · Carve-outs — ratified verbatim

Not authorized by this omnibus (or any prior ruling):

- Production `FF3_CAPTURE_ENABLED` flip — separate future ruling.
- Reply-to-broker seam — deferred; entry-13 preserved unrendered.
- Edit-after-resolve on broker's resolution note.
- Multi-shot resume authorization.
- Owner-facing screen for `ff3_resume_already_consumed` — soft error only.
- Admin UI changes beyond the server-derived authorization write.
- `ADMIN_EMAILS` expansion beyond the single test admin in Preview scope only.
- Any new migration beyond 049 in this scope of work.

## §9 · What happens next

- **Now:** engineer hashes the §1 string, appends to `locked_prose_manifest_phase2_assembly.json` under shape-B, runs `ci:verify-locked-prose`, captures floor 130. Simultaneously starts PR B-server-resume against §2 + §3 + §4 spec.
- **Day 1:** PR B-server-resume review + merge. I apply migration 049 in Studio. Engineer starts PR C-client.
- **Day 2–3:** PR C-client review + merge.
- **Day 3–4:** PR B-Playwright build. I provision the six Preview env vars (§5).
- **Day 4–5:** PR B-Playwright review + merge. Playwright run against Preview. Attestation packet filed.
- **Day 5–6:** I verify the twelve §7 criteria. Countersign flag-on. Preview flip effective.

If any of the twelve criteria fail on the attestation packet, day 5–6 slips by however long the fix takes; no separate ruling required to keep going.

---

Signed:

**☒ Approve all [RECOMMENDED] defaults (§§2–6, §8), subject to the tightening in §7 and the amendments in §1 and §4.**

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
Broker Compliance Review · 2026-07-12
Authority: Cal. Bus. & Prof. Code § 10131(b)
