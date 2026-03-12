import { Metadata } from "next";
import Link from "next/link";
import { client } from "@/lib/sanity/client";
import {
  CATEGORIES_QUERY,
  FEATURED_POSTS_QUERY,
  LATEST_POSTS_QUERY,
} from "@/lib/sanity/queries";
import type { CategoryPreview, PostPreview } from "@/lib/sanity/types";
import { genPageMetadata } from "@/lib/seo/genPageMetadata";
import BlogPostCard from "@/components/blog/BlogPostCard";
import BlogCategoryCard from "@/components/blog/BlogCategoryCard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = genPageMetadata({
  title:
    "PostClaw Blog — AI Content Management, Social Media Automation & Publishing",
  description:
    "Expert guides for content creators on AI content management, social media automation, multi-platform publishing, and Telegram bot workflows. Actionable tips to grow your social presence.",
  url: "/blog",
});

const fetchOptions = { next: { revalidate: 60 } };

export default async function BlogPage() {
  const [categories, featuredPosts, latestPosts] = await Promise.all([
    client.fetch<CategoryPreview[]>(CATEGORIES_QUERY, {}, fetchOptions),
    client.fetch<PostPreview[]>(FEATURED_POSTS_QUERY, {}, fetchOptions),
    client.fetch<PostPreview[]>(LATEST_POSTS_QUERY, {}, fetchOptions),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      {/* Header */}
      <header className="max-w-3xl mb-16">
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
          PostClaw Blog — AI Content Management & Social Media Automation
        </h1>
        <div className="text-lg text-[#7a7f94] leading-relaxed space-y-4">
          <p>
            The PostClaw Blog is your go-to resource for AI-powered content
            management, social media automation, and multi-platform publishing.
            If you&apos;re a creator or business struggling to keep up with
            posting across 13+ platforms — you&apos;re in the right place.
          </p>
          <p>
            Here, we break down the exact strategies, tools, and workflows used
            by top creators to publish everywhere from a single Telegram chat.
            Whether you&apos;re automating your content, adapting posts per
            platform, or scaling your social presence — we write for people who
            want results.
          </p>
        </div>
      </header>

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Explore Topics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <BlogCategoryCard key={category._id} category={category} />
            ))}
          </div>
        </section>
      )}

      {/* Featured Posts Section */}
      {featuredPosts.length > 0 && (
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Most Popular</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredPosts.map((post, index) => (
              <BlogPostCard key={post._id} post={post} featured={index === 0} />
            ))}
          </div>
        </section>
      )}

      {/* Latest Posts Section */}
      {latestPosts.length > 0 && (
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-white mb-8">Latest Posts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestPosts.map((post) => (
              <BlogPostCard key={post._id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-[#151929] rounded-3xl border border-[#1e2233] p-8 md:p-12 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">
          Ready to Publish Everywhere from One Chat?
        </h2>
        <p className="text-[#7a7f94] mb-6 max-w-xl mx-auto">
          PostClaw gives you a personal AI content manager on Telegram. Create,
          adapt, and publish to 13+ social platforms — all on autopilot.
        </p>
        <Button
          asChild
          className="bg-[#e8614d] hover:bg-[#d4563f] text-white rounded-full px-8"
        >
          <Link href="/">
            Get Started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </section>

      {/* FAQ Section */}
      <section className="mt-20">
        <h2 className="text-2xl font-bold text-white mb-8">
          Frequently Asked Questions
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-white mb-2">
              What topics does this blog cover?
            </h3>
            <p className="text-[#7a7f94] text-sm">
              AI content management, social media automation, multi-platform
              publishing, Telegram bot workflows, content creation strategies,
              and platform-specific tips.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2">
              Who is this blog for?
            </h3>
            <p className="text-[#7a7f94] text-sm">
              Content creators, social media managers, and businesses who want to
              automate their publishing workflow and grow their presence across
              multiple platforms.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
