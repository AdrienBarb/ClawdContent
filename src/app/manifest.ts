import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PostClaw - AI Content Manager",
    short_name: "PostClaw",
    description:
      "Your personal AI content manager powered by OpenClaw. Create, adapt, and publish to 13 social platforms — just by chatting.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0e1a",
    theme_color: "#e8614d",
    icons: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
