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
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link
            href="/alternatives"
            className="hover:text-foreground transition-colors"
          >
            Alternatives
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-muted-foreground">{competitor.competitorName}</span>
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
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            {competitor.title}
          </h1>

          {/* Subtitle */}
          {competitor.excerpt && (
            <p className="text-lg text-muted-foreground leading-relaxed">
              {competitor.excerpt}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground flex-wrap mt-6">
            <span className="font-medium text-foreground">
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
            <p className="mt-3 text-sm text-muted-foreground italic">
              {competitor.authorBio}
            </p>
          )}

          {competitor.updatedAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Updated: {format(new Date(competitor.updatedAt), "MMM d, yyyy")}
            </p>
          )}

          {/* Quick CTA */}
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary text-foreground rounded-full px-8"
            >
              <Link href="/">
                Start posting today
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-3xl mx-auto">
          {/* Key Takeaways */}
          {competitor.keyTakeaways && competitor.keyTakeaways.length > 0 && (
            <div className="mb-10 p-6 bg-primary/10 border border-primary/20 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  Key Takeaways: {competitor.competitorName} vs PostClaw
                </h2>
              </div>
              <ul className="space-y-2">
                {competitor.keyTakeaways.map((takeaway, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-foreground"
                  >
                    <span className="text-primary font-medium mt-0.5">
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
                    <tr className="bg-muted">
                      <th className="text-left p-4 font-semibold text-foreground border-b border-border">
                        Feature
                      </th>
                      <th className="text-center p-4 font-semibold text-foreground border-b border-border">
                        {competitor.competitorName}
                      </th>
                      <th className="text-center p-4 font-semibold text-primary border-b border-border">
                        PostClaw
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitor.comparisonTable.map((row, index) => (
                      <tr
                        key={index}
                        className={
                          index % 2 === 0 ? "bg-card" : "bg-muted/50"
                        }
                      >
                        <td className="p-4 text-foreground border-b border-border">
                          {row.feature}
                        </td>
                        <td className="p-4 text-center text-muted-foreground border-b border-border">
                          {row.competitor === "Yes" ? (
                            <Check className="w-5 h-5 text-green-400 mx-auto" />
                          ) : row.competitor === "No" ? (
                            <X className="w-5 h-5 text-red-400 mx-auto" />
                          ) : (
                            row.competitor
                          )}
                        </td>
                        <td className="p-4 text-center text-foreground border-b border-border">
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
            <section className="mt-16 p-6 bg-card rounded-xl border border-border">
              <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                Compare More Tools
              </h2>
              <p className="text-muted-foreground mb-4">
                If you&apos;re exploring social media automation tools, check out
                our reviews of:
              </p>
              <ul className="space-y-2">
                {relatedCompetitors.map((comp) => (
                  <li key={comp._id} className="flex items-start gap-2">
                    <span className="text-primary">&bull;</span>
                    <div>
                      <Link
                        href={`/alternatives/${comp.slug}`}
                        className="text-foreground font-medium hover:text-primary transition-colors underline underline-offset-2"
                      >
                        {comp.primaryKeyword ||
                          `${comp.competitorName || comp.title} Alternative`}
                      </Link>
                      {comp.excerpt && (
                        <span className="text-muted-foreground">
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
              <section className="mt-8 p-6 bg-card rounded-xl border border-border">
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Related Articles
                </h2>
                <ul className="space-y-2">
                  {competitor.manualRelatedPosts.map((post) => (
                    <li key={post._id} className="flex items-start gap-2">
                      <span className="text-primary">&bull;</span>
                      <div>
                        <Link
                          href={`/blog/${post.slug}`}
                          className="text-foreground font-medium hover:text-primary transition-colors underline underline-offset-2"
                        >
                          {post.primaryKeyword || post.title}
                        </Link>
                        {post.excerpt && (
                          <span className="text-muted-foreground">
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
          <div className="mt-16 bg-primary/10 rounded-2xl border border-primary/20 p-8 md:p-12">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Ready to Switch from {competitor.competitorName}?
              </h2>
              <p className="text-muted-foreground text-lg">
                Join creators who use PostClaw to publish everywhere from one
                chat.
              </p>
            </div>

            {/* Features List */}
            <ul className="max-w-md mx-auto space-y-3 mb-8">
              {ctaFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="bg-primary hover:bg-primary text-foreground rounded-full px-8 w-full sm:w-auto"
              >
                <Link href="/">
                  Start posting today
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full px-8 w-full sm:w-auto border-border text-foreground hover:bg-card hover:text-foreground"
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
