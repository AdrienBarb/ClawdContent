import { Metadata } from "next";
import Link from "next/link";
import { client } from "@/lib/sanity/client";
import { LATEST_POSTS_QUERY } from "@/lib/sanity/queries";
import type { PostPreview } from "@/lib/sanity/types";
import { genPageMetadata } from "@/lib/seo/genPageMetadata";
import BlogPostCard from "@/components/blog/BlogPostCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = genPageMetadata({
  title:
    "PostClaw Blog: social media, made easy for busy people",
  description:
    "Practical guides for small businesses, solo founders, and creators who'd rather spend time on their work than on Instagram and Facebook. Tips, playbooks, and real workflows.",
  url: "/blog",
});

const fetchOptions = { next: { revalidate: 60 } };

export default async function BlogPage() {
  const posts = await client.fetch<PostPreview[]>(
    LATEST_POSTS_QUERY,
    {},
    fetchOptions,
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      {/* Header */}
      <header className="max-w-3xl mb-16">
        <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
          The PostClaw Blog
        </h1>
        <div className="text-lg text-muted-foreground leading-relaxed space-y-4">
          <p>
            Practical writing for people who'd rather run their business, ship
            their product, or make their work, instead of spending their
            evenings stuck on Instagram and Facebook.
          </p>
          <p>
            We share the playbooks, examples, and workflows we use ourselves:
            what to post, how to plan a week of content in minutes, and how
            to stop letting social media eat your calendar.
          </p>
        </div>
      </header>

      {/* All Posts */}
      {posts.length > 0 && (
        <section className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <BlogPostCard key={post._id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-card rounded-3xl border border-border p-8 md:p-12 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Tell PostClaw what to post. It does the rest.
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          PostClaw is your social media manager. It learns your brand, plans
          your content, and publishes to Instagram, Facebook, and the rest of
          your accounts. No dashboard. No editor. No learning curve.
        </p>
        <Button
          asChild
          className="bg-primary hover:bg-primary text-foreground rounded-full px-8"
        >
          <Link href="/">
            Get started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </section>

      {/* FAQ Section */}
      <section className="mt-20">
        <h2 className="text-2xl font-bold text-foreground mb-8">
          Frequently Asked Questions
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-foreground mb-2">
              What does this blog cover?
            </h3>
            <p className="text-muted-foreground text-sm">
              Honest, tactical writing on running social for a small business,
              a one-person company, or a creator practice: what to post, how
              often, and how to stop dreading it.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">
              Who is this blog for?
            </h3>
            <p className="text-muted-foreground text-sm">
              Small business owners, solo founders and indie hackers, and
              creators who'd rather make than post. Anyone who wants social
              media handled without it becoming a second job.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
