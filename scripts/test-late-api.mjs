#!/usr/bin/env node

/**
 * Test script for Late API integration
 * Usage:
 *   node scripts/test-late-api.mjs profiles:list
 *   node scripts/test-late-api.mjs profiles:create "My Brand"
 *   node scripts/test-late-api.mjs accounts:list <profileId>
 *   node scripts/test-late-api.mjs connect <platform> <profileId>
 *   node scripts/test-late-api.mjs posts:create <accountId> "Hello world!"
 *   node scripts/test-late-api.mjs posts:list
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load LATE_API_KEY from .env
const envPath = resolve(process.cwd(), ".env");
const envContent = readFileSync(envPath, "utf-8");
const apiKeyMatch = envContent.match(/^LATE_API_KEY=(.+)$/m);
if (!apiKeyMatch) {
  console.error("LATE_API_KEY not found in .env");
  process.exit(1);
}
const API_KEY = apiKeyMatch[1].trim();
const BASE_URL = "https://getlate.dev/api/v1";

async function api(method, path, body) {
  const url = `${BASE_URL}${path}`;
  console.log(`\n→ ${method} ${url}`);
  if (body) console.log("  Body:", JSON.stringify(body, null, 2));

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    console.error(`\n✗ ${res.status} ${res.statusText}`);
    console.error(JSON.stringify(data, null, 2));
    return null;
  }

  console.log(`\n✓ ${res.status}`);
  console.log(JSON.stringify(data, null, 2));
  return data;
}

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "profiles:list": {
    await api("GET", "/profiles");
    break;
  }

  case "profiles:create": {
    const name = args[0] || "PostClaw Test";
    await api("POST", "/profiles", { name });
    break;
  }

  case "accounts:list": {
    const profileId = args[0];
    if (!profileId) {
      console.error("Usage: accounts:list <profileId>");
      process.exit(1);
    }
    await api("GET", `/accounts?profileId=${profileId}`);
    break;
  }

  case "accounts:health": {
    await api("GET", "/accounts/health");
    break;
  }

  case "connect": {
    const platform = args[0];
    const profileId = args[1];
    if (!platform || !profileId) {
      console.error("Usage: connect <platform> <profileId>");
      console.error(
        "Platforms: twitter, instagram, facebook, linkedin, tiktok, youtube, pinterest, reddit, bluesky, threads"
      );
      process.exit(1);
    }
    const redirectUrl = "http://localhost:3000/dashboard/accounts/callback";
    const data = await api(
      "GET",
      `/connect/${platform}?profileId=${profileId}&redirectUrl=${encodeURIComponent(redirectUrl)}`
    );
    if (data?.authUrl) {
      console.log(`\n🔗 Open this URL to connect your ${platform} account:`);
      console.log(data.authUrl);
    }
    break;
  }

  case "posts:create": {
    const accountId = args[0];
    const content = args[1];
    if (!accountId || !content) {
      console.error('Usage: posts:create <accountId> "Post content"');
      process.exit(1);
    }
    // Detect platform from account ID or ask
    const platform = args[2] || "twitter";
    await api("POST", "/posts", {
      content,
      publishNow: false, // Create as draft first for safety
      platforms: [{ platform, accountId }],
    });
    break;
  }

  case "posts:publish": {
    const accountId = args[0];
    const content = args[1];
    const platform = args[2] || "twitter";
    if (!accountId || !content) {
      console.error('Usage: posts:publish <accountId> "Post content" [platform]');
      process.exit(1);
    }
    await api("POST", "/posts", {
      content,
      publishNow: true,
      platforms: [{ platform, accountId }],
    });
    break;
  }

  case "posts:list": {
    await api("GET", "/posts?limit=10");
    break;
  }

  default: {
    console.log(`Late API Test Script

Commands:
  profiles:list                          List all profiles
  profiles:create "Name"                 Create a new profile
  accounts:list <profileId>              List connected accounts for a profile
  accounts:health                        Check health of all accounts
  connect <platform> <profileId>         Get OAuth URL to connect a social account
  posts:create <accountId> "content"     Create a draft post
  posts:publish <accountId> "content" [platform]  Publish a post immediately
  posts:list                             List recent posts

Platforms: twitter, instagram, facebook, linkedin, tiktok, youtube, pinterest, reddit, bluesky, threads`);
  }
}
