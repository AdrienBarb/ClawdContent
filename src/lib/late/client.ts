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

  const res = await fetch(`${ZERNIO_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`Zernio API ${method} ${path} failed (${res.status}): ${text}`);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
