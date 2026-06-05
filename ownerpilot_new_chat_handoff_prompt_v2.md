# OwnerPilot AI — project handoff v2 (paste this to start a new chat)

_Updated 2026-06-05, after Stage-1 / Defect #1 landed green and the test suite was
brought current. Supersedes the earlier handoff._

You are picking up a pair-programming engagement on **OwnerPilot AI**, a California
**3-Day Notice to Pay Rent or Quit** generator (expanding toward a full late-rent
workflow — see the RiskPath appendix). I'm Jack (GitHub `hjt521`), a CA licensed
real-estate broker. My spouse is a **CA-licensed attorney** who verifies all legal
content. We work in a tight build → verify → deliver loop. Read this whole file
before doing anything; then ask what to work on next (or I'll tell you).

---

## 0. The one rule that governs everything

**The build side never authors or self-certifies California legal text, and never
finalizes tenant-facing copy.** You render attorney-approved, build-locked text
**verbatim**. Once she signs off on a piece of face/prose, the renderer's per-branch
prose constants *are* the legal artifact — immutable until a new ruling changes them.

- Never invent, paraphrase, "improve," or broaden legal wording or a legal gate.
- If you spot an inconsistency in a ruling, **flag it — don't silently fix it.**
- Attorney-approved operator/UI copy (error strings, interstitials, helper text) is
  also locked; changes need a one-line note to her, not an edit.
- **Anything sent to a tenant** (e.g. the RiskPath courtesy-reminder SMS templates)
  is legal-adjacent and goes through her before it can ship. Drafts are fine to build
  against; sending is gated.
- When unsure whether something is legal text vs. plumbing, assume legal text and ask.

Workflow: I describe a need or upload an attorney "ruling" (a markdown doc). You build
+ verify in the sandbox, deliver changed files to `/mnt/user-data/outputs/` **mirroring
repo paths**, and I download, `mv` them in, run the authoritative suites, and send
screenshots. Keep responses concise; minimal formatting.

---

## 1. Product + stack

- CA 3-Day Notice to Pay Rent or Quit. Guided multi-step intake → compliant notice +
  proof-of-service guidance. Expanding into a persistent late-rent workflow (RiskPath).
- **Next.js 16 / React 19 / TypeScript / Tailwind v4 / Supabase**, repo `~/ownerpilot`,
  branch `main`.
- **Today the notice flow is pure in-memory `useState`.** No persistence of
  notice/payment/bank data, no tenant-facing surface, no storage. The only DB write in
  the tree is `lib/tracking.ts` (a `users.referring_source` attribution write — does
  not touch notice/payment data). Supabase files are **auth-only** (`@supabase/ssr`
  triplet). **The RiskPath track (appendix) changes this** — it is the first
  persistence layer + first tenant-facing surface + SMS. Treat that as a major
  architectural shift, gated on the items in §5.D.

---

## 2. How verification works (rebuild this in a new chat)

A new chat starts with a **clean sandbox**; the prior mirror/tooling doesn't persist.
Have me upload the files you need, then reconstruct:

1. **Strict `tsc` on the logic subset.** Create `tsconfig.libcheck.json` (`strict`,
   `noEmit`, `moduleResolution:"Bundler"`, `skipLibCheck`, `types:[]`) including:
   `lib/flow/advancement.ts`, `lib/flow/gates.ts`, `lib/flow/escalation.ts`,
   `lib/flow/noticeFlowState.ts`, `lib/produce/renderNotice.ts`,
   `lib/dates/computeCompliancePeriod.ts`, `lib/payments/validatePaymentBranch.ts`.
   They import each other (+ `lib/jurisdiction/detectJurisdiction.ts`,
   `lib/dates/holidays.ts`) via **relative paths**, so they typecheck together if all
   are uploaded. `npx tsc -p tsconfig.libcheck.json --noEmit`.
2. **JSX syntax check** of `components/notice-flow.tsx` via a node script running
   TypeScript's `transpileModule` (the component isn't in the tsc subset).
