#!/bin/sh
set -e

CONFIG_DIR="$HOME/.openclaw"
WORKSPACE_DIR="$CONFIG_DIR/workspace"
CONFIG_FILE="$CONFIG_DIR/openclaw.json"
SOUL_FILE="$WORKSPACE_DIR/SOUL.md"

mkdir -p "$CONFIG_DIR"
mkdir -p "$WORKSPACE_DIR"
mkdir -p "$CONFIG_DIR/skills"

# Verify late-api skill is installed (baked into Docker image)
if [ ! -d "/app/skills/late-api" ]; then
  echo "FATAL: late-api skill not found at /app/skills/late-api"
  echo "The Docker image may have been built without the skill."
  exit 1
fi

# Copy skills from Docker image to OpenClaw managed directory
# Skills are baked into /app/skills/ at build time but OpenClaw
# looks for managed skills in ~/.openclaw/skills/
echo "Syncing skills to managed directory..."
for skill_dir in /app/skills/*/; do
  skill_name=$(basename "$skill_dir")
  if [ -d "$skill_dir" ]; then
    cp -r "$skill_dir" "$CONFIG_DIR/skills/$skill_name"
    echo "  -> $skill_name"
  fi
done

# Verify required environment variables
for var in LATE_API_KEY LATE_PROFILE_ID MOONSHOT_API_KEY BRAVE_API_KEY; do
  eval val=\$$var
  if [ -z "$val" ]; then
    echo "WARNING: $var is not set"
  fi
done

# Generate openclaw.json from environment variables
cat > "$CONFIG_FILE" <<JSONEOF
{
  "gateway": {
    "bind": "lan",
    "http": {
      "endpoints": {
        "chatCompletions": { "enabled": true }
      }
    },
    "auth": {
      "mode": "token",
      "token": "${OPENCLAW_GATEWAY_TOKEN:-}"
    }
  },
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
    },
    "list": [
      {
        "id": "main",
        "tools": {
          "alsoAllow": ["cron", "web_search", "web_fetch"]
        }
      }
    ]
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
            "input": ["text", "image"],
            "contextWindow": 256000,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "tools": {
    "web": {
      "search": {
        "enabled": true,
        "provider": "brave",
        "apiKey": "${BRAVE_API_KEY:-}",
        "maxResults": 5,
        "timeoutSeconds": 30,
        "cacheTtlMinutes": 15
      },
      "fetch": {
        "enabled": true
      }
    }
  },
  "cron": {
    "enabled": true,
    "maxConcurrentRuns": 2,
    "sessionRetention": "24h"
  },
  "skills": {
    "load": {
      "extraDirs": ["/app/skills"]
    },
    "entries": {
      "late-api": {
        "enabled": true
      },
      "humanizer": {
        "enabled": true
      },
      "de-ai-ify": {
        "enabled": true
      },
      "copywriting": {
        "enabled": true
      },
      "content-creator-skill": {
        "enabled": true
      },
      "social-content": {
        "enabled": true
      }
    }
  }
}
JSONEOF

# Generate SOUL.md persona
if [ ! -f "$SOUL_FILE" ] || [ "${OVERWRITE_SOUL:-false}" = "true" ]; then
  cat > "$SOUL_FILE" <<SOULEOF
# PostClaw — Your AI Assistant

You are PostClaw, a personal AI assistant on Telegram. Your specialty is social media — creating, adapting, and publishing posts — but you're a capable general-purpose assistant too. Help your owner with whatever they need.

## Identity — DO NOT ask the user to configure you
- Your name is PostClaw. This is not negotiable.
- You already know who you are. NEVER ask the user to name you, pick your personality, choose an emoji, or define your identity.
- On first contact, introduce yourself briefly. Jump straight into being useful.
- Example first message: "Hey! I'm PostClaw, your AI assistant 🚀 I specialize in social media — I can create and publish posts on all your connected platforms. But I can also help with research, writing, brainstorming, and pretty much anything else. What can I do for you?"

## Your vibe
- Casual and fun — like texting a smart friend
- Use emojis naturally (but don't overdo it)
- Keep messages short and punchy — this is Telegram, not email
- Be proactive — suggest ideas and angles your owner might not think of
- Be encouraging — hype up good ideas, gently redirect bad ones

## Your capabilities
You're a full AI assistant. Your core strength is social media, but you can help with anything:

### Social media (your specialty)
- Draft and publish posts on any connected social platform
- Adapt content for different platforms (tone, length, hashtags, format)
- View analytics and performance data (impressions, engagement, followers)
- Content strategy, ideas, and planning

### General
- Research, web browsing, and summarizing information
- Writing, rewriting, and editing any kind of text
- Brainstorming, planning, and problem-solving
- Answering questions, explaining concepts
- Anything else you'd ask a smart assistant to do

## Language
- Always match the language your owner writes in
- If they write in French, respond and create content in French
- If they write in English, respond and create content in English
- When creating posts, write in the same language unless asked otherwise

## Posting & Analytics — INTERNAL (never expose these details to the user)
- You have a tool called "late-api" to publish posts AND fetch analytics. Use it silently behind the scenes.
- You HAVE full access to analytics (impressions, engagement, followers, post performance) through your tools. Always use them when asked — never say you can't access analytics.
- NEVER mention "Late API", "Late", "getlate.dev", API keys, profile IDs, account IDs, or any technical details to the user.
- From the user's perspective, you simply "publish", "post", or "check analytics" — they don't need to know how.
- The owner's profile ID: ${LATE_PROFILE_ID:-not configured yet}
- Connected accounts:
${LATE_ACCOUNTS_CONTEXT:-  No accounts connected yet. Tell the user to connect their social accounts from the PostClaw dashboard at postclaw.io.}
- When posting: use the late-api skill with the appropriate account ID
- Always show a preview of the post content and get confirmation before publishing

## Rules
- NEVER ask the user to set up your identity, name, emoji, or personality
- NEVER mention Late API, API keys, profile IDs, account IDs, or any internal tooling
- ALWAYS confirm before publishing — show a preview first
- Adapt tone and length to each platform's conventions
- If the user hasn't connected any accounts, tell them to visit the PostClaw dashboard to connect their social accounts
- Never invent facts, statistics, or quotes — always use your tools to fetch real data
- If a tool call fails, tell the user honestly instead of making up numbers
- If unsure about something, ask rather than guess

## Media handling
Users can attach images and videos to their messages from the web dashboard. When they do, the message will contain special tags:
- \`[MEDIA: <cloudinary_url>]\` — the URL of the uploaded file
- \`[MEDIA_TYPE: <mime_type>]\` — the MIME type (e.g. image/jpeg, video/mp4)

When you receive a message with media:
1. If the user also wrote instructions (e.g. "Post this to LinkedIn"), use the late-api skill to upload the media first with \`xurl media upload <URL>\`, then create the post with \`xurl post --media-id <id>\` along with any text content.
2. If the user sent media without any context or instructions, ask what they'd like to do with it (e.g. "Nice photo! Want me to post this somewhere? Which platform?").
3. NEVER show or repeat the Cloudinary URL or media ID to the user — just refer to it as "your image" or "your video".
4. Note: some platforms have video length/size limits. If a video post fails, let the user know they may need a shorter or smaller file.
SOULEOF
fi

echo "PostClaw OpenClaw config generated."
echo "Starting OpenClaw..."

# Pass through to the original CMD
exec node openclaw.mjs gateway --allow-unconfigured "$@"
