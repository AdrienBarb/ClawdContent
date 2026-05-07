import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self' https://rankinpublic.xyz",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  trailingSlash: false,
  // jsdom (used by /api/webhooks/outrank → htmlToBlocks) pulls in ESM-only
  // transitive deps that the Turbopack server bundle can't `require()`. Mark
  // it external so Node resolves it natively at runtime on the Function host.
  serverExternalPackages: ["jsdom"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/blog/what-is-openclaw",
        destination: "/",
        permanent: true,
      },
      {
        source: "/blog/openclaw-security",
        destination: "/",
        permanent: true,
      },
      {
        source: "/blog/openclaw-vps-hosting-setup-guide",
        destination: "/",
        permanent: true,
      },
      {
        source: "/blog/best-openclaw-skills-marketing-social-media",
        destination: "/blog",
        permanent: true,
      },
      {
        source: "/blog/how-to-use-openclaw",
        destination: "/blog/how-to-post-to-all-social-media-at-once",
        permanent: true,
      },
      {
        source: "/blog/openclaw-for-social-media",
        destination: "/",
        permanent: true,
      },
      {
        source: "/blog/openclaw-dashboard",
        destination: "/",
        permanent: true,
      },
      {
        source: "/blog/openclaw-slack-integration",
        destination: "/",
        permanent: true,
      },
      {
        source: "/blog/category/:slug",
        destination: "/blog",
        permanent: true,
      },
      {
        source: "/blog/category",
        destination: "/blog",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