3. **Behavioral / suite runs with `tsx`** (`npx tsx <file>`). Put harnesses at the
   **repo root** so `./lib/...` imports resolve. Gotchas: `evaluateCanProduceV4` throws
   if `data.dispute` is undefined (pass a cleared dispute screen); `renderNotice` takes
   `{ data, dates }`; field names are `tenantNames`, `rentPeriods[].{periodStartDate,
   periodEndDate,amount}`, `baseRentOnlyConfirmed`, `paymentBranch` ∈
   `'mail_only'|'in_person_and_mail'|'bank_deposit'`, `landlordContact.{name,phone,
   streetAddress}`. **Sandbox caveats:** the sandbox's `holidays.ts` is a stub (so
   `gates.test.ts`, which reads `CA_JUDICIAL_HOLIDAYS[2026]` at import, can't run here),
   and the sandbox's `V4_WORDING_SIGNED_OFF` and `NOTICE_TEMPLATE_VERSION` differ from
   the real repo. To verify sign-off-dependent tests in-sandbox, temporarily flip
   `V4_WORDING_SIGNED_OFF=true` and restore after.

**The authoritative test run is mine**, via `tsx`, on my machine:

| suite | command | current |
|---|---|---|
| escalation | `npx tsx lib/flow/escalation.test.ts` | 27/0 |
| payment branch | `npx tsx lib/payments/validatePaymentBranch.test.ts` | 34/0 |
| advancement | `npx tsx lib/flow/advancement.test.ts` | 33/0 |
| gates (legacy) | `npx tsx lib/flow/gates.test.ts` | 45/0 |
| gates v4 | `npx tsx lib/flow/gates.v4.test.ts` | 21/0 |

