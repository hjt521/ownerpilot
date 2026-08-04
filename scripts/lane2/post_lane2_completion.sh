#!/usr/bin/env bash
set -euo pipefail

# Lane 2 completion Notion mirror POST via the external-caller path.
#
# Provenance:
# - Branch: lane7/product-forms-refresh-2026-08-04
# - PR: #339
# - HEAD at authoring: fc2b453d79ec656ed0601ab13c8c5d1360deca73
# - Founder-executed only; this script is never run by the repository operator.
#
# Usage:
#   DRY_RUN=1 ./scripts/lane2/post_lane2_completion.sh
#   ./scripts/lane2/post_lane2_completion.sh
#
# Contract:
# - Eight-field RunRecord schema documented in:
#   docs/compliance/lane7_automation_log_post_lane2_completion_2026-08-04.md
#
# Secret sourcing:
# - Export AUTOMATION_LOG_SECRET into the current shell before running.
# - Recommended sources include Vercel CLI or 1Password CLI.
# - Never commit, echo, log, or pass the secret as a positional argument.
# - This script does not invoke vercel or op; it only performs the POST.

DEFAULT_TARGET_URL="https://www.ownerpilot.ai/api/automation/log"
DEFAULT_SCHEDULER_TS="2026-08-04T21:00:00.000Z"
REPORT_LINK="https://github.com/hjt521/ownerpilot/pull/339"
CRON_ID="cron_5_lahd_forms"
STATUS="partial"
CHANGES_FOUND=17

TARGET_URL="${TARGET_URL:-$DEFAULT_TARGET_URL}"
SCHEDULER_TS="${SCHEDULER_TS:-$DEFAULT_SCHEDULER_TS}"
DRY_RUN="${DRY_RUN:-0}"

if [[ -z "${AUTOMATION_LOG_SECRET:-}" ]]; then
  cat >&2 <<'EOF'
ERROR: AUTOMATION_LOG_SECRET is unset or empty.
Source the Production value into the current shell, then rerun.
Examples:
  read -s AUTOMATION_LOG_SECRET && export AUTOMATION_LOG_SECRET
  export AUTOMATION_LOG_SECRET="$(op read 'op://<vault>/<item>/<field>')"
Do not commit or paste the secret into chat.
EOF
  exit 2
fi

for required_command in jq curl mktemp date; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "ERROR: required command not found: $required_command" >&2
    exit 2
  fi
done

RUN_DATE="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
BODY_FILE="$(mktemp -t ownerpilot-lane2-body.XXXXXX)"
RESPONSE_FILE="$(mktemp -t ownerpilot-lane2-response.XXXXXX)"
trap 'rm -f "$BODY_FILE" "$RESPONSE_FILE"' EXIT

SUMMARY="[LANE 2 EXECUTION] Lane 2 Product Forms Refresh completed: Cron 0abb46c4 pinned-forms extended from 4 to 19 (Lane 2 Source Packet §1.3 rows #1–#7 and #9–#17 applied; row #8 deduplicated; row #13 already represented by the existing ordinance_187737_text pin at cityclerk.lacity.org under the 2026-07-27 ratification). Row #12 DCBA wildfire FAQ applied with nag-until-removed broker-review flag; retention decision pending. Los Angeles and Santa Monica rent-control landing-page hash changes classified as cosmetic (chore); no broker sign-off required. Documentation-only PR #339 basis HEAD 77a5ec0c2366e6f36a590560925f6bb20ab3984b. Scheduler update executed by Founder in owning session 28e720f4-1cef-4815-bcc0-8a0ea7e3a1c0 at ${SCHEDULER_TS}. Sub-scope 2.C deferred to Lane 3. Lane 3 candidates: producer-state persistence, rent-control target switch, RTC field-level regeneration, and 2026-08-01 diff-truncation limits."

jq -n \
  --arg cron_id "$CRON_ID" \
  --arg cron_name "LAHD forms refresh" \
  --arg cron_category "external_source_watch" \
  --arg status "$STATUS" \
  --arg run_date "$RUN_DATE" \
  --arg summary "$SUMMARY" \
  --arg report_link "$REPORT_LINK" \
  --argjson changes_found "$CHANGES_FOUND" \
  '{
    cron_id: $cron_id,
    cron_name: $cron_name,
    cron_category: $cron_category,
    status: $status,
    run_date: $run_date,
    changes_found: $changes_found,
    summary: $summary,
    report_link: $report_link
  }' >"$BODY_FILE"

print_result() {
  local http_code="$1"
  local response_body="$2"
  printf '%s\n' '================ LANE 2 POST RESULT ================'
  printf 'run_date:       %s\n' "$RUN_DATE"
  printf 'scheduler_ts:   %s\n' "$SCHEDULER_TS"
  printf 'target_url:     %s\n' "$TARGET_URL"
  printf 'http_code:      %s\n' "$http_code"
  printf 'response_body:  %s\n' "$response_body"
  printf 'cron_id_sent:   %s\n' "$CRON_ID"
  printf 'status_sent:    %s\n' "$STATUS"
  printf 'changes_found:  %s\n' "$CHANGES_FOUND"
  printf 'report_link:    %s\n' "$REPORT_LINK"
  printf '%s\n' '====================================================='
}

printf 'target_url: %s\n' "$TARGET_URL"

if [[ "$DRY_RUN" == "1" ]]; then
  printf '%s\n' 'DRY RUN — no HTTPS request will be sent.'
  printf '%s\n' 'Generated JSON body:'
  cat "$BODY_FILE"
  printf '\n%s\n' 'Curl command that would run:'
  printf 'curl -sS -o <response-file> -w %%{http_code} -X POST %q -H %q -H %q --data-binary @<temp-json-file>\n' \
    "$TARGET_URL" \
    'Content-Type: application/json' \
    'x-automation-secret: <AUTOMATION_LOG_SECRET>'
  print_result "DRY_RUN" "not sent"
  exit 0
fi

set +e
HTTP_CODE="$(curl -sS \
  -o "$RESPONSE_FILE" \
  -w '%{http_code}' \
  -X POST "$TARGET_URL" \
  -H 'Content-Type: application/json' \
  -H "x-automation-secret: ${AUTOMATION_LOG_SECRET}" \
  --data-binary "@$BODY_FILE")"
CURL_EXIT=$?
set -e

RESPONSE_BODY="$(cat "$RESPONSE_FILE")"
HTTP_CODE="${HTTP_CODE:-000}"

print_result "$HTTP_CODE" "$RESPONSE_BODY"

if [[ "$CURL_EXIT" -ne 0 ]]; then
  exit 50
fi

case "$HTTP_CODE" in
  2??)
    if [[ "$RESPONSE_BODY" == '{"ok":true}' ]]; then
      exit 0
    fi
    exit 10
    ;;
  401)
    exit 20
    ;;
  403)
    exit 30
    ;;
  *)
    exit 40
    ;;
esac
