# Deploy-Readiness Capstone — Acceptance + External-Inputs Ruling

**Filed:** 2026-06-29 20:10 PT
**Status:** Engineering build complete. This filing accepts the staged work, ratifies the magic-link email body, authors the courtesy-reminder addendum copy, and rules on the SM rent-registration data source — clearing every remaining broker-side block before the deploy.
**Authority:** Sole broker filing covering capstone acceptance + the three external inputs. No further rulings needed before JT executes the land sequence in §4 of the capstone doc.

**Receives:**
- `DEPLOY_READINESS_AND_LAND_SEQUENCE_2026-06-29.md` (engineering capstone)
- `G1_G8_omnibus_pre_ruling_2026-06-29.md` (G1/G7 clauses authored, all gates cleared)
- `omnibus_open_items_broker_determination_2026-06-29_PT1845.md` (Lane sequencing + SM Phase B)
- All prior settlements (38 locked-prose entries + 22 unified triggers + 8 CI guards)

---

## 1. Capstone acceptance

Engineering's staged build is **accepted as complete** for everything within engineering's writable scope. The verification ledger in §7 of the capstone (≈110 assertions across the pure-logic modules, 0 failures, strict tsc clean, Guards A–H proven on pass+fail paths) is sufficient evidence for pre-deploy acceptance. Runtime evidence (synthetic A14/A15 + Playwright E2E) gets captured at preview-deploy time and folded into the per-Lane attestation packets at PR-open.

**Branch inventory accepted** as listed in §1 of the capstone:
- `ai-first-chat-rebuild` — chat engine + riskpath + documents + jurisdiction + email + safety + 17 app routes + 7 components + 5 migrations + e2e suite
- `workstream-c/decision2-broker-confirm` — Lane 5 normalize/freshness/token/schemas + 4 endpoints + edge fn + 2 guards
- `workstream-e/analytics-section-q` — Lane 6 analytics + privacy + Guard G + privacy_requests migration
- `workstream-f/automation-section-p` — Lane 7 automation + mirrorScrubber + queueDrain + Crons #9/#10/#11 + migration 027 + 2 guards + full ci.yml with all 8 guards (A–H)

**Migration renumbering reconciliation accepted** per §3 of the capstone: chat-rebuild keeps 026 (attested SHA — do NOT renumber). Cross-branch collisions on 027/028 reconcile to next-free global slots at merge per the tombstone discipline. Engineering applies the reconciliation at land time; broker does not need to pre-rule the specific numbers — the tombstone rule is the rule.

**CI guard inventory accepted:** A (locked-prose), B (sla-sync), C (normalize-identical), D (analytics-no-pii), E (banned-terms), F (fetch-binding), G (pre-consent-analytics), H (mirror-denylist). All eight wired in `ci.yml`. Pass+fail mode each proven this session.

## 2. External Input 1 — Courtesy-Reminder Addendum copy (AUTHORED)

Engineering flagged that `app/riskpath/courtesy-reminder` ships with `[BROKER COPY REQUIRED]` placeholders for the per-tone message templates, and the `028_courtesy_reminders.tone` constraint is a placeholder pending tone-set ratification. Authoring below — engineering wires.

### Tone set (locked)

Three tones for v1: `friendly`, `firm`, `formal`. The `028_courtesy_reminders.tone` column constraint locks to these three string values. No `casual`, no `urgent`, no per-jurisdiction tone variants in v1.

### Per-tone message templates (locked prose, byte-exact)

**Manifest IDs (engineering adds to `lib/lockedProse/manifest.json`):**

#### `COURTESY_REMINDER_FRIENDLY_V1`

> Hi {{tenant_first_name}}, this is a friendly reminder that the rent payment of {{amount_due}} for {{property_address}} was due on {{due_date}}. If you've already sent it, thank you — please disregard. If not, would you let me know when I can expect it? I'd rather hear from you than not. Thanks. — {{owner_first_name}}

#### `COURTESY_REMINDER_FIRM_V1`

> {{tenant_first_name}}, the rent payment of {{amount_due}} for {{property_address}}, due on {{due_date}}, has not been received as of {{current_date}}. Please send the payment or contact me with a specific date you'll send it. If I don't hear back, I'll need to consider next steps under the lease. — {{owner_first_name}}

#### `COURTESY_REMINDER_FORMAL_V1`

> {{tenant_first_name}}: Rent for {{property_address}} in the amount of {{amount_due}} was due on {{due_date}}. As of {{current_date}}, the payment has not been received. Please remit the amount due, or respond in writing with the date you intend to remit. This message is a courtesy reminder only and is not a formal notice under California law; nothing in this message waives any right under the lease or under applicable law. — {{owner_first_name}}

### Always-on §2.5 disclaimer (appended to every tone)

