import { PostHog } from "posthog-node";

let postHogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return null;
  }

  if (!postHogClient) {
    postHogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
      flushAt: 1,
      flushInterval: 0,
      requestTimeout: 10_000,
    });
  }

  return postHogClient;
}

async function safeFlush(client: PostHog): Promise<void> {
  try {
    await client.flush();
  } catch {
    // PostHog flush failures are non-critical — don't crash the request
  }
}

// Helper function to capture server-side events
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const client = getPostHogClient();
  if (!client) return;

  client.capture({
    distinctId,
    event,
    properties,
  });

  await safeFlush(client);
}

// Helper function to evaluate a feature flag server-side
export async function getFeatureFlag(
  flagKey: string,
  distinctId: string
): Promise<string | boolean | undefined> {
  const client = getPostHogClient();
  if (!client) return undefined;

  const value = await client.getFeatureFlag(flagKey, distinctId);
  return value;
}

// Helper function to identify users
export async function identifyUser(
  distinctId: string,
  properties?: Record<string, unknown>
) {
  const client = getPostHogClient();
  if (!client) return;

  client.identify({
    distinctId,
    properties,
  });

  await safeFlush(client);
}
