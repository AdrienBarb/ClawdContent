const FLY_API_BASE = "https://api.machines.dev/v1";

function getApiToken(): string {
  const token = process.env.FLY_API_TOKEN;
  if (!token) {
    throw new Error("Missing FLY_API_TOKEN environment variable");
  }
  return token;
}

export function getAppName(): string {
  const app = process.env.FLY_APP_NAME;
  if (!app) {
    throw new Error("Missing FLY_APP_NAME environment variable");
  }
  return app;
}

export async function flyRequest<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
  } = {}
): Promise<T> {
  const { method = "GET", body } = options;
  const token = getApiToken();

  const response = await fetch(`${FLY_API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(body && { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fly API error (${response.status}): ${text}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return (await response.json()) as T;
  }

  return {} as T;
}
