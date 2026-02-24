const RAILWAY_API_URL = "https://backboard.railway.com/graphql/v2";

function getApiToken(): string {
  const token = process.env.RAILWAY_API_TOKEN;
  if (!token) {
    throw new Error("Missing RAILWAY_API_TOKEN environment variable");
  }
  return token;
}

export async function railwayQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const token = getApiToken();

  const response = await fetch(RAILWAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Railway API error (${response.status}): ${text}`
    );
  }

  const json = await response.json();

  if (json.errors && json.errors.length > 0) {
    const messages = json.errors
      .map((e: { message: string }) => e.message)
      .join(", ");
    throw new Error(`Railway GraphQL error: ${messages}`);
  }

  return json.data as T;
}
