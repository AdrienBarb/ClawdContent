import { MetadataRoute } from "next";
import { siteMetadata } from "@/data/siteMetadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/blog/*", "/pricing"],
        disallow: [
          "/api/",
          "/d/",
          "/dashboard/",
          "/signup",
          "/signin",
          "/reset-password",
          "/privacy",
          "/terms",
        ],
      },
    ],
    sitemap: `${siteMetadata.siteUrl}/sitemap.xml`,
  };
}
