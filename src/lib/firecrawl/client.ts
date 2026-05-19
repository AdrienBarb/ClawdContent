import Firecrawl, { type BrandingProfile } from "@mendable/firecrawl-js";

const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY!,
});

export type ScrapeResult = {
  markdown: string;
  title?: string;
  branding?: BrandingProfile;
  images?: string[];
};

export async function scrapeWebsite(url: string): Promise<ScrapeResult> {
  const result = await firecrawl.scrape(url, {
    formats: ["markdown", "branding", "images"],
  });

  return {
    markdown: result.markdown ?? "",
    title: result.metadata?.title ?? undefined,
    branding: result.branding ?? undefined,
    images: result.images ?? undefined,
  };
}
