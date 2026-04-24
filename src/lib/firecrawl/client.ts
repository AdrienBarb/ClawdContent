import Firecrawl from "@mendable/firecrawl-js";

const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY!,
});

export async function scrapeWebsite(
  url: string
): Promise<{ markdown: string; title?: string }> {
  const result = await firecrawl.scrape(url, {
    formats: ["markdown"],
  });

  return {
    markdown: result.markdown ?? "",
    title: result.metadata?.title ?? undefined,
  };
}
