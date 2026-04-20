import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

export default function PoweredBySection() {
  return (
    <section id="powered-by" className="py-20 md:py-28">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-foreground">
            Powered By
          </h2>
          <p className="text-center text-secondary-foreground text-lg mb-16">
            Built on proven infrastructure trusted by thousands of developers.
          </p>

          <div className="flex justify-center">
            <a
              href="https://zernio.com/?utm_source=postclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-card border border-border rounded-2xl p-8 max-w-md w-full hover:border-primary/30 transition-colors group shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="h-12 flex items-center">
                  <Image
                    src="/images/zernio/logo-primary.svg"
                    alt="Zernio logo"
                    width={140}
                    height={48}
                    className="h-12 w-auto"
                  />
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                  Social Media API
                </span>
                <span className="text-xs text-muted-foreground">9 Platforms</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Zernio
              </h3>
              <p className="text-secondary-foreground leading-relaxed text-[0.92rem]">
                Unified social media API for publishing, scheduling, and account
                management across every major platform.
              </p>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
