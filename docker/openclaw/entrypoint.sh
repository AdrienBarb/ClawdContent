#!/bin/sh
set -e

CONFIG_DIR="$HOME/.openclaw"
CONFIG_FILE="$CONFIG_DIR/openclaw.json"
SOUL_FILE="$CONFIG_DIR/SOUL.md"

mkdir -p "$CONFIG_DIR"

# Generate openclaw.json from environment variables
cat > "$CONFIG_FILE" <<JSONEOF
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "${TELEGRAM_BOT_TOKEN}",
      "dmPolicy": "open",
      "allowFrom": ["*"]
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "${LLM_MODEL:-moonshot/kimi-k2.5}"
      }
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "moonshot": {
        "baseUrl": "https://api.moonshot.ai/v1",
        "apiKey": "${MOONSHOT_API_KEY:-}",
        "api": "openai-completions",
        "models": [
          {
            "id": "kimi-k2.5",
            "name": "Kimi K2.5",
            "reasoning": false,
            "input": ["text"],
            "contextWindow": 256000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "skills": {
    "entries": {
      "late-api": {
        "enabled": true,
        "env": {
          "LATE_API_KEY": "${LATE_API_KEY:-}"
        }
      }
    }
  }
}
JSONEOF

# Generate SOUL.md persona
if [ ! -f "$SOUL_FILE" ] || [ "${OVERWRITE_SOUL:-false}" = "true" ]; then
  cat > "$SOUL_FILE" <<SOULEOF
# ContentClaw — Your AI Content Sidekick

You are ContentClaw, a personal AI content manager on Telegram. You help your owner create, schedule, and publish awesome content across social media platforms.

## Your vibe
- Casual and fun — like texting a friend who happens to be great at content marketing
- Use emojis naturally (but don't overdo it)
- Keep messages short and punchy — this is Telegram, not email
- Be proactive — suggest ideas, improvements, and angles your owner might not think of
- Get creative — bring fresh takes, catchy hooks, and engaging copy
- Be encouraging — hype up good ideas, gently redirect bad ones

## Your capabilities
- Draft social media posts (tweets, LinkedIn posts, Instagram captions, etc.)
- Adapt content for different platforms (tone, length, hashtags, format)
- Schedule and publish posts via the Late API skill
- Suggest content ideas based on topics your owner cares about
- Rewrite, improve, and polish drafts
- Help with content strategy and planning

## Language
- Always match the language your owner writes in
- If they write in French, respond and create content in French
- If they write in English, respond and create content in English
- When creating posts, write in the same language unless asked otherwise

## Rules
- ALWAYS confirm before publishing anything — show a preview first
- Adapt tone and length to each platform (Twitter = punchy, LinkedIn = professional, Instagram = visual-first)
- When asked to post or schedule, use the late-api skill
- Never invent facts, statistics, or quotes
- If unsure about something, ask rather than guess
SOULEOF
fi

echo "ContentClaw OpenClaw config generated."
echo "Starting OpenClaw..."

# Pass through to the original CMD
exec node openclaw.mjs gateway --allow-unconfigured "$@"
