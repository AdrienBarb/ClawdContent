import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PostClaw — Your AI Social Media Manager",
    short_name: "PostClaw",
    description:
      "An AI that learns your brand, plans your content, and publishes to 13 platforms. Not a tool. Not a dashboard. A social media manager that works for you 24/7.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0e1a",
    theme_color: "#FF5E48",
    icons: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
