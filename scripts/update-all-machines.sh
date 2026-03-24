#!/bin/bash
set -euo pipefail

# Load env vars
source "$(dirname "$0")/../.env"

APP="$FLY_APP_NAME"
TOKEN="$FLY_API_TOKEN"
IMAGE="${1:-ghcr.io/adrienbarb/postclaw-agent:latest}"
API="https://api.machines.dev/v1"

echo "Updating all machines in app '$APP' to image: $IMAGE"
echo ""

# List all machines
MACHINES=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/apps/$APP/machines")
MACHINE_IDS=$(echo "$MACHINES" | python3 -c "import json,sys; [print(m['id']) for m in json.load(sys.stdin)]")

TOTAL=$(echo "$MACHINE_IDS" | wc -l | tr -d ' ')
echo "Found $TOTAL machines to update."
echo ""

i=0
for MID in $MACHINE_IDS; do
  i=$((i + 1))

  # Get current config
  CURRENT=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/apps/$APP/machines/$MID")
  CURRENT_IMAGE=$(echo "$CURRENT" | python3 -c "import json,sys; print(json.load(sys.stdin)['config']['image'])")
  STATE=$(echo "$CURRENT" | python3 -c "import json,sys; print(json.load(sys.stdin)['state'])")

  echo "[$i/$TOTAL] Machine $MID (state: $STATE, current: $CURRENT_IMAGE)"

  # Build updated config: swap image + set OVERWRITE_SOUL=true
  UPDATED_BODY=$(echo "$CURRENT" | python3 -c "
import json, sys
m = json.load(sys.stdin)
config = m['config']
config['image'] = '$IMAGE'
if 'env' not in config or config['env'] is None:
    config['env'] = {}
config['env']['OVERWRITE_SOUL'] = 'true'
print(json.dumps({'config': config}))
")

  # Update the machine
  RESULT=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$UPDATED_BODY" \
    "$API/apps/$APP/machines/$MID")

  HTTP_CODE=$(echo "$RESULT" | tail -1)
  BODY=$(echo "$RESULT" | sed '$d')

  if [ "$HTTP_CODE" = "200" ]; then
    NEW_STATE=$(echo "$BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('state','unknown'))" 2>/dev/null || echo "unknown")
    echo "  -> Updated successfully (new state: $NEW_STATE)"
  else
    echo "  -> FAILED (HTTP $HTTP_CODE)"
    echo "  -> $BODY" | head -3
  fi

  # Small delay between updates to avoid rate limiting
  sleep 2
done

echo ""
echo "Done. All $TOTAL machines updated."
