#!/bin/bash
set -euo pipefail

# Migration script: Late API -> Zernio
# Renames LATE_* env vars to ZERNIO_* on all Fly machines and updates Docker image.
# Run AFTER the new Docker image (with zernio-cli skill) has been built and pushed.
#
# Usage:
#   ./scripts/migrate-to-zernio.sh [image]
#   ./scripts/migrate-to-zernio.sh                                      # uses :latest
#   ./scripts/migrate-to-zernio.sh ghcr.io/adrienbarb/postclaw-agent:dev  # use :dev

# Load env vars
source "$(dirname "$0")/../.env"

APP="$FLY_APP_NAME"
TOKEN="$FLY_API_TOKEN"
IMAGE="${1:-ghcr.io/adrienbarb/postclaw-agent:latest}"
API="https://api.machines.dev/v1"

echo "=== Late API -> Zernio Migration ==="
echo "App: $APP"
echo "Image: $IMAGE"
echo ""

# List all machines
MACHINES=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/apps/$APP/machines")
MACHINE_IDS=$(echo "$MACHINES" | python3 -c "import json,sys; [print(m['id']) for m in json.load(sys.stdin)]")

TOTAL=$(echo "$MACHINE_IDS" | wc -l | tr -d ' ')
echo "Found $TOTAL machines to migrate."
echo ""

SUCCESS=0
FAILED=0

for MID in $MACHINE_IDS; do
  # Get current config
  CURRENT=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/apps/$APP/machines/$MID")
  CURRENT_IMAGE=$(echo "$CURRENT" | python3 -c "import json,sys; print(json.load(sys.stdin)['config']['image'])")
  STATE=$(echo "$CURRENT" | python3 -c "import json,sys; print(json.load(sys.stdin)['state'])")

  echo "Machine $MID (state: $STATE, image: $CURRENT_IMAGE)"

  # Build updated config: rename env vars + swap image + set OVERWRITE_SOUL
  UPDATED_BODY=$(echo "$CURRENT" | python3 -c "
import json, sys
m = json.load(sys.stdin)
config = m['config']
config['image'] = '$IMAGE'
env = config.get('env') or {}

# Rename LATE_* -> ZERNIO_* (copy value, keep old key for backwards compat in entrypoint)
renames = {
    'LATE_API_KEY': 'ZERNIO_API_KEY',
    'LATE_PROFILE_ID': 'ZERNIO_PROFILE_ID',
    'LATE_ACCOUNTS_CONTEXT': 'ZERNIO_ACCOUNTS_CONTEXT',
}
for old_key, new_key in renames.items():
    if old_key in env and new_key not in env:
        env[new_key] = env[old_key]
        print(f'  -> Renamed {old_key} -> {new_key}', file=sys.stderr)
    elif old_key in env and new_key in env:
        print(f'  -> {new_key} already set, skipping', file=sys.stderr)
    else:
        print(f'  -> {old_key} not found, skipping', file=sys.stderr)

# Remove old keys (entrypoint has backwards compat fallback, but clean is better)
for old_key in renames:
    if old_key in env:
        del env[old_key]
        print(f'  -> Removed old {old_key}', file=sys.stderr)

env['OVERWRITE_SOUL'] = 'true'
config['env'] = env
print(json.dumps({'config': config}))
")

  # Update the machine
  RESULT=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$UPDATED_BODY" \
    "$API/apps/$APP/machines/$MID")

  HTTP_CODE=$(echo "$RESULT" | tail -1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo "  -> Migrated successfully"
    SUCCESS=$((SUCCESS + 1))
  else
    BODY=$(echo "$RESULT" | sed '$d')
    echo "  -> FAILED (HTTP $HTTP_CODE)"
    echo "  -> $BODY" | head -3
    FAILED=$((FAILED + 1))
  fi

  echo ""
  sleep 2
done

echo "=== Migration Complete ==="
echo "Success: $SUCCESS / $TOTAL"
if [ "$FAILED" -gt 0 ]; then
  echo "Failed: $FAILED (re-run script to retry)"
  exit 1
fi
