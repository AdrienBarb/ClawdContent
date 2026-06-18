/**
 * Extract the human-readable message our API routes return in `{ error }` from a
 * rejected axios error, falling back to `fallback`. Avoids re-spelling the axios
 * error envelope (`err.response.data.error`) at every call site without reaching
 * for `any`.
 */
export function serverErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { error?: string } } })
    ?.response?.data?.error;
  return message || fallback;
}
