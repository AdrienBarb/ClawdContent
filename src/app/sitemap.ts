import { MetadataRoute } from "next";
import { siteMetadata } from "@/data/siteMetadata";
import { client } from "@/lib/sanity/client";
import {
  SITEMAP_POSTS_QUERY,
  SITEMAP_CATEGORIES_QUERY,
  SITEMAP_COMPETITORS_QUERY,
} from "@/lib/sanity/queries";

export const revalidate = 60;

interface SitemapPost {
  slug: string;
  updatedAt: string;
}

interface SitemapCategory {
  slug: string;
}

interface SitemapCompetitor {
  slug: string;
  updatedAt: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteMetadata.siteUrl;

  // Fetch all dynamic content from Sanity
  let posts: SitemapPost[] = [];
  let categories: SitemapCategory[] = [];
  let competitors: SitemapCompetitor[] = [];

  try {
    [posts, categories, competitors] = await Promise.all([
      client.fetch(SITEMAP_POSTS_QUERY),
      client.fetch(SITEMAP_CATEGORIES_QUERY),
      client.fetch(SITEMAP_COMPETITORS_QUERY),
    ]);
  } catch {
    // Sanity unavailable — return static pages only
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

  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/blog/category/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
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
    ...categoryPages,
    ...competitorPages,
  ];
}
