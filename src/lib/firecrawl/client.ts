import Firecrawl from "@mendable/firecrawl-js";
import type { BrandingProfile, DocumentMetadata } from "@mendable/firecrawl-js";

const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY!,
});

export interface ScrapeResult {
  markdown: string;
  title?: string;
  /** Firecrawl's rendered brand profile (colours, fonts, logo, personality). */
  branding?: BrandingProfile;
  metadata?: DocumentMetadata;
}

export async function scrapeWebsite(url: string): Promise<ScrapeResult> {
  // `branding` runs a full browser render and returns visual + personality
  // tokens; markdown feeds the verbal analysis. One call, both signals.
  const result = await firecrawl.scrape(url, {
    formats: ["markdown", "branding"],
  });

  return {
    markdown: result.markdown ?? "",
    title: result.metadata?.title ?? undefined,
    branding: result.branding,
    metadata: result.metadata,
  };
}
