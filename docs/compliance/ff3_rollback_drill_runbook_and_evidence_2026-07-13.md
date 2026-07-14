# FF-3 Rollback Drill — Runbook + Evidence — 2026-07-13

Deliverable for `ff3_prod_flip_and_scope_a_closure_omnibus_broker_ruling_2026-07-13.md` §1.3. Proves that
`FF3_CAPTURE_ENABLED=false` cleanly reverts the FF-3 surface to pre-FF-3 behavior and that flipping back restores
it. **Run twice** (ruling amendment): first by **2026-07-20**, second **within 48h before the §1.6 flip
attestation**. Broker-executed (flag flips + Preview runs, §4.13); engineering supplied this runbook + template.

All steps run against the Preview deployment. The flag is currently **on** in Preview (Gate-4 activation).

---

## Procedure (each run)

**Step 1 — Flag-ON baseline.** With `FF3_CAPTURE_ENABLED=true` (current state), run the evidence spec:
```bash
cd ~/ownerpilot && E2E_BASE_URL="<preview-url>" E2E_RUN_ID="$(uuidgen)" TEST_SEED_SECRET="<secret>" \
  SUPABASE_URL="https://txpetdrfsmqnyooydmas.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<key>" \
  npx playwright test ff3-reconciliation-resume --config=e2e/playwright.config.ts --project=desktop --reporter=list
```
Expect **3 passed** (reconciliation fires → escalate → resolve → resume; negative scope-mismatch; pause). Capture output.

**Step 2 — Flip OFF.** In Vercel → Environment Variables → set `FF3_CAPTURE_ENABLED=false` (Preview scope) →
**Redeploy** the Preview. Wait for Ready.

**Step 3 — Verify the surface is dark.** Re-run the same command against the redeployed Preview. Expected: the run
**does not reach the reconciliation card** — the FF-3 scripted walk no longer opens (the `ff3_intake` category is
unregistered with the flag off), so the spec cannot progress past the FF-3 opener. This *expected* stop is the
no-op proof: with the flag off, FF-3 is completely dark and the produce path reverts to pre-FF-3 behavior. Capture
the output showing it does not reach `ff3-reconcile-card`. (Corroborated at the unit level by the flag-off skip
tests and `synthetic:ff3:monitoring` — the chain returns the `skip` disposition when the flag is off.)

**Step 4 — Flip back ON + confirm parity.** Set `FF3_CAPTURE_ENABLED=true` (Preview) → Redeploy → re-run the
command. Expect **3 passed** again — parity with the Step-1 baseline. Capture output.

**Step 5 — Record below.**

---

## Evidence — Run 1 (target ≤ 2026-07-20)

- Date/time (PT): ____
- Preview URL: ____
- Step 1 (flag on) baseline: ☐ 3 passed — paste tail: ____
- Step 3 (flag off) dark: ☐ did not reach `ff3-reconcile-card` — paste tail: ____
- Step 4 (flag back on) parity: ☐ 3 passed — paste tail: ____
- Flag state left at end of run: ☐ `true` (Preview) — **critical: never leave Preview flag off**
- Notes / anomalies: ____

## Evidence — Run 2 (within 48h before the §1.6 flip attestation)

- Date/time (PT): ____
- Preview URL: ____
- Step 1 baseline: ☐ 3 passed — tail: ____
- Step 3 dark: ☐ no reconcile card — tail: ____
- Step 4 parity: ☐ 3 passed — tail: ____
- Flag state left at end: ☐ `true` (Preview)
- Notes: ____

---

## Disposition

On both runs clean, this evidence is referenced in the §1.6 Prod-Flip Attestation Packet as the §1.3 requirement.
Rollback mechanism confirmed: `FF3_CAPTURE_ENABLED` flip is the primary FF-3 containment (on-call addendum §3) —
no code deploy, env change + redeploy, fully reversible.

— Engineering runbook + template · 2026-07-13 · broker-executed per §4.13 · Jack Taglyan / CalDRE B9445457