Plus full `npx tsc --noEmit` clean. There is **no** `npm test` runner. (There's an older
`validatePaymentMethods.test.ts` superseded by the 34-test `validatePaymentBranch`
suite — don't resurrect the old one.)

---

## 3. Key files (repo paths)

- `components/notice-flow.tsx` (~2300 lines) — intake UI. Steps: `PreflightDispute`,
  `PropertyIdentification`, `Tenants`, `AmountOwed`, `PaymentInstructions`(=`PaymentStep`),
  `LandlordAgentInfo`(=`LandlordStep`, Step 3 — now the **two-stage landlord-identity
  capture**), `Review`(=`ReviewStep`), `ServiceInstructions`(=`ServiceStep` + `ReServePanel`).
  `inputClass` is module-level. `update` accepts `Partial<NoticeFlowData> | ((d)=>Partial)`.
  `FieldLabel`'s `htmlFor` is **optional** (group/legend labels over radio groups).
- `lib/flow/noticeFlowState.ts` — `NoticeFlowData`, `FlowStep`, `RentPeriod`,
  `LandlordContact`, `ServiceAttempt`, `createFlowState()`. **Stage-1 identity types:**
  `LandlordIdentity` (discriminated union individual|entity), `EntityType`,
  `SignerCapacity` (canonical, replaces `signerRole`), `signerTitle`,
  `landlordIdentityConfirmed`, and the helper `legacySignerRole(capacity)`.
  Legacy `signerRole` is **retained as a derived value** feeding the unchanged renderer.
- `lib/produce/renderNotice.ts` — `NOTICE_PROSE` (13 build-locked face constants),
  `renderNotice({data,dates})`, `signerRoleLabel()`. **Face-coupled and locked.** Reads
  derived `signerRole` for the individual signature block. Has audit-only fields
  `landlord_type`/`signer_capacity`/`signer_title` (Defect #1 §1.4). Entity signature
  rendering is **not built** (Defect #3).
- `lib/produce/buildNoticeHtml.ts` — styled 2-page HTML for print + in-app preview.
- `lib/flow/escalation.ts` — snapshot/staleness/signing-date; reads derived `signerRole`.
- `lib/flow/gates.ts` (~590 lines) — `evaluateCanProduce` (legacy) +
  `evaluateCanProduceV4` (authoritative, used by the UI). Signer checks key on
  `signerCapacity` (insider = `owner`|`officer_member_trustee`). **Type-based entity
  gate** (`LANDLORD_TYPE_UNCONFIRMED` + `ENTITY_LANDLORD_NOT_SUPPORTED`) replaced the
  retired suffix gate. Parked `TODO(attorney-ruling-2026-06-05)` to log entity-block
  fires once an audit sink exists.
- `lib/flow/advancement.ts` — `validateStep`; `LandlordAgentInfo` validates the
  two-stage capture; `PaymentInstructions` is fully v4 (`landlordContact`+`paymentBranch`).
- `lib/payments/validatePaymentBranch.ts` — v4 payment validator; `EFT_REQUIRES_
  NON_EFT_PRIMARY` guard.
- `lib/flow/templateVersion.ts` — `V4_WORDING_SIGNED_OFF = true` (wording is LIVE);
  `NOTICE_TEMPLATE_VERSION` starts `v4-`.
- `lib/flow/landlord.fixture.ts` — **shared TEST fixture** (`individualLandlord()`,
  `entityLandlord()`). Single source of the capacity→legacy-`signerRole` mapping for
  tests; when Defect #3 removes `signerRole`, update this once and the suites follow.

---

## 4. Completed & signed-off (do not redo)

- **EFT-not-sole guard**, attorney-verbatim error string (closed).
- **Part E** bank account-number interstitial (sticky dismissal); account number never
  persisted / no tenant surface; `FINANCIAL_INSTITUTION` production released. Two
  **forward triggers** registered: (1) persisted storage, (2) tenant surface — both
  **activated by the RiskPath track**, so they need her sign-off before that ships.
- **Review-step bank attestations** factored into a shared `BankDepositAttestations`
  component (single source, verbatim labels).
- **Service guidance / B1 signing-date-vs-service-date split**, attorney-verbatim.

### Corporate / entity-landlord track
- Rulings 1–3 (`corporate_landlord_attorney_ruling_2026-06-04.md` + round-2/round-3).
  Interim suffix gate built then **retired**; broadened gate **shelved** (false-positives
  on co-owners). Round 3 chose Option 3: ship Stage-1, keep individual production live.
- Step-4 "Name to receive payment" **helper text** (attorney-verbatim, includes "consult
  counsel") shipped.
- **Stage-1 / Defect #1 — FULLY LANDED + GREEN.** Step 3 is a two-stage capture
  (individual vs entity → branch-specific fields: entity legal name + type + signer
  title + entity capacity, or individual capacity). `signerCapacity` is canonical;
  `signerRole` derived for the unchanged individual face. **Entity production is gated**
  (`ENTITY_LANDLORD_NOT_SUPPORTED`) until Defect #3; the attorney's Round 1 §5.2 Option A
  interstitial renders verbatim when "entity" is selected. Full `tsc` clean; all five
  suites green (160 assertions).
- **Test-suite remediation (done alongside Stage-1).** The gate/advancement suites had
  drifted across three signed-off migrations (B1 dates, v4 payment, Stage-1) because
  they weren't in the regular run. Brought current via the shared `landlord.fixture.ts`
  helper. The **gates.v4 wording-sign-off tests were rewritten** to reflect
  `V4_WORDING_SIGNED_OFF = true` (now assert "valid config produces" instead of "blocked
  by pending sign-off") — a deliberate change to a legal-gate's test coverage, made with
  my confirmation that sign-off is intentionally true.

---

## 5. Remaining work to launch

### A. Finish the entity-landlord track
1. **Defect #2 — Step-4 payee derivation.** Derive the §1161(2) "Name to receive payment"
   from `landlordIdentity` (entity legal name, or individual owner name(s)), with an
   override checkbox when payee ≠ landlord. Removes the current temporary duplication and
   is where the individual owner-name(s) field belongs.
2. **Defect #3 — entity signature renderer. CLOSED (attorney countersign 2026-06-05).**
   Renders `[Entity legal name] / By: [name], [title]` beneath the signature rule. The
   locks are **two locked face constants** (`entitySignatureByLabel = "By:"`,
   `entitySignerTitleJoiner = ", "`) **+ one locked validation rule**
   (`signerTitleRequired = true` for entity landlords, enforced at intake and re-checked
   in `evaluateCanProduceV4`) — NOT three face-prose constants (the earlier "3 locked
   constants" wording was a misread; there is no missing third string). This **lifted the
   entity production gate** (`ENTITY_LANDLORD_NOT_SUPPORTED` removed) and the legacy
   derived `signerRole` is **fully removed** — the individual face now derives its role
   label from `signerCapacity`, and `landlord.fixture.ts` was updated once. The
   `buildNoticeHtml` entity layout landed as a styling follow-up that consumes the same
   locked prose. **NOTE:** entity production AND the Defect #2 payee derivation should not
   go LIVE until the Step-4 UI cutover lands (held on the helper-disposition ruling).

### B. Pending attorney close-out notes (I send; you can draft)
- Stage-1 / Defect #1 schema-implementation review (flag: `signerRole` retained as a
  derived value, removed in Defect #3; individual owner-name → Step-4 link deferred to #2).
- FYI: the wording-sign-off gate's tests were updated when wording went live.
- (Older, likely already closed: EFT item #1; Review-attestation placement.)

### C. Hard-deadline + standing backlog
- **E2 — 2027 holiday table. HARD DEADLINE 2026-11-01.** The date engine **throws** on
  2027 service/compliance dates without the verified 2027 CA court-holiday set. Correctness
  blocker, independent of everything else.
- B3 multi-method wording lock; C1 Step-3 reword; D1 attorney retention/SBN on the notice;
  Google Address Validation API (replaces free-text address; feeds jurisdiction);
  375px mobile QA.

### D. RiskPath™ feature track (NEW — see appendix for the full spec)
The attached product spec (Courtesy Reminder + Follow-Up + Service Completion &
Re-Engagement) is the concrete realization of the long-deferred "persistence + audit
sink + service re-engagement" backlog item. **It is the biggest architectural change on
the roadmap.** Before/while building it, these gates apply:
- It introduces **persistence** (Supabase Postgres + RLS) and an **audit sink**
  (`audit_events`) — which lights up Part E forward-trigger #1 *and* the parked
  entity-block logging in `gates.ts`. **Part E forward-trigger #2 (tenant surface)** is
  also activated by the courtesy reminder.
- **Tenant-facing SMS templates** (24h/48h) are legal-adjacent (they reference the CA
  3-day notice + legal process) — **attorney review required before any tenant send.**
  Build the generate-and-copy MVP first; gate actual sending.
- **SMS = TCPA + A2P 10DLC + consent** obligations (the spec's `consents` table + Phase 3
  compliance checklist). Surface for legal/compliance review; don't ship SMS sending
  without it.
- **Data-security:** Part E established that the bank account number is never persisted
  today. If RiskPath persists notices, honor that — do **not** persist raw account
  numbers (mask or omit), and keep sensitive data out of resume-link URLs (the spec
  already requires signed, short-lived, non-guessable tokens with login before sensitive
  downloads).
- **Sequencing is my call**, not assumed: weigh RiskPath Phase 1 against finishing the
  corporate-landlord track (Defects #2/#3) and the E2 hard deadline.

---

## 6. Recurring gotchas

- **Download-name traps.** Browser appends `-2`/`2` on re-downloads; once a `-2` even
  ended up in the `mv` *destination*. Always `ls -lt ~/Downloads`, verify names, and make
  the destination the **real repo path**.
- **Grep verification** needs single-line distinguishers (phrases spanning a source
  string-concatenation line break falsely return 0).
- **zsh eats inline `#` comments** — don't paste `# expect N` after commands (it runs `#`,
  `expect`, `N` as commands). And don't paste two commands on one line without a newline
  (`mv … notice-flow.tsxcd …` happened).
- Deliver files mirroring repo paths under `/mnt/user-data/outputs/`; present files (not
  folders), most-relevant first, short summary.

---

## 7. Files to re-upload when we resume

On request I'll upload: the Stage-1 set (`notice-flow.tsx`, `noticeFlowState.ts`,
`advancement.ts`, `gates.ts`, `renderNotice.ts`), the test set + helper
(`landlord.fixture.ts`, `advancement.test.ts`, `gates.test.ts`, `gates.v4.test.ts`,
`escalation.test.ts`, `validatePaymentBranch.test.ts`), logic-subset deps
(`escalation.ts`, `computeCompliancePeriod.ts`, `validatePaymentBranch.ts`,
`detectJurisdiction.ts`, `holidays.ts`, `templateVersion.ts`), and relevant rulings.

**Suggested first move:** confirm with me whether we're continuing the entity track
(**Defect #2**, then the **Defect #3** countersign packet) or starting **RiskPath
Phase 1** (persistence + courtesy-reminder generate/copy + Open RiskPaths dashboard +
audit events) — and remember the E2 holiday deadline (2026-11-01) sits behind all of it.

---
---

# APPENDIX — RiskPath™ feature spec (product brief for the build)

> This is the product/business write-up for the next feature track. It is **not
> attorney-approved legal text**. Build against it as a spec, but the tenant-facing
> pieces (the two SMS templates, any tenant-visible copy) and the SMS/consent/compliance
> machinery are gated on attorney + compliance review per §0 and §5.D. Persistence,
> the audit sink, and the tenant surface activate the Part E forward triggers.

**App:** OwnerPilot.AI — "AI-Powered Property Guidance, Backed by Real Expertise."
**Framework:** Prevent · Document · Resolve. **System:** OwnerPilot RiskPath™.
**Goal:** OwnerPilot shouldn't just create a notice — it should keep the landlord on
track until the issue is documented, completed, or escalated. Persona: 50+ CA property
owner who wants simple guidance, reminders, and organized records.

**Stack for this track:** Next.js, Supabase (Postgres, Auth, Storage), Row Level
Security, Tailwind/existing styling, clean mobile-first UI.
**Brand colors:** deep forest `#102018`, forest `#1F3D2E`, muted gold `#B48944`, warm
ivory `#F8F5EF`, soft sage `#8FAE9C`, white/cream. Premium, calm, trustworthy, simple,
not dark-mode, not cluttered, not generic SaaS.

## Feature 1 — RiskPath™ Courtesy Reminder
A pre-notice option to send the tenant a courtesy rent reminder before serving a formal
3-day notice. Three choices: **Send 24-Hour Reminder**, **Send 48-Hour Reminder**,
**Skip Reminder**.

Flow: confirm tenant first name / landlord name / month-unit / balance owed / deadline
date-time / tenant phone (if SMS) → "Would you like to send a courtesy reminder before
preparing formal notice service?" → three cards → preview (placeholders filled) → Copy
Message / Mark as Sent / Save Reminder / Proceed to Notice Workflow.

**MVP = generate + copy.** OwnerPilot generates the message; the landlord copies and
sends from their own phone; they can Mark as Sent so it's logged. Add architecture hooks
for OwnerPilot-sent SMS later, but don't require it for MVP.

**SMS templates — DRAFT, attorney review required before any tenant send. Use verbatim
once approved:**

_24-hour:_ "Hi [Tenant first name] — this is [Landlord name]. Rent for [month/unit] is
past due. Please pay the full balance of $[amount] by [time, e.g., 6:00 PM tomorrow,
Friday June 5]. If it isn't paid by then, I'll have a formal three-day notice to pay rent
or quit served, which starts a legal process under California law. If you've already paid
or if there's an issue, please reply to this message so we can sort it out today. Thank
you."

_48-hour:_ "Hi [Tenant first name] — this is [Landlord name]. Rent for [month/unit] is
past due. Please pay the full balance of $[amount] within the next 48 hours, by [time and
date]. If it isn't paid by then, I'll have a formal three-day notice to pay rent or quit
served, which starts a legal process under California law. If you've already paid or if
there's an issue, please reply to this message so we can sort it out. Thank you."

UI copy — Title: "RiskPath™ Courtesy Reminder"; Subtitle: "Give your tenant one clear
chance to pay before formal notice service begins."; Helper: "Choose a 24-hour or 48-hour
rent reminder. OwnerPilot will save the message and keep the issue record organized."
Buttons: Send 24-Hour / Send 48-Hour / Skip / Copy Message / Mark as Sent / Proceed to
Notice Workflow. After marked sent → card "Courtesy reminder logged" / body about saving
it + proceeding if unpaid / CTA "Proceed to Notice Workflow" / secondary "Wait for Tenant
Response."

## Feature 2 — RiskPath™ Follow-Up
"OwnerPilot keeps the issue moving until the record is complete." Detects unfinished
workflows and shows a clear next step. Unfinished examples: reminder generated-not-sent;
reminder sent + deadline passed; notice generated-not-served; attempt started-not-completed;
posting/substituted logged but mailing date missing; service log incomplete; final packet
not downloaded.

**Open RiskPaths dashboard** — each card: issue type · property/unit · tenant · status ·
next step · due/deadline · CTA. Example: "Late Rent — Unit 320 / Courtesy reminder sent /
Check payment or proceed to formal notice / Due today 6:00 PM / Continue RiskPath." Other
next-step cards: log next attempt, add mailing date, mark complete, download packet,
proceed to notice, close as resolved, prepare review packet. Sequence: Next Step →
Reminder → Record → Escalation Trigger → Completion Packet.

## Feature 3 — Service Completion & Re-Engagement
Persist an in-progress notice + service log and bring the user back over several days to
record attempts and complete service. Generating the notice is one session; serving it is
not.

Service statuses: notice_generated, service_not_started, service_in_progress,
personal_attempt_logged, substituted_service_pending_mailing, post_and_mail_pending_mailing,
mailing_logged, service_complete, incomplete, abandoned, closed_resolved.
Attempt outcomes: personally_served_tenant, no_answer, tenant_refused, tenant_not_home,
left_with_suitable_adult, posted_on_door, mailed_copy, other.
Methods: personal_service, substituted_service, post_and_mail, mail_only_if_applicable, other.

Journey: notice generated → "You're not done yet…" → Serve now / Remind me later / Assign
to someone else / Download packet → create service plan (who serves, first attempt
date-time, reminder preference, email, phone) → service log saved → Follow-Up next-step
card → log each attempt → schedule next on failure → mailing reminder for
substituted/post-and-mail → final completion packet.

Attempt-logging screen (mobile-first) "What happened on this attempt?" with the outcome
options above; fields: date, time, method, outcome, server name, location, notes, optional
photo, mailing date if applicable. Final packet: notice summary, attempt timeline, method,
mailing date, server info, notes, photos, audit trail, proof-of-service support doc,
download button.

## Database (Supabase Postgres + RLS — users access only their own rows)
- **properties**(id, user_id, address, unit, city, state, zip, created_at, updated_at)
- **tenants**(id, user_id, property_id, first_name, last_name, phone, email, …)
- **late_rent_cases**(id, user_id, property_id, tenant_id, rent_month, amount_due, status,
  opened_at, resolved_at, …) — status ∈ open, courtesy_reminder_draft,
  courtesy_reminder_sent, notice_ready, notice_generated, service_in_progress,
  service_complete, resolved, abandoned
- **courtesy_reminders**(id, user_id, property_id, tenant_id, late_rent_case_id,
  notice_id?, reminder_type, tenant_first_name, landlord_name, month_unit, amount_due,
  deadline_at, tenant_phone, generated_message, delivery_mode, status, copied_at, sent_at,
  skipped_at, …)
- **notices**(id, user_id, property_id, tenant_id, late_rent_case_id, notice_type,
  notice_status, generated_at, document_url, …)
- **service_logs**(id, user_id, property_id, tenant_id, late_rent_case_id, notice_id,
  service_status, current_method, assigned_server_name, assigned_server_phone,
  first_attempt_scheduled_at, mailing_required, mailing_completed_at, completed_at,
  proof_packet_url, …)
- **service_attempts**(id, user_id, service_log_id, attempted_at, method_attempted,
  outcome, server_name, location, notes, photo_url, …)
- **riskpath_tasks**(id, user_id, late_rent_case_id, property_id, tenant_id, task_type,
  title, description, status, due_at, cta_label, cta_url, priority, …, completed_at) —
  task_type ∈ courtesy_reminder, payment_check, prepare_notice, serve_notice, log_attempt,
  log_mailing, complete_service, download_packet, close_issue, escalation_review; status ∈
  open, completed, dismissed, expired, abandoned
- **reminders**(id, user_id, riskpath_task_id, service_log_id?, courtesy_reminder_id?,
  channel, scheduled_at, sent_at, status, stopped_reason, message_template,
  provider_message_id, …) — channel ∈ email, sms_later, in_app, calendar_later
- **consents**(id, user_id, phone, sms_opt_in, opt_in_timestamp, opt_in_language_snapshot,
  sms_opt_out_at, …)
- **audit_events**(id, user_id, entity_type, entity_id, action, metadata, ip_address,
  created_at) — this is the **audit sink** the parked `gates.ts` logging + Part E
  trigger #1 wait on.

## Security
Supabase Auth + RLS, own-rows-only. Audit-log: reminder generated/copied/marked-sent/
skipped, notice generated, service log created, attempt logged, mailing logged, service
completed, packet downloaded, reminder sent, workflow resumed. **Resume links:**
`/resume/riskpath/[token]`, 24–72h expiry, maps to a task/service_log, non-guessable, **no
tenant name/address/amount/bank info in the URL**, login required before sensitive
downloads.

## Reminder system
MVP channels: in-app + email. Later: SMS, calendar. Logic: send only if task open; stop on
completed/resolved/dismissed/opted-out; log every attempt; surface incomplete tasks on the
dashboard. (Reminder copy examples in the original brief.)

## Pages/components
Late Rent Case `/dashboard/late-rent/[caseId]`; Courtesy Reminder component; Open RiskPaths
`/dashboard/riskpaths`; Service Log `/dashboard/service-log/[serviceLogId]`; Log Attempt
modal (mobile-first); Completion Packet page; Resume page `/resume/riskpath/[token]`.

## Rollout phases
1. Persistent `late_rent_cases`; Courtesy Reminder copy-to-send + mark-sent; Open
   RiskPaths dashboard; audit log; basic service-log persistence.
2. Email reminders; resume links; incomplete-task dashboard; attempt timeline; mailing
   alerts.
3. SMS infra hooks; `consents`; **A2P/TCPA compliance checklist for legal review**; tenant
   reply capture; delivery status.
4. Delegated service link (property manager / process server) + limited role; photo
   uploads; completion-packet PDF.
5. RiskPath analytics; conversion metrics; repeat workflows; pricing/paywall.

North-star metric: **Completed Service Record Rate.** (Other success metrics in the
original brief.)

## What a builder should produce first (per the brief)
Summarize the feature (10 bullets) → DB changes → routes/pages/components → assumptions →
phased plan; then prioritize **Phase 1** (persistent cases, courtesy reminder copy-to-send,
mark-sent, saved reminder, Open RiskPaths dashboard, basic service-log persistence, audit
events). Keep it modular for SMS + full reminder automation later.
