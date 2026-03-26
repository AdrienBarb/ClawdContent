import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { client } from "@/lib/sanity/client";
import { COMPETITOR_PAGES_QUERY } from "@/lib/sanity/queries";
import type { CompetitorPreview } from "@/lib/sanity/types";
import { genPageMetadata } from "@/lib/seo/genPageMetadata";
import { getImageUrl } from "@/lib/sanity/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = genPageMetadata({
  title: "PostClaw Alternatives & Competitors Comparison",
  description:
    "Looking for a social media automation or AI content management tool? Compare PostClaw with other platforms and discover why creators choose PostClaw to publish everywhere from one chat.",
  url: "/alternatives",
});

export default async function AlternativesPage() {
  const competitors = await client.fetch<CompetitorPreview[]>(
    COMPETITOR_PAGES_QUERY,
    {},
    { next: { revalidate: 3600 } }
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
          PostClaw Alternatives & Comparisons
        </h1>
        <p className="text-lg text-[#7a7f94] leading-relaxed mb-8">
          Looking for a social media automation or AI content management tool?
          Compare PostClaw with other platforms in the market. Learn what makes
          each tool unique and discover why creators choose PostClaw to publish
          everywhere from a single chat.
        </p>
        <Button
          asChild
          size="lg"
          className="bg-[#e8614d] hover:bg-[#d4563f] text-white rounded-full px-8"
        >
          <Link href="/">
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>

      {/* Competitors Grid */}
      {competitors.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {competitors.map((competitor) => {
            const logoUrl = getImageUrl(competitor.logo, 100, 100);
            return (
              <Link
                key={competitor._id}
                href={`/alternatives/${competitor.slug.current}`}
                className="group bg-[#151929] border border-[#1e2233] rounded-xl p-6 hover:border-[#e8614d]/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  {logoUrl && (
                    <Image
                      src={logoUrl}
                      alt={`${competitor.title} logo`}
                      width={48}
                      height={48}
                      className="rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-white group-hover:text-[#e8614d] transition-colors">
                      {competitor.title} Alternative
                    </h2>
                    {competitor.excerpt && (
                      <p className="text-sm text-[#7a7f94] mt-1 line-clamp-2">
                        {competitor.excerpt}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-[#e8614d] font-medium">
                  Compare with PostClaw
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-[#7a7f94]">
            No comparisons available yet. Check back soon!
          </p>
        </div>
      )}

      {/* CTA Section */}
      <div className="max-w-2xl mx-auto mt-20 text-center bg-[#e8614d]/10 rounded-2xl border border-[#e8614d]/20 p-8 md:p-12">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Why Choose PostClaw?
        </h2>
        <p className="text-[#7a7f94] mb-6">
          Your AI social media manager. It learns your brand, plans your content,
          and publishes to 13+ social platforms — all from one chat. Plans from
          $17/month.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="bg-[#e8614d] hover:bg-[#d4563f] text-white rounded-full px-8 w-full sm:w-auto"
          >
            <Link href="/">
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-full px-8 w-full sm:w-auto border-[#1e2233] text-[#c0c4d0] hover:bg-[#151929] hover:text-white"
          >
            <Link href="/#how-it-works">See How It Works</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
