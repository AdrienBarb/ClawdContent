import { Metadata } from "next";
import { siteMetadata } from "@/data/siteMetadata";
import config from "@/lib/config";

interface PageSEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  [key: string]: unknown;
}

export function genPageMetadata({
  title,
  description,
  image,
  url = "./",
  ...rest
}: PageSEOProps): Metadata {
  const absoluteUrl = url.startsWith("http")
    ? url
    : `${siteMetadata.siteUrl}${url}`;

  const imageUrl = image
    ? image
    : `${siteMetadata.siteUrl}${siteMetadata.socialBanner}`;

  return {
    metadataBase: new URL(siteMetadata.siteUrl),
    title: {
      default: title || siteMetadata.title,
      template: `%s | ${config.project.brandName}`,
    },
    description: description || siteMetadata.description,
    keywords: config.seo.keywords,
    authors: [{ name: config.seo.author }],
    creator: config.project.brandName,
    publisher: config.project.brandName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      title: `${title} | ${config.project.brandName}`,
      description: description || siteMetadata.description,
      url: absoluteUrl,
      siteName: config.project.brandName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${title} | ${config.project.brandName}`,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      title: `${title} | ${config.project.brandName}`,
      description: description || siteMetadata.description,
      card: "summary_large_image",
      images: [
        {
          url: imageUrl,
          alt: `${title} | ${config.project.brandName}`,
        },
      ],
      creator: siteMetadata.twitter,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: absoluteUrl,
    },
    ...rest,
  };
}
