const ZERNIO_API_BASE = "https://zernio.com/api/v1";

function getMasterApiKey(): string {
  const key = process.env.ZERNIO_API_KEY ?? process.env.LATE_API_KEY;
  if (!key) {
    throw new Error("Missing ZERNIO_API_KEY environment variable");
  }
  return key;
}

export class ZernioError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly method: string,
    public readonly path: string
  ) {
    super(message);
    this.name = "ZernioError";
  }
}

export function isZernioRateLimited(err: unknown): err is ZernioError {
  return err instanceof ZernioError && err.status === 429;
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
      throw new ZernioError(
        `Zernio API ${method} ${path} failed (${res.status}): ${text}`,
        res.status,
        method,
        path
      );
    }

    console.log(`[Zernio] ✓ ${method} ${path} → ${res.status} (${duration}ms)`);

    if (res.status === 204) return undefined as T;

    return res.json() as Promise<T>;
  } catch (error) {
    const duration = Date.now() - start;
    if (error instanceof ZernioError) {
      throw error; // Already logged above
    }
    console.error(
      `[Zernio] ❌ ${method} ${path} → network error (${duration}ms): ${error instanceof Error ? error.message : "unknown"}`
    );
    throw error;
  }
}
