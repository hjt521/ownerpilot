# Lane 2 Founder Execution Cheat Sheet — 2026-08-04

Use this from a macOS zsh terminal. The script generates the JSON body fresh on every run and never requires hand-editing JSON.

## 1. Clone or enter the repository and check out the Lane 2 branch

```zsh
gh repo clone hjt521/ownerpilot  # or: cd existing checkout
cd ownerpilot
git fetch origin
git checkout lane7/product-forms-refresh-2026-08-04
git pull
```

## 2. Export the Production secret into the current shell only

Choose one method. Do not echo the secret and never commit it.

### Option A — Vercel CLI

```zsh
export AUTOMATION_LOG_SECRET="$(vercel env pull --environment=production /dev/stdout 2>/dev/null | grep '^AUTOMATION_LOG_SECRET=' | cut -d'=' -f2- | tr -d '\"')"
```

### Option B — secure direct paste

```zsh
read -s AUTOMATION_LOG_SECRET && export AUTOMATION_LOG_SECRET
```

Paste the secret and press Enter. `read -s` prevents the pasted value from being displayed.

### Option C — 1Password CLI

```zsh
export AUTOMATION_LOG_SECRET="$(op read 'op://<vault>/<item>/<field>')"
```

The script itself does not invoke `vercel` or `op`; it only reads the already-exported environment variable.

## 3a. Dry-run first

```zsh
DRY_RUN=1 ./scripts/lane2/post_lane2_completion.sh
```

The dry-run prints the generated eight-field JSON body, the effective Production URL, the redacted curl command, and a structured result block. It does not send an HTTPS request.

## 3b. Execute the live POST

```zsh
./scripts/lane2/post_lane2_completion.sh
```

To override the recorded scheduler timestamp:

```zsh
SCHEDULER_TS='2026-08-04T21:00:00.000Z' ./scripts/lane2/post_lane2_completion.sh
```

To override the target URL only when necessary:

```zsh
TARGET_URL='https://ownerpilot.vercel.app/api/automation/log' ./scripts/lane2/post_lane2_completion.sh
```

## 4. Paste the structured result block into the Perplexity Computer reconciliation session

The script prints:

```text
================ LANE 2 POST RESULT ================
run_date:       <UTC ISO timestamp>
scheduler_ts:   <scheduler timestamp>
target_url:     <effective URL>
http_code:      <HTTP status>
response_body:  <exact response body>
cron_id_sent:   cron_5_lahd_forms
status_sent:    partial
changes_found:  17
report_link:    https://github.com/hjt521/ownerpilot/pull/339
=====================================================
```

Paste that entire block back into the Perplexity Computer reconciliation session.

## 5. Finish Lane 2 after verification

After Perplexity confirms the Production Notion row and prepares the final attestation placeholder-fill commit, countersign PR #339 and squash-merge it.

## Exit-code meanings

| Exit code | Meaning |
|---:|---|
| `0` | Dry-run completed, or live POST returned HTTP 2xx with exact body `{"ok":true}`. |
| `2` | Local preflight failure: missing secret or required command. |
| `10` | HTTP 2xx returned, but the body was not exactly `{"ok":true}`. |
| `20` | HTTP 401 authentication failure; verify the Production `AUTOMATION_LOG_SECRET`. |
| `30` | HTTP 403 ownership-gate failure; confirm `cron_id` remains `cron_5_lahd_forms`. |
| `40` | Any other non-2xx HTTP response. |
| `50` | Network, DNS, TLS, or other curl transport failure. |

The structured result block is printed for every live outcome, including failures.

## Security cleanup

Never commit, paste into chat, or store the value of `AUTOMATION_LOG_SECRET` in a file. When finished, remove it from the current shell:

```zsh
unset AUTOMATION_LOG_SECRET
```

## Contract references

- Eight-field `RunRecord` POST contract and Founder execution posture: `docs/compliance/lane7_automation_log_post_lane2_completion_2026-08-04.md`
- Shipped schema source: `lib/automation/types.ts`
- Founder-executable script: `scripts/lane2/post_lane2_completion.sh`
