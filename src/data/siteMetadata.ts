import config from "@/lib/config";

export const siteMetadata = {
  title: config.seo.title,
  description: config.seo.description,
  siteUrl: config.project.url,
  socialBanner: config.seo.ogImage,
  twitter: config.seo.twitterHandle,
};
