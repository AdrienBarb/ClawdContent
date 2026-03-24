export const UTM_COOKIE = "postclaw_utm";

const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type UtmData = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
};

/**
 * Extract UTM params from a URL's search params.
 */
export function extractUtmFromUrl(url: URL): UtmData | null {
  const data: UtmData = {};
  let hasUtm = false;

  for (const param of UTM_PARAMS) {
    const value = url.searchParams.get(param);
    if (value) {
      data[param] = value;
      hasUtm = true;
    }
  }

  return hasUtm ? data : null;
}

/**
 * Parse the UTM cookie from a raw Cookie header string.
 */
export function getUtmFromCookieHeader(
  cookieHeader: string
): UtmData | null {
  const match = cookieHeader.match(new RegExp(`${UTM_COOKIE}=([^;]+)`));
  if (!match) return null;

  try {
    return JSON.parse(decodeURIComponent(match[1])) as UtmData;
  } catch {
    return null;
  }
}