**Manifest ID:** `COURTESY_REMINDER_DISCLAIMER_V1`

> This is a courtesy reminder only. It is not a 3-day notice and is not a legal notice under California law. If you need to send a legal notice, OwnerPilot AI can help you produce one.

### Field-slot syntax (locked)

The five `{{...}}` slots are the only permitted interpolations: `tenant_first_name`, `amount_due`, `property_address`, `due_date`, `current_date`, plus `owner_first_name`. No additional slots. No free-text user-supplied insertions inside the templates. The owner can append a free-text postscript on the client side, but it appears **below the locked template + disclaimer** as a clearly demarcated section labeled "Personal note (optional):" — never interleaved with the locked prose.

### §028 migration constraint reconciliation

The `tone` column on `028_courtesy_reminders` updates to a CHECK constraint:

```sql
ALTER TABLE courtesy_reminders
  ADD CONSTRAINT courtesy_reminders_tone_check
  CHECK (tone IN ('friendly', 'firm', 'formal'));
```

If the migration already ships with a placeholder constraint, engineering reconciles in the same PR that wires the locked-prose IDs above. No new migration number needed.

### CI coverage

CI Guard A (locked-prose) covers all four new IDs. A test asserts that the rendered courtesy-reminder text is byte-identical to the locked template after slot substitution, with the disclaimer appended verbatim.

## 3. External Input 2 — `MAGIC_LINK_EMAIL_BODY_V1` (RATIFIED)

Engineering's PROVISIONAL draft is loaded to the manifest. Broker ratification follows. The locked body below replaces any provisional draft in the manifest before deploy.

### `MAGIC_LINK_EMAIL_BODY_V1` (locked prose, byte-exact)

**Subject line:**
> Your OwnerPilot AI claim link

**Body:**

> Hi,
>
> You started a session on OwnerPilot AI and asked us to send you a link to claim it.
>
> Click the link below to access your saved progress and any documents you produced:
>
> {{claim_url}}
>
> This link expires in 30 minutes and can be used only once.
>
> If you didn't ask for this link, you can ignore this email — no action is needed and nothing was sent in your name.
>
> Questions: reply to this email and we'll get back to you.
>
> — OwnerPilot AI
> Operated by Jack Taglyan, California Licensed Real Estate Broker (CalDRE B9445457)

### Slot syntax

One slot: `{{claim_url}}`. No other interpolations. The recipient's name is not echoed. No captured intake field appears in the body. No transcript content appears. The sender domain is fixed (engineering pins at deploy).

### Resend wiring confirmation

Per G6 (already settled): Resend receives only the recipient email + the rendered body above + the fixed sender domain. The raw token is in the `{{claim_url}}` substitution and only there; the database stores the hash. No other PII reaches Resend.

### CI coverage

CI Guard A (locked-prose) covers `MAGIC_LINK_EMAIL_BODY_V1`. A test asserts the body sent to Resend (with `{{claim_url}}` substituted) is byte-identical to the locked source.

## 4. External Input 3 — SM rent-registration data source (RULING)

Engineering's `lib/jurisdiction/smRentRegistration.ts` ships **fail-closed pluggable**: SM produce blocks until a real RCB (Santa Monica Rent Control Board) registry lookup is wired. This is the correct posture — same as the LA parcel-health fail-closed pattern.

### Data source determination

**Primary source (canonical):** Santa Monica Rent Control Board property database. The RCB maintains a public-records database of registered units; engineering wires a HTTP adapter against the RCB's data export or query endpoint.

**Adapter contract (engineering implements):**

- Input: normalized SM property address (street number + street name + unit if applicable, post-resolver output)
- Output: `{ registered: true | false, registration_id: string | null, last_verified_at: ISO timestamp, source: 'rcb_v1' }`
- Failure mode: any non-200 response, parse error, or timeout returns the existing fail-closed behavior (SM produce blocked, surfaced to broker review)
- Cache: 24-hour TTL on positive results, no cache on negative results (negatives must re-query in case registration completed since last check)

**Wiring acceptance:** engineering authorized to wire against whichever RCB endpoint is operationally available — the broker does not need to pre-approve specific URL paths or API contracts. The fail-closed posture means a bad endpoint blocks SM produce rather than producing incorrect output, so the worst case is graceful degradation to broker review.

**If no RCB endpoint exists or is unreachable:** SM v1 ships with the fail-closed default permanently engaged until an endpoint becomes available. SM produce routes 100% to broker review in that scenario, which is acceptable for v1 — broker review with the full intake captured is still a usable product surface; it just isn't auto-produce.

**Surface on the user-facing path:** when SM produce blocks on rent-registration check, the user-facing copy is:

**Manifest ID:** `SM_PRODUCE_BLOCKED_PENDING_REGISTRATION_CHECK_V1`

