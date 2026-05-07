import { MetadataRoute } from "next";
import { siteMetadata } from "@/data/siteMetadata";
import { client } from "@/lib/sanity/client";
import {
  SITEMAP_POSTS_QUERY,
  SITEMAP_COMPETITORS_QUERY,
} from "@/lib/sanity/queries";

export const revalidate = 60;

interface SitemapPost {
  slug: string;
  updatedAt: string;
}

interface SitemapCompetitor {
  slug: string;
  updatedAt: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteMetadata.siteUrl;

  // Fetch all dynamic content from Sanity
  let posts: SitemapPost[] = [];
  let competitors: SitemapCompetitor[] = [];

  try {
    [posts, competitors] = await Promise.all([
      client.fetch(SITEMAP_POSTS_QUERY),
      client.fetch(SITEMAP_COMPETITORS_QUERY),
    ]);
  } catch (error) {
    // Sanity unavailable — return static pages only. Log so silent
    // delistings don't go unnoticed.
    console.error("[sitemap] Sanity fetch failed", error);
  }

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/alternatives`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/for-small-businesses`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/for-founders`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/for-creators`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const competitorPages: MetadataRoute.Sitemap = competitors.map((comp) => ({
    url: `${baseUrl}/alternatives/${comp.slug}`,
    lastModified: comp.updatedAt ? new Date(comp.updatedAt) : new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...blogPages,
    ...competitorPages,
  ];
}
