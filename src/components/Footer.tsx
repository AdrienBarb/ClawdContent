import Link from "next/link";
import Image from "next/image";
import config from "@/lib/config";
import { client } from "@/lib/sanity/client";
import { FOOTER_COMPETITORS_QUERY } from "@/lib/sanity/queries";

const currentYear = new Date().getFullYear();

interface FooterCompetitor {
  competitorName: string;
  title: string;
  primaryKeyword?: string;
  slug: string;
}

export default async function Footer() {
  let competitors: FooterCompetitor[] = [];
  try {
    competitors = await client.fetch(FOOTER_COMPETITORS_QUERY);
  } catch {
    // Sanity unavailable — render footer without competitors
  }

  return (
    <footer className="bg-[#0a0c14] border-t border-[#1e2233]">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">
              {config.project.name}
            </h3>
            <p className="text-sm text-[#7a7f94]">
              {config.project.description}
            </p>
            <a
              href={`mailto:${config.contact.supportEmail}`}
              className="inline-block text-sm text-[#7a7f94] hover:text-[#e8614d] transition-colors"
            >
              {config.contact.supportEmail}
            </a>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Product</h4>
            <ul className="space-y-2 text-sm text-[#7a7f94]">
              <li>
                <Link
                  href="/#pricing"
                  className="hover:text-[#e8614d] transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="hover:text-[#e8614d] transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/affiliates"
                  className="hover:text-[#e8614d] transition-colors"
                >
                  Affiliates
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">Legal</h4>
            <ul className="space-y-2 text-sm text-[#7a7f94]">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-[#e8614d] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-[#e8614d] transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Alternatives */}
        {competitors.length > 0 && (
          <div className="mt-10 border-t border-[#1e2233] pt-8">
            <h4 className="mb-4 text-sm font-semibold text-white">
              Alternatives
            </h4>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#7a7f94]">
              {competitors.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/alternatives/${c.slug}`}
                    className="hover:text-[#e8614d] transition-colors"
                  >
                    {c.primaryKeyword || `PostClaw vs ${c.competitorName}`}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10 border-t border-[#1e2233] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#7a7f94]">
            &copy; {currentYear} {config.project.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <a
              href="https://openclaw.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <Image
                src="/images/openclaw/openclaw-seeklogo.svg"
                alt="OpenClaw"
                width={48}
                height={48}
                className="h-12 w-auto"
              />
            </a>
            <a
              href="https://zernio.com/?utm_source=postclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <Image
                src="/images/zernio/powered-by-zernio.svg"
                alt="Powered by Zernio"
                width={188}
                height={94}
                className="h-12 w-auto"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
