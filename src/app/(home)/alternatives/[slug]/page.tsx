import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { client } from "@/lib/sanity/client";
import {
  COMPETITOR_BY_SLUG_QUERY,
  COMPETITOR_SLUGS_QUERY,
  RELATED_COMPETITORS_QUERY,
} from "@/lib/sanity/queries";
import type { CompetitorPage, RelatedCompetitor } from "@/lib/sanity/types";
import { genPageMetadata } from "@/lib/seo/genPageMetadata";
import { getImageUrl } from "@/lib/sanity/image";
import BlogPortableText from "@/components/blog/BlogPortableText";
import BlogFAQ from "@/components/blog/BlogFAQ";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ArrowRight,
  CheckCircle,
  Lightbulb,
  Calendar,
  Check,
  X,
} from "lucide-react";
import { format } from "date-fns";
import config from "@/lib/config";

interface CompetitorPageProps {
  params: Promise<{ slug: string }>;
}

const fetchOptions = { next: { revalidate: 60 } };

export async function generateStaticParams() {
  const competitors = await client.fetch<{ slug: string }[]>(
    COMPETITOR_SLUGS_QUERY,
    {},
    fetchOptions
  );
  return competitors.map((competitor) => ({ slug: competitor.slug }));
}

export async function generateMetadata({
  params,
}: CompetitorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const competitor = await client.fetch<CompetitorPage | null>(
    COMPETITOR_BY_SLUG_QUERY,
    { slug },
    fetchOptions
  );

  if (!competitor) {
    return {};
  }

  const title = competitor.seo.title;
  const description = competitor.seo?.description;
  const imageUrl = getImageUrl(
    competitor.seo?.ogImage || competitor.logo,
    1200,
    630
  );

  return genPageMetadata({
    title,
    description,
    url: `/alternatives/${slug}`,
    ...(imageUrl && { image: imageUrl }),
  });
}

