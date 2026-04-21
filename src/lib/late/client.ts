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
        `[Zernio] ❌ ${method} ${path} → ${res.status} (${duration}ms): ${text.slice(0, 200)}`
      );
      throw new Error(
        `Zernio API ${method} ${path} failed (${res.status}): ${text}`
      );
    }

    console.log(`[Zernio] ✓ ${method} ${path} → ${res.status} (${duration}ms)`);

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
