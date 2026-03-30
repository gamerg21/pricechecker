#!/usr/bin/env bash
# Smoke-test the sync API contract (run against a running server).
# Usage:
#   ./scripts/verify-sync-contract.sh [BASE_URL]
# Examples:
#   ./scripts/verify-sync-contract.sh http://127.0.0.1:3100
#   SYNC_API_KEY=secret ./scripts/verify-sync-contract.sh http://127.0.0.1:3100
set -euo pipefail

BASE="${1:-http://127.0.0.1:3100}"
URL="${BASE%/}/api/sync/products"

hdr=(-H "Content-Type: application/json")
if [[ -n "${SYNC_API_KEY:-}" ]]; then
  hdr+=(-H "x-sync-key: ${SYNC_API_KEY}")
fi

body='{"page_of_records":[{"internalId":"verify-1","UPC Code (Variant)":"012345678905","Display Name":"Sync Verify","Item Name (Variant)":"VERIFY-SKU","Sales Description":"Contract test","Price (Variant)":1.23}]}'

echo "POST ${URL}"
code=$(curl -sS -o /tmp/pricechecker-sync-out.json -w "%{http_code}" -X POST "${hdr[@]}" -d "$body" "$URL")
cat /tmp/pricechecker-sync-out.json
echo
if [[ "$code" != "200" ]]; then
  echo "Expected HTTP 200, got ${code}" >&2
  exit 1
fi
echo "OK: sync contract returned 200"