export default async function CompetitorPageView({
  params,
}: CompetitorPageProps) {
  const { slug } = await params;

  const competitor = await client.fetch<CompetitorPage | null>(
    COMPETITOR_BY_SLUG_QUERY,
    { slug },
    fetchOptions
  );

  if (!competitor) {
    notFound();
  }

  // Use manual related competitors if available, otherwise fetch auto-generated
  let relatedCompetitors: RelatedCompetitor[] =
    competitor.manualRelatedCompetitors || [];
  if (relatedCompetitors.length === 0) {
    relatedCompetitors = await client.fetch<RelatedCompetitor[]>(
      RELATED_COMPETITORS_QUERY,
      { currentSlug: slug },
      fetchOptions
    );
  }

  const logoUrl = getImageUrl(competitor.logo, 1200, 630);

  // Comparison structured data
  const comparisonStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${competitor.competitorName} Alternative - ${config.project.brandName}`,
    description:
      competitor.excerpt ||
      `Compare ${competitor.competitorName} with ${config.project.brandName}`,
    author: {
      "@type": "Person",
      name: competitor.authorName,
    },
    datePublished: competitor.publishedAt,
    dateModified: competitor.updatedAt || competitor.publishedAt,
    mainEntity: {
      "@type": "SoftwareApplication",
      name: config.project.brandName,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: config.project.url,
      brand: {
        "@type": "Brand",
        name: config.project.brandName,
      },
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: "29",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "29",
          priceCurrency: "USD",
          unitText: "Monthly",
        },
      },
    },
    publisher: {
      "@type": "Organization",
      name: config.project.brandName,
      url: config.project.url,
      logo: {
        "@type": "ImageObject",
        url: `${config.project.url}${config.project.logo}`,
      },
    },
  };

  const ctaFeatures = [
    "AI social media manager — just chat and publish",
    "Publish to 13+ social platforms from one chat",
    "AI-adapted content per platform",
    "Unlimited posts — no per-action fees",
  ];

  return (
    <>
      {/* Structured Data */}
      <Script
        id="comparison-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(comparisonStructuredData),
        }}
      />

      <article className="max-w-7xl mx-auto px-6 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#555a6b] mb-8">
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link
            href="/alternatives"
            className="hover:text-white transition-colors"
          >
            Alternatives
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-[#7a7f94]">{competitor.competitorName}</span>
        </nav>

        {/* Header */}
        <header className="max-w-3xl mx-auto text-center mb-12">
          {logoUrl && (
            <div className="max-w-4xl mx-auto mb-12">
              <Image
                src={logoUrl}
                alt={competitor.competitorName}
                width={1200}
                height={630}
                className="rounded-2xl w-full"
                priority
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            {competitor.title}
          </h1>

          {/* Subtitle */}
          {competitor.excerpt && (
            <p className="text-lg text-[#7a7f94] leading-relaxed">
              {competitor.excerpt}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center justify-center gap-4 text-sm text-[#555a6b] flex-wrap mt-6">
            <span className="font-medium text-[#c0c4d0]">
              {competitor.authorName}
            </span>
            <span>&middot;</span>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <time dateTime={competitor.publishedAt}>
                {format(new Date(competitor.publishedAt), "MMM d, yyyy")}
              </time>
            </div>
            {competitor.competitorPricing && (
              <>
                <span>&middot;</span>
                <span>
                  {competitor.competitorName} pricing:{" "}
                  {competitor.competitorPricing}
                </span>
              </>
            )}
          </div>

          {competitor.authorBio && (
            <p className="mt-3 text-sm text-[#7a7f94] italic">
              {competitor.authorBio}
            </p>
          )}

          {competitor.updatedAt && (
            <p className="mt-2 text-xs text-[#555a6b]">
              Updated: {format(new Date(competitor.updatedAt), "MMM d, yyyy")}
            </p>
          )}

          {/* Quick CTA */}
          <div className="mt-8">
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
        </header>

        {/* Main Content */}
        <div className="max-w-3xl mx-auto">
          {/* Key Takeaways */}
          {competitor.keyTakeaways && competitor.keyTakeaways.length > 0 && (
            <div className="mb-10 p-6 bg-[#e8614d]/10 border border-[#e8614d]/20 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-[#e8614d]" />
                <h2 className="text-lg font-semibold text-white">
                  Key Takeaways: {competitor.competitorName} vs PostClaw
                </h2>
              </div>
              <ul className="space-y-2">
                {competitor.keyTakeaways.map((takeaway, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-[#c0c4d0]"
                  >
                    <span className="text-[#e8614d] font-medium mt-0.5">
                      &bull;
                    </span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Comparison Table */}
          {competitor.comparisonTable &&
            competitor.comparisonTable.length > 0 && (
              <div className="mb-10 overflow-x-auto">
                <table className="w-full border-collapse rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-[#1a1d2e]">
                      <th className="text-left p-4 font-semibold text-white border-b border-[#1e2233]">
                        Feature
                      </th>
                      <th className="text-center p-4 font-semibold text-white border-b border-[#1e2233]">
                        {competitor.competitorName}
                      </th>
                      <th className="text-center p-4 font-semibold text-[#e8614d] border-b border-[#1e2233]">
                        PostClaw
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitor.comparisonTable.map((row, index) => (
                      <tr
                        key={index}
                        className={
                          index % 2 === 0 ? "bg-[#151929]" : "bg-[#1a1d2e]/50"
                        }
                      >
                        <td className="p-4 text-[#e8e9f0] border-b border-[#1e2233]">
                          {row.feature}
                        </td>
                        <td className="p-4 text-center text-[#7a7f94] border-b border-[#1e2233]">
                          {row.competitor === "Yes" ? (
                            <Check className="w-5 h-5 text-green-400 mx-auto" />
                          ) : row.competitor === "No" ? (
                            <X className="w-5 h-5 text-red-400 mx-auto" />
                          ) : (
                            row.competitor
                          )}
                        </td>
                        <td className="p-4 text-center text-[#e8e9f0] border-b border-[#1e2233]">
                          {row.postclaw === "Yes" ? (
                            <Check className="w-5 h-5 text-green-400 mx-auto" />
                          ) : row.postclaw === "No" ? (
                            <X className="w-5 h-5 text-red-400 mx-auto" />
                          ) : (
                            row.postclaw
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          <BlogPortableText value={competitor.body} />

          {/* FAQ */}
          {competitor.faq && <BlogFAQ faq={competitor.faq} />}

          {/* Related Competitors */}
          {relatedCompetitors.length > 0 && (
            <section className="mt-16 p-6 bg-[#151929] rounded-xl border border-[#1e2233]">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                Compare More Tools
              </h2>
              <p className="text-[#7a7f94] mb-4">
                If you&apos;re exploring social media automation tools, check out
                our reviews of:
              </p>
              <ul className="space-y-2">
                {relatedCompetitors.map((comp) => (
                  <li key={comp._id} className="flex items-start gap-2">
                    <span className="text-[#e8614d]">&bull;</span>
                    <div>
                      <Link
                        href={`/alternatives/${comp.slug}`}
                        className="text-[#e8e9f0] font-medium hover:text-[#e8614d] transition-colors underline underline-offset-2"
                      >
                        {comp.primaryKeyword ||
                          `${comp.competitorName || comp.title} Alternative`}
                      </Link>
                      {comp.excerpt && (
                        <span className="text-[#7a7f94]">
                          {" "}
                          &ndash; {comp.excerpt}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Related Blog Posts */}
          {competitor.manualRelatedPosts &&
            competitor.manualRelatedPosts.length > 0 && (
              <section className="mt-8 p-6 bg-[#151929] rounded-xl border border-[#1e2233]">
                <h2 className="text-xl font-bold text-white mb-2">
                  Related Articles
                </h2>
                <ul className="space-y-2">
                  {competitor.manualRelatedPosts.map((post) => (
                    <li key={post._id} className="flex items-start gap-2">
                      <span className="text-[#e8614d]">&bull;</span>
                      <div>
                        <Link
                          href={`/blog/${post.slug}`}
                          className="text-[#e8e9f0] font-medium hover:text-[#e8614d] transition-colors underline underline-offset-2"
                        >
                          {post.primaryKeyword || post.title}
                        </Link>
                        {post.excerpt && (
                          <span className="text-[#7a7f94]">
                            {" "}
                            &ndash; {post.excerpt}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

          {/* CTA Section */}
          <div className="mt-16 bg-[#e8614d]/10 rounded-2xl border border-[#e8614d]/20 p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Ready to Switch from {competitor.competitorName}?
              </h2>
              <p className="text-[#7a7f94] text-lg">
                Join creators who use PostClaw to publish everywhere from one
                chat.
              </p>
            </div>

            {/* Features List */}
            <ul className="max-w-md mx-auto space-y-3 mb-8">
              {ctaFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-[#e8614d] flex-shrink-0" />
                  <span className="text-[#e8e9f0]">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Buttons */}
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
      </article>
    </>
  );
}
