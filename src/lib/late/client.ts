const ZERNIO_API_BASE = "https://zernio.com/api/v1";

function getMasterApiKey(): string {
  const key = process.env.ZERNIO_API_KEY ?? process.env.LATE_API_KEY;
  if (!key) {
    throw new Error("Missing ZERNIO_API_KEY environment variable");
  }
  return key;
}

export async function lateRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    apiKey?: string;
  } = {}
): Promise<T> {
  const { method = "GET", body, apiKey } = options;
  const key = apiKey ?? getMasterApiKey();
  const start = Date.now();

  // Compact preview of the outgoing payload (no secrets — the API key lives in
  // the header, not the body). Logged on mutating calls so a post bug can be
  // traced to exactly what we sent to Zernio (content/mediaItems/scheduledFor).
  const bodyNote =
    body && method !== "GET"
      ? ` body=${JSON.stringify(body).slice(0, 300)}`
      : "";

  try {
    const res = await fetch(`${ZERNIO_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const duration = Date.now() - start;

    if (!res.ok) {
      const text = await res.text().catch(() => "Unknown error");
      console.error(
        `[Zernio] ❌ ${method} ${path} → ${res.status} (${duration}ms): ${text.slice(0, 200)}${bodyNote}`
      );
      throw new Error(
        `Zernio API ${method} ${path} failed (${res.status}): ${text}`
      );
    }

    console.log(
      `[Zernio] ✓ ${method} ${path} → ${res.status} (${duration}ms)${bodyNote}`
    );

    if (res.status === 204) return undefined as T;

    return res.json() as Promise<T>;
  } catch (error) {
    const duration = Date.now() - start;
    if (
      error instanceof Error &&
      error.message.startsWith("Zernio API")
    ) {
      throw error; // Already logged above
    }
    console.error(
      `[Zernio] ❌ ${method} ${path} → network error (${duration}ms): ${error instanceof Error ? error.message : "unknown"}`
    );
    throw error;
  }
}
