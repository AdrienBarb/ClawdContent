import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { client } from "@/lib/sanity/client";
import { POST_BY_SLUG_QUERY, POST_SLUGS_QUERY } from "@/lib/sanity/queries";
import type { Post, PostPreview } from "@/lib/sanity/types";
import { genPageMetadata } from "@/lib/seo/genPageMetadata";
import { getImageUrl } from "@/lib/sanity/image";
import BlogPortableText, {
  extractHeadings,
} from "@/components/blog/BlogPortableText";
import BlogTableOfContents from "@/components/blog/BlogTableOfContents";
import BlogFAQ from "@/components/blog/BlogFAQ";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  CalendarDays,
  Clock,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { format } from "date-fns";
import config from "@/lib/config";

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

const fetchOptions = { next: { revalidate: 60 } };

export async function generateStaticParams() {
  const posts = await client.fetch<{ slug: string }[]>(
    POST_SLUGS_QUERY,
    {},
    fetchOptions
  );
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await client.fetch<Post | null>(
    POST_BY_SLUG_QUERY,
    { slug },
    fetchOptions
  );

  if (!post) {
    return {};
  }

  const title = post.seo?.title || post.title;
  const description = post.seo?.description || post.excerpt || "";
  const imageUrl = getImageUrl(
    post.seo?.ogImage || post.coverImage,
    1200,
    630
  );

  return genPageMetadata({
    title,
    description,
    url: `/blog/${slug}`,
    ...(imageUrl && { image: imageUrl }),
  });
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;

  const post = await client.fetch<Post | null>(
    POST_BY_SLUG_QUERY,
    { slug },
    fetchOptions
  );

  if (!post) {
    notFound();
  }

  const relatedPosts: PostPreview[] = post.manualRelatedPosts || [];

  const coverImageUrl = getImageUrl(post.coverImage, 1200, 630);
  const headings = extractHeadings(post.body);

  // Article structured data
  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: coverImageUrl,
    author: {
      "@type": "Person",
      name: post.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: config.project.brandName,
      logo: {
        "@type": "ImageObject",
        url: `${config.project.url}${config.project.logo}`,
      },
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${config.project.url}/blog/${slug}`,
    },
  };

  return (
    <>
      {/* Article Structured Data */}
      <Script
        id="article-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleStructuredData),
        }}
      />

      {slug === "how-to-post-to-all-social-media-at-once" && (
        <Script
          id="howto-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "HowTo",
              name: "How to post to all social media at once",
              image: coverImageUrl,
              totalTime: "PT2M",
              step: [
                {
                  "@type": "HowToStep",
                  name: "Connect your accounts",
                  text: "Connect Instagram, Facebook, LinkedIn, X, TikTok, YouTube, Pinterest, Threads, and Bluesky to a single dashboard.",
                },
                {
                  "@type": "HowToStep",
                  name: "Write the post once",
                  text: "Compose your caption and attach images or video in one place.",
                },
                {
                  "@type": "HowToStep",
                  name: "Adapt per platform",
                  text: "Adjust hashtags, character limits, and image dimensions for each network.",
                },
                {
                  "@type": "HowToStep",
                  name: "Choose timing",
                  text: "Publish immediately or schedule for the best time per platform.",
                },
                {
                  "@type": "HowToStep",
                  name: "Publish to all",
                  text: "Push the post to every selected platform from one click.",
                },
                {
                  "@type": "HowToStep",
                  name: "Track results",
                  text: "Review reach, engagement, and clicks across platforms in one dashboard.",
                },
              ],
            }),
          }}
        />
      )}

      <article className="max-w-7xl mx-auto px-6 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link
            href="/blog"
            className="hover:text-foreground transition-colors"
          >
            Blog
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-muted-foreground truncate max-w-[200px]">
            {post.title}
          </span>
        </nav>

        {/* Header */}
        <header className="max-w-3xl mx-auto text-center mb-12">
          {coverImageUrl && (
            <div className="max-w-4xl mx-auto mb-12">
              <Image
                src={coverImageUrl}
                alt={post.title}
                width={1200}
                height={630}
                className="rounded-2xl w-full"
                priority
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground">
              {post.authorName}
            </span>
            <span>&middot;</span>
            <div className="flex items-center gap-1">
              <CalendarDays className="w-4 h-4" />
              <time dateTime={post.publishedAt}>
                {format(new Date(post.publishedAt), "MMM d, yyyy")}
              </time>
            </div>
            {post.readingTime && (
              <>
                <span>&middot;</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{post.readingTime} min read</span>
                </div>
              </>
            )}
          </div>

          {post.authorBio && (
            <p className="mt-3 text-sm text-muted-foreground italic">
              {post.authorBio}
            </p>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            Updated: {format(new Date(post.updatedAt || post.publishedAt), "MMM d, yyyy")}
          </p>
        </header>

        {/* Content Layout */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-12">
          {/* Main Content */}
          <div className="max-w-3xl">
            {/* Key Takeaways / TL;DR */}
            {post.keyTakeaways && post.keyTakeaways.length > 0 && (
              <div className="mb-10 p-6 bg-primary/10 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Key Takeaways
                  </h2>
                </div>
                <ul className="space-y-2">
                  {post.keyTakeaways.map((takeaway, index) => (
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

            <BlogPortableText value={post.body} />

            {/* FAQ */}
            {post.faq && <BlogFAQ faq={post.faq} />}

            {/* CTA */}
            <div className="mt-16 bg-card rounded-2xl border border-border p-8 text-center">
              <h2 className="text-xl font-bold text-foreground mb-3">
                Ready to automate your social media publishing?
              </h2>
              <p className="text-muted-foreground mb-6">
                PostClaw is your social media manager.
                It learns your brand, plans your content, and publishes to 9 platforms.
              </p>
              <Button
                asChild
                className="bg-primary hover:bg-primary text-foreground rounded-full px-8"
              >
                <Link href="/">
                  Start posting today
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Sidebar - TOC */}
          <aside className="hidden lg:block">
            {headings.length > 0 && <BlogTableOfContents headings={headings} />}
          </aside>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="max-w-3xl mx-auto mt-16 p-6 bg-card rounded-xl border border-border">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Related Articles
            </h2>
            <p className="text-muted-foreground mb-4">
              If you found this article useful, you might also enjoy:
            </p>
            <ul className="space-y-2">
              {relatedPosts.map((relatedPost) => (
                <li key={relatedPost._id} className="flex items-start gap-2">
                  <span className="text-primary">&bull;</span>
                  <div>
                    <Link
                      href={`/blog/${relatedPost.slug.current}`}
                      className="text-foreground font-medium hover:text-primary transition-colors underline underline-offset-2"
                    >
                      {relatedPost.primaryKeyword || relatedPost.title}
                    </Link>
                    {relatedPost.excerpt && (
                      <span className="text-muted-foreground">
                        {" "}
                        &ndash; {relatedPost.excerpt}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  );
}
