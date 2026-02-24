import { MetadataRoute } from "next";
import { siteMetadata } from "@/data/siteMetadata";

// Revalidate sitemap every 60 seconds (ISR)
export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteMetadata.siteUrl;

  // Landing page
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // Add dynamic pages here when you have a blog or other content
  // Example:
  // const posts = await fetchBlogPosts();
  // const postsSitemap: MetadataRoute.Sitemap = posts.map((post) => ({
  //   url: `${baseUrl}/blog/${post.slug}`,
  //   lastModified: new Date(post.updatedAt),
  //   changeFrequency: "monthly",
  //   priority: 0.7,
  // }));

  return [...staticPages];
}