> We can't produce this notice automatically right now because we need to verify the rent-registration status of your Santa Monica property with the Santa Monica Rent Control Board. Your information is saved. A reviewer will contact you within one business day with next steps.

### Engineering build authorization

Engineering proceeds with the RCB adapter wiring whenever it fits the SM v1 timeline. Until wired, the fail-closed default + the manifest entry above is the production behavior. No further broker pings on the wiring — surface only a §0 fork if the RCB data source itself surfaces a compliance issue (e.g. the RCB exposes PII engineering would need to handle, or the data quality is so poor that fail-closed becomes the steady state rather than a transitional posture).

## 5. Land sequence — broker confirmation

The §4 land sequence in the capstone is accepted as the deploy plan. Restating the broker-relevant checkpoints:

1. **Master §R paste** — corrected block lands in `claude_code_master_prompt_ai_first_rebuild_2026-06-28.md`; amendment renamed `_APPLIED.md`. Broker action: paste at land time, single commit.
2. **Branch hygiene** — stash on `la-phase2d`, cut four branches from `main@5942d7b`. Broker confirms `5942d7b` is the SHA before cutting.
3. **Copy staged files** — engineering knows what goes where; broker executes the file moves.
4. **Supabase preview branch + migrations** — apply 023–030 per §3 reconciliation; verify RLS posture (no public policy on `magic_link_tokens`, `automation_mirror_queue`, `privacy_requests`).
5. **Synthetic + E2E runs** against preview — A14/A15 scripts + Playwright. Evidence fills attestation packets.
6. **Lane 6 atomicity PR** — `GoogleAnalytics.tsx` deletion + consent path + footer mount + 4-state Network capture per `lane6_ga4_deletion_runtime_qa_checklist_2026-06-29.md`.
7. **Provision secrets** — `GA4_API_SECRET`, Cookiebot CBID, GA4 custom dimensions, `RESEND_API_KEY`, `PERPLEXITY_API_KEY`, `NEXT_PUBLIC_*` envs.
8. **Per branch CI green → PR → attestation packet → soak → broker countersign → flip behind env flag.** Soak windows: Lane 5/7 = 14d, Lane 6 = 7d.
9. **Lane 5 merges first** → SM resolver-refactor integration → SM v1 soak.

Broker countersign happens at PR-open time per the established discipline. The omnibus rulings already in the workspace are the SSOT for compliance gates; engineering does not re-surface gates already settled.

## 6. Group 6 SM v1 post-merge wiring

Per §6 of the capstone, the one remaining integration pass after Lane 5 merges is:

- Point existing `detectJurisdiction` at `resolveCityFromLocality` / `cities.ts` so SM addresses resolve to `santa_monica` instead of `not_la`
- Bind `resolveSmForm()` into the shared `DocumentRender` html→pdf util

**No new ruling needed.** Omnibus §5 settled the SM jurisdiction rules; G7 settled the SM clause prose. The integration is purely engineering wiring. Surface a fork only if the resolver refactor reveals a contract change against the unified-trigger taxonomy or the locked-prose manifest.

## 7. What this ruling does NOT do

- Authorize edits to the 5 locked disclaimers, the 7 G1 clauses, the 3 G7 SM clauses, or any other previously locked-prose entry
- Authorize bypass of the fail-closed SM rent-registration gate (the gate is the gate)
- Authorize SF Phase C work (still deferred until SM v1 ships)
- Authorize touching Phase 2D freeze-zone files before 2026-07-02 18:51 UTC
- Authorize public RLS policies on `magic_link_tokens`, `automation_mirror_queue`, or `privacy_requests`
- Override the migration-tombstone discipline (chat 026 keeps its number; collisions reconcile to next-free global slots)

## 8. Discipline going forward

Engineering hand-off is complete. The next broker filing is **at PR-open countersign time per Lane**, not before, unless a genuine §0 fork surfaces during the land sequence. Engineering surfaces only forks with real compliance consequence — implementation details, preview deploy mechanics, secret provisioning, CI run-time tuning, migration syntax inside the tombstone-respecting rules — engineering's call.

The build is as far as it goes without a deploy. JT executes §4 of the capstone. When the preview is up, engineering runs the synthetic + E2E against it and fills the attestation packets. Broker countersigns each Lane at PR-open. Then the soak windows. Then the flips.

---

## 9. Acknowledgment

Engineering's execution across this session — from the §R taxonomy unification through the 8 CI guards through the SM resolver layer through the deploy-readiness capstone — was clean, dependency-disciplined, and surfaced forks at the right altitude. The pattern (build forward, surface real §0 forks only, batch related items into omnibus rulings, fail-closed on external integrations) is exactly the operating posture this platform needs. Noted.

---

— Jack Taglyan / California Licensed Real Estate Broker / CalDRE B9445457 / Broker Compliance Review · 2026-06-29
