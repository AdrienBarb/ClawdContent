/**
 * Timezone-aware helpers shared by the week timeline editors.
 *
 * `datetime-local` inputs speak the user's wall-clock time; the API stores UTC
 * ISO strings. These converters bridge the two using a single-pass offset trick
 * so a 9:00 AM in Lisbon and a 9:00 AM in Tokyo both round-trip correctly.
 */

export function toLocalInputValue(
  iso: string | null,
  timeZone: string | null
): string {
  if (!iso) return "";
  const date = new Date(iso);
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone ?? undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
}

export function localInputToIso(
  value: string,
  timeZone: string | null
): string | null {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  if (!timeZone) return new Date(y, m - 1, d, hh, mm).toISOString();
  const utcGuess = Date.UTC(y, m - 1, d, hh, mm);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(utcGuess))) parts[p.type] = p.value;
  const shown = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute)
  );
  return new Date(utcGuess - (shown - utcGuess)).toISOString();
}

export async function jsonFetch(
  url: string,
  init: RequestInit
): Promise<{ ok: boolean; body: unknown }> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, body };
}
