# OMNIBUS BROKER RULING — D1 / D2 / D3 / D4 / D5

**Re:** `broker_status_and_decision_request_2026-07-01.md` (engineering, 2026-07-01, main HEAD `361f128` post-#114)
**Ruling authority:** Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457
**Ruling date:** 2026-07-01
**Disposition:** All five decisions ruled in a single filing per §0 recalibration. Full-steam engineering unblocked on both critical paths as of this ruling's timestamp.

---

## §1 — D1 · Produce round-trip architecture · **RULING**

### §1.1 Precedent (binding, do not disturb)

`phase2d_server_core_ack_and_client_wiring_authorization_broker_ruling_2026-06-29.md` §§3–5 already ratified the produce rail:

- Notice body is **client-rendered** (`laProduceServer` naming is misleading; the assertion helper is server-side, the body render is client-side).
- **Verify** is server-side: `POST /api/notice/produce/verify-la`. It is the single load-bearing assertion.
- **Delivery** is server-side and gated by the same assertion: `GET /api/notice/produce/la-packet`.
- Fail-closed posture: no PDF exits the gate without the verify assertion passing.

That architecture is **not being reopened**. The defect engineering found is not in the ratified rail — it is in the **chat-side handoff into the ratified rail**. Two concrete bugs, both upstream of verify-la and la-packet:

1. Review-step "Generate" issues a **GET navigation** to `/api/notice/produce/from-chat`, which is **POST-only**. Navigations are GETs; this cannot ever succeed.
2. `from-chat` in turn posts to `/api/notice/produce` (root), which **has no route handler**. Only the `verify-la`, `la-packet`, `sm`, and `verify-la` subroutes exist.

Neither of those is an architecture question. Both are wiring defects against the already-ratified architecture.

### §1.2 Ruling

**Option:** repoint from-chat to the ratified rail. **DO NOT** create a new `/api/notice/produce` root handler. **DO NOT** move the body render server-side.

**Concrete requirements PR-A3 must satisfy:**

1. **Review-step "Generate" becomes a POST**, not a navigation. It carries `intendedServiceDate` in the request body along with whatever payload the produce path already requires. No `<a href>`, no `router.push`, no window navigation. Explicit `fetch(..., { method: 'POST', ... })` against the from-chat endpoint (or its replacement per §1.2.3 below).
2. **`from-chat` continues to accept POST** and is amended to (a) validate `intendedServiceDate` presence + range (matches PR-A2 validator; delegate, do not duplicate), (b) hand off to the client-render surface with the assertion + payload intact.
3. **The `/api/notice/produce` root defect is closed by deletion of the dangling POST call, not by adding a route.** `from-chat` must call **directly into the ratified rail** — `verify-la` for assertion, `la-packet` for delivery. If `from-chat` currently uses an intermediary POST-to-root, remove the intermediary and inline the two ratified calls (or a thin server helper that fans out to them). No new user-facing endpoint. No new server-side body renderer.
4. **The client-render surface remains client-render.** The Review-step page, on successful POST response from from-chat, renders the notice body client-side against the confirmed intake payload + `intendedServiceDate` per PR-A2's triple-coherence invariant (`Dated = serviceDate = intendedServiceDate`). No round-trip to a server body-renderer.
5. **Verify + Delivery gate stays load-bearing.** No path may reach a PDF without passing `verify-la`. The old GET-navigation code path had no gate at all (it would have 405'd before reaching one). The new POST path must be traced end-to-end through verify-la → la-packet in a Playwright test before the PR merges.

### §1.3 Why not the alternative (server body-renderer)

Engineering offered "create `/api/notice/produce` (server body-producer)" as an alternative. I am **rejecting** that alternative for two reasons:

1. It would supersede the Phase 2d ratification without new compliance basis. The client-render posture was chosen deliberately: it keeps the produce path testable in the browser, keeps the PDF fingerprint stable across environments, and keeps the assertion helper as the single source of truth. Moving the render server-side scatters the source-of-truth surface.
2. It doubles the surface PR-B (D3) has to defend. PR-B's stale-facial-dates guard is scoped to the serve-time boundary. If produce moves server-side, PR-B has to defend both the client body and a new server body renderer. That is churn without benefit.

### §1.4 Locked-prose and citation obligations

PR-A3 touches produce/from-chat. It **does not introduce new user-facing prose** — the Review-step already carries `intendedServiceDateExplainer` (locked from PR-A2, hash `62872b7c…35a7b2`). PR-A3 is pure wiring + method change + validator delegation.

Verbatim citation comments required in the diff:

- In from-chat handler, at the point where `intendedServiceDate` is validated: `// intendedServiceDate validated per broker ruling 2026-07-01 §1.2(2); delegates to PR-A2 validator (lib/produce/intendedServiceDate.ts). Do not duplicate range/back-date logic here.`
- In the Review-step Generate handler, at the fetch call: `// POST per broker ruling 2026-07-01 §1.2(1); GET-navigation superseded (was 405 against POST-only endpoint). Carries intendedServiceDate from PR-A2 UI capture.`
- At any deletion of the dangling `/api/notice/produce` root POST call: `// Dangling POST to /api/notice/produce (no route) removed per broker ruling 2026-07-01 §1.2(3). Ratified rail is verify-la (POST) + la-packet (GET); no root handler exists or will be created.`

### §1.5 Sequencing (PR-A3 lands before PR-B)

PR-A3 lands **before** PR-B (D3). PR-B's serve-time guard reads the produced notice's facial dates against actual service date; that read path presupposes the produce round-trip actually reaches a produced notice. Building PR-B against a broken produce rail creates untestable code.

Order: **PR-A2 (in flight) → PR-A3 (D1 fix) → PR-B (D3) → PR-C (D4)**.

### §1.6 Surface-as-fork triggers for PR-A3

Engineer escalates rather than deciding if any of the following surface:

- The client-render surface cannot be reached from the from-chat POST response without a server-side body render step. (Would mean the ratified rail has a gap that Phase 2d didn't catch — I need to hear that immediately.)
- `verify-la` or `la-packet` reject the payload shape that from-chat produces after the method change. (Would mean a schema drift between the from-chat handoff and the ratified rail — I need to see the delta before we resolve it.)
- The Playwright end-to-end trace can pass verify-la but never reach la-packet delivery. (Would mean the delivery gate has a client-side dependency that the test can't satisfy — surface it, don't work around it.)

---

## §2 — D2 · Gate-2 ops go-ahead · **AUTHORIZED**

I am authorizing the §3.2 / §3.3 / §3.4 / G14 §6 chain to proceed on the operator side in parallel with PR-A3. Explicit sub-authorizations:

### §2.1 §3.2 env provisioning — **PROCEED**

I will personally execute the Vercel env writes for the two criticals (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`) plus the remainder of the checklist (`CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, Notion/automation/broker/analytics/Resend/internal-invoke, GA4 test stream on Preview, `RTC_REFRESH_SECRET` in Supabase, Preview-only test-infra vars). **Classifier flags remain untouched pending D5.** Engineering: no action; this is operator work.

### §2.2 §3.3 branch protection — **PROCEED**

I will toggle the 17 compliance guards to Required on `main`. Engineering: keep `verify-branch-protection.mjs` ready; expect me to invoke it for the 17/17 confirmation after the toggle.

### §2.3 §3.4 clean E2E re-attestation — **PRE-AUTHORIZED countersign**

E1–E4 are built per the E2E deviations ruling. When engineering files the re-issued attestation packet, I countersign on receipt provided the packet mechanism matches E1–E4 as-built (per §4.12 closure-artifact verification rule). No new ruling needed unless the packet diverges from the ratified mechanism.

### §2.4 G14 §6 countersign + Gate-2 runbook execution + closure artifact

Same pre-authorization posture: countersign on receipt of the closure artifact if it matches the runbook mechanism. §4.10 execute/verify separation applies — engineering executes the runbook, I verify the closure artifact against as-built.

### §2.5 Non-blocking of PR-A3

Path α (Gate-2) and Path β (produce round-trip) are independent. Nothing in D2 blocks D1. Nothing in D1 blocks D2. Engineering proceeds on PR-A3; I proceed on env + branch protection.

---

## §3 — D3 · PR-B scope confirm · **CONFIRMED, sequenced after PR-A3**

PR-B (serve-time stale-facial-dates guard) is confirmed in scope and locked-prose per the field-placement/B1 ruling of 2026-06-30. Verbatim guard block hash **`d6684b26…cbf4f96d`** (386 chars) ships with PR-B.

**Sequencing:** PR-B builds **after** PR-A3 merges. Reason per §1.5 — PR-B reads the produced notice's facial dates against actual service date, and that read path presupposes a working produce round-trip. Do not start PR-B branch work until PR-A3 is on `main`.

PR-B still needs to reference the ratified serve-flow surface. If that surface is materially touched by PR-A3 (it should not be — PR-A3 is chat→produce, not produce→serve), engineer surfaces as fork before PR-B branch opens.

---

## §4 — D4 · PR-C + cron pinned-forms add · **AUTHORIZED**

### §4.1 PR-C (LAHD post-service checklist + optional pre-filled cover sheet)

Authorized to build. Sequencing: **after PR-B**. Reason: PR-C's post-service checklist depends on the serve-time boundary that PR-B defines; the two ship as a defensive pair against the day-count/filing-obligation surface.

Broker prose for the checklist will be authored in a separate ruling filed against PR-C branch open. Engineer: open the PR-C branch when PR-B lands, tag me for prose, I file within 24h of tag.

### §4.2 Cron `0abb46c4` — add `eviction_filing_cover_sheet` to pinned-forms list

I will edit cron `0abb46c4` this week to add:

```
form_slug: eviction_filing_cover_sheet
URL: [current LAHD URL for Rev 2.6.2026]
basis: LAHD eviction filing cover sheet Rev 2.6.2026 — required companion to 3-day notice filing per lahd_eviction_filing_cover_sheet_and_3day_count_defect_broker_ruling_2026-06-30.md
```

Engineering: no action. This is a cron edit, operator work.

---

## §5 — D5 · Phase 3c `CLASSIFIER_AUDIT_LIVE` provenance reconciliation · **PARALLEL, DEFERRED FILING**

Engineering files the Phase 3c reconciliation packet within 1–2 weeks per the gate-2 flag-state ruling §4. I rule ratify-retro vs roll-back on receipt. **Non-blocking of everything above.**

**Do not touch classifier flags pending my ruling on that filing.** That standing directive from the flag-state ruling §3 remains in force.

If the audit-substrate alerts fire before the packet lands, engineer escalates immediately and I move D5 to critical-path with same-day filing.

---

## §6 — Operator items still binding (carried forward, unchanged)

- **DO NOT SERVE** the existing Clifton Alexander Jul-2 notice (5537 La Mirada Ave Unit 202). Regenerate on the actual service day for face-correct dates. Note per the engineering filing: until PR-A3 lands, generation must occur on the intended service day for the face to be correct — the intendedServiceDate UI carries the invariant but the produce round-trip is broken. If Clifton service moves before PR-A3 lands, I generate manually against the day-of.
- Continue non-flag §3.2 env provisioning per §2.1 above.
- Do not touch classifier flags pending D5.

---

## §7 — Recommended execution sequence (adopted)

1. **PR-A2** finishes and merges. (In flight — engineering is on branch `pr-a2/intended-service-date-wiring-and-ui`.)
2. **PR-A3** starts immediately on PR-A2 merge. Scope per §1.2 above.
3. **§3.2 env provisioning** proceeds in parallel today/tomorrow (operator, me).
4. **§3.3 branch protection** toggles when §3.2 completes (operator, me).
5. **§3.4 re-attestation** filed by engineering; I countersign on receipt.
6. **G14 §6** countersign + Gate-2 runbook execution + closure artifact.
7. **PR-B** starts on PR-A3 merge.
8. **PR-C** starts on PR-B merge; I file prose within 24h of PR-C branch open tag.
9. **Cron `0abb46c4`** edit this week for eviction_filing_cover_sheet.
10. **Phase 3c reconciliation** files within 1–2 weeks; I rule on receipt.

Path α and Path β run genuinely in parallel. Nothing in the sequence forces engineering to wait on me for a ruling before starting the next PR.

---

## §8 — Attestation posture reminder

Per §4.10 / §4.11 / §4.12: execute/verify separation, pre-gate readiness vs gate-closure separation, closure-artifact verification bars match as-built mechanism. All Gate-2 closure work must produce attestation packets whose mechanism claims match the as-built rail. I will not countersign closure artifacts whose mechanism sections drift from the ratified rail.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-07-01
