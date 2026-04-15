# Known Bugs & Fixes

Reference document for debugging user issues. Check here first before investigating from scratch.

---

## 1. Bot stuck saying "pipes are broken" / "no configured channels detected"

**Symptoms:**
- Bot responds with "Channel is required (no configured channels detected)"
- Bot says all platforms are "Not working" even though accounts are connected
- Bot suggests user to "Set up Zernio" themselves
- Bot keeps repeating the same error without retrying

**Root cause:**
OpenClaw cron jobs created with a `delivery` block (e.g. `"delivery": {"channel": "gateway"}`) fail because `"channels": {}` is empty in `openclaw.json`. This is expected — we use Zernio CLI for posting, not OpenClaw native channels. But the bot sees the cron error, wrongly concludes ALL posting is broken, and the conversation history gets poisoned. The LLM then repeats "nothing works" without retrying.

**How to verify:**
Test with a fresh session key — if posting works with a new session but not the user's session, the conversation is poisoned.

```bash
# Test with fresh session (should work)
curl -s -X POST \
  -H "Authorization: Bearer <GATEWAY_TOKEN>" \
  -H "fly-force-instance-id: <MACHINE_ID>" \
  -H "Content-Type: application/json" \
  -H "x-openclaw-session-key: debug-test" \
  "https://postclaw-bots.fly.dev/v1/chat/completions" \
  -d '{"model":"openclaw:main","messages":[{"role":"user","content":"What accounts do I have connected?"}],"stream":false}'
```

**Fix:**

1. **Clear the poisoned session** — SSH into the machine and delete the session entry:
```bash
FLY_API_TOKEN=$FLY_API_TOKEN fly ssh console -a postclaw-bots --machine <MACHINE_ID> -C 'python3 -c "
import json
with open(\"/home/node/.openclaw/agents/main/sessions/sessions.json\",\"r\") as f:
    data = json.load(f)
key = \"webchat:<USER_ID>\"
if key in data:
    del data[key]
    with open(\"/home/node/.openclaw/agents/main/sessions/sessions.json\",\"w\") as f:
        json.dump(data, f)
    print(\"Session deleted\")
"'
```

2. **Delete broken cron jobs** (ones with `delivery` blocks):
```bash
FLY_API_TOKEN=$FLY_API_TOKEN fly ssh console -a postclaw-bots --machine <MACHINE_ID> -C 'python3 -c "
import json
with open(\"/home/node/.openclaw/cron/jobs.json\", \"r\") as f:
    data = json.load(f)
count = len(data.get(\"jobs\", []))
data[\"jobs\"] = []
with open(\"/home/node/.openclaw/cron/jobs.json\", \"w\") as f:
    json.dump(data, f, indent=2)
print(f\"Deleted {count} cron jobs\")
"'
```

3. **Remove misleading workspace files** (optional, prevents re-poisoning):
```bash
FLY_API_TOKEN=$FLY_API_TOKEN fly ssh console -a postclaw-bots --machine <MACHINE_ID> -C "rm -f /home/node/.openclaw/workspace/support-request-message.md /home/node/.openclaw/workspace/automation-setup-status.md"
```

**Prevention:**
- `entrypoint.sh` now auto-strips `delivery` blocks from cron jobs on every startup
- SOUL.md instructs the bot to never include `delivery` blocks in cron jobs

**First occurrence:** April 2026 — User Adontai Mason (gm5iwt3rHoI001FQspwKRQTwZZYvVbsR), machine 6839951a537578

---

## 2. Twitter/X account shows "active" in dashboard but posting fails

**Symptoms:**
- User's Twitter/X shows as connected in the dashboard
- Bot fails to post to Twitter with token errors
- Zernio API shows `isActive: false` for the account

**Root cause:**
Twitter OAuth tokens expire and Zernio marks the account as `isActive: false`, but our DB still shows `status: 'active'` because we don't sync the `isActive` field from Zernio.

**How to verify:**
```bash
# Check Zernio API with user's scoped key
curl -s -H "Authorization: Bearer <USER_ZERNIO_API_KEY>" "https://zernio.com/api/v1/accounts" | python3 -m json.tool
```
Look for `"isActive": false` and `"tokenRefreshError"` on the Twitter account.

**Fix:**
1. Update the account status in our DB:
```sql
UPDATE social_account SET status = 'disconnected', "updatedAt" = NOW()
WHERE "lateAccountId" = '<ZERNIO_ACCOUNT_ID>' AND platform = 'twitter';
```
2. Tell the user to reconnect Twitter/X from `/d/accounts` in the dashboard.

**Future improvement:** Sync `isActive` from Zernio on the callback/polling flow so disconnected accounts show correctly in the dashboard automatically.

---

## Debugging Cheatsheet

### Find user's data
```bash
# Query production DB (use direct URL, port 5432)
psql "postgresql://postgres.ideqdufwcrwbjqzcctsf:<PASSWORD>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Get user + related records
SELECT * FROM "user" WHERE id = '<USER_ID>';
SELECT * FROM fly_machine WHERE "userId" = '<USER_ID>';
SELECT * FROM late_profile WHERE "userId" = '<USER_ID>';
SELECT * FROM subscription WHERE "userId" = '<USER_ID>';
-- Social accounts are linked via late_profile, not directly via userId:
SELECT sa.* FROM social_account sa JOIN late_profile lp ON sa."lateProfileId" = lp.id WHERE lp."userId" = '<USER_ID>';
```

### Check Fly machine
```bash
source .env
# List all machines
curl -s -H "Authorization: Bearer $FLY_API_TOKEN" "https://api.machines.dev/v1/apps/postclaw-bots/machines" | python3 -c "import json,sys; [print(f'{m[\"id\"]} | {m[\"name\"]} | {m[\"state\"]}') for m in json.load(sys.stdin)]"

# Get machine config (env vars, image, etc.)
curl -s -H "Authorization: Bearer $FLY_API_TOKEN" "https://api.machines.dev/v1/apps/postclaw-bots/machines/<MACHINE_ID>" | python3 -m json.tool

# View logs
FLY_API_TOKEN=$FLY_API_TOKEN fly logs -a postclaw-bots -i <MACHINE_ID> --no-tail

# SSH into machine
FLY_API_TOKEN=$FLY_API_TOKEN fly ssh console -a postclaw-bots --machine <MACHINE_ID> -C "<command>"
```

### Test bot directly
```bash
# Chat with bot (use fresh session key for clean test)
curl -s -X POST \
  -H "Authorization: Bearer <GATEWAY_TOKEN>" \
  -H "fly-force-instance-id: <MACHINE_ID>" \
  -H "Content-Type: application/json" \
  -H "x-openclaw-session-key: debug-test" \
  "https://postclaw-bots.fly.dev/v1/chat/completions" \
  -d '{"model":"openclaw:main","messages":[{"role":"user","content":"<message>"}],"stream":false}'
```

### Check Zernio accounts
```bash
curl -s -H "Authorization: Bearer <USER_ZERNIO_API_KEY>" "https://zernio.com/api/v1/accounts" | python3 -m json.tool
```
