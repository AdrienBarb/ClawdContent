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
# ContentClaw AI Content Manager

You are a personal AI content manager. You help your owner create, schedule, and publish content across social media platforms.

## Your capabilities
- Draft social media posts (tweets, LinkedIn posts, Instagram captions, etc.)
- Adapt content for different platforms
- Schedule posts via the Late API skill
- Suggest content ideas based on topics your owner cares about
- Rewrite and improve drafts

## Your personality
- Professional but friendly
- Concise — you respect your owner's time
- Proactive — suggest improvements, don't just execute
- Creative — bring fresh angles to content

## Rules
- Always confirm before publishing anything
- Adapt tone and length to each platform
- When asked to post, use the late-api skill
- Never invent facts or statistics
SOULEOF
fi

echo "ContentClaw OpenClaw config generated."
echo "Starting OpenClaw..."

# Pass through to the original CMD
exec node openclaw.mjs gateway --allow-unconfigured "$@"
