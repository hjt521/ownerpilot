# OwnerPilot AI — project handoff v3 (paste this to start a new chat)

_Updated 2026-06-05, end of the session that closed the corporate-landlord track (Defects #1/#2/#3 countersigned), verified the 2027 holiday table, and landed the §1.2 wording-lock clerical updates. Supersedes handoff v2._

You are picking up a pair-programming engagement on **OwnerPilot AI**, a California **3-Day Notice to Pay Rent or Quit** generator (expanding toward a late-rent workflow — RiskPath — and now also a Claude-powered help chatbox). I'm Jack (GitHub `hjt521`), a CA-licensed real-estate broker. My spouse, **Janna Taglyan, JD, SBN 269639**, is the CA-licensed attorney who verifies all legal content. We work in a tight build → verify → deliver loop. Read this whole file before doing anything, then ask what to work on (or I'll tell you).

---

## 0. The one rule that governs everything

**The build side never authors or self-certifies California legal text, and never finalizes tenant-facing or legal-adjacent copy.** You render attorney-approved, build-locked text **verbatim**. Once she signs off a piece of face/prose, the renderer's per-branch prose constants *are* the legal artifact — immutable until a new ruling changes them.

- Never invent, paraphrase, "improve," or broaden legal wording or a legal gate.
- If you spot an inconsistency in a ruling or between code and a ruling, **flag it — don't silently fix it.** (This held under pressure this cycle on the §1.2 wording question and was the right call.)
- Attorney-approved operator/UI copy (error strings, interstitials, helper text) is locked; changes need a one-line note to her, not an edit.
- **Anything shown to a tenant or any AI-generated legal-adjacent output** (the RiskPath SMS templates; the help chatbox's answers) goes through her before it ships. Drafts are fine to build against; the live path is gated.
- When unsure whether something is legal text vs. plumbing, assume legal text and ask.

Workflow: I describe a need or upload an attorney "ruling" (a markdown doc). You build + verify in the sandbox, deliver changed files to `/mnt/user-data/outputs/` **mirroring repo paths**, and I download, `mv` them in, run the suites, and screenshot. Browser downloads land flat in `~/Downloads` (watch the `-2` rename trap); each file `mv`s to its real repo path, one command per line. **Give me step-by-step Terminal directions every time** (one command per line; zsh eats inline `#` comments). Keep responses concise.

---

## 1. Product + stack + infrastructure

### Product
CA 3-Day Notice to Pay Rent or Quit. Guided multi-step intake → compliant notice + proof-of-service guidance + styled HTML/print. Expanding into (a) a persistent late-rent workflow (RiskPath) and (b) a Claude-powered help chatbox.

### Stack
**Next.js 16 / React 19 / TypeScript / Tailwind v4 / Supabase**, repo `~/ownerpilot`, branch `main`. The notice flow is currently pure in-memory `useState` — no persistence of notice/payment/bank data. The only DB write today is `lib/tracking.ts` (a `users.referring_source` attribution write). Supabase is **auth-only** so far.

### Infrastructure (NO secrets in this doc — keys/tokens live in env vars and the dashboards)
- **GitHub:** account `hjt521`. SSH key auth configured (MacBook Pro key, added 2026-05-25). No GPG keys; vigilant mode off. Repo hosts `~/ownerpilot` on branch `main`.
- **Hosting — Vercel:** the app deploys on Vercel (Cloudflare A record points to Vercel's `76.76.21.21`; `www` CNAME → Vercel). Project config is managed via the Vercel dashboard / REST API (`https://api.vercel.com/v9/projects/{idOrName}`, PATCH, bearer token). Access token is NOT stored here.
- **Database/Auth — Supabase:** project **"Ownerpilot.ai"** (org OwnerPilot.ai, **Free** tier). URL `https://txpetdrfsmqnyooydmas.supabase.co`. Region `us-west-1` (West US / N. California), compute **NANO** (`t4g.nano`), branch `main` (PRODUCTION), status Healthy. **No migrations, no backups, no GitHub repo connected yet** → the DB is essentially empty; only auth is wired (`@supabase/ssr` triplet). The RiskPath track is what populates this (see §6). `NEXT_PUBLIC_SUPABASE_URL` is the URL above; the anon and service-role keys live in env only.
- **DNS — Cloudflare:** zone `ownerpilot.ai`, account `Jack@butlered.com`, Free plan, "DNS Setup: Full," proxying **OFF** (DNS-only) on the records. 10 records total: `A ownerpilot.ai → 76.76.21.21` (Vercel), `CNAME www → *.vercel`, `MX → aspmx.l.google.com` + `alt1...` (Google Workspace email). **SPF and DMARC are not yet configured** — Cloudflare is flagging both; adding them is a backlog item (email-deliverability/anti-spoofing), not legal-gated.
- **Email:** Google Workspace on `ownerpilot.ai` (MX → Google).

### The help chatbox (NEW — built with the Claude API; NOT yet reviewed by the build side)
There is a Claude-API-powered help chat in the app (seen running at `localhost`). Current state: a single-pane chat UI, opening line **"Hi — I'm OwnerPilot. I help California property owners think through the tricky stuff. What's going on?"**, a "Type your question…" input + Send button, and a disclaimer banner: **"OwnerPilot is an AI tool, not a lawyer. It provides general information from a California-licensed real estate broker. It is not legal advice. For legal advice about your situation, you choose and engage your own California-licensed attorney directly."**

**⚠️ HIGH-PRIORITY §0 FLAG (review before any non-dev deploy):** a free-text AI chatbox that helps CA property owners "think through the tricky stuff," sitting one tab over from the 3-day-notice generator, is a significant new legal-risk surface — it can emit unreviewed legal-adjacent text, which is exactly what the whole engagement is built to prevent. The disclaimer is present (good) but is not sufficient on its own. The build side has **not** seen the chatbox's code, system prompt, or guardrails. Before this goes anywhere near production it needs: (a) attorney review of the system prompt + guardrails; (b) hard scope boundaries (general info only, never generate notice/face text or case-specific legal advice in the chat, route actionable requests into the structured notice flow); (c) the disclaimer (present); (d) a decision on whether chat transcripts are persisted (ties into the same data-security posture as Part E / RiskPath — no sensitive data in logs/URLs). Treat its live answers as gated tenant/consumer-facing output under §0.
(There is also an in-progress service-step branch — a tab titled "ServiceStep: render attorney-approved CCP 1162 service…" — status unknown to the build side; confirm scope on resume.)

---

## 2. How verification works (rebuild this in a new chat)

A new chat starts with a **clean sandbox**; nothing persists. Have me upload the files you need, then reconstruct:

1. **Strict `tsc` on the logic subset.** Create `tsconfig.libcheck.json` (`strict`, `noEmit`, `moduleResolution:"Bundler"`, `skipLibCheck`, `types:[]`) including: `lib/flow/advancement.ts`, `lib/flow/gates.ts`, `lib/flow/escalation.ts`, `lib/flow/noticeFlowState.ts`, `lib/flow/templateVersion.ts`, `lib/flow/landlord.fixture.ts`, `lib/produce/renderNotice.ts`, `lib/dates/computeCompliancePeriod.ts`, `lib/dates/holidays.ts`, `lib/payments/validatePaymentBranch.ts`, `lib/jurisdiction/detectJurisdiction.ts`. They import via relative paths and typecheck together. Run `npx tsc -p tsconfig.libcheck.json`.
2. **`tsconfig.scriptcheck.json`** (same + `lib:["ES2022","DOM"]`) to typecheck `scripts/*.ts` (a generator once slipped a type error past libcheck).
3. **Behavioral suites with `tsx`** (`npx tsx <file>`), harnesses at repo root so `./lib/...` resolves.
4. **`components/notice-flow.tsx` is NOT in the tsc subset** (needs React/Next types). The only backstop for it is **my full `npx tsc --noEmit` on my machine** — so any field rename/removal that touches the UI write path won't show up in your sandbox. Always have me run the full `tsc` after such changes. (`buildNoticeHtml.ts` imports `./noticeAssets` (inlined data URIs), which is also not in the subset; stub it locally for a render-test if needed, never deliver the stub.)

### Authoritative suite counts (current, all green)
| suite | command | count |
|---|---|---|
| holidays | `npx tsx lib/dates/holidays.test.ts` | 18/0 |
| renderNotice | `npx tsx lib/produce/renderNotice.test.ts` | 32/0 |
| escalation | `npx tsx lib/flow/escalation.test.ts` | 27/0 |
| payment branch | `npx tsx lib/payments/validatePaymentBranch.test.ts` | 34/0 |
| advancement | `npx tsx lib/flow/advancement.test.ts` | 36/0 |
| gates (legacy) | `npx tsx lib/flow/gates.test.ts` | 45/0 |
| gates v4 | `npx tsx lib/flow/gates.v4.test.ts` | 26/0 |

**Total 218 assertions, plus full `npx tsc --noEmit` clean.** There is no `npm test` runner. `lib/payments/validatePaymentMethods.ts` is the superseded legacy validator — don't resurrect its old test.

---

## 3. File inventory (repo paths)

**UI**
- `components/notice-flow.tsx` (~2300 lines) — intake UI. Steps: PreflightDispute, PropertyIdentification, Tenants, AmountOwed, PaymentInstructions (=PaymentStep, Step 4), LandlordAgentInfo (=LandlordStep, Step 3, two-stage identity capture), Review, ServiceInstructions. `update` accepts `Partial<NoticeFlowData> | ((d)=>Partial)`. Capacity radios write only `signerCapacity` (no more `signerRole`).

**Flow logic** (`lib/flow/`)
- `noticeFlowState.ts` — `NoticeFlowData`, `FlowStep`, `RentPeriod`, `LandlordContact`, `ServiceAttempt`, `createFlowState()`. Identity types: `LandlordIdentity` (individual|entity union), `EntityType`, `SignerCapacity` (canonical). `payeeIsNonLandlord`/`payeeOverrideName` (Defect #2). `landlordContact.name` is `@deprecated` (kept optional). **`signerRole` fully removed.**
- `advancement.ts` — `validateStep`. Entity intake requires `signerTitle` (Defect #3 §1).
- `gates.ts` (~600 lines) — `evaluateCanProduce` (legacy) + `evaluateCanProduceV4` (authoritative). Entity gate **lifted** (no `ENTITY_LANDLORD_NOT_SUPPORTED`); `LANDLORD_TYPE_UNCONFIRMED` + `SIGNER_TITLE_REQUIRED` (entity, fail-closed) + `PAYEE_NAME_UNRESOLVED` (Defect #2) remain. `TEMPLATE_NOT_SIGNED_OFF` gated by `V4_WORDING_SIGNED_OFF`.
- `escalation.ts` — snapshot/staleness; uses `signerCapacity`.
- `templateVersion.ts` — `NOTICE_TEMPLATE_VERSION`, `V4_WORDING_SIGNED_OFF = true` (LOCKED 2026-06-04, see §4), `GEOCODING_LIVE = false`.
- `landlord.fixture.ts` — shared test fixture (`individualLandlord()`, `entityLandlord()`), `signerCapacity`-only.
- Tests: `advancement.test.ts` (36), `escalation.test.ts` (27), `gates.test.ts` (45), `gates.v4.test.ts` (26).

**Produce** (`lib/produce/`)
- `renderNotice.ts` — `NOTICE_PROSE` (build-locked face constants incl. the four §1161(2) HOW TO PAY sentences, the Defect #2 payee constants, and the two Defect #3 entity constants `entitySignatureByLabel`/`entitySignerTitleJoiner`), `renderNotice({data,dates})`, `derivePayeeName(data)` (single payee-composition site), `signerCapacityLabel()`. Entity signature block built. Audit vars: `payee_name_source`, `landlord_type`, `signer_capacity`, `signer_role` (label).
- `buildNoticeHtml.ts` — styled 2-page HTML for print/preview; entity signature layout landed (consumes the same locked prose).
- `noticeAssets.ts` — inlined logo data URIs (not in the tsc subset).
- `renderNotice.test.ts` (32).

**Dates** (`lib/dates/`)
- `holidays.ts` — CA judicial-holiday tables. **2026 and 2027 both `verified:true`, `verifiedBy:'Janna Taglyan, JD, SBN 269639'`** (2026-05-31 / 2026-06-05). Engine throws on unverified years. `holidays.test.ts` (18).
- `computeCompliancePeriod.ts` — date math (attorney Q4/Q11 settled).

**Other**
- `lib/payments/validatePaymentBranch.ts` (+ `.test.ts`, 34) — v4 payment validator; `EFT_REQUIRES_NON_EFT_PRIMARY` guard. `lib/payments/validatePaymentMethods.ts` — legacy, superseded.
- `lib/jurisdiction/detectJurisdiction.ts` — placeholder until Google Address Validation; LA overlay "coming soon" copy.
- `lib/tracking.ts` — the only DB write (referral attribution).
- `scripts/defect2_signoff_packet.ts`, `scripts/defect3_signoff_packet.ts` — packet generators (run with `tsx`).
- Root: `proxy.ts`, `next.config.ts`, `tsconfig.json`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `app/`, `public/`, `supabase/`.

---

## 4. Completed & signed-off this cycle (do not redo)

- **Defect #1 (Stage-1 landlord identity)** — two-stage Step-3 capture; `landlordIdentity` is source of truth; `signerCapacity` canonical. Countersigned, green.
- **Defect #2 (payee derivation)** — `derivePayeeName` composes the §1161(2) "Payable to:" line from identity (owner-line rules: 1→verbatim, 2→"A and B", 3+→Oxford serial) or `[payee], as agent for [landlord]` on override. Five face constants + three operator strings, all build-locked on countersign. `payableToLabel` ships as `"Payable to"` + `": "` at render (byte-identical; confirmed OK).
- **Defect #3 (entity signature + gate-lift)** — entity face renders `[Entity legal name] / By: [name], [title]`; two locked face constants + one locked validation rule (`signerTitleRequired` for entity, intake + gate). Gate `ENTITY_LANDLORD_NOT_SUPPORTED` removed. `signerRole` fully removed. `buildNoticeHtml` entity layout landed.
- **E2 — 2027 CA holiday table** — verified, `verified:true`, attorney-attributed. 2026 + 2027 both carry her real name + SBN (primary-source verification convention, per her consolidated-review §1.3).
- **§1.2 v4 HOW TO PAY wording** — the four §1161(2) sentences (`mailboxRuleSentence`, `fiveMileSentence`, `bankPaperInstrumentSentence`, `eftElectionSentence`) were **signed off verbatim** by the A1 Part D sign-off (2026-06-03) + countersign (2026-06-04). Comments updated PROPOSED→LOCKED (clerical only; no sentence text changed; flag stays `true`). Ratified.
- **Close-outs §2.1/§2.3** — Defect #1 schema review accepted; EFT-not-sole guard + Review-step `BankDepositAttestations` both retired. (§2.2 gates.v4 test-rewrite ratified, downstream of §1.2.)
- **Signature convention** — attorney rulings/countersigns use a `[Name], [SBN]` placeholder block as the signature of record for build-lock; primary-source verifications (e.g., `holidays.ts`) carry her real name + SBN. (Her consolidated-review §1.3 / Step-4 ruling §4.)

---

## 5. THE NEXT JOB — Step-4 UI cutover (fully authorized, NOT yet built)

This is the single remaining piece to take the corporate-landlord scope live. All rulings are in; it's a `components/notice-flow.tsx` edit plus the deferred logic that rides with it. Do it as one increment with full `tsc` + suites after.

**[MUST FIX] checklist:**
1. **Remove the Round-3 Step-4 helper** `STEP4_ENTITY_NAME_HELPER` (def ~line 880) and its render site (~line 1014). Delete the constant if it has no other consumer.
2. **Add new build-locked constant `entityLegalNameHelper`**, render it under the entity-legal-name input on **Step 3**, scoped to `landlord_type === "entity"`, styled like the rest of Step-3 helper text. **Verbatim (Step-4 helper-disposition ruling §2):**
   > "Enter the entity's full registered legal name as it appears on the deed or Secretary of State filing (e.g., 'PTAG Properties, LLC' — not 'PTAG Prop'). Using a shorthand or DBA on a three-day notice can be challenged in an unlawful-detainer action."
3. **Delete `ENTITY_NOT_SUPPORTED_COPY`** (def ~line 1230) and its Step-3 render site (~line 1479). Delete the constant if it has no other consumer. (Consolidated-review §1.1 — it contradicts the lifted gate.)
4. **Leave the §3.3 unchecked-helper on Step 4 untouched** — it's the sole helper on the payee field after cutover.
5. **Defect #2 payee-derivation UI** — make the Step-4 "Name to receive payment" field **read-only derived** (from Step-3 identity via `derivePayeeName`) by default, with an override checkbox + conditional input. The fields `payeeIsNonLandlord`/`payeeOverrideName` already exist. Three attorney-approved operator strings (verbatim):
   - **§3.1 checkbox label:** "Rent is paid to someone other than the landlord (e.g., a property manager or agent)."
   - **§3.2 checked helper:** "Enter the name of the person or company that receives rent. The notice will show that they are acting as agent for the landlord identified on Step 3."
   - **§3.3 unchecked helper:** "Leave this unchecked if rent is paid directly to the landlord. The payee name on the notice will match the landlord identified on Step 3."
6. **Deferred logic that rides with the UI** (intentionally not yet landed): drop the typed-`contact.name` requirement in `validatePaymentBranch`/`advancement` (validate the override name when override is on instead), and switch the `escalation` snapshot to read `derivePayeeName` so staleness tracks the derived/override name. Update affected fixtures/tests.
7. **Verify:** `grep` for any orphaned references to the two deleted constants (snapshot tests, string matches); then full `npx tsc --noEmit` (this is the real backstop for the `.tsx`), libcheck, scriptcheck, and all suites green.

(The 2027 holiday attribution item from the ruling is already satisfied in code — no-op.)

---

## 6. Remaining roadmap / open items

- **Help chatbox review (HIGH)** — see §1; attorney review of system prompt + guardrails before non-dev deploy; build side hasn't seen the code.
- **RiskPath Phase 1** — biggest architectural change: Supabase persistence + audit sink (`audit_events`) + Open RiskPaths dashboard + Courtesy Reminder (generate-and-copy MVP). Lights up Part E forward triggers (persisted storage + tenant surface) and the parked entity-block audit logging in `gates.ts`. SMS templates (24h/48h) are legal-adjacent — attorney review before any tenant send; TCPA + A2P 10DLC + `consents` are a separate compliance pass. Build the copy MVP; gate sending. (Full spec was the appendix in handoff v2 — re-upload if starting this.)
- **2028 holiday table** — verify before any late-Dec-2027 notice (a count can cross into 2028). Calendar late Q3 2027.
- **Jurisdiction overlay** — `detectJurisdiction.ts` placeholder pending Google Address Validation; LA "coming soon" + local-filing "pending attorney review" copy are known gaps.
- **Backlog (handoff v2 §5.C):** B3 multi-method service wording lock; C1 Step-3 reword; D1 attorney retention/SBN on the notice face; 375px mobile QA.
- **Email auth** — add SPF + DMARC for `ownerpilot.ai` (Cloudflare flagged; deliverability, not legal-gated).
- **Pending uploads (engagement record):** the A1 Part D sign-off (2026-06-03) + countersign (2026-06-04) + `v4_payment_fields_attorney_ruling.md` exist in the attorney's workspace but were never uploaded to the build-side record. §1.2 is closed regardless; file them when convenient for completeness.

---

## 7. Recurring gotchas

- **Download-name traps:** browser appends `-2` on re-downloads; once a `-2` even ended up in the `mv` destination. Always `ls -lt ~/Downloads`, verify names, `mv` to the real repo path, one command per line.
- **Grep verification needs single-line distinguishers** (phrases spanning a string-concatenation line break falsely return 0).
- **zsh eats inline `#` comments** — don't paste `# expect N` after a command; don't put two commands on one line.
- **`.tsx` not in the sandbox tsc subset** — UI breakage from a field rename/removal only shows on my full `npx tsc --noEmit`. Always run it after such changes.
- **Sandbox file provenance:** a couple of files have shown up root-owned with fresh timestamps (environment scaffolding). When in doubt, diff a delivered file against my repo copy before relying on it.
- Deliver files mirroring repo paths under `/mnt/user-data/outputs/`; present files (not folders), most-relevant first, short summary.

---

## 8. Suggested first move

Confirm with me whether we're doing **(a) the Step-4 UI cutover** (§5 — closes the corporate-landlord scope; small surface, all rulings in), **(b) the help-chatbox guardrail review** (§1 HIGH flag — new legal-risk surface), or **(c) RiskPath Phase 1** (§6 — biggest shift, needs the appendix spec re-uploaded). Have me upload the relevant files first; reconstruct the libcheck + `tsx` harness; confirm the seven suites are green (218 assertions) before touching anything. Remember the E2 holiday deadline is de-risked (2027 verified) but 2028 still sits behind any late-2027 notice.

— End of handoff v3 —
